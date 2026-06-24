const Sale = require('../models/Sale');
const { documentDatePrefix, nextDocumentNumber } = require('./documentNumberHelpers');

/** Sale totals for customer ledger (mirrors purchase order helpers). */

/** Next bill / invoice number: yyMMdd-001, yyMMdd-002, … per admin and calendar day. */
async function generateSaleInvoiceNo(adminId, saleDate = new Date()) {
  return nextDocumentNumber(adminId, saleDate, Sale, 'invoice_no');
}

function saleInvoiceDatePrefix(saleDate = new Date()) {
  return documentDatePrefix(saleDate);
}

/**
 * Max quantity that can still be returned for one product on a sale.
 * After partial returns, sale line qty may already be reduced to remaining only.
 */
function maxReturnableQty(lineQty, alreadyReturned) {
  const line = Number(lineQty || 0);
  const returned = Number(alreadyReturned || 0);
  if (returned <= 0) return line;
  if (returned >= line) return line;
  return Math.max(0, line - returned);
}

/**
 * Rebuild sale line items after returns: drop fully returned lines, reduce partial qty.
 * @param {object} sale Mongoose doc or plain object with items[]
 * @param {Map<string, number>} returnMap productId -> total returned qty
 */
function applyReturnsToSaleLineItems(sale, returnMap) {
  if (!sale?.items?.length || !returnMap?.size) return;

  const originalSubtotal = sale.items.reduce(
    (sum, it) => sum + Number(it.line_total ?? Number(it.quantity || 0) * Number(it.unit_price || 0)),
    0,
  );

  const updatedItems = [];

  for (const saleItem of sale.items) {
    const pid = String(saleItem.product_id?._id || saleItem.product_id);
    const returnedQty = Number(returnMap.get(pid) || 0);
    const soldQty = Number(saleItem.quantity || 0);
    const remaining = soldQty - returnedQty;
    if (remaining <= 0) continue;

    const unitPrice = Number(saleItem.unit_price || 0);
    const ratio = soldQty > 0 ? remaining / soldQty : 1;
    const lineDiscount = Number(saleItem.discount || 0) * ratio;
    const lineTax = Number(saleItem.tax || 0) * ratio;
    const lineTotal = Math.max(0, remaining * unitPrice - lineDiscount + lineTax);

    updatedItems.push({
      product_id: saleItem.product_id,
      product_name: saleItem.product_name,
      quantity: remaining,
      unit_price: unitPrice,
      discount: lineDiscount,
      tax: lineTax,
      line_total: lineTotal,
    });
  }

  sale.items = updatedItems;

  const newSubtotal = updatedItems.reduce((sum, it) => sum + Number(it.line_total || 0), 0);
  sale.total_amount = newSubtotal;

  if (originalSubtotal > 0 && sale.tax_amount != null) {
    sale.tax_amount = Number(
      ((Number(sale.tax_amount) * newSubtotal) / originalSubtotal).toFixed(2),
    );
  } else if (!updatedItems.length) {
    sale.tax_amount = 0;
  }
}

function saleNetTotal(sale) {
  return Math.max(0, Number(sale?.net_amount || 0));
}

function saleAmountReceived(sale) {
  return Math.max(0, Number(sale?.amount_received ?? sale?.amount_paid ?? 0));
}

function enrichSale(sale) {
  const plain = sale && typeof sale.toObject === 'function' ? sale.toObject() : { ...sale };
  const netTotal = saleNetTotal(plain);
  const amountReceived = saleAmountReceived(plain);
  const returnedTotal = Number(plain.total_return_amount || 0);
  const amountRemaining = Math.max(0, netTotal - amountReceived);

  return {
    ...plain,
    net_total: netTotal,
    returned_total: returnedTotal,
    amount_received: amountReceived,
    amount_remaining: amountRemaining,
  };
}

module.exports = {
  saleNetTotal,
  saleAmountReceived,
  enrichSale,
  applyReturnsToSaleLineItems,
  maxReturnableQty,
  generateSaleInvoiceNo,
  saleInvoiceDatePrefix,
};
