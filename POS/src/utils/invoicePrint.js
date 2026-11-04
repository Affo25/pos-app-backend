import Cookies from "js-cookie";
import { apiUrl } from "../redux/utils/apiHelpers";

/**
 * Map a Sale document to the print/preview invoice payload.
 */
export function saleToInvoicePayload(sale) {
  if (!sale) return null;
  return {
    document_type: "sale",
    document_title: "SALE INVOICE",
    invoice_no: sale.invoice_no || "",
    sale_date: sale.sale_date || sale.createdAt || new Date().toISOString(),
    customer_name: sale.customer_name || "Walk-in Customer",
    payment_mode: sale.payment_method || sale.payment_mode || "cash",
    amount_received: sale.amount_received,
    amount_tendered: sale.amount_received,
    total_amount: sale.total_amount,
    discount_amount: sale.discount_amount,
    tax_amount: sale.tax_amount,
    net_amount: sale.net_amount,
    notes: sale.notes || "",
    reference_no: sale.reference_no || "",
    cashier_name: sale.cashier_name || sale.created_by_name || "",
    items: (sale.items || []).map((it) => ({
      product_name: it.product_name || it.name || "Item",
      name: it.product_name || it.name || "Item",
      quantity: it.quantity,
      unit_price: it.unit_price,
      price: it.unit_price,
      discount: it.discount,
      tax: it.tax,
      line_total: it.line_total,
      amount: it.line_total,
    })),
  };
}

/**
 * Map a Purchase Order to the print/preview invoice payload.
 */
export function purchaseOrderToInvoicePayload(po) {
  if (!po) return null;
  const items = (po.items || []).map((it) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.price ?? it.unit_price ?? 0);
    return {
      product_name: it.product_name || it.name || "Item",
      name: it.product_name || it.name || "Item",
      quantity: qty,
      unit_price: price,
      price,
      line_total: it.line_total != null ? it.line_total : qty * price,
      amount: it.line_total != null ? it.line_total : qty * price,
    };
  });
  const total =
    po.total_amount != null
      ? Number(po.total_amount)
      : po.order_total != null
        ? Number(po.order_total)
        : items.reduce((s, i) => s + Number(i.line_total || 0), 0);
  const net = po.net_total != null ? Number(po.net_total) : total;
  return {
    document_type: "purchase_order",
    document_title: "PURCHASE ORDER",
    invoice_no: po.order_number || po.invoice_no || "",
    sale_date: po.order_date || po.createdAt || new Date().toISOString(),
    customer_name: po.supplier_name || po.supplier_id?.name || "Vendor",
    total_amount: total,
    discount_amount: po.discount_amount || 0,
    tax_amount: po.tax_amount || 0,
    net_amount: net,
    items,
  };
}

async function postInvoicePdf(invoice, template) {
  if (!invoice) throw new Error("Invoice data is required");
  const token = Cookies.get("token");
  const response = await fetch(apiUrl("/print/preview"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice, template }),
  });
  if (!response.ok) {
    let message = "Failed to generate invoice PDF";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return response.blob();
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

/** Create an object URL for the branded invoice PDF (caller should revoke). */
export async function fetchInvoicePdfBlobUrl(invoice, template) {
  const blob = await postInvoicePdf(invoice, template);
  return URL.createObjectURL(blob);
}

/** Download branded invoice/PO PDF to the device. */
export async function downloadInvoicePdf(invoice, template, filename) {
  const blob = await postInvoicePdf(invoice, template);
  const name =
    filename ||
    `${invoice?.document_type || "invoice"}-${invoice?.invoice_no || Date.now()}.pdf`;
  triggerBlobDownload(blob, name);
  return name;
}

/**
 * Open branded PDF preview in a new tab; falls back to download if popup blocked.
 */
export async function openInvoicePreview(invoice, template) {
  const blob = await postInvoicePdf(invoice, template);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    triggerBlobDownload(blob, `${invoice?.invoice_no || "invoice"}.pdf`);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

/**
 * Download a list/register PDF via POST /print/sales-register/preview.
 * Records shape: { invoice_no, customer_name, date_label, total_amount, net_amount, status }
 */
export async function downloadRegisterPdf({
  records,
  subtitle = "",
  filename = "register.pdf",
  generated_at,
} = {}) {
  if (!Array.isArray(records)) {
    throw new Error("records array is required");
  }
  const token = Cookies.get("token");
  const response = await fetch(apiUrl("/print/sales-register/preview"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records,
      subtitle,
      generated_at: generated_at || new Date().toLocaleString("en-GB"),
    }),
  });
  if (!response.ok) {
    let message = "Failed to generate PDF";
    try {
      const err = await response.json();
      message = err?.error || err?.detail || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  triggerBlobDownload(blob, filename);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return filename;
}

/** Send invoice to a Windows printer via backend (optional printer name). */
export async function printInvoiceToDevice(invoice, template, printer) {
  if (!invoice) throw new Error("Invoice data is required");
  const token = Cookies.get("token");
  const response = await fetch(apiUrl("/print/invoice"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice, template, printer }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || "Print failed");
  }
  return payload;
}

export async function fetchPrinters() {
  const token = Cookies.get("token");
  const response = await fetch(apiUrl("/print/printers"), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || "Failed to list printers");
  }
  return Array.isArray(payload?.printers) ? payload.printers : [];
}

export function resolveUploadUrl(path, apiBase) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const origin = String(apiBase || "").replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
