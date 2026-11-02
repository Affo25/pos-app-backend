import Cookies from "js-cookie";
import { apiUrl } from "./apiHelpers";

const authHeaders = () => {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const downloadExcelExport = async (resourcePath, filename) => {
  const response = await fetch(apiUrl(`${resourcePath}/export-excel`), {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) {
    let message = "Export failed";
    try {
      const payload = await response.json();
      message = payload?.error || payload?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "export.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const uploadExcelImport = async (resourcePath, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(apiUrl(`${resourcePath}/import-excel`), {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Import failed");
  }
  return payload;
};
