import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Printer, ShoppingCart, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { all_routes } from "../../Router/all_routes";
import {
  deleteSaleAction,
  fetchAllSalesAction,
} from "../../redux/sales/saleSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import { openInvoicePreview, saleToInvoicePayload } from "../../utils/invoicePrint";

const SalesList = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { sales, loading } = useSelector((state) => state.sales);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllSalesAction());
  }, [dispatch]);

  const rows = Array.isArray(sales) ? sales : [];

  const tabCounts = useMemo(() => {
    const norm = (s) => String(s.status || "").toLowerCase();
    return {
      all: rows.length,
      completed: rows.filter((s) => ["completed", "paid", "done"].includes(norm(s))).length,
      pending: rows.filter((s) => ["pending", "partial"].includes(norm(s))).length,
      cancelled: rows.filter((s) => ["cancelled", "canceled", "returned"].includes(norm(s))).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      const hay = `${s.invoice_no || ""} ${s.customer_name || ""} ${s.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const st = String(s.status || "").toLowerCase();
      if (activeTab === "completed" && !["completed", "paid", "done"].includes(st)) return false;
      if (activeTab === "pending" && !["pending", "partial"].includes(st)) return false;
      if (activeTab === "cancelled" && !["cancelled", "canceled", "returned"].includes(st)) return false;
      return true;
    });
  }, [rows, search, activeTab]);

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete sale?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteSaleAction(id));
    });
  };

  const onPrint = async (sale) => {
    try {
      await openInvoicePreview(saleToInvoicePayload(sale));
    } catch (err) {
      toast.error(err?.message || "Failed to generate invoice");
    }
  };

  const dataSource = useMemo(
    () =>
      filtered.map((s, i) => ({
        key: s._id || String(i),
        index: i + 1,
        id: s._id,
        raw: s,
        invoice: s.invoice_no || "-",
        customer: s.customer_name || "Walk-in",
        items: Array.isArray(s.items) ? s.items.length : 0,
        net: Number(s.net_amount || 0).toFixed(2),
        status: s.status || "-",
        date: s.sale_date ? dayjs(s.sale_date).format("YYYY-MM-DD HH:mm") : "-",
      })),
    [filtered],
  );

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["completed", "paid", "done"].includes(st)) {
      return <span className="modern-crud-badge is-ok">{status}</span>;
    }
    if (["pending", "partial"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{status}</span>;
    }
    if (["cancelled", "canceled", "returned"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{status}</span>;
    }
    return status;
  };

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    { title: "Invoice", dataIndex: "invoice", sorter: (a, b) => String(a.invoice).localeCompare(String(b.invoice)) },
    { title: "Customer", dataIndex: "customer", sorter: (a, b) => String(a.customer).localeCompare(String(b.customer)) },
    { title: "Items", dataIndex: "items", sorter: (a, b) => a.items - b.items },
    { title: "Net Amount", dataIndex: "net", render: (v) => `PKR ${v}` },
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
            title="Print invoice"
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
    { key: "completed", label: "Completed", count: tabCounts.completed, tone: "ok" },
    { key: "pending", label: "Pending", count: tabCounts.pending, tone: "warn" },
    { key: "cancelled", label: "Cancelled", count: tabCounts.cancelled, tone: "danger" },
  ];

  return (
    <ModernCrudShell
      title="Sales"
      subtitle="Manage your sales orders."
      icon={<ShoppingCart size={18} />}
      addLabel="Open POS"
      addTo={route.pos}
      excelResource="/sales"
      excelFileName="sales-export.xlsx"
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
          locale={{ emptyText: loading ? "Loading..." : "No sales found" }}
        />
      </div>
    </ModernCrudShell>
  );
};

export default SalesList;
