import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { getAppBranding } from "../../utils/appBranding";

const AppFooter = () => {
  const settings = useSelector((state) => state.settings?.settings);
  const brand = useMemo(() => getAppBranding(settings), [settings]);
  const year = new Date().getFullYear();
  const company = settings?.invoiceDesign?.companyName || brand.name;

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <span className="app-footer__copy">
          © {year} {company}. All rights reserved.
        </span>
        <span className="app-footer__meta">{brand.name}</span>
      </div>
    </footer>
  );
};

export default AppFooter;
