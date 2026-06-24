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
  return Math.max(0, orderItemsTotal(po.items) - returnsTotal(po.returns));
}

function orderAmountPaid(po) {
  return Math.max(0, Number(po?.amount_paid || 0));
}

function orderRemaining(po) {
  return Math.max(0, netOrderTotal(po) - orderAmountPaid(po));
}

function enrichPurchaseOrder(po) {
  const plain = po?.toObject ? po.toObject() : { ...po };
  const order_total = orderItemsTotal(plain.items);
  const returned_total = returnsTotal(plain.returns);
  const net_total = plain.status === 'cancelled' ? 0 : Math.max(0, order_total - returned_total);
  const amount_paid = orderAmountPaid(plain);
  const amount_remaining = Math.max(0, net_total - amount_paid);
  return {
    ...plain,
    order_total,
    returned_total,
    net_total,
    amount_paid,
    amount_remaining,
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
  returnedQtyForProduct,
  orderedQtyForProduct,
  purchaseOrderDatePrefix,
  generatePurchaseOrderNumber,
};
