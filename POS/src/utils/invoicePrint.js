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

/**
 * Open branded PDF preview in a new tab (uses tenant settings on the server).
 */
export async function openInvoicePreview(invoice, template) {
  if (!invoice) return;
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
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function resolveUploadUrl(path, apiBase) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const origin = String(apiBase || "").replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
