import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { Printer, ShoppingBag, Trash2 } from "feather-icons-react/build/IconComponents";
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
import ModernCrudShell from "../../core/components/ModernCrudShell";
import {
  openInvoicePreview,
  purchaseOrderToInvoicePayload,
} from "../../utils/invoicePrint";

const PurchasesList = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { purchaseOrders, loading } = useSelector((state) => state.purchaseOrders);
  const { suppliers } = useSelector((state) => state.suppliers);
  const { products } = useSelector((state) => state.products);

  const [showModal, setShowModal] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllPurchaseOrdersAction());
    dispatch(fetchAllSuppliersAction());
    dispatch(fetchAllProductsAction());
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
      })),
    [products],
  );

  const tabCounts = useMemo(() => {
    const norm = (p) => String(p.status || "").toLowerCase();
    return {
      all: rows.length,
      pending: rows.filter((p) => ["pending", "draft"].includes(norm(p))).length,
      received: rows.filter((p) => ["received", "completed", "done"].includes(norm(p))).length,
      cancelled: rows.filter((p) => ["cancelled", "canceled"].includes(norm(p))).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((po) => {
      const supplierName = po.supplier_name || po.supplier_id?.name || "";
      const hay = `${po.order_number || ""} ${supplierName} ${po.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const st = String(po.status || "").toLowerCase();
      if (activeTab === "pending" && !["pending", "draft"].includes(st)) return false;
      if (activeTab === "received" && !["received", "completed", "done"].includes(st)) return false;
      if (activeTab === "cancelled" && !["cancelled", "canceled"].includes(st)) return false;
      return true;
    });
  }, [rows, search, activeTab]);

  const closeModal = () => {
    setShowModal(false);
    setSupplier(null);
    setProduct(null);
    setQuantity("1");
    setPrice("");
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!supplier?.value || !product?.value) {
      toast.error("Select supplier and product");
      return;
    }
    const qty = Math.max(1, Number(quantity) || 1);
    const unitPrice = Number(price !== "" ? price : product.price || 0);
    const payload = {
      supplier_id: supplier.value,
      supplier_name: supplier.name || supplier.label,
      items: [
        {
          product_id: product.value,
          product_name: product.label,
          quantity: qty,
          price: unitPrice,
        },
      ],
      order_date: new Date().toISOString(),
      status: "pending",
    };
    try {
      const created = await purchaseOrderService.createPurchaseOrder(payload);
      closeModal();
      dispatch(fetchAllPurchaseOrdersAction());
      toast.success("Purchase order created");
      try {
        await openInvoicePreview(
          purchaseOrderToInvoicePayload(created),
          "purchase_order_a4",
        );
      } catch (printErr) {
        toast.error(printErr?.message || "PO saved, but PDF failed");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to create purchase order");
    }
  };

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
      await openInvoicePreview(purchaseOrderToInvoicePayload(po), "purchase_order_a4");
    } catch (err) {
      toast.error(err?.message || "Failed to generate purchase order PDF");
    }
  };

  const dataSource = useMemo(
    () =>
      filtered.map((po, i) => ({
        key: po._id || String(i),
        index: i + 1,
        id: po._id,
        raw: po,
        order: po.order_number || "-",
        supplier: po.supplier_name || po.supplier_id?.name || "-",
        items: Array.isArray(po.items) ? po.items.length : 0,
        total: Number(po.net_total ?? po.order_total ?? po.total_amount ?? 0).toFixed(2),
        status: po.status || "-",
        date: po.order_date ? dayjs(po.order_date).format("YYYY-MM-DD") : "-",
      })),
    [filtered],
  );

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["received", "completed", "done"].includes(st)) {
      return <span className="modern-crud-badge is-ok">{status}</span>;
    }
    if (["pending", "draft"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{status}</span>;
    }
    if (["cancelled", "canceled"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{status}</span>;
    }
    return status;
  };

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    { title: "Order #", dataIndex: "order" },
    { title: "Supplier", dataIndex: "supplier" },
    { title: "Items", dataIndex: "items" },
    { title: "Total", dataIndex: "total", render: (v) => `PKR ${v}` },
    { title: "Status", dataIndex: "status", render: statusBadge },
    { title: "Date", dataIndex: "date" },
    {
      title: "Action",
      width: 110,
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button
            type="button"
            className="modern-crud-icon-btn"
            onClick={() => onPrint(row.raw)}
            title="Print purchase order"
          >
            <Printer size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            onClick={() => onDelete(row.id)}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const filterTabs = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "pending", label: "Pending", count: tabCounts.pending, tone: "warn" },
    { key: "received", label: "Received", count: tabCounts.received, tone: "ok" },
    { key: "cancelled", label: "Cancelled", count: tabCounts.cancelled, tone: "danger" },
  ];

  return (
    <>
      <ModernCrudShell
        title="Purchase Orders"
        subtitle="Create and manage purchase orders."
        icon={<ShoppingBag size={18} />}
        addLabel="Add Purchase Order"
        onAdd={() => setShowModal(true)}
        excelResource="/purchaseOrders"
        excelFileName="purchase-orders-export.xlsx"
      >
        <CrudListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search"
          totalRecords={filtered.length}
          showFiltersButton
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          stockFilterValue={activeTab}
          onStockFilterChange={setActiveTab}
          stockFilterOptions={filterTabs.map((t) => ({
            value: t.key,
            label: t.label,
            count: t.count,
            tone: t.tone,
          }))}
          tabs={filterTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="modern-crud-table">
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
            locale={{ emptyText: loading ? "Loading..." : "No purchase orders found" }}
          />
        </div>
      </ModernCrudShell>

      <Modal show={showModal} onHide={closeModal} centered size="lg" dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>Add Purchase Order</Modal.Title>
        </Modal.Header>
        <form onSubmit={onCreate}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">
                  Supplier <span className="text-danger">*</span>
                </label>
                <Select
                  classNamePrefix="react-select"
                  options={supplierOptions}
                  value={supplier}
                  onChange={setSupplier}
                  placeholder="Select supplier"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">
                  Product <span className="text-danger">*</span>
                </label>
                <Select
                  classNamePrefix="react-select"
                  options={productOptions}
                  value={product}
                  onChange={(opt) => {
                    setProduct(opt);
                    setPrice(opt?.price != null ? String(opt.price) : "");
                  }}
                  placeholder="Select product"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Quantity</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Unit price</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit">
              Create Purchase Order
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default PurchasesList;
