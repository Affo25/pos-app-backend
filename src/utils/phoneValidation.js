/** International phone: +923247890891 (+ then 8–15 digits, no spaces). */
const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

function normalizePhone(value) {
  if (value == null || value === '') return '';
  let s = String(value).trim().replace(/[\s\-().]/g, '');
  if (!s) return '';
  if (!s.startsWith('+')) {
    s = s.startsWith('00') ? `+${s.slice(2)}` : `+${s}`;
  }
  return s;
}

function isValidPhone(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return true;
  return PHONE_E164_REGEX.test(normalized);
}

/** WhatsApp Cloud API expects digits only, no + prefix (e.g. 92329852247). */
function toWhatsAppDigits(value) {
  const normalized = normalizePhone(value);
  if (!normalized) return '';
  return normalized.replace(/\D/g, '');
}

module.exports = {
  PHONE_E164_REGEX,
  normalizePhone,
  isValidPhone,
  toWhatsAppDigits,
};
