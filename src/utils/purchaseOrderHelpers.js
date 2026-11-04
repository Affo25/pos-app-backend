const PurchaseOrder = require('../models/PurchaseOrder');
const { documentDatePrefix, nextDocumentNumber } = require('./documentNumberHelpers');

function lineAmount(quantity, price) {
  return Number(quantity || 0) * Number(price || 0);
}

function orderItemsTotal(items = []) {
  return items.reduce((sum, it) => sum + lineAmount(it.quantity, it.price), 0);
}

function returnsTotal(returns = []) {
  return returns.reduce((sum, r) => sum + lineAmount(r.quantity, r.price), 0);
}

function netOrderTotal(po) {
  if (!po || po.status === 'cancelled') return 0;
  // Line items are reduced when returns are recorded; returns[] is audit history.
  return Math.max(0, orderItemsTotal(po.items));
}

/**
 * Reduce PO line qty after a return (drop line when fully returned).
 * Mutates po.items (mongoose doc or plain object).
 */
function applyReturnToPurchaseOrderItems(po, productId, qty) {
  if (!po) return;
  const pid = String(productId);
  const take = Number(qty || 0);
  if (take <= 0) return;

  const next = [];
  for (const it of po.items || []) {
    const id = String(it.product_id?._id || it.product_id);
    if (id !== pid) {
      next.push(it);
      continue;
    }
    const remaining = Number(it.quantity || 0) - take;
    if (remaining > 0) {
      next.push({
        product_id: it.product_id,
        quantity: remaining,
        price: Number(it.price || 0),
      });
    }
  }
  po.items = next;
  if (typeof po.markModified === 'function') {
    po.markModified('items');
  }
}

function orderAmountPaid(po) {
  return Math.max(0, Number(po?.amount_paid || 0));
}

function orderRemaining(po) {
  return Math.max(0, netOrderTotal(po) - orderAmountPaid(po));
}

/**
 * Line items with ordered / returned / remaining qty for UI (list, view, edit, return).
 * After returns, stored quantity is remaining; ordered = remaining + returned.
 */
function enrichPurchaseOrderItems(po) {
  const plain = po?.toObject ? po.toObject() : po || {};
  return (plain.items || []).map((it) => {
    const pid = it.product_id?._id || it.product_id;
    const remaining_quantity = Number(it.quantity || 0);
    const returned_quantity = returnedQtyForProduct(plain, pid);
    const ordered_quantity = remaining_quantity + returned_quantity;
    return {
      ...it,
      product_id: it.product_id,
      ordered_quantity,
      returned_quantity,
      remaining_quantity,
      quantity: remaining_quantity,
      line_total: remaining_quantity * Number(it.price || 0),
    };
  });
}

function enrichPurchaseOrder(po) {
  const plain = po?.toObject ? po.toObject() : { ...po };
  const items = enrichPurchaseOrderItems(plain);
  const returned_total = returnsTotal(plain.returns);
  const net_total = plain.status === 'cancelled' ? 0 : orderItemsTotal(plain.items);
  const order_total = net_total + returned_total;
  const amount_paid = orderAmountPaid(plain);
  const amount_remaining = Math.max(0, net_total - amount_paid);
  const items_count = items.length;
  const items_qty = items.reduce((s, it) => s + Number(it.remaining_quantity || 0), 0);
  const items_qty_ordered = items.reduce((s, it) => s + Number(it.ordered_quantity || 0), 0)
    + (plain.returns || [])
      .filter((r) => {
        const pid = String(r.product_id?._id || r.product_id);
        return !items.some((it) => String(it.product_id?._id || it.product_id) === pid);
      })
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  const items_qty_returned = (plain.returns || []).reduce((s, r) => s + Number(r.quantity || 0), 0);
  return {
    ...plain,
    items,
    order_total,
    returned_total,
    net_total,
    amount_paid,
    amount_remaining,
    items_count,
    items_qty,
    items_qty_ordered,
    items_qty_returned,
  };
}

function returnedQtyForProduct(po, productId) {
  const pid = String(productId);
  return (po.returns || [])
    .filter((r) => String(r.product_id?._id || r.product_id) === pid)
    .reduce((s, r) => s + Number(r.quantity || 0), 0);
}

function orderedQtyForProduct(po, productId) {
  const pid = String(productId);
  const line = (po.items || []).find((it) => String(it.product_id?._id || it.product_id) === pid);
  return line ? Number(line.quantity || 0) : 0;
}

/** Date prefix for PO numbers: yyMMdd (e.g. 260519 for 19 May 2026). */
function purchaseOrderDatePrefix(orderDate = new Date()) {
  return documentDatePrefix(orderDate);
}

/** Next purchase order number: yyMMdd-001, yyMMdd-002, … per admin and calendar day. */
async function generatePurchaseOrderNumber(adminId, orderDate = new Date()) {
  return nextDocumentNumber(adminId, orderDate, PurchaseOrder, 'order_number');
}

module.exports = {
  lineAmount,
  orderItemsTotal,
  returnsTotal,
  netOrderTotal,
  orderAmountPaid,
  orderRemaining,
  enrichPurchaseOrder,
  enrichPurchaseOrderItems,
  applyReturnToPurchaseOrderItems,
  returnedQtyForProduct,
  orderedQtyForProduct,
  purchaseOrderDatePrefix,
  generatePurchaseOrderNumber,
};
