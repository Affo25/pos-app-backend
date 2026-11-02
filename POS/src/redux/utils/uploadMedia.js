import Cookies from "js-cookie";
import { apiUrl } from "./apiHelpers";
import { getApiBase } from "../../config/runtimeConfig";

export async function uploadMedia(file, folder = "products") {
  const token = Cookies.get("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch(apiUrl("/uploads"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || "Image upload failed");
  }
  return payload.url || payload?.data?.url;
}

export function resolveMediaUrl(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image) || image.startsWith("data:") || image.startsWith("blob:")) {
    return image;
  }
  if (image.startsWith("/uploads/") || image.startsWith("/api/") || image.includes("/api/uploads/")) {
    const origin = getApiBase().replace(/\/api\/?$/, "");
    return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
  }
  return image;
}
