import React from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "feather-icons-react/build/IconComponents";
import ImportExportButtons from "./ImportExportButtons";

const ModernCrudShell = ({
  title,
  subtitle,
  icon,
  addLabel,
  onAdd,
  addTo,
  children,
  excelResource,
  excelFileName,
  canImportExcel = false,
  onExcelImported,
}) => (
  <div className="page-wrapper modern-crud-page">
    <div className="content">
      <div className="modern-crud-header modern-crud-header--outside">
        <div>
          <h4 className="modern-crud-title">
            {icon ? <span className="modern-crud-title-icon">{icon}</span> : null}
            {title}
          </h4>
          {subtitle ? <p className="modern-crud-subtitle">{subtitle}</p> : null}
        </div>
        <div className="modern-crud-header-actions">
          {excelResource ? (
            <ImportExportButtons
              resourcePath={excelResource}
              exportFileName={excelFileName}
              canImport={canImportExcel}
              onImported={onExcelImported}
            />
          ) : null}
          {addLabel && addTo ? (
            <Link to={addTo} className="btn modern-crud-add-btn">
              <PlusCircle size={18} />
              {addLabel}
            </Link>
          ) : null}
          {addLabel && !addTo && onAdd ? (
            <button type="button" className="btn modern-crud-add-btn" onClick={onAdd}>
              <PlusCircle size={18} />
              {addLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="modern-crud-shell">{children}</div>
    </div>
  </div>
);

export default ModernCrudShell;
