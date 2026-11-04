import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowUp,
  Eye,
  FileText,
  Package,
  RefreshCw,
  Trash2,
} from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { toast } from "react-toastify";
import {
  deleteProductAction,
  fetchAllProductsAction,
} from "../../redux/products/productSlice";
import { fetchAllCategoriesAction } from "../../redux/categories/categorySlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import { IdBadge, MoneyBadge, QtyBadge } from "../../core/components/CrudValueBadge";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import ModernViewDialog from "../../core/components/ModernViewDialog";
import { downloadExcelExport } from "../../redux/utils/excelTransfer";
import { downloadRegisterPdf } from "../../utils/invoicePrint";

const money = (v) =>
  `Rs ${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isLowStock = (p) => {
  const qty = Number(p.available_quantity ?? 0);
  const min = Number(p.minimum_stock_alert ?? 0);
  if (qty <= 0) return false;
  return qty <= (min > 0 ? min : 5);
};

const StockManagement = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { products, loading } = useSelector((state) => state.products);
  const { categories } = useSelector((state) => state.categories);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewProduct, setViewProduct] = useState(null);
  const [busyExport, setBusyExport] = useState(false);

  const load = () => {
    dispatch(fetchAllProductsAction());
    dispatch(fetchAllCategoriesAction());
  };

  useEffect(() => {
    load();
  }, [dispatch]);

  const rows = Array.isArray(products) ? products : [];

  const stats = useMemo(() => {
    const totalMedicines = rows.length;
    const lowStock = rows.filter(isLowStock).length;
    const stockValue = rows.reduce((sum, p) => {
      const tv =
        p.total_value != null
          ? Number(p.total_value)
          : Number(p.available_quantity || 0) * Number(p.unit_price || 0);
      return sum + tv;
    }, 0);
    const active = rows.filter(
      (p) => String(p.status || "active").toLowerCase() === "active" && Number(p.available_quantity || 0) > 0,
    ).length;
    return { totalMedicines, lowStock, stockValue, active };
  }, [rows]);

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...(categories || []).map((c) => ({ value: c._id, label: c.name })),
    ],
    [categories],
  );

  const tabCounts = useMemo(() => {
    const low = rows.filter(isLowStock).length;
    const out = rows.filter((p) => Number(p.available_quantity ?? 0) <= 0).length;
    const ok = rows.filter((p) => Number(p.available_quantity ?? 0) > 0 && !isLowStock(p)).length;
    const expired = rows.filter((p) => p.expiry_date && dayjs(p.expiry_date).isBefore(dayjs(), "day")).length;
    return { all: rows.length, ok, low, out, expired };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      const catName = p.category?.name || "";
      const catId = p.category?._id || p.category || "";
      const hay = `${p.name || ""} ${p.sku || ""} ${p.batch_number || ""} ${catName} ${p.supplier_name || ""} ${p.manufacturer || ""} ${p.medicine_size || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (categoryFilter !== "all" && String(catId) !== categoryFilter) return false;
      const qty = Number(p.available_quantity ?? 0);
      if (activeTab === "ok" && (qty <= 0 || isLowStock(p))) return false;
      if (activeTab === "low" && !isLowStock(p)) return false;
      if (activeTab === "out" && qty > 0) return false;
      if (activeTab === "expired" && !(p.expiry_date && dayjs(p.expiry_date).isBefore(dayjs(), "day"))) {
        return false;
      }
      return true;
    });
  }, [rows, search, categoryFilter, activeTab]);

  const onDelete = (product) => {
    MySwal.fire({
      title: "Delete medicine?",
      text: `Remove "${product.name}" from inventory?`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteProductAction(product._id));
    });
  };

  const onExportExcel = async () => {
    setBusyExport(true);
    try {
      await downloadExcelExport("/products", "stock-management.xlsx");
      toast.success("Excel downloaded");
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setBusyExport(false);
    }
  };

  const onExportPdf = async () => {
    try {
      const records = filtered.map((p) => ({
        invoice_no: p.sku || p.batch_number || "-",
        customer_name: p.name || "-",
        date_label: p.expiry_date ? dayjs(p.expiry_date).format("DD MMM YYYY") : "-",
        total_amount: Number(p.available_quantity || 0) * Number(p.unit_price || 0),
        net_amount: Number(p.unit_price || 0),
        status: `qty ${Number(p.available_quantity || 0)}`,
      }));
      await downloadRegisterPdf({
        records,
        subtitle: `Stock management · ${records.length} products`,
        filename: "stock-management.pdf",
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "PDF export failed");
    }
  };

  const dataSource = useMemo(
    () =>
      filtered.map((p, i) => ({
        key: p._id || String(i),
        index: i + 1,
        raw: p,
        name: p.name || "-",
        sku: p.sku || "-",
        batch: p.batch_number || "-",
        category: p.category?.name || "-",
        qty: Number(p.available_quantity ?? 0),
        min: Number(p.minimum_stock_alert ?? 0),
        sell: Number(p.unit_price || 0),
        expiry: p.expiry_date ? dayjs(p.expiry_date).format("M/D/YYYY") : "-",
        expiryRaw: p.expiry_date,
        supplier: p.supplier_name || "-",
        manufacturer: p.manufacturer || "-",
        size: p.medicine_size || "-",
        low: isLowStock(p),
        expired: p.expiry_date ? dayjs(p.expiry_date).isBefore(dayjs(), "day") : false,
      })),
    [filtered],
  );

  const columns = [
    {
      title: "#",
      dataIndex: "index",
      width: 56,
      sorter: (a, b) => a.index - b.index,
    },
    {
      title: "Medicine",
      dataIndex: "name",
      sorter: (a, b) => String(a.name).localeCompare(String(b.name)),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      ellipsis: true,
      sorter: (a, b) => String(a.sku).localeCompare(String(b.sku)),
      render: (v) => <IdBadge value={v} />,
    },
    {
      title: "Batch",
      dataIndex: "batch",
      sorter: (a, b) => String(a.batch).localeCompare(String(b.batch)),
      render: (v) => <span className="mc-value-badge is-neutral">{v}</span>,
    },
    {
      title: "Category",
      dataIndex: "category",
      sorter: (a, b) => String(a.category).localeCompare(String(b.category)),
      render: (v) => <span className="mc-value-badge is-muted">{v}</span>,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      sorter: (a, b) => a.qty - b.qty,
      render: (qty, row) => (
        <span className="d-inline-flex align-items-center gap-1">
          {qty > 0 ? <ArrowUp size={13} className="text-success" /> : null}
          <QtyBadge value={qty} tone={qty <= 0 ? "danger" : row.low ? "warn" : "ok"} />
        </span>
      ),
    },
    {
      title: "Min",
      dataIndex: "min",
      sorter: (a, b) => a.min - b.min,
      render: (v) => <QtyBadge value={v} tone="neutral" />,
    },
    {
      title: "Sell",
      dataIndex: "sell",
      sorter: (a, b) => a.sell - b.sell,
      render: (v) => <MoneyBadge value={v} tone="info" />,
    },
    {
      title: "Expiry",
      dataIndex: "expiry",
      sorter: (a, b) => dayjs(a.expiryRaw || 0).valueOf() - dayjs(b.expiryRaw || 0).valueOf(),
      render: (text, row) =>
        text === "-" ? (
          "-"
        ) : (
          <span className={`modern-crud-badge ${row.expired ? "is-danger" : "is-ok"}`}>{text}</span>
        ),
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      ellipsis: true,
      sorter: (a, b) => String(a.supplier).localeCompare(String(b.supplier)),
    },
    {
      title: "Manufacturer",
      dataIndex: "manufacturer",
      ellipsis: true,
      sorter: (a, b) => String(a.manufacturer).localeCompare(String(b.manufacturer)),
    },
    {
      title: "Size",
      dataIndex: "size",
      sorter: (a, b) => String(a.size).localeCompare(String(b.size)),
    },
    {
      title: "Actions",
      width: 100,
      fixed: "right",
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button
            type="button"
            className="modern-crud-icon-btn"
            title="View"
            onClick={() => setViewProduct(row.raw)}
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            title="Delete"
            onClick={() => onDelete(row.raw)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const filterTabs = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "ok", label: "In stock", count: tabCounts.ok, tone: "ok" },
    { key: "low", label: "Low stock", count: tabCounts.low, tone: "warn" },
    { key: "out", label: "Out of stock", count: tabCounts.out, tone: "danger" },
    { key: "expired", label: "Expired", count: tabCounts.expired, tone: "danger" },
  ];

  return (
    <>
      <ModernCrudShell
        title="Medicine & Inventory"
        subtitle="Stock levels, batches, expiry, and valuation"
        icon={<Package size={18} />}
        totalRecords={filtered.length}
        headerExtra={
          <>
            <button
              type="button"
              className="btn modern-crud-io-btn"
              onClick={onExportExcel}
              disabled={busyExport}
            >
              Excel
            </button>
            <button type="button" className="btn modern-crud-io-btn" onClick={onExportPdf}>
              <FileText size={15} />
              PDF
            </button>
            <button type="button" className="btn modern-crud-io-btn" onClick={load} disabled={loading}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </>
        }
      >
        <div className="stock-stat-grid">
          <div className="stock-stat-card">
            <div className="stock-stat-label">Total medicines</div>
            <div className="stock-stat-value">{stats.totalMedicines}</div>
            <div className="stock-stat-hint">SKUs in catalog</div>
            <div className="stock-stat-spark is-purple" aria-hidden="true" />
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Low stock items</div>
            <div className="stock-stat-value">{stats.lowStock}</div>
            <div className="stock-stat-hint">At or below minimum</div>
            <div className="stock-stat-spark is-amber" aria-hidden="true" />
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Total stock value</div>
            <div className="stock-stat-value stock-stat-value--sm">{money(stats.stockValue)}</div>
            <div className="stock-stat-hint">At sell price / valuation</div>
            <div className="stock-stat-spark is-green" aria-hidden="true" />
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Active medicines</div>
            <div className="stock-stat-value">{stats.active}</div>
            <div className="stock-stat-hint">Available to sell</div>
            <div className="stock-stat-spark is-blue" aria-hidden="true" />
          </div>
        </div>

        <CrudListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by medicine name, batch, SKU..."
          totalRecords={filtered.length}
          filterLabel="Category"
          filterValue={categoryFilter}
          onFilterChange={setCategoryFilter}
          filterOptions={categoryOptions}
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
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            scroll={{ x: 1280 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
            }}
            locale={{ emptyText: loading ? "Loading..." : "No stock records found" }}
          />
        </div>
      </ModernCrudShell>

      <ModernViewDialog
        show={Boolean(viewProduct)}
        onHide={() => setViewProduct(null)}
        title={viewProduct?.name || "Medicine"}
        subtitle={viewProduct?.sku ? `SKU ${viewProduct.sku}` : "Stock details"}
        badge={
          viewProduct ? (
            <span
              className={`modern-crud-badge ${
                viewProduct.status === "inactive" ? "is-danger" : "is-ok"
              }`}
            >
              {viewProduct.status === "inactive" ? "Inactive" : "Active"}
            </span>
          ) : null
        }
        sections={[
          {
            title: "Basic",
            fields: [
              { label: "Medicine", value: viewProduct?.name },
              { label: "SKU", value: viewProduct?.sku, mono: true },
              { label: "Batch", value: viewProduct?.batch_number, mono: true },
              {
                label: "Expiry",
                value: viewProduct?.expiry_date
                  ? dayjs(viewProduct.expiry_date).format("MMM D, YYYY")
                  : null,
              },
              { label: "Category", value: viewProduct?.category?.name },
              { label: "Status", value: viewProduct?.status || "active" },
              {
                label: "Prescription required",
                value: viewProduct?.is_prescription_required,
                type: "bool",
              },
              { label: "Medicine size", value: viewProduct?.medicine_size },
            ],
          },
          {
            title: "Stock & pricing",
            fields: [
              { label: "Available quantity", value: viewProduct?.available_quantity },
              { label: "Minimum stock alert", value: viewProduct?.minimum_stock_alert },
              { label: "Unit price", value: money(viewProduct?.unit_price) },
              {
                label: "Total value",
                value: money(
                  viewProduct?.total_value != null
                    ? viewProduct.total_value
                    : Number(viewProduct?.available_quantity || 0) *
                        Number(viewProduct?.unit_price || 0),
                ),
              },
              { label: "Discount %", value: viewProduct?.discount },
              { label: "GST %", value: viewProduct?.gst },
              { label: "Rack location", value: viewProduct?.rack_location },
            ],
          },
          {
            title: "Supplier & manufacturer",
            fields: [
              { label: "Supplier", value: viewProduct?.supplier_name },
              { label: "Manufacturer", value: viewProduct?.manufacturer },
              { label: "License no.", value: viewProduct?.manufacturer_license_no },
              { label: "Registration no.", value: viewProduct?.manufacturer_registration_no },
            ],
          },
          {
            title: "Additional",
            fields: [
              {
                label: "Alternative medicines",
                value: viewProduct?.alternative_medicines,
                type: "list",
                span: 2,
              },
              { label: "Storage instructions", value: viewProduct?.storage_instructions, span: 2 },
              { label: "Notes", value: viewProduct?.notes, span: 2 },
            ],
          },
        ]}
      />
    </>
  );
};

export default StockManagement;
