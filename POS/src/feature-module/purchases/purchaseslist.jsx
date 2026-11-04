import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import {
  Edit,
  Eye,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  ShoppingBag,
  Trash2,
} from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { fetchAllSuppliersAction } from "../../redux/suppliers/supplierSlice";
import { fetchAllProductsAction } from "../../redux/products/productSlice";
import {
  deletePurchaseOrderAction,
  fetchAllPurchaseOrdersAction,
} from "../../redux/purchaseOrders/purchaseOrderSlice";
import * as purchaseOrderService from "../../redux/purchaseOrders/purchaseOrderService";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import { IdBadge, MoneyBadge, QtyBadge } from "../../core/components/CrudValueBadge";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import {
  downloadInvoicePdf,
  downloadRegisterPdf,
  purchaseOrderToInvoicePayload,
} from "../../utils/invoicePrint";
import { downloadExcelExport } from "../../redux/utils/excelTransfer";

const money = (v) => `PKR ${Number(v || 0).toFixed(2)}`;

const emptyForm = () => ({
  supplier: null,
  order_number: "",
  order_date: dayjs().format("YYYY-MM-DD"),
  status: "pending",
  amount_paid: "0",
  items: [],
  lineProduct: null,
  lineQty: "1",
  linePrice: "",
});

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const PurchasesList = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { purchaseOrders, loading } = useSelector((state) => state.purchaseOrders);
  const { suppliers } = useSelector((state) => state.suppliers);
  const { products } = useSelector((state) => state.products);
  const settings = useSelector((state) => state.settings?.settings);

  const [mainTab, setMainTab] = useState("orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState("all");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [viewPo, setViewPo] = useState(null);
  const [busyExport, setBusyExport] = useState(false);
  const [returnPo, setReturnPo] = useState(null);
  const [returnProduct, setReturnProduct] = useState(null);
  const [returnQty, setReturnQty] = useState("1");
  const [returnPrice, setReturnPrice] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnSaving, setReturnSaving] = useState(false);

  const load = () => {
    dispatch(fetchAllPurchaseOrdersAction());
    dispatch(fetchAllSuppliersAction());
    dispatch(fetchAllProductsAction());
  };

  useEffect(() => {
    load();
  }, [dispatch]);

  const rows = Array.isArray(purchaseOrders) ? purchaseOrders : [];

  const supplierOptions = useMemo(
    () => (suppliers || []).map((s) => ({ value: s._id, label: s.name, name: s.name })),
    [suppliers],
  );
  const productOptions = useMemo(
    () =>
      (products || []).map((p) => ({
        value: p._id,
        label: p.name,
        price: p.unit_price,
        name: p.name,
      })),
    [products],
  );

  const refreshOrderNumber = useCallback(async (orderDate) => {
    try {
      const result = await purchaseOrderService.fetchNextOrderNumber(
        orderDate ? new Date(orderDate).toISOString() : undefined,
      );
      setForm((prev) => ({ ...prev, order_number: result?.order_number || prev.order_number }));
    } catch {
      /* keep manual */
    }
  }, []);

  const openCreate = async () => {
    const next = emptyForm();
    setEditId(null);
    setForm(next);
    setShowModal(true);
    await refreshOrderNumber(next.order_date);
  };

  const openEdit = (po) => {
    setEditId(po._id);
    setForm({
      supplier: po.supplier_id
        ? {
            value: po.supplier_id._id || po.supplier_id,
            label: po.supplier_name || po.supplier_id?.name || "Supplier",
            name: po.supplier_name || po.supplier_id?.name || "",
          }
        : null,
      order_number: po.order_number || "",
      order_date: po.order_date ? dayjs(po.order_date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      status: po.status || "pending",
      amount_paid: String(po.amount_paid ?? 0),
      items: (po.items || [])
        .filter((it) => Number(it.remaining_quantity ?? it.quantity ?? 0) > 0)
        .map((it) => ({
          product_id: it.product_id?._id || it.product_id,
          product_name: it.product_id?.name || it.product_name || "Item",
          quantity: Number(it.remaining_quantity ?? it.quantity ?? 1),
          ordered_quantity: Number(it.ordered_quantity ?? it.quantity ?? 0),
          returned_quantity: Number(it.returned_quantity || 0),
          price: Number(it.price || 0),
        })),
      lineProduct: null,
      lineQty: "1",
      linePrice: "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const formTotals = useMemo(() => {
    const net = form.items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.price || 0),
      0,
    );
    const returned = form.items.reduce(
      (s, it) => s + Number(it.returned_quantity || 0) * Number(it.price || 0),
      0,
    );
    const order_total = net + returned;
    const paid = Math.max(0, Number(form.amount_paid || 0));
    const remaining = Math.max(0, net - paid);
    return { order_total, returned, net, paid, remaining };
  }, [form.items, form.amount_paid]);

  const addLine = () => {
    if (!form.lineProduct?.value) {
      toast.error("Select a product");
      return;
    }
    const qty = Math.max(1, Number(form.lineQty) || 1);
    const price = Number(form.linePrice !== "" ? form.linePrice : form.lineProduct.price || 0);
    setForm((prev) => {
      const existing = prev.items.find((i) => String(i.product_id) === String(prev.lineProduct.value));
      let items;
      if (existing) {
        items = prev.items.map((i) =>
          String(i.product_id) === String(prev.lineProduct.value)
            ? { ...i, quantity: Number(i.quantity) + qty, price }
            : i,
        );
      } else {
        items = [
          ...prev.items,
          {
            product_id: prev.lineProduct.value,
            product_name: prev.lineProduct.name || prev.lineProduct.label,
            quantity: qty,
            price,
          },
        ];
      }
      return {
        ...prev,
        items,
        lineProduct: null,
        lineQty: "1",
        linePrice: "",
      };
    });
  };

  const removeLine = (productId) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => String(i.product_id) !== String(productId)),
    }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.supplier?.value) {
      toast.error("Select supplier");
      return;
    }
    if (!form.items.length) {
      toast.error("Add at least one line item");
      return;
    }
    if (formTotals.paid > formTotals.net) {
      toast.error("Amount paid cannot exceed net total");
      return;
    }
    const payload = {
      supplier_id: form.supplier.value,
      supplier_name: form.supplier.name || form.supplier.label,
      order_number: form.order_number.trim() || undefined,
      order_date: new Date(form.order_date).toISOString(),
      status: form.status,
      amount_paid: formTotals.paid,
      items: form.items.map(({ product_id, quantity, price }) => ({
        product_id,
        quantity,
        price,
      })),
    };
    setSaving(true);
    try {
      if (editId) {
        await purchaseOrderService.updatePurchaseOrder(editId, payload);
        toast.success("Purchase order updated");
      } else {
        await purchaseOrderService.createPurchaseOrder(payload);
        toast.success("Purchase order created");
      }
      closeModal();
      dispatch(fetchAllPurchaseOrdersAction());
    } catch (err) {
      toast.error(err?.message || "Failed to save purchase order");
    } finally {
      setSaving(false);
    }
  };

  const returnRows = useMemo(() => {
    const list = [];
    rows.forEach((po) => {
      (po.returns || []).forEach((r, idx) => {
        list.push({
          key: `${po._id}-${r._id || idx}`,
          order: po.order_number || "-",
          supplier: po.supplier_name || po.supplier_id?.name || "-",
          product: r.product_id?.name || r.product_name || "-",
          quantity: Number(r.quantity || 0),
          price: Number(r.price || 0),
          total: Number(r.quantity || 0) * Number(r.price || 0),
          reason: r.reason || "-",
          date: r.return_date ? dayjs(r.return_date).format("M/D/YYYY") : "-",
        });
      });
    });
    return list;
  }, [rows]);

  const inDateRange = (dateValue) => {
    if (dateMode === "all") return true;
    if (!dateValue) return false;
    const d = dayjs(dateValue);
    if (!d.isValid()) return false;
    if (dateMode === "today") return d.isSame(dayjs(), "day");
    if (dateMode === "range") {
      if (rangeFrom && d.isBefore(dayjs(rangeFrom), "day")) return false;
      if (rangeTo && d.isAfter(dayjs(rangeTo), "day")) return false;
      return true;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((po) => {
      const supplierName = po.supplier_name || po.supplier_id?.name || "";
      const hay = `${po.order_number || ""} ${supplierName} ${po.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (statusFilter !== "all" && String(po.status || "").toLowerCase() !== statusFilter) {
        return false;
      }
      if (!inDateRange(po.order_date || po.createdAt)) return false;
      return true;
    });
  }, [rows, search, statusFilter, dateMode, rangeFrom, rangeTo]);

  const returnProductOptions = useMemo(() => {
    if (!returnPo) return [];
    return (returnPo.items || [])
      .map((it) => {
        const productId = String(it.product_id?._id || it.product_id || "");
        // After returns, quantity / remaining_quantity is what can still be returned
        const maxQty = Math.max(0, Number(it.remaining_quantity ?? it.quantity ?? 0));
        const ordered = Number(it.ordered_quantity ?? (maxQty + Number(it.returned_quantity || 0)));
        const returned = Number(it.returned_quantity || 0);
        return {
          value: productId,
          label: `${it.product_id?.name || it.product_name || "Item"} (remain ${maxQty}${returned ? ` · returned ${returned}` : ""}${ordered ? ` · ordered ${ordered}` : ""})`,
          price: Number(it.price || 0),
          maxQty,
          disabled: maxQty <= 0,
        };
      })
      .filter((o) => o.value && o.maxQty > 0);
  }, [returnPo]);

  const openReturn = (po) => {
    setReturnPo(po);
    setReturnProduct(null);
    setReturnQty("1");
    setReturnPrice("");
    setReturnReason("");
  };

  const closeReturn = () => {
    setReturnPo(null);
    setReturnProduct(null);
    setReturnQty("1");
    setReturnPrice("");
    setReturnReason("");
  };

  const onRecordReturn = async (e) => {
    e.preventDefault();
    if (!returnPo?._id || !returnProduct?.value) {
      toast.error("Select a product to return");
      return;
    }
    const qty = Math.max(1, Number(returnQty) || 1);
    if (qty > Number(returnProduct.maxQty || 0)) {
      toast.error(`Cannot return more than ${returnProduct.maxQty}`);
      return;
    }
    setReturnSaving(true);
    try {
      const updated = await purchaseOrderService.addPurchaseOrderReturn(returnPo._id, {
        product_id: returnProduct.value,
        quantity: qty,
        price: Number(returnPrice !== "" ? returnPrice : returnProduct.price || 0),
        reason: returnReason.trim(),
      });
      toast.success("Return recorded");
      closeReturn();
      dispatch(fetchAllPurchaseOrdersAction());
      if (viewPo && String(viewPo._id) === String(updated?._id || returnPo._id)) {
        setViewPo(updated);
      }
      if (editId && String(editId) === String(updated?._id || returnPo._id) && updated) {
        openEdit(updated);
      }
      setMainTab("returns");
    } catch (err) {
      toast.error(err?.message || "Failed to record return");
    } finally {
      setReturnSaving(false);
    }
  };

  const stats = useMemo(() => {
    const pending = filteredOrders.filter((p) => String(p.status).toLowerCase() === "pending").length;
    const received = filteredOrders.filter((p) => String(p.status).toLowerCase() === "received").length;
    return { total: filteredOrders.length, pending, received, all: rows.length };
  }, [filteredOrders, rows]);

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete purchase order?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deletePurchaseOrderAction(id));
    });
  };

  const onPrint = async (po) => {
    try {
      await downloadInvoicePdf(
        purchaseOrderToInvoicePayload(po),
        settings?.invoiceDesign?.purchaseOrderTemplate || "modern_po_a4",
        `purchase-order-${po.order_number || po._id || "export"}.pdf`,
      );
      toast.success("Purchase order PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "Failed to generate purchase order PDF");
    }
  };

  const onExportExcel = async () => {
    setBusyExport(true);
    try {
      await downloadExcelExport("/purchaseOrders", "purchase-orders.xlsx");
      toast.success("Excel downloaded");
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setBusyExport(false);
    }
  };

  const onExportPdf = async () => {
    try {
      const records = filteredOrders.map((po) => ({
        invoice_no: po.order_number || "-",
        customer_name: po.supplier_name || po.supplier_id?.name || "-",
        date_label: po.order_date ? dayjs(po.order_date).format("DD MMM YYYY") : "-",
        total_amount: Number(po.order_total ?? po.net_total ?? 0),
        net_amount: Number(po.net_total ?? 0),
        status: `${po.status || "-"} · paid ${Number(po.amount_paid || 0).toFixed(0)}`,
      }));
      await downloadRegisterPdf({
        records,
        subtitle: `${records.length} purchase orders · filtered list`,
        filename: "purchase-orders.pdf",
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "PDF export failed");
    }
  };

  const orderDataSource = useMemo(
    () =>
      filteredOrders.map((po, i) => {
        const lines = Array.isArray(po.items) ? po.items : [];
        const qty =
          po.items_qty != null
            ? Number(po.items_qty)
            : lines.reduce((s, it) => s + Number(it.remaining_quantity ?? it.quantity ?? 0), 0);
        return {
          key: po._id || String(i),
          index: i + 1,
          id: po._id,
          raw: po,
          order: po.order_number || "-",
          date: po.order_date ? dayjs(po.order_date).format("M/D/YYYY") : "-",
          supplier: po.supplier_name || po.supplier_id?.name || "-",
          items: lines.length,
          qty,
          qtyLabel: `${lines.length} line${lines.length === 1 ? "" : "s"} · ${qty} qty`,
          net: Number(po.net_total ?? po.order_total ?? 0),
          paid: Number(po.amount_paid ?? 0),
          remaining: Number(
            po.amount_remaining ?? Math.max(0, Number(po.net_total || 0) - Number(po.amount_paid || 0)),
          ),
          status: po.status || "-",
        };
      }),
    [filteredOrders],
  );

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["received", "completed", "done"].includes(st)) {
      return <span className="modern-crud-badge is-ok">{String(status).toUpperCase()}</span>;
    }
    if (["pending", "draft"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{String(status).toUpperCase()}</span>;
    }
    if (["cancelled", "canceled"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{String(status).toUpperCase()}</span>;
    }
    return status;
  };

  const orderColumns = [
    { title: "#", dataIndex: "index", width: 56, sorter: (a, b) => a.index - b.index },
    {
      title: "Order No",
      dataIndex: "order",
      sorter: (a, b) => String(a.order).localeCompare(String(b.order)),
      render: (v) => <IdBadge value={v} />,
    },
    {
      title: "Order Date",
      dataIndex: "date",
      sorter: (a, b) => String(a.date).localeCompare(String(b.date)),
      render: (v) => <span className="mc-value-badge is-neutral">{v}</span>,
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      sorter: (a, b) => String(a.supplier).localeCompare(String(b.supplier)),
    },
    {
      title: "Items",
      dataIndex: "qty",
      sorter: (a, b) => a.qty - b.qty,
      render: (_, row) => (
        <span className="d-inline-flex align-items-center gap-1 flex-wrap">
          <QtyBadge value={row.qty} tone="dark" />
          <span className="mc-value-badge is-neutral">{row.items} lines</span>
        </span>
      ),
    },
    {
      title: "Net (PKR)",
      dataIndex: "net",
      sorter: (a, b) => a.net - b.net,
      render: (v) => <MoneyBadge value={v} tone="info" prefix="PKR" />,
    },
    {
      title: "Paid",
      dataIndex: "paid",
      sorter: (a, b) => a.paid - b.paid,
      render: (v) => <MoneyBadge value={v} tone="ok" prefix="PKR" />,
    },
    {
      title: "Remaining",
      dataIndex: "remaining",
      sorter: (a, b) => a.remaining - b.remaining,
      render: (v) => <MoneyBadge value={v} tone={Number(v) > 0 ? "warn" : "ok"} prefix="PKR" />,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: statusBadge,
      sorter: (a, b) => String(a.status).localeCompare(String(b.status)),
    },
    {
      title: "Actions",
      width: 180,
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button type="button" className="modern-crud-icon-btn" title="View" onClick={() => setViewPo(row.raw)}>
            <Eye size={15} />
          </button>
          <button type="button" className="modern-crud-icon-btn" title="Print" onClick={() => onPrint(row.raw)}>
            <Printer size={15} />
          </button>
          <button type="button" className="modern-crud-icon-btn" title="Edit" onClick={() => openEdit(row.raw)}>
            <Edit size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn"
            title="Return items"
            onClick={() => openReturn(row.raw)}
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            title="Delete"
            onClick={() => onDelete(row.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const returnColumns = [
    { title: "Order No", dataIndex: "order", render: (v) => <IdBadge value={v} /> },
    { title: "Supplier", dataIndex: "supplier" },
    { title: "Product", dataIndex: "product" },
    { title: "Qty", dataIndex: "quantity", render: (v) => <QtyBadge value={v} tone="dark" /> },
    { title: "Price", dataIndex: "price", render: (v) => <MoneyBadge value={v} tone="muted" prefix="PKR" /> },
    { title: "Total", dataIndex: "total", render: (v) => <MoneyBadge value={v} tone="warn" prefix="PKR" /> },
    { title: "Reason", dataIndex: "reason" },
    { title: "Date", dataIndex: "date", render: (v) => <span className="mc-value-badge is-neutral">{v}</span> },
  ];

  const lineTableData = form.items.map((it, i) => ({
    key: String(it.product_id || i),
    product: it.product_name,
    quantity: it.quantity,
    ordered: it.ordered_quantity,
    returned: it.returned_quantity,
    price: Number(it.price).toFixed(2),
    line: (Number(it.quantity) * Number(it.price)).toFixed(2),
    product_id: it.product_id,
  }));

  const lineColumns = [
    { title: "Product", dataIndex: "product" },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 110,
      render: (v, row) =>
        row.returned > 0 ? (
          <span>
            {v}
            <small className="text-muted d-block">
              ordered {row.ordered} · returned {row.returned}
            </small>
          </span>
        ) : (
          v
        ),
    },
    { title: "Price (PKR)", dataIndex: "price", width: 110 },
    { title: "Line total", dataIndex: "line", width: 110 },
    {
      title: "Action",
      width: 80,
      render: (_, row) => (
        <button
          type="button"
          className="modern-crud-icon-btn is-danger"
          onClick={() => removeLine(row.product_id)}
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <ModernCrudShell
        title="Purchase Orders"
        subtitle={`${stats.all} orders · ${returnRows.length} returns`}
        icon={<ShoppingBag size={18} />}
        addLabel="New order"
        onAdd={openCreate}
        headerExtra={
          <>
            <button type="button" className="btn modern-crud-io-btn" onClick={onExportExcel} disabled={busyExport}>
              Excel
            </button>
            <button type="button" className="btn modern-crud-io-btn" onClick={onExportPdf}>
              <FileText size={15} />
              PDF
            </button>
          </>
        }
      >
        <div className="stock-stat-grid po-stat-grid">
          <div className="stock-stat-card">
            <div className="stock-stat-label">Total orders</div>
            <div className="stock-stat-value">{stats.total}</div>
            <div className="stock-stat-hint">Matching filters</div>
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Pending</div>
            <div className="stock-stat-value po-stat-pending">{stats.pending}</div>
            <div className="stock-stat-hint">Awaiting receipt</div>
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Received</div>
            <div className="stock-stat-value po-stat-received">{stats.received}</div>
            <div className="stock-stat-hint">Completed lines</div>
          </div>
        </div>

        <div className="modern-crud-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`modern-crud-tab${mainTab === "orders" ? " active" : ""}`}
            onClick={() => setMainTab("orders")}
          >
            Orders
            <span className="modern-crud-tab-count">{stats.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            className={`modern-crud-tab${mainTab === "returns" ? " active" : ""}`}
            onClick={() => setMainTab("returns")}
          >
            Returns
            <span className="modern-crud-tab-count">{returnRows.length}</span>
          </button>
        </div>

        {mainTab === "orders" ? (
          <>
            <CrudListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by order # or status"
              totalRecords={filteredOrders.length}
              filterLabel="Status"
              filterValue={statusFilter}
              onFilterChange={setStatusFilter}
              filterOptions={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "received", label: "Received" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              dateMode={dateMode}
              onDateModeChange={setDateMode}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              onRangeFromChange={setRangeFrom}
              onRangeToChange={setRangeTo}
            />
            <div className="modern-crud-table">
              <Table
                columns={orderColumns}
                dataSource={orderDataSource}
                loading={loading}
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
                locale={{ emptyText: loading ? "Loading..." : "No purchase orders found" }}
              />
            </div>
          </>
        ) : (
          <div className="modern-crud-table">
            <Table
              columns={returnColumns}
              dataSource={returnRows}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: "No purchase returns yet" }}
            />
          </div>
        )}
      </ModernCrudShell>

      <Modal show={showModal} onHide={closeModal} centered size="xl" dialogClassName="modern-form-modal po-create-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Edit Purchase Order" : "Create Purchase Order"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onSave}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Supplier <span className="text-danger">*</span>
                </label>
                <Select
                  classNamePrefix="react-select"
                  options={supplierOptions}
                  value={form.supplier}
                  onChange={(opt) => setForm((p) => ({ ...p, supplier: opt }))}
                  placeholder="Select Supplier"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Order Number <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  value={form.order_number}
                  onChange={(e) => setForm((p) => ({ ...p, order_number: e.target.value }))}
                  required
                />
                <small className="text-muted">Auto-generated (yyMMdd-001). You can edit before save.</small>
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Order Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.order_date}
                  onChange={async (e) => {
                    const order_date = e.target.value;
                    setForm((p) => ({ ...p, order_date }));
                    if (!editId) await refreshOrderNumber(order_date);
                  }}
                  required
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Status</label>
                <Select
                  classNamePrefix="react-select"
                  options={statusOptions}
                  value={statusOptions.find((o) => o.value === form.status) || statusOptions[0]}
                  onChange={(opt) => setForm((p) => ({ ...p, status: opt?.value || "pending" }))}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Amount Paid (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.amount_paid}
                  onChange={(e) => setForm((p) => ({ ...p, amount_paid: e.target.value }))}
                />
              </div>
            </div>

            <div className="po-summary-bar">
              <div>
                <span>Order total</span>
                <strong>{money(formTotals.order_total)}</strong>
              </div>
              <div>
                <span>Returned</span>
                <strong>{money(formTotals.returned)}</strong>
              </div>
              <div>
                <span>Net</span>
                <strong>{money(formTotals.net)}</strong>
              </div>
              <div className="is-remaining">
                <span>Remaining</span>
                <strong>{money(formTotals.remaining)}</strong>
              </div>
            </div>

            <h6 className="mt-3 mb-2">Line items</h6>
            <div className="row align-items-end">
              <div className="col-md-5 mb-2">
                <label className="modern-form-label">
                  Product <span className="text-danger">*</span>
                </label>
                <Select
                  classNamePrefix="react-select"
                  options={productOptions}
                  value={form.lineProduct}
                  onChange={(opt) =>
                    setForm((p) => ({
                      ...p,
                      lineProduct: opt,
                      linePrice: opt?.price != null ? String(opt.price) : "",
                    }))
                  }
                  placeholder="Select Product"
                />
              </div>
              <div className="col-md-2 mb-2">
                <label className="modern-form-label">
                  Quantity <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.lineQty}
                  onChange={(e) => setForm((p) => ({ ...p, lineQty: e.target.value }))}
                />
              </div>
              <div className="col-md-3 mb-2">
                <label className="modern-form-label">
                  Price <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.linePrice}
                  onChange={(e) => setForm((p) => ({ ...p, linePrice: e.target.value }))}
                />
              </div>
              <div className="col-md-2 mb-2">
                <button type="button" className="btn modern-form-submit w-100" onClick={addLine}>
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            <div className="modern-crud-table mt-2">
              <Table
                columns={lineColumns}
                dataSource={lineTableData}
                pagination={false}
                size="small"
                locale={{ emptyText: "No data" }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={Boolean(viewPo)} onHide={() => setViewPo(null)} centered size="lg" dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>Purchase Order {viewPo?.order_number || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewPo ? (
            <>
              <dl className="user-detail-meta mb-3">
                <div>
                  <dt>Supplier</dt>
                  <dd>{viewPo.supplier_name || viewPo.supplier_id?.name || "-"}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{viewPo.order_date ? dayjs(viewPo.order_date).format("MMM D, YYYY") : "-"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{statusBadge(viewPo.status)}</dd>
                </div>
                <div>
                  <dt>Net</dt>
                  <dd>{money(viewPo.net_total)}</dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd className="po-paid">{money(viewPo.amount_paid)}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd className="po-remaining">{money(viewPo.amount_remaining)}</dd>
                </div>
              </dl>
              <Table
                size="small"
                pagination={false}
                dataSource={(viewPo.items || []).map((it, i) => ({
                  key: String(i),
                  product: it.product_id?.name || it.product_name || "-",
                  ordered: Number(it.ordered_quantity ?? it.quantity ?? 0),
                  returned: Number(it.returned_quantity || 0),
                  qty: Number(it.remaining_quantity ?? it.quantity ?? 0),
                  price: Number(it.price || 0).toFixed(2),
                  total: Number(
                    it.line_total ??
                      Number(it.remaining_quantity ?? it.quantity ?? 0) * Number(it.price || 0),
                  ).toFixed(2),
                }))}
                columns={[
                  { title: "Product", dataIndex: "product" },
                  { title: "Ordered", dataIndex: "ordered", width: 90 },
                  { title: "Returned", dataIndex: "returned", width: 90 },
                  { title: "Remaining", dataIndex: "qty", width: 100 },
                  { title: "Price", dataIndex: "price" },
                  { title: "Line total", dataIndex: "total" },
                ]}
              />
              {(viewPo.returns || []).length ? (
                <>
                  <h6 className="mt-3 mb-2">Returns</h6>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={(viewPo.returns || []).map((r, i) => ({
                      key: String(r._id || i),
                      product: r.product_id?.name || r.product_name || "-",
                      qty: r.quantity,
                      price: Number(r.price || 0).toFixed(2),
                      total: (Number(r.quantity || 0) * Number(r.price || 0)).toFixed(2),
                      reason: r.reason || "-",
                      date: r.return_date ? dayjs(r.return_date).format("M/D/YYYY") : "-",
                    }))}
                    columns={[
                      { title: "Product", dataIndex: "product" },
                      { title: "Qty", dataIndex: "qty", width: 70 },
                      { title: "Price", dataIndex: "price" },
                      { title: "Total", dataIndex: "total" },
                      { title: "Reason", dataIndex: "reason" },
                      { title: "Date", dataIndex: "date" },
                    ]}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="modern-form-cancel" onClick={() => setViewPo(null)}>
            Close
          </Button>
          {viewPo ? (
            <>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  openReturn(viewPo);
                }}
              >
                Return items
              </Button>
              <Button className="modern-form-submit" onClick={() => onPrint(viewPo)}>
                Print
              </Button>
            </>
          ) : null}
        </Modal.Footer>
      </Modal>

      <Modal
        show={Boolean(returnPo)}
        onHide={closeReturn}
        centered
        dialogClassName="modern-form-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Return items - {returnPo?.order_number || ""}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onRecordReturn}>
          <Modal.Body>
            <div className="mb-3">
              <label className="modern-form-label">
                Product <span className="text-danger">*</span>
              </label>
              <Select
                classNamePrefix="react-select"
                options={returnProductOptions}
                value={returnProduct}
                onChange={(opt) => {
                  setReturnProduct(opt);
                  setReturnPrice(opt?.price != null ? String(opt.price) : "");
                  setReturnQty(opt?.maxQty > 0 ? "1" : "0");
                }}
                placeholder="Select product to return."
                isOptionDisabled={(opt) => opt.disabled}
              />
            </div>
            <div className="mb-3">
              <label className="modern-form-label">
                Quantity <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={returnProduct?.maxQty || undefined}
                className="form-control"
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="modern-form-label">Unit price (PKR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={returnPrice}
                onChange={(e) => setReturnPrice(e.target.value)}
              />
            </div>
            <div className="mb-1">
              <label className="modern-form-label">Reason (optional)</label>
              <textarea
                className="form-control"
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Reason for return"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeReturn} disabled={returnSaving}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit" disabled={returnSaving}>
              {returnSaving ? "Saving..." : "Record return"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default PurchasesList;
