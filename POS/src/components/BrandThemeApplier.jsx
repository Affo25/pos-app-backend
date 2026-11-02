import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import { fetchSettingsAction } from "../redux/settings/settingSlice";

const DEFAULT_SIDEBAR = "#0d2b26";

function shadeHex(hex, percent) {
  const raw = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return hex;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Applies button/accent branding only. Sidebar stays on the fixed theme color.
 */
const BrandThemeApplier = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings?.settings);
  const token = Cookies.get("token");

  useEffect(() => {
    if (token) dispatch(fetchSettingsAction());
  }, [dispatch, token]);

  useEffect(() => {
    const design = settings?.invoiceDesign || {};
    const button = design.buttonColor || design.primaryColor || "#c4f45d";
    const root = document.documentElement;
    // Keep sidebar / primary text on the original theme greens
    root.style.setProperty("--ph-sidebar", DEFAULT_SIDEBAR);
    root.style.setProperty("--ph-sidebar-soft", "#143832");
    root.style.setProperty("--ph-lime-text", DEFAULT_SIDEBAR);
    root.style.setProperty("--mc-primary", DEFAULT_SIDEBAR);
    // Only accent / buttons follow branding
    root.style.setProperty("--ph-lime", button);
    root.style.setProperty("--ph-lime-hover", shadeHex(button, -8));
    root.style.setProperty("--mc-accent", button);
  }, [settings]);

  return null;
};

export default BrandThemeApplier;
