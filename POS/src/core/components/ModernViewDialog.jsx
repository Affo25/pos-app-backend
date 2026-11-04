import React from "react";
import { Modal, Button } from "react-bootstrap";
import { X } from "feather-icons-react/build/IconComponents";

const isEmpty = (value) =>
  value == null ||
  value === "" ||
  (Array.isArray(value) && !value.length);

const formatDisplay = (field) => {
  if (field.render) return field.render(field.value, field);
  if (isEmpty(field.value)) return <span className="mv-empty">—</span>;
  if (field.type === "bool") return field.value ? "Yes" : "No";
  if (field.type === "list" && Array.isArray(field.value)) {
    return (
      <div className="mv-chip-row">
        {field.value.map((item) => (
          <span key={String(item)} className="mv-chip">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  return String(field.value);
};

/**
 * Reusable read-only detail dialog for CRUD screens.
 *
 * highlights: [{ label, value, tone? }]
 * fields/sections: [{ label, value, type?, span?, render?, hideIfEmpty?, mono? }]
 */
const ModernViewDialog = ({
  show,
  onHide,
  title = "Details",
  subtitle = "",
  badge = null,
  imageUrl = "",
  imageAlt = "",
  highlights = [],
  fields = [],
  sections = null,
  sectionColumns = 1,
  children = null,
  size = "lg",
  footerExtra = null,
  closeLabel = "Close",
}) => {
  const renderFieldRows = (list = []) => {
    const visible = list.filter((f) => !(f.hideIfEmpty && isEmpty(f.value)));
    if (!visible.length) {
      return <p className="mv-empty-block mb-0">No details available.</p>;
    }
    return (
      <div className="mv-rows">
        {visible.map((field) => (
          <div
            key={field.key || field.label}
            className={`mv-row${field.span === 2 ? " is-stack" : ""}`}
          >
            <div className="mv-label">{field.label}</div>
            <div className={`mv-value${field.mono ? " is-mono" : ""}`}>
              {formatDisplay(field)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSectionCard = (section) => (
    <section
      key={section.title}
      className={`mv-card${section.fullWidth ? " is-full" : ""}`}
    >
      <div className="mv-card-header">
        <h6 className="mv-card-title">{section.title}</h6>
        {section.badge ? <div className="mv-card-badge">{section.badge}</div> : null}
      </div>
      <div className="mv-card-body">{renderFieldRows(section.fields || [])}</div>
    </section>
  );

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size={size}
      scrollable
      dialogClassName="modern-view-dialog"
    >
      <div className="mv-shell">
        <div className="mv-header">
          <div className="mv-header-main">
            {imageUrl ? (
              <img src={imageUrl} alt={imageAlt || title} className="mv-avatar" />
            ) : (
              <div className="mv-avatar is-placeholder" aria-hidden="true">
                {(title || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="mv-header-copy">
              <div className="mv-title-row">
                <h5 className="mv-title">{title}</h5>
                {badge}
              </div>
              {subtitle ? <p className="mv-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="mv-close" onClick={onHide} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mv-body">
          {highlights?.length ? (
            <div className="mv-highlights">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className={`mv-highlight${item.tone ? ` is-${item.tone}` : ""}`}
                >
                  <span className="mv-highlight-label">{item.label}</span>
                  <strong className="mv-highlight-value">
                    {isEmpty(item.value) ? "—" : String(item.value)}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}

          {sections?.length ? (
            <div
              className={`mv-card-grid${
                Number(sectionColumns) === 2 ? " is-two-col" : ""
              }`}
            >
              {sections.map(renderSectionCard)}
            </div>
          ) : (
            <div className="mv-card">
              <div className="mv-card-body">{renderFieldRows(fields)}</div>
            </div>
          )}
          {children}
        </div>

        <div className="mv-footer">
          {footerExtra}
          <Button variant="light" className="modern-form-cancel" onClick={onHide}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModernViewDialog;
