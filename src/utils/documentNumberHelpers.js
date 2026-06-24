/** Shared yyMMdd-### document numbers for sales (bill/invoice) and purchase orders. */

function documentDatePrefix(documentDate = new Date()) {
  const d = documentDate instanceof Date ? documentDate : new Date(documentDate);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Next number for a field: yyMMdd-001, yyMMdd-002, … per admin and calendar day.
 */
async function nextDocumentNumber(adminId, documentDate, Model, fieldName) {
  const prefix = documentDatePrefix(documentDate);
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  const rows = await Model.find({
    admin_id: adminId,
    [fieldName]: new RegExp(`^${prefix}-`, 'i'),
  })
    .select(fieldName)
    .lean();

  let maxSeq = 0;
  rows.forEach((row) => {
    const m = String(row[fieldName] || '').match(pattern);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

module.exports = {
  documentDatePrefix,
  nextDocumentNumber,
};
