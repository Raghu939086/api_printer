module.exports = (value) => String(value || '')
  .normalize('NFKD').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
