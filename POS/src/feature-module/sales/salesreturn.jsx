import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { RotateCcw } from "feather-icons-react/build/IconComponents";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { fetchAllSalesAction } from "../../redux/sales/saleSlice";
import {
  createReturnAction,
  fetchAllReturnsAction,
} from "../../redux/returns/returnSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";

const SalesReturn = () => {
  const dispatch = useDispatch();
  const { returns, loading } = useSelector((state) => state.returns);
  const { sales } = useSelector((state) => state.sales);

  const [showModal, setShowModal] = useState(false);
  const [sale, setSale] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllReturnsAction());
    dispatch(fetchAllSalesAction());
  }, [dispatch]);

  const rows = Array.isArray(returns) ? returns : [];

  const saleOptions = useMemo(
    () =>
      (sales || [])
        .filter((s) => s.status !== "returned")
        .map((s) => ({
          value: s._id,
          label: `${s.invoice_no || s._id} · ${s.customer_name || "Walk-in"} · ${Number(s.net_amount || 0).toFixed(2)}`,
          items: s.items || [],
        })),
    [sales],
  );

  const productOptions = useMemo(
    () =>
      (sale?.items || []).map((item) => ({
        value: item.product_id?._id || item.product_id,
        label: `${item.product_name || "Item"} (qty ${item.quantity})`,
        unit_price: item.unit_price,
        maxQty: item.quantity,
      })),
    [sale],
  );

  const tabCounts = useMemo(() => {
    const norm = (r) => String(r.status || "").toLowerCase();
    return {
      all: rows.length,
      pending: rows.filter((r) => ["pending", "processing"].includes(norm(r))).length,
      completed: rows.filter((r) => ["completed", "refunded", "done"].includes(norm(r))).length,
      cancelled: rows.filter((r) => ["cancelled", "canceled", "rejected"].includes(norm(r))).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const invoice = r.sale_id?.invoice_no || r.sale_id || "";
      const productName = r.product_id?.name || r.product_name || "";
      const hay = `${invoice} ${productName} ${r.reason || ""} ${r.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const st = String(r.status || "").toLowerCase();
      if (activeTab === "pending" && !["pending", "processing"].includes(st)) return false;
      if (activeTab === "completed" && !["completed", "refunded", "done"].includes(st)) return false;
      if (activeTab === "cancelled" && !["cancelled", "canceled", "rejected"].includes(st)) return false;
      return true;
    });
  }, [rows, search, activeTab]);

  const closeModal = () => {
    setShowModal(false);
    setSale(null);
    setProduct(null);
    setQuantity("1");
    setReason("");
  };

  const onCreate = (e) => {
    e.preventDefault();
    if (!sale?.value || !product?.value) {
      toast.error("Select a sale and product");
      return;
    }
    const qty = Math.max(1, Number(quantity) || 1);
    dispatch(
      createReturnAction({
        sale_id: sale.value,
        reason: reason.trim() || "Customer return",
        items: [
          {
            product_id: product.value,
            quantity: qty,
            unit_price: Number(product.unit_price || 0),
            reason: reason.trim() || "Customer return",
          },
        ],
      }),
    );
    closeModal();
  };

  const dataSource = useMemo(
    () =>
      filtered.map((r, i) => ({
        key: r._id || String(i),
        index: i + 1,
        invoice: r.sale_id?.invoice_no || r.sale_id || "-",
        product: r.product_id?.name || r.product_name || "-",
        qty: r.quantity ?? "-",
        reason: r.reason || "-",
        amount: Number(r.refund_amount || 0).toFixed(2),
        date: r.return_date || r.createdAt
          ? dayjs(r.return_date || r.createdAt).format("YYYY-MM-DD HH:mm")
          : "-",
        status: r.status || "-",
      })),
    [filtered],
  );

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["completed", "refunded", "done"].includes(st)) {
      return <span className="modern-crud-badge is-ok">{status}</span>;
    }
    if (["pending", "processing"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{status}</span>;
    }
    if (["cancelled", "canceled", "rejected"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{status}</span>;
    }
    return status;
  };

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    { title: "Sale / Invoice", dataIndex: "invoice" },
    { title: "Product", dataIndex: "product" },
    { title: "Qty", dataIndex: "qty" },
    { title: "Reason", dataIndex: "reason" },
    { title: "Refund", dataIndex: "amount", render: (v) => `PKR ${v}` },
    { title: "Status", dataIndex: "status", render: statusBadge },
    { title: "Date", dataIndex: "date" },
  ];

  const filterTabs = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "pending", label: "Pending", count: tabCounts.pending, tone: "warn" },
    { key: "completed", label: "Completed", count: tabCounts.completed, tone: "ok" },
    { key: "cancelled", label: "Cancelled", count: tabCounts.cancelled, tone: "danger" },
  ];

  return (
    <>
      <ModernCrudShell
        title="Sales Returns"
        subtitle="Create and view product returns."
        icon={<RotateCcw size={18} />}
        addLabel="Add Return"
        onAdd={() => setShowModal(true)}
        excelResource="/returns"
        excelFileName="sales-returns-export.xlsx"
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
            locale={{ emptyText: loading ? "Loading..." : "No returns found" }}
          />
        </div>
      </ModernCrudShell>

      <Modal show={showModal} onHide={closeModal} centered size="lg" dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>Add Sales Return</Modal.Title>
        </Modal.Header>
        <form onSubmit={onCreate}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">
                  Sale <span className="text-danger">*</span>
                </label>
                <Select
                  classNamePrefix="react-select"
                  options={saleOptions}
                  value={sale}
                  onChange={(opt) => {
                    setSale(opt);
                    setProduct(null);
                  }}
                  placeholder="Select sale"
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
                  onChange={setProduct}
                  isDisabled={!sale}
                  placeholder="Select product"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Quantity</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  max={product?.maxQty || undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="col-md-8 mb-3">
                <label className="modern-form-label">Reason</label>
                <input
                  className="form-control"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Customer return"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit">
              Create Return
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default SalesReturn;
