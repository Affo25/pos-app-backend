import React, { useMemo, useState } from "react";
import Select from "react-select";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Image as ImageIcon, X } from "feather-icons-react/build/IconComponents";

const TABS = [
  { key: "basic", label: "Basic" },
  { key: "stock", label: "Stock & Price" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "extra", label: "Extra Info" },
  { key: "image", label: "Image" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/**
 * Tabbed product create/edit fields shared by list modal and add page.
 */
const ProductFormTabs = ({
  form,
  onChange,
  categoryOptions = [],
  imagePreview,
  uploading,
  dragging,
  setDragging,
  onPickImage,
  onDrop,
  onClearImage,
  fileInputRef,
  defaultTab = "basic",
}) => {
  const [tab, setTab] = useState(defaultTab);

  const totalValue = useMemo(() => {
    const price = Number(form.unit_price) || 0;
    const qty = Number(form.available_quantity) || 0;
    return (price * qty).toFixed(2);
  }, [form.unit_price, form.available_quantity]);

  return (
    <>
      <div className="modern-form-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`modern-form-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="modern-form-tab-panel">
        {tab === "basic" ? (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="modern-form-label">
                Medicine name <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                maxLength={150}
                required
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">SKU</label>
              <input
                className="form-control"
                value={form.sku}
                onChange={(e) => onChange("sku", e.target.value)}
                maxLength={80}
                placeholder="Auto if blank"
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">
                Batch number <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={form.batch_number}
                onChange={(e) => onChange("batch_number", e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="modern-form-label">
                Category <span className="text-danger">*</span>
              </label>
              <Select
                classNamePrefix="react-select"
                options={categoryOptions}
                value={form.category}
                onChange={(opt) => onChange("category", opt)}
                placeholder="Select category"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 10650 }) }}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="modern-form-label">
                Expiry date <span className="text-danger">*</span>
              </label>
              <DatePicker
                className="form-control"
                value={form.expiry_date ? dayjs(form.expiry_date) : null}
                onChange={(date) => onChange("expiry_date", date)}
                style={{ width: "100%" }}
                getPopupContainer={() => document.body}
                popupClassName="modern-form-datepicker-popup"
                popupStyle={{ zIndex: 10650 }}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="modern-form-label">Medicine size / dosage</label>
              <input
                className="form-control"
                value={form.medicine_size}
                onChange={(e) => onChange("medicine_size", e.target.value)}
                maxLength={50}
                placeholder="e.g. 500mg, 100ml"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="modern-form-label">
                Supplier name <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={form.supplier_name}
                onChange={(e) => onChange("supplier_name", e.target.value)}
                maxLength={150}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="modern-form-label">Rack location</label>
              <input
                className="form-control"
                value={form.rack_location}
                onChange={(e) => onChange("rack_location", e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
        ) : null}

        {tab === "stock" ? (
          <div className="row">
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">
                Available qty <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.available_quantity}
                onChange={(e) => onChange("available_quantity", e.target.value)}
                required
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">
                Unit price <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={form.unit_price}
                onChange={(e) => onChange("unit_price", e.target.value)}
                required
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">Total value</label>
              <input className="form-control" value={`PKR ${totalValue}`} disabled />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">Min stock alert</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.minimum_stock_alert}
                onChange={(e) => onChange("minimum_stock_alert", e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={form.discount}
                onChange={(e) => onChange("discount", e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">GST %</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={form.gst}
                onChange={(e) => onChange("gst", e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="modern-form-label">Status</label>
              <Select
                classNamePrefix="react-select"
                options={statusOptions}
                value={statusOptions.find((o) => o.value === form.status)}
                onChange={(opt) => onChange("status", opt?.value || "active")}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 10650 }) }}
              />
            </div>
            <div className="col-md-3 mb-3 d-flex align-items-end">
              <label className="modern-form-label d-flex align-items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={form.is_prescription_required}
                  onChange={(e) => onChange("is_prescription_required", e.target.checked)}
                />
                Prescription required
              </label>
            </div>
          </div>
        ) : null}

        {tab === "manufacturer" ? (
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="modern-form-label">Manufacturer</label>
              <input
                className="form-control"
                value={form.manufacturer}
                onChange={(e) => onChange("manufacturer", e.target.value)}
                maxLength={150}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="modern-form-label">License no.</label>
              <input
                className="form-control"
                value={form.manufacturer_license_no}
                onChange={(e) => onChange("manufacturer_license_no", e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="modern-form-label">Registration no.</label>
              <input
                className="form-control"
                value={form.manufacturer_registration_no}
                onChange={(e) => onChange("manufacturer_registration_no", e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
        ) : null}

        {tab === "extra" ? (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="modern-form-label">Alternative medicines</label>
              <input
                className="form-control"
                value={form.alternative_medicines}
                onChange={(e) => onChange("alternative_medicines", e.target.value)}
                placeholder="Comma separated names"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="modern-form-label">Storage instructions</label>
              <input
                className="form-control"
                value={form.storage_instructions}
                onChange={(e) => onChange("storage_instructions", e.target.value)}
                placeholder="e.g. Store below 25°C"
              />
            </div>
            <div className="col-12 mb-3">
              <label className="modern-form-label">Notes</label>
              <textarea
                className="form-control"
                rows={5}
                value={form.notes}
                onChange={(e) => onChange("notes", e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {tab === "image" ? (
          <div className="row">
            <div className="col-md-8 col-lg-6">
              <div
                className={`modern-image-upload${dragging ? " is-dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging?.(true);
                }}
                onDragLeave={() => setDragging?.(false)}
                onDrop={onDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  disabled={uploading}
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="modern-image-upload-preview" />
                ) : (
                  <div className="modern-image-upload-placeholder">
                    <ImageIcon size={28} />
                    <strong>Upload image</strong>
                    <span>Drag & drop or click to browse</span>
                    <small className="d-block mt-1">JPG, PNG — saved to Cloudflare R2</small>
                  </div>
                )}
                {imagePreview ? (
                  <div className="modern-image-upload-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fileInputRef?.current?.click();
                      }}
                      disabled={uploading}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={onClearImage}
                      disabled={uploading}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
                {uploading ? <div className="modern-image-upload-busy">Uploading…</div> : null}
              </div>
              {form.image && !uploading ? (
                <small className="text-success d-block mt-2">Image ready</small>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default ProductFormTabs;
