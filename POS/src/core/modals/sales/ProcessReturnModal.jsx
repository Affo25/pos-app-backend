import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";
import { Table } from "antd";
import { toast } from "react-toastify";
import * as returnService from "../../../redux/returns/returnService";

const money = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

/**
 * Multi-line Process Return modal matching Sales Management reference UI.
 */
const ProcessReturnModal = ({ show, sale, onClose, onSuccess }) => {
  const [lines, setLines] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show || !sale) {
      setLines([]);
      setReason("");
      return;
    }
    const returnedMap = sale.returned_qty_by_product || {};
    setLines(
      (sale.items || []).map((it) => {
        const productId = String(it.product_id?._id || it.product_id || "");
        const sold = Number(it.quantity || 0);
        const already = Number(returnedMap[productId] || returnedMap[it.product_id] || 0);
        const canReturn = Math.max(0, sold - already);
        return {
          key: productId,
          product_id: productId,
          product_name: it.product_name || it.name || "Item",
          sold,
          already,
          canReturn,
          selected: canReturn > 0,
          returnQty: canReturn > 0 ? canReturn : 0,
          unit_price: Number(it.unit_price || 0),
        };
      }),
    );
    setReason("");
  }, [show, sale]);

  const totalReturn = useMemo(
    () =>
      lines
        .filter((l) => l.selected && l.returnQty > 0)
        .reduce((s, l) => s + Number(l.returnQty) * Number(l.unit_price), 0),
    [lines],
  );

  const toggleLine = (key, checked) => {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              selected: checked && l.canReturn > 0,
              returnQty: checked && l.canReturn > 0 ? l.returnQty || Math.min(1, l.canReturn) : 0,
            }
          : l,
      ),
    );
  };

  const setQty = (key, value) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const qty = Math.max(0, Math.min(l.canReturn, Number(value) || 0));
        return { ...l, returnQty: qty, selected: qty > 0 };
      }),
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!sale?._id) return;
    const items = lines
      .filter((l) => l.selected && l.returnQty > 0 && l.canReturn > 0)
      .map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.returnQty),
        unit_price: Number(l.unit_price),
        reason: reason.trim() || "Customer return",
      }));
    if (!items.length) {
      toast.error("Select at least one item to return");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide reason for return");
      return;
    }
    setSaving(true);
    try {
      const result = await returnService.createReturn({
        sale_id: sale._id,
        reason: reason.trim(),
        items,
      });
      toast.success("Return processed successfully");
      onSuccess?.(result);
      onClose();
    } catch (err) {
      const msg =
        err?.message ||
        (Array.isArray(err?.errors) ? err.errors.join(", ") : null) ||
        "Failed to process return";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Select",
      width: 70,
      render: (_, row) => (
        <input
          type="checkbox"
          checked={Boolean(row.selected)}
          disabled={row.canReturn <= 0}
          onChange={(e) => toggleLine(row.key, e.target.checked)}
        />
      ),
    },
    { title: "Product", dataIndex: "product_name" },
    { title: "Sold", dataIndex: "sold", width: 70 },
    { title: "Already returned", dataIndex: "already", width: 120 },
    { title: "Can return", dataIndex: "canReturn", width: 100 },
    {
      title: "Return qty",
      width: 110,
      render: (_, row) => (
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          max={row.canReturn}
          disabled={row.canReturn <= 0}
          value={row.returnQty}
          onChange={(e) => setQty(row.key, e.target.value)}
        />
      ),
    },
    {
      title: "Unit",
      width: 100,
      render: (_, row) => money(row.unit_price),
    },
    {
      title: "Return amount",
      width: 120,
      render: (_, row) => money(row.selected ? row.returnQty * row.unit_price : 0),
    },
  ];

  return (
    <Modal show={show} onHide={onClose} centered size="xl" dialogClassName="modern-form-modal sale-return-modal">
      <Modal.Header closeButton>
        <Modal.Title>Process Return</Modal.Title>
      </Modal.Header>
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <div className="sale-return-meta">
            <div>
              <span>Invoice No</span>
              <strong>{sale?.invoice_no || "-"}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{sale?.customer_name || "Walk-In Customer"}</strong>
            </div>
            <div>
              <span>Current net (invoice)</span>
              <strong>{money(sale?.net_amount)}</strong>
            </div>
          </div>

          <div className="modern-crud-table mt-3">
            <Table
              columns={columns}
              dataSource={lines}
              pagination={false}
              size="small"
              rowKey="key"
              locale={{ emptyText: "No line items" }}
              scroll={{ x: 900 }}
            />
          </div>

          <div className="mt-3">
            <label className="modern-form-label">
              Return Reason <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide reason for return."
              required
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="sale-return-footer">
          <div className="sale-return-total">
            Total return amount: <strong>{money(totalReturn)}</strong>
          </div>
          <div className="sale-return-actions">
            <Button variant="light" className="modern-form-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit" disabled={saving}>
              {saving ? "Processing..." : "Process Return"}
            </Button>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

ProcessReturnModal.propTypes = {
  show: PropTypes.bool,
  sale: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default ProcessReturnModal;
