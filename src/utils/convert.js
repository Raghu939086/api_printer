const fs = require('fs');
const os = require('os');
const path = require('path');
const mammoth = require('mammoth');
const { JSDOM } = require('jsdom');
const htmlToPdfmake = require('html-to-pdfmake');
const PdfPrinter = require('pdfmake');

// pdfmake (server-side) registers fonts by file path, but the package only ships
// the fonts as base64 inside its virtual file system. So, on first use, write the
// bundled Roboto fonts to a temp folder and point the printer at those real files.
// This keeps conversion working the same on Windows and on Linux hosts (Render)
// with no system fonts, LibreOffice, MS Word or headless browser required.
const vfsModule = require('pdfmake/build/vfs_fonts.js');
const vfs = vfsModule.pdfMake ? vfsModule.pdfMake.vfs : vfsModule.vfs;

let fonts; // lazily initialised font descriptor with on-disk paths

function ensureFonts() {
  if (fonts) return fonts;
  const dir = path.join(os.tmpdir(), 'applications-backend-fonts');
  fs.mkdirSync(dir, { recursive: true });
  for (const name of Object.keys(vfs)) {
    const target = path.join(dir, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.from(vfs[name], 'base64'));
  }
  fonts = {
    Roboto: {
      normal: path.join(dir, 'Roboto-Regular.ttf'),
      bold: path.join(dir, 'Roboto-Medium.ttf'),
      italics: path.join(dir, 'Roboto-Italic.ttf'),
      bolditalics: path.join(dir, 'Roboto-MediumItalic.ttf')
    }
  };
  return fonts;
}

const WORD_EXTS = new Set(['.doc', '.docx']);
const WORD_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

function isWordDocument(originalname = '', mimetype = '') {
  const ext = path.extname(originalname).toLowerCase();
  return WORD_EXTS.has(ext) || WORD_MIMES.has(mimetype);
}

// Convert a Word (.docx) buffer into a PDF buffer, fully in-process. Flow:
//   .docx  --mammoth-->  HTML  --html-to-pdfmake-->  pdfmake doc  -->  PDF
async function docxToPdf(buffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer });

  const { window } = new JSDOM('');
  const content = htmlToPdfmake(html && html.trim() ? html : '<p></p>', { window });

  const printer = new PdfPrinter(ensureFonts());
  const docDefinition = {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.3 },
    pageMargins: [50, 50, 50, 50]
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data', (c) => chunks.push(c));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Given an uploaded file (multer memory object), always return PDF bytes:
// PDFs pass through untouched; Word docs are converted. Returns
// { buffer, filename, mimetype } ready to store in GridFS.
async function toPdf(file) {
  if (isWordDocument(file.originalname, file.mimetype)) {
    const pdfBuffer = await docxToPdf(file.buffer);
    const base = path.basename(file.originalname, path.extname(file.originalname));
    return { buffer: pdfBuffer, filename: `${base}.pdf`, mimetype: 'application/pdf' };
  }
  return { buffer: file.buffer, filename: file.originalname, mimetype: file.mimetype || 'application/pdf' };
}

module.exports = { isWordDocument, docxToPdf, toPdf };
