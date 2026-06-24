const { buildBranding } = require('./branding');
const salesRegisterA4 = require('./templates/sales_register_a4');

/**
 * @param {object} payload { records, subtitle?, generated_at? }
 * @param {object|null} branding
 * @returns {Promise<string>} temp file path
 */
function generateSalesRegisterPDF(payload, branding) {
  const B = branding || buildBranding(null);
  return salesRegisterA4.generate(payload, B);
}

module.exports = { generateSalesRegisterPDF };
