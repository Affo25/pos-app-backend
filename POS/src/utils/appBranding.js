import { getApiBase } from "../config/runtimeConfig";
import { resolveUploadUrl } from "./invoicePrint";

export const DEFAULT_APP_NAME = "POSHub";
export const DEFAULT_APP_LOGO = "assets/img/main-app-logo.png";

/** Public URL for the bundled default logo (CRA public folder). */
export function getDefaultAppLogoUrl() {
  const base = String(process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/${DEFAULT_APP_LOGO}`.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Resolve display name + logo for chrome (sidebar, header, login, document title).
 * App identity is separate from invoice company branding.
 */
export function getAppBranding(settings) {
  const design = settings?.invoiceDesign || {};
  const name = String(design.appName || "").trim() || DEFAULT_APP_NAME;

  const uploaded = resolveUploadUrl(design.appLogoUrl, getApiBase());

  return {
    name,
    logoUrl: uploaded || getDefaultAppLogoUrl(),
    hasCustomLogo: Boolean(uploaded),
  };
}
