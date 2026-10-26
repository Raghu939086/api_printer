/**
 * Seed script: inserts the application-form PDFs into the backend.
 *
 * What it does:
 *   1. Connects to MongoDB (same MONGODB_URI as the server).
 *   2. Ensures an admin user exists (FormTemplate.createdBy is required).
 *   3. Ensures the categories used below exist.
 *   4. For every form entry, finds its PDF on disk, copies it into ./uploads
 *      with a safe unique name, and upserts a FormTemplate carrying the
 *      title, description, tags and the stored file (fileUrl + originalFileName).
 *
 * After seeding:
 *   GET /api/forms            -> list every seeded form (title, description, tags, fileUrl)
 *   GET /api/forms/:id        -> one form with the same fields
 *   GET /uploads/<file>.pdf   -> downloads the actual PDF
 *
 * Run:
 *   npm run seed                      (uses your Downloads folder as the PDF source)
 *   SEED_SOURCE_DIR=/path npm run seed   (override where the PDFs are read from)
 *   npm run seed -- --force           (re-copy files even if already stored)
 *
 * It is idempotent: re-running updates the existing forms instead of duplicating them.
 */
require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const FormTemplate = require('./models/FormTemplate');
const slugify = require('./utils/slugify');
const { uploadBuffer, findFile } = require('./utils/gridfs');

// Where the raw PDFs live. By default we search the user's Downloads AND
// Documents folders; set SEED_SOURCE_DIR to one or more folders (comma-separated)
// to override. The first folder that contains a given file wins.
const SOURCE_DIRS = (process.env.SEED_SOURCE_DIR
  ? process.env.SEED_SOURCE_DIR.split(/[,;]/)
  : [path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Documents')]
).map((d) => d.trim()).filter(Boolean);
const FORCE = process.argv.includes('--force');

const ADMIN = {
  name: 'Seed Admin',
  email: 'admin@applications.local',
  password: 'ChangeMe123!' // 12+ chars; change after first login
};

const CATEGORIES = [
  { name: 'Identity & Civil Registration', description: 'Birth certificates, Aadhaar and identity documents' },
  { name: 'Elections', description: 'Voter registration and electoral forms' },
  { name: 'Revenue & Certificates', description: 'Income, caste and residence certificates' },
  { name: 'Transport', description: 'Driving licences and public transport passes' },
  { name: 'Employment', description: 'Job and employment application forms' },
  { name: 'Education & Scholarships', description: 'Scholarship and student service forms' },
  { name: 'Utilities', description: 'Electricity and other utility connection forms' },
  { name: 'Travel', description: 'Passport and travel document forms' }
];

/**
 * Each form lists one or more candidate file names (first one found on disk wins,
 * so the "(1)" duplicate copies are handled automatically).
 */
const FORMS = [
  {
    files: ['CDMAAPPLICATIONFORBIRTHCERTIFICATE.pdf', 'CDMAAPPLICATIONFORBIRTHCERTIFICATE (1).pdf'],
    title: 'Birth Certificate Application (CDMA)',
    description: 'Application for registration and issue of a birth certificate through the Commissioner & Director of Municipal Administration.',
    tags: ['birth-certificate', 'civil-registration', 'cdma', 'municipal'],
    category: 'Identity & Civil Registration',
    formType: 'downloadable',
    officialUrl: 'https://cdma.telangana.gov.in/'
  },
  {
    files: ['LR_Aadhaar_Handbook_2026.pdf'],
    title: 'Aadhaar Enrolment & Update Handbook 2026',
    description: 'Reference handbook covering Aadhaar enrolment, document requirements and the update process.',
    tags: ['aadhaar', 'uidai', 'handbook', 'identity'],
    category: 'Identity & Civil Registration',
    formType: 'downloadable',
    officialUrl: 'https://uidai.gov.in/'
  },
  {
    files: ['Form_6_English.pdf', 'Application Form for New Voter.pdf'],
    title: 'New Voter Registration (Form 6)',
    description: 'Election Commission Form 6 for enrolment of a new elector in the electoral roll.',
    tags: ['voter', 'election', 'form-6', 'eci'],
    category: 'Elections',
    formType: 'both',
    officialUrl: 'https://voters.eci.gov.in/'
  },
  {
    files: ['IncomeGeneralApplicationForm.pdf', 'IncomeGeneralApplicationForm (1).pdf'],
    title: 'Income Certificate Application',
    description: 'General application form to obtain an income certificate from the revenue department.',
    tags: ['income-certificate', 'revenue', 'meeseva'],
    category: 'Revenue & Certificates',
    formType: 'both',
    officialUrl: 'https://ts.meeseva.telangana.gov.in/'
  },
  // The entries below are seeded only if their PDF is present in SOURCE_DIR.
  {
    files: ['Job-application-form.pdf'],
    title: 'Job Application Form',
    description: 'General employment application form for candidates applying for a position.',
    tags: ['job', 'employment', 'recruitment'],
    category: 'Employment',
    formType: 'both'
  },
  {
    files: ['PassportApplicationForm.pdf'],
    title: 'Passport Application Form',
    description: 'Passport Seva application form for a fresh or re-issue Indian passport.',
    tags: ['passport', 'travel', 'psk'],
    category: 'Travel',
    formType: 'downloadable',
    officialUrl: 'https://www.passportindia.gov.in/'
  },
  {
    files: ['APPLICATION FOR SUPPLY OF ELECTRICITY.pdf'],
    title: 'Electricity Supply Connection Application',
    description: 'Application for a new domestic or commercial electricity supply connection.',
    tags: ['electricity', 'utility', 'new-connection'],
    category: 'Utilities',
    formType: 'downloadable'
  },
  {
    files: ['STUDENT SCHOLARSHIP SERVICE APPLICATION FORM.pdf'],
    title: 'Student Scholarship Application',
    description: 'Application for student scholarship services and financial assistance.',
    tags: ['scholarship', 'student', 'education'],
    category: 'Education & Scholarships',
    formType: 'both'
  },
  {
    files: ['Student-Pass-Application Metro.pdf'],
    title: 'Student Metro Pass Application',
    description: 'Application for a concessional student travel pass on the metro.',
    tags: ['metro', 'student-pass', 'transport'],
    category: 'Transport',
    formType: 'downloadable'
  },
  {
    files: ['licence.pdf'],
    title: 'Driving Licence Application',
    description: 'Application form for issue of a driving licence.',
    tags: ['driving-licence', 'rto', 'transport'],
    category: 'Transport',
    formType: 'downloadable',
    officialUrl: 'https://parivahan.gov.in/'
  }
];

function findSourceFile(candidates) {
  for (const dir of SOURCE_DIRS) {
    for (const name of candidates) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return { full, name };
    }
  }
  return null;
}

async function ensureAdmin() {
  let user = await User.findOne({ email: ADMIN.email });
  if (user) return user;
  user = await User.create({
    name: ADMIN.name,
    email: ADMIN.email,
    passwordHash: await User.hashPassword(ADMIN.password),
    role: 'admin'
  });
  console.log(`Created admin user: ${ADMIN.email} / ${ADMIN.password}`);
  return user;
}

async function ensureCategories() {
  const map = {};
  for (const c of CATEGORIES) {
    const slug = slugify(c.name);
    const cat = await Category.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name: c.name, slug, description: c.description } },
      { new: true, upsert: true }
    );
    map[c.name] = cat;
  }
  return map;
}

// Stores a PDF into GridFS (MongoDB) and returns its id + served URL.
async function storePdf(source) {
  const buffer = fs.readFileSync(source.full);
  const fileId = await uploadBuffer(buffer, source.name, 'application/pdf');
  return { fileId, fileUrl: `/api/files/${fileId}` };
}

async function storedFileExists(fileId) {
  if (!fileId) return false;
  try {
    return Boolean(await findFile(fileId));
  } catch (_) {
    return false;
  }
}

async function seedForms(admin, categoryMap) {
  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const form of FORMS) {
    const slug = slugify(form.title);
    const source = findSourceFile(form.files);

    if (!source) {
      console.warn(`SKIP  "${form.title}" - no PDF found in [${SOURCE_DIRS.join(', ')}] (looked for: ${form.files.join(', ')})`);
      summary.skipped += 1;
      continue;
    }

    const category = categoryMap[form.category];
    const existing = await FormTemplate.findOne({ slug });

    // Reuse the already-stored GridFS file unless forced or it went missing.
    let fileUrl;
    let fileId;
    if (existing && existing.fileId && !FORCE && (await storedFileExists(existing.fileId))) {
      fileUrl = existing.fileUrl;
      fileId = existing.fileId;
    } else {
      ({ fileUrl, fileId } = await storePdf(source));
    }

    const payload = {
      title: form.title,
      slug,
      category: category._id,
      description: form.description,
      formType: form.formType || 'both',
      tags: form.tags || [],
      officialUrl: form.officialUrl || '',
      fileUrl,
      fileId,
      originalFileName: source.name,
      isActive: true,
      createdBy: admin._id
    };

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      summary.updated += 1;
      console.log(`UPDATE "${form.title}" -> ${fileUrl}`);
    } else {
      await FormTemplate.create(payload);
      summary.created += 1;
      console.log(`CREATE "${form.title}" -> ${fileUrl}`);
    }
  }

  return summary;
}

async function main() {
  console.log(`Reading PDFs from: ${SOURCE_DIRS.join(', ')}`);
  console.log(`Storing files in:  MongoDB GridFS (bucket: pdfs)\n`);

  await connectDB();
  const admin = await ensureAdmin();
  const categoryMap = await ensureCategories();
  const summary = await seedForms(admin, categoryMap);

  console.log(`\nDone. created=${summary.created} updated=${summary.updated} skipped=${summary.skipped}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
