import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FileText,
  Printer,
  X as CloseIcon,
} from "feather-icons-react/build/IconComponents";
import { getApiBase } from "../../../config/runtimeConfig";
import {
  fetchInvoicePdfBlobUrl,
  fetchPrinters,
  openInvoicePreview,
  printInvoiceToDevice,
  resolveUploadUrl,
  saleToInvoicePayload,
} from "../../../utils/invoicePrint";

const money = (v) => `PKR ${Number(v || 0).toFixed(2)}`;

const formatDateParts = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    return { date: "-", time: "-" };
  }
  return {
    date: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

/**
 * Post-sale invoice alert modal with receipt preview + Print / PDF / Printer actions.
 */
const SaleInvoiceModal = ({ show, sale, template, onClose }) => {
  const settings = useSelector((state) => state.settings?.settings);
  const design = settings?.invoiceDesign || {};
  const printRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [showPrinterPicker, setShowPrinterPicker] = useState(false);

  const invoice = useMemo(() => saleToInvoicePayload(sale), [sale]);
  const logoSrc = useMemo(
    () => resolveUploadUrl(design.logoUrl, getApiBase()),
    [design.logoUrl],
  );

  const companyName = design.companyName || "Company";
  const tagline = design.tagline || "";
  const address = design.address || "";
  const phone = design.phone || "";
  const email = design.email || "";
  const footerText = design.footerText || "Thank you for your business!";

  const { date, time } = formatDateParts(invoice?.sale_date);
  const items = invoice?.items || [];
  const itemCount = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
  const paid = Number(
    invoice?.amount_tendered ?? invoice?.amount_received ?? invoice?.net_amount ?? 0,
  );
  const net = Number(invoice?.net_amount || 0);
  const change = Math.max(0, paid - net);
  const paymentMode = String(invoice?.payment_mode || "cash").toUpperCase();

  useEffect(() => {
    if (!show) {
      setShowPrinterPicker(false);
      setBusy("");
    }
  }, [show]);

  const handlePreviewPdf = async () => {
    if (!invoice) return;
    setBusy("pdf");
    try {
      await openInvoicePreview(invoice, template);
    } catch (err) {
      toast.error(err?.message || "Failed to open PDF");
    } finally {
      setBusy("");
    }
  };

  const handlePrintInvoice = async () => {
    if (!invoice) return;
    setBusy("print");
    try {
      // Prefer browser print of the receipt preview for immediate feedback
      const node = printRef.current;
      if (node) {
        const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
        if (win) {
          win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoice_no || ""}</title>
            <style>
              body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin: 16px; color: #111; }
              .receipt { max-width: 340px; margin: 0 auto; }
              .c { text-align: center; }
              .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
              table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
              th, td { padding: 3px 0; text-align: left; }
              th:last-child, td:last-child { text-align: right; }
              .dup { text-align: center; font-weight: 700; letter-spacing: 0.08em; margin: 8px 0; }
              .hr { border-top: 1px dashed #999; margin: 8px 0; }
              img.logo { max-height: 56px; margin: 0 auto 6px; display: block; }
            </style></head><body>${node.innerHTML}</body></html>`);
          win.document.close();
          win.focus();
          win.print();
        } else {
          // Popup blocked — fall back to PDF tab
          await openInvoicePreview(invoice, template);
        }
      } else {
        await openInvoicePreview(invoice, template);
      }
    } catch (err) {
      toast.error(err?.message || "Print failed");
    } finally {
      setBusy("");
    }
  };

  const handleOpenPrinterPicker = async () => {
    setBusy("printers");
    try {
      const list = await fetchPrinters();
      setPrinters(list);
      const preferred = String(design.connectedPrinter || "").trim();
      const preferredExists = preferred && list.some((p) => p?.name === preferred);
      setSelectedPrinter(
        preferredExists ? preferred : list[0]?.name || preferred || "",
      );
      setShowPrinterPicker(true);
      if (!list.length) {
        toast.info("No printers found. You can still Preview PDF or Print Invoice.");
      }
    } catch (err) {
      toast.error(err?.message || "Could not list printers");
      // Still allow PDF print path
      try {
        const url = await fetchInvoicePdfBlobUrl(invoice, template);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy("");
    }
  };

  const handleSendToPrinter = async () => {
    if (!invoice) return;
    setBusy("send");
    try {
      const result = await printInvoiceToDevice(
        invoice,
        template,
        selectedPrinter || undefined,
      );
      toast.success(result?.message || "Sent to printer");
      setShowPrinterPicker(false);
    } catch (err) {
      toast.error(err?.message || "Failed to send to printer");
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal
      show={Boolean(show && sale)}
      onHide={onClose}
      centered
      size="md"
      backdrop="static"
      dialogClassName="sale-invoice-modal"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title>
          Invoice {invoice?.invoice_no || sale?.invoice_no || ""}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="sale-invoice-receipt" ref={printRef}>
          <div className="receipt">
            {logoSrc ? <img src={logoSrc} alt="" className="logo" /> : null}
            <div className="c company">{companyName}</div>
            {tagline ? <div className="c muted tagline">{tagline}</div> : null}
            {phone ? <div className="c muted">{phone}</div> : null}
            {address ? <div className="c muted address">{address}</div> : null}
            {email ? <div className="c muted">{email}</div> : null}

            <div className="hr" />

            <div className="row">
              <span>Date</span>
              <span>{date}</span>
            </div>
            <div className="row">
              <span>Time</span>
              <span>{time}</span>
            </div>
            <div className="row">
              <span>Cashier</span>
              <span>{invoice?.cashier_name || "—"}</span>
            </div>
            <div className="row">
              <span>Customer</span>
              <span>{invoice?.customer_name || "Walk-in"}</span>
            </div>
            <div className="row">
              <span>Invoice</span>
              <span>{invoice?.invoice_no || "—"}</span>
            </div>
            {invoice?.reference_no ? (
              <div className="row">
                <span>Ref</span>
                <span>{invoice.reference_no}</span>
              </div>
            ) : null}

            <div className="dup">DUPLICATE</div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Rate</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${it.product_name}-${idx}`}>
                    <td>{it.product_name || it.name}</td>
                    <td>{Number(it.unit_price || it.price || 0).toFixed(1)}</td>
                    <td>{it.quantity}</td>
                    <td>{Number(it.line_total || it.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="hr" />

            <div className="row">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <div className="row">
              <span>Sub Total</span>
              <span>{money(invoice?.total_amount)}</span>
            </div>
            {Number(invoice?.discount_amount || 0) > 0 ? (
              <div className="row">
                <span>Discount</span>
                <span>{money(invoice.discount_amount)}</span>
              </div>
            ) : null}
            {Number(invoice?.tax_amount || 0) > 0 ? (
              <div className="row">
                <span>Tax</span>
                <span>{money(invoice.tax_amount)}</span>
              </div>
            ) : null}
            <div className="row grand">
              <span>Grand Total</span>
              <span>{money(net)}</span>
            </div>
            <div className="row">
              <span>Payment {paymentMode}</span>
              <span>{money(paid)}</span>
            </div>
            <div className="row">
              <span>Change</span>
              <span>{money(change)}</span>
            </div>

            {invoice?.notes ? (
              <>
                <div className="hr" />
                <div className="c muted note">{invoice.notes}</div>
              </>
            ) : null}

            <div className="hr" />
            <div className="c muted footer">{footerText}</div>
          </div>
        </div>

        {showPrinterPicker ? (
          <div className="sale-invoice-printer-box mt-3">
            <label className="modern-form-label">Select printer</label>
            <select
              className="form-select form-select-sm"
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
            >
              {!printers.length ? <option value="">No printers found</option> : null}
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                  {p.status ? ` (${p.status})` : ""}
                </option>
              ))}
            </select>
            <div className="d-flex gap-2 mt-2">
              <Button
                size="sm"
                className="modern-form-submit"
                disabled={busy === "send" || !selectedPrinter}
                onClick={handleSendToPrinter}
              >
                {busy === "send" ? "Sending..." : "Send to printer"}
              </Button>
              <Button
                size="sm"
                variant="light"
                className="modern-form-cancel"
                onClick={() => setShowPrinterPicker(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer className="sale-invoice-actions border-0 pt-0">
        <Button
          className="sale-invoice-btn is-primary"
          disabled={Boolean(busy)}
          onClick={handlePrintInvoice}
        >
          <Printer size={15} />
          {busy === "print" ? "Printing..." : "Print Invoice"}
        </Button>
        <Button
          variant="light"
          className="sale-invoice-btn"
          disabled={Boolean(busy)}
          onClick={handlePreviewPdf}
        >
          <FileText size={15} />
          {busy === "pdf" ? "Opening..." : "Preview PDF"}
        </Button>
        <Button
          variant="light"
          className="sale-invoice-btn"
          disabled={Boolean(busy)}
          onClick={handleOpenPrinterPicker}
        >
          <Printer size={15} />
          {busy === "printers" ? "Loading..." : "Printer"}
        </Button>
        <Button variant="light" className="sale-invoice-btn" onClick={onClose}>
          <CloseIcon size={15} />
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

SaleInvoiceModal.propTypes = {
  show: PropTypes.bool,
  sale: PropTypes.object,
  template: PropTypes.string,
  onClose: PropTypes.func,
};

export default SaleInvoiceModal;
