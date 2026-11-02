const XLSX = require('xlsx');

const normalizeKey = (key) =>
  String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const parseExcelDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sheetRowsFromBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  return rows.map((rawRow) => {
    const row = {};
    Object.keys(rawRow).forEach((k) => {
      row[normalizeKey(k)] = rawRow[k];
    });
    return row;
  });
};

const sendExcel = (res, rows, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
};

module.exports = {
  normalizeKey,
  parseExcelDate,
  sheetRowsFromBuffer,
  sendExcel,
  XLSX,
};
