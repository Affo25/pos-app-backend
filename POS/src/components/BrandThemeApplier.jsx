import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import { fetchSettingsAction } from "../redux/settings/settingSlice";
import { DEFAULT_APP_NAME, getAppBranding } from "../utils/appBranding";

/** Dark green palette from app theme (color-hex 9376). */
const THEME = {
  sidebar: "#182c25",
  pine: "#1e453e",
  forest: "#2c4c3b",
  emerald: "#306844",
  slate: "#455b55",
  soft: "#e6efe9",
  buttonText: "#ffffff",
};

/**
 * Applies fixed dark-green theme + browser title from app branding.
 */
const BrandThemeApplier = () => {
  const dispatch = useDispatch();
  const token = Cookies.get("token");
  const settings = useSelector((state) => state.settings?.settings);

  useEffect(() => {
    if (token) dispatch(fetchSettingsAction());
  }, [dispatch, token]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ph-sidebar", THEME.sidebar);
    root.style.setProperty("--ph-sidebar-soft", THEME.pine);
    root.style.setProperty("--ph-forest", THEME.forest);
    root.style.setProperty("--ph-emerald", THEME.emerald);
    root.style.setProperty("--ph-slate", THEME.slate);
    root.style.setProperty("--ph-soft", THEME.soft);
    root.style.setProperty("--ph-lime", THEME.emerald);
    root.style.setProperty("--ph-lime-hover", THEME.forest);
    root.style.setProperty("--ph-lime-text", THEME.buttonText);
    root.style.setProperty("--mc-primary", THEME.sidebar);
    root.style.setProperty("--mc-primary-dark", "#121f1a");
    root.style.setProperty("--mc-primary-soft", THEME.soft);
    root.style.setProperty("--mc-accent", THEME.emerald);
    root.style.setProperty("--mc-accent-hover", THEME.forest);
    root.style.setProperty("--mc-emerald", THEME.emerald);
    root.style.setProperty("--mc-forest", THEME.forest);
    root.style.setProperty("--mc-pine", THEME.pine);
    root.style.setProperty("--mc-slate", THEME.slate);

    const { name } = getAppBranding(settings);
    document.title = name || DEFAULT_APP_NAME;
  }, [settings]);

  return null;
};

export default BrandThemeApplier;
