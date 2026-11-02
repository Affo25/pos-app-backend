import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { CreditCard, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  deletePaymentAction,
  fetchAllPaymentsAction,
} from "../../redux/payments/paymentSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";

const PaymentsList = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { payments, loading } = useSelector((state) => state.payments);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllPaymentsAction());
  }, [dispatch]);

  const rows = Array.isArray(payments) ? payments : [];

  const tabCounts = useMemo(() => {
    const norm = (p) => String(p.status || "").toLowerCase();
    return {
      all: rows.length,
      completed: rows.filter((p) => ["completed", "paid", "success"].includes(norm(p))).length,
      pending: rows.filter((p) => ["pending", "partial"].includes(norm(p))).length,
      cancelled: rows.filter((p) => ["cancelled", "canceled", "failed"].includes(norm(p))).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      const party = p.party_name || p.customer?.name || p.supplier?.name || "";
      const hay = `${p.payment_no || ""} ${p.payment_type || ""} ${party} ${p.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const st = String(p.status || "").toLowerCase();
      if (activeTab === "completed" && !["completed", "paid", "success"].includes(st)) return false;
      if (activeTab === "pending" && !["pending", "partial"].includes(st)) return false;
      if (activeTab === "cancelled" && !["cancelled", "canceled", "failed"].includes(st)) return false;
      return true;
    });
  }, [rows, search, activeTab]);

  const onCancel = (id) => {
    MySwal.fire({
      title: "Cancel this payment?",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deletePaymentAction(id));
    });
  };

  const dataSource = useMemo(
    () =>
      filtered.map((p, i) => ({
        key: p._id || String(i),
        index: i + 1,
        id: p._id,
        no: p.payment_no || "-",
        type: p.payment_type || "-",
        party: p.party_name || p.customer?.name || p.supplier?.name || "-",
        reference: p.reference_no || "-",
        paid: Number(p.paid_amount || 0).toFixed(2),
        method: p.payment_method || "-",
        status: p.status || "-",
        date: p.payment_date ? dayjs(p.payment_date).format("YYYY-MM-DD") : "-",
      })),
    [filtered],
  );

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["completed", "paid", "success"].includes(st)) {
      return <span className="modern-crud-badge is-ok">{status}</span>;
    }
    if (["pending", "partial"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{status}</span>;
    }
    if (["cancelled", "canceled", "failed"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{status}</span>;
    }
    return status;
  };

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    { title: "Payment #", dataIndex: "no" },
    { title: "Type", dataIndex: "type" },
    { title: "Party", dataIndex: "party" },
    { title: "Reference", dataIndex: "reference" },
    { title: "Paid", dataIndex: "paid", render: (v) => `PKR ${v}` },
    { title: "Method", dataIndex: "method" },
    { title: "Status", dataIndex: "status", render: statusBadge },
    { title: "Date", dataIndex: "date" },
    {
      title: "Action",
      width: 80,
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            onClick={() => onCancel(row.id)}
            title="Cancel"
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
      title="Payments"
      subtitle="Payments recorded from sales and purchases."
      icon={<CreditCard size={18} />}
      excelResource="/payments"
      excelFileName="payments-export.xlsx"
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
          locale={{ emptyText: loading ? "Loading..." : "No payments found" }}
        />
      </div>
    </ModernCrudShell>
  );
};

export default PaymentsList;
