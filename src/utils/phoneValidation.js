/** International phone: +923247890891 (+ then 8–15 digits, no spaces). */
const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

function normalizePhone(value) {
  if (value == null || value === '') return '';
  let s = String(value).trim().replace(/[\s\-().]/g, '');
  if (!s) return '';
  if (s.startsWith('00')) {
    s = `+${s.slice(2)}`;
  } else if (s.startsWith('0')) {
    s = `+92${s.slice(1)}`;
  } else if (!s.startsWith('+')) {
    s = `+${s}`;
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
