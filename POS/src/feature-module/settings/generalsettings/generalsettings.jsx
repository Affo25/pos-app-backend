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

const TEMPLATE_OPTIONS = [
  { value: "pos_receipt", label: "POS receipt (classic duplicate style)" },
  { value: "a4_80mm_strip", label: "A4 80mm strip" },
  { value: "report_a4", label: "Report A4" },
  { value: "restaurant_80mm", label: "Restaurant 80mm" },
];

const emptyForm = {
  companyName: "",
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
  primaryColor: "#c4f45d",
  secondaryColor: "#0d2b26",
  buttonColor: "#c4f45d",
  sidebarColor: "#0d2b26",
  template: "pos_receipt",
  posLayout: "tabular",
};

const GeneralSettings = () => {
  const dispatch = useDispatch();
  const { settings, loading } = useSelector((state) => state.settings);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("invoice");
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingSidebar, setUploadingSidebar] = useState(false);
  const invoiceLogoRef = useRef(null);
  const sidebarLogoRef = useRef(null);

  useEffect(() => {
    dispatch(fetchSettingsAction());
  }, [dispatch]);

  useEffect(() => {
    const design = settings?.invoiceDesign || {};
    const button = design.buttonColor || design.primaryColor || emptyForm.buttonColor;
    const sidebar = design.sidebarColor || design.secondaryColor || emptyForm.sidebarColor;
    setForm({
      ...emptyForm,
      ...design,
      template: design.template || "pos_receipt",
      posLayout: design.posLayout === "gridview" ? "gridview" : "tabular",
      primaryColor: button,
      buttonColor: button,
      secondaryColor: sidebar,
      sidebarColor: sidebar,
      logoUrl: design.logoUrl || "",
      sidebarLogoUrl: design.sidebarLogoUrl || "",
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

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "buttonColor") next.primaryColor = value;
      if (key === "primaryColor") next.buttonColor = value;
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
          secondaryColor: "#0d2b26",
          sidebarColor: "#0d2b26",
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
      else setUploadingSidebar(true);
      const result =
        kind === "invoice"
          ? await settingService.uploadInvoiceLogo(file)
          : await settingService.uploadSidebarLogo(file);
      const nextSettings = result?.settings ?? result;
      if (nextSettings) {
        dispatch(fetchSettingsSuccess(nextSettings));
      }
      toast.success(kind === "invoice" ? "Invoice logo uploaded" : "Sidebar logo uploaded");
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingInvoice(false);
      setUploadingSidebar(false);
    }
  };

  return (
    <div className="page-wrapper branding-settings-page">
      <div className="content">
        <div className="page-header branding-page-header">
          <div className="page-title">
            <h4>Invoice &amp; Branding</h4>
            <h6>Company details, PDF templates, and POS catalog layout.</h6>
          </div>
        </div>

        <div className="branding-tabs">
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
          {tab === "invoice" ? (
            <div className="row g-4">
              <div className="col-xl-6">
                <div className="card branding-card">
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Invoice template (PDF)</label>
                      <select
                        className="form-select"
                        value={form.template}
                        onChange={onChange("template")}
                      >
                        {TEMPLATE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
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
                        value={form.buttonColor || "#c4f45d"}
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
                    background: "#0d2b26",
                    color: form.buttonColor,
                    borderColor: form.buttonColor,
                  }}
                >
                  <span>Button preview</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: form.buttonColor,
                      color: "#0d2b26",
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

          <div className="text-end mt-3">
            <button type="submit" className="btn btn-primary branding-save-btn" disabled={loading}>
              {loading ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneralSettings;
