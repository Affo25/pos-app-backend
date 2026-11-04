import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Upload, Image as ImageIcon } from "feather-icons-react/build/IconComponents";
import { toast } from "react-toastify";
import {
  fetchSettingsAction,
  updateSettingsAction,
  fetchSettingsSuccess,
} from "../../../redux/settings/settingSlice";
import * as settingService from "../../../redux/settings/settingService";
import { getApiBase } from "../../../config/runtimeConfig";
import { resolveUploadUrl } from "../../../utils/invoicePrint";
import { DEFAULT_APP_NAME, getDefaultAppLogoUrl } from "../../../utils/appBranding";
import PrinterConnectPanel from "../../../components/PrinterConnectPanel";

const SALE_PDF_TEMPLATES = [
  {
    value: "modern_sale_a4",
    label: "Modern A4",
    desc: "Professional emerald invoice with accent bar",
    tone: "sale",
  },
  {
    value: "report_a4",
    label: "Classic A4",
    desc: "Clean report-style tax invoice",
    tone: "sale",
  },
  {
    value: "pos_receipt",
    label: "POS receipt",
    desc: "Thermal duplicate receipt style",
    tone: "receipt",
  },
  {
    value: "a4_80mm_strip",
    label: "80mm strip",
    desc: "Narrow A4 strip for small printers",
    tone: "receipt",
  },
  {
    value: "restaurant_80mm",
    label: "Restaurant 80mm",
    desc: "Compact kitchen / counter layout",
    tone: "receipt",
  },
];

const PO_PDF_TEMPLATES = [
  {
    value: "modern_po_a4",
    label: "Modern A4",
    desc: "Professional purchase order matching sales",
    tone: "po",
  },
  {
    value: "purchase_order_a4",
    label: "Classic PO",
    desc: "Formal navy purchase order layout",
    tone: "po",
  },
  {
    value: "report_a4",
    label: "Report A4",
    desc: "Shared report-style document",
    tone: "po",
  },
];

const emptyForm = {
  companyName: "",
  appName: DEFAULT_APP_NAME,
  tagline: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  regNumber: "",
  footerText: "",
  receiptPoweredBy: "",
  receiptWebsite: "",
  logoUrl: "",
  sidebarLogoUrl: "",
  appLogoUrl: "",
  connectedPrinter: "",
  primaryColor: "#306844",
  secondaryColor: "#182c25",
  buttonColor: "#306844",
  sidebarColor: "#182c25",
  template: "modern_sale_a4",
  saleTemplate: "modern_sale_a4",
  purchaseOrderTemplate: "modern_po_a4",
  posLayout: "tabular",
};

const GeneralSettings = () => {
  const dispatch = useDispatch();
  const { settings, loading } = useSelector((state) => state.settings);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("app");
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingSidebar, setUploadingSidebar] = useState(false);
  const [uploadingApp, setUploadingApp] = useState(false);
  const invoiceLogoRef = useRef(null);
  const sidebarLogoRef = useRef(null);
  const appLogoRef = useRef(null);

  useEffect(() => {
    dispatch(fetchSettingsAction());
  }, [dispatch]);

  useEffect(() => {
    const design = settings?.invoiceDesign || {};
    const button = design.buttonColor || design.primaryColor || emptyForm.buttonColor;
    const sidebar = design.sidebarColor || design.secondaryColor || emptyForm.sidebarColor;
    const saleTpl = design.saleTemplate || design.template || "modern_sale_a4";
    setForm({
      ...emptyForm,
      ...design,
      posLayout: design.posLayout === "gridview" ? "gridview" : "tabular",
      primaryColor: button,
      buttonColor: button,
      secondaryColor: sidebar,
      sidebarColor: sidebar,
      appName: design.appName || DEFAULT_APP_NAME,
      logoUrl: design.logoUrl || "",
      sidebarLogoUrl: design.sidebarLogoUrl || "",
      appLogoUrl: design.appLogoUrl || "",
      connectedPrinter: design.connectedPrinter || "",
      saleTemplate: saleTpl,
      purchaseOrderTemplate: design.purchaseOrderTemplate || "modern_po_a4",
      template: saleTpl,
    });
  }, [settings]);

  const apiBase = getApiBase();
  const invoiceLogoSrc = useMemo(
    () => resolveUploadUrl(form.logoUrl, apiBase),
    [form.logoUrl, apiBase],
  );
  const sidebarLogoSrc = useMemo(
    () => resolveUploadUrl(form.sidebarLogoUrl, apiBase),
    [form.sidebarLogoUrl, apiBase],
  );
  const appLogoSrc = useMemo(
    () => resolveUploadUrl(form.appLogoUrl, apiBase) || getDefaultAppLogoUrl(),
    [form.appLogoUrl, apiBase],
  );

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "buttonColor") next.primaryColor = value;
      if (key === "primaryColor") next.buttonColor = value;
      if (key === "saleTemplate") next.template = value;
      return next;
    });
  };

  const selectTemplate = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "saleTemplate") next.template = value;
      return next;
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(
      updateSettingsAction({
        invoiceDesign: {
          ...form,
          primaryColor: form.buttonColor || form.primaryColor,
          buttonColor: form.buttonColor || form.primaryColor,
          // Sidebar stays on fixed theme color — do not persist custom sidebar colors
          secondaryColor: "#182c25",
          sidebarColor: "#182c25",
        },
      }),
    );
  };

  const handleLogoUpload = async (kind, file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Please choose an image file");
      return;
    }
    try {
      if (kind === "invoice") setUploadingInvoice(true);
      else if (kind === "app") setUploadingApp(true);
      else setUploadingSidebar(true);
      const result =
        kind === "invoice"
          ? await settingService.uploadInvoiceLogo(file)
          : kind === "app"
            ? await settingService.uploadAppLogo(file)
            : await settingService.uploadSidebarLogo(file);
      const nextSettings = result?.settings ?? result;
      if (nextSettings) {
        dispatch(fetchSettingsSuccess(nextSettings));
      }
      toast.success(
        kind === "invoice"
          ? "Invoice logo uploaded"
          : kind === "app"
            ? "App logo uploaded"
            : "Sidebar logo uploaded",
      );
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingInvoice(false);
      setUploadingSidebar(false);
      setUploadingApp(false);
    }
  };

  return (
    <div className="page-wrapper branding-settings-page">
      <div className="content">
        <div className="page-header branding-page-header">
          <div className="page-title">
            <h4>Invoice &amp; Branding</h4>
            <h6>App name/logo, printer, company details, PDF templates, and POS layout.</h6>
          </div>
        </div>

        <div className="branding-tabs">
          <button
            type="button"
            className={`branding-tab${tab === "app" ? " is-active" : ""}`}
            onClick={() => setTab("app")}
          >
            App name &amp; logo
          </button>
          <button
            type="button"
            className={`branding-tab${tab === "printer" ? " is-active" : ""}`}
            onClick={() => setTab("printer")}
          >
            Printer
          </button>
          <button
            type="button"
            className={`branding-tab${tab === "pdf" ? " is-active" : ""}`}
            onClick={() => setTab("pdf")}
          >
            PDF templates
          </button>
          <button
            type="button"
            className={`branding-tab${tab === "invoice" ? " is-active" : ""}`}
            onClick={() => setTab("invoice")}
          >
            Invoice &amp; branding
          </button>
          <button
            type="button"
            className={`branding-tab${tab === "pos" ? " is-active" : ""}`}
            onClick={() => setTab("pos")}
          >
            POS display
          </button>
          <button
            type="button"
            className={`branding-tab${tab === "theme" ? " is-active" : ""}`}
            onClick={() => setTab("theme")}
          >
            App theme
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {tab === "app" ? (
            <div className="card branding-card" style={{ maxWidth: 720 }}>
              <div className="card-body">
                <h5 className="mb-2">App identity</h5>
                <p className="text-muted mb-3">
                  Shown in the sidebar, header, login screen, and browser tab. Default name is{" "}
                  <strong>{DEFAULT_APP_NAME}</strong> with <code>main-app-logo</code>.
                </p>
                <div className="mb-3">
                  <label className="form-label">App name</label>
                  <input
                    className="form-control"
                    value={form.appName}
                    onChange={onChange("appName")}
                    placeholder={DEFAULT_APP_NAME}
                    maxLength={80}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">App logo</label>
                  <div className="branding-upload-row">
                    <button
                      type="button"
                      className="btn branding-upload-btn"
                      disabled={uploadingApp}
                      onClick={() => appLogoRef.current?.click()}
                    >
                      <ImageIcon size={16} />
                      {uploadingApp ? "Uploading..." : "Upload app logo"}
                    </button>
                    <input
                      ref={appLogoRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        handleLogoUpload("app", e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <img
                      src={appLogoSrc}
                      alt={form.appName || DEFAULT_APP_NAME}
                      className="branding-logo-thumb"
                    />
                  </div>
                  <p className="text-muted small mt-2 mb-0">
                    {form.appLogoUrl
                      ? "Custom logo is active for sidebar and header."
                      : "Using default main-app-logo until you upload a custom image."}
                  </p>
                </div>
                <div
                  className="branding-theme-swatch mt-3 d-flex align-items-center gap-3"
                  style={{
                    background: "#182c25",
                    color: "#e6efe9",
                    borderColor: "#306844",
                  }}
                >
                  <img
                    src={appLogoSrc}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", background: "#fff" }}
                  />
                  <strong>{form.appName || DEFAULT_APP_NAME}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "printer" ? (
            <div className="card branding-card" style={{ maxWidth: 720 }}>
              <div className="card-body">
                <PrinterConnectPanel />
              </div>
            </div>
          ) : null}

          {tab === "pdf" ? (
            <div className="card branding-card">
              <div className="card-body">
                <h5 className="mb-1">PDF templates</h5>
                <p className="text-muted mb-4">
                  Choose modern layouts for sale invoices, purchase orders, and receipt-style PDFs.
                </p>

                <h6 className="pdf-template-group-title">Sale invoices &amp; receipts</h6>
                <div className="pdf-template-grid mb-4">
                  {SALE_PDF_TEMPLATES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pdf-template-card${
                        form.saleTemplate === opt.value ? " is-selected" : ""
                      } is-${opt.tone}`}
                      onClick={() => selectTemplate("saleTemplate", opt.value)}
                    >
                      <div className="pdf-template-preview" aria-hidden="true">
                        <span className="pdf-template-preview__bar" />
                        <span className="pdf-template-preview__line" />
                        <span className="pdf-template-preview__line is-short" />
                        <span className="pdf-template-preview__table" />
                      </div>
                      <div className="pdf-template-copy">
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <h6 className="pdf-template-group-title">Purchase orders</h6>
                <div className="pdf-template-grid">
                  {PO_PDF_TEMPLATES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pdf-template-card${
                        form.purchaseOrderTemplate === opt.value ? " is-selected" : ""
                      } is-${opt.tone}`}
                      onClick={() => selectTemplate("purchaseOrderTemplate", opt.value)}
                    >
                      <div className="pdf-template-preview" aria-hidden="true">
                        <span className="pdf-template-preview__bar" />
                        <span className="pdf-template-preview__line" />
                        <span className="pdf-template-preview__line is-short" />
                        <span className="pdf-template-preview__table" />
                      </div>
                      <div className="pdf-template-copy">
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "invoice" ? (
            <div className="row g-4">
              <div className="col-xl-6">
                <div className="card branding-card">
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Company name</label>
                      <input
                        className="form-control"
                        value={form.companyName}
                        onChange={onChange("companyName")}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Tagline</label>
                      <input
                        className="form-control"
                        value={form.tagline}
                        onChange={onChange("tagline")}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone</label>
                        <input
                          className="form-control"
                          value={form.phone}
                          onChange={onChange("phone")}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={form.email}
                          onChange={onChange("email")}
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Registration no.</label>
                        <input
                          className="form-control"
                          value={form.regNumber}
                          onChange={onChange("regNumber")}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">GSTIN</label>
                        <input
                          className="form-control"
                          value={form.gstin}
                          onChange={onChange("gstin")}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.address}
                        onChange={onChange("address")}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Footer text</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.footerText}
                        onChange={onChange("footerText")}
                      />
                    </div>
                    <div className="mb-1">
                      <label className="form-label">Company logo</label>
                      <div className="branding-upload-row">
                        <button
                          type="button"
                          className="btn branding-upload-btn"
                          disabled={uploadingInvoice}
                          onClick={() => invoiceLogoRef.current?.click()}
                        >
                          <Upload size={16} />
                          {uploadingInvoice ? "Uploading..." : "Upload logo"}
                        </button>
                        <input
                          ref={invoiceLogoRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            handleLogoUpload("invoice", e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                        {invoiceLogoSrc ? (
                          <img src={invoiceLogoSrc} alt="Invoice logo" className="branding-logo-thumb" />
                        ) : (
                          <span className="text-muted small">No logo uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-6">
                <div className="card branding-card branding-preview-card">
                  <div className="card-body">
                    <div className="invoice-live-preview">
                      <div className="ilp-header">
                        {invoiceLogoSrc ? (
                          <img src={invoiceLogoSrc} alt="" className="ilp-logo" />
                        ) : (
                          <div className="ilp-logo-placeholder">LOGO</div>
                        )}
                        <div className="ilp-company">{form.companyName || "Company name"}</div>
                        {form.tagline ? <div className="ilp-tagline">{form.tagline}</div> : null}
                        {form.address ? <div className="ilp-meta">{form.address}</div> : null}
                        <div className="ilp-meta">
                          {[form.phone, form.email].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="ilp-meta-row">
                        <span>Invoice No. SAMPLE-001</span>
                        <span>Date {new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="ilp-meta-row">
                        <span>Customer Walk-in</span>
                      </div>
                      <table className="ilp-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Sample Item #1</td>
                            <td>2</td>
                            <td>PKR 500.00</td>
                          </tr>
                          <tr>
                            <td>Sample Item #2</td>
                            <td>1</td>
                            <td>PKR 250.00</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="ilp-totals">
                        <div>
                          <span>Subtotal</span>
                          <strong>PKR 750.00</strong>
                        </div>
                        <div>
                          <span>Discount</span>
                          <strong>PKR 0.00</strong>
                        </div>
                        <div className="is-total">
                          <span>Total</span>
                          <strong>PKR 750.00</strong>
                        </div>
                      </div>
                      <div className="ilp-footer">{form.footerText || "Thank you for your business!"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "pos" ? (
            <div className="card branding-card" style={{ maxWidth: 640 }}>
              <div className="card-body">
                <h5 className="mb-2">Product catalog layout</h5>
                <p className="text-muted mb-3">
                  Choose how the product catalog appears on the Point of Sale billing screen: a
                  scrollable list (tabular) or a card grid (grid view).
                </p>
                <label className="form-label">Layout</label>
                <select
                  className="form-select"
                  value={form.posLayout}
                  onChange={onChange("posLayout")}
                >
                  <option value="tabular">Tabular — vertical list</option>
                  <option value="gridview">Grid view — product cards</option>
                </select>
                <p className="text-muted small mt-2 mb-0">
                  {form.posLayout === "gridview"
                    ? "Products show as cards in a grid."
                    : "Products show as a vertical list with image and details."}
                </p>
              </div>
            </div>
          ) : null}

          {tab === "theme" ? (
            <div className="card branding-card" style={{ maxWidth: 720 }}>
              <div className="card-body">
                <h5 className="mb-2">App buttons &amp; accents</h5>
                <p className="text-muted mb-3">
                  Change primary button and accent colors across the app. The sidebar keeps the
                  default theme color. You can still upload a sidebar logo.
                </p>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label className="form-label">Button / accent color</label>
                    <div className="branding-color-row">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        value={form.buttonColor || "#306844"}
                        onChange={onChange("buttonColor")}
                      />
                      <input
                        className="form-control"
                        value={form.buttonColor}
                        onChange={onChange("buttonColor")}
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-1">
                  <label className="form-label">Sidebar menu image / logo</label>
                  <div className="branding-upload-row">
                    <button
                      type="button"
                      className="btn branding-upload-btn"
                      disabled={uploadingSidebar}
                      onClick={() => sidebarLogoRef.current?.click()}
                    >
                      <ImageIcon size={16} />
                      {uploadingSidebar ? "Uploading..." : "Upload sidebar image"}
                    </button>
                    <input
                      ref={sidebarLogoRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        handleLogoUpload("sidebar", e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    {sidebarLogoSrc ? (
                      <img src={sidebarLogoSrc} alt="Sidebar logo" className="branding-logo-thumb" />
                    ) : (
                      <span className="text-muted small">No sidebar image</span>
                    )}
                  </div>
                </div>
                <div
                  className="branding-theme-swatch mt-3"
                  style={{
                    background: "#182c25",
                    color: "#e6efe9",
                    borderColor: form.buttonColor || "#306844",
                  }}
                >
                  <span>Button preview</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: form.buttonColor || "#306844",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                    }}
                  >
                    Sample button
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {tab !== "printer" ? (
            <div className="text-end mt-3">
              <button type="submit" className="btn btn-primary branding-save-btn" disabled={loading}>
                {loading ? "Saving..." : "Save settings"}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default GeneralSettings;
