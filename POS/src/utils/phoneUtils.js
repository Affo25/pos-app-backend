const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const normalizePhoneInput = (value) => {
  let phone = String(value || "").trim().replace(/[\s\-().]/g, "");
  if (!phone) return "";

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  } else if (phone.startsWith("0")) {
    phone = `+92${phone.slice(1)}`;
  } else if (!phone.startsWith("+")) {
    phone = `+${phone}`;
  }

  return phone;
};

export const isValidPhoneInput = (value) => {
  const normalized = normalizePhoneInput(value);
  if (!normalized) return true;
  return PHONE_E164_REGEX.test(normalized);
};

export const getPhoneErrorMessage = () =>
  "Invalid phone format. Use +923247890891 or 03247890891";
