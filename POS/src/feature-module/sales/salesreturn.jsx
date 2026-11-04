import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import Select from "react-select";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
  Eye,
  FileText,
  RotateCcw,
} from "feather-icons-react/build/IconComponents";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { fetchAllSalesAction } from "../../redux/sales/saleSlice";
import { fetchAllReturnsAction } from "../../redux/returns/returnSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import { IdBadge, MoneyBadge, QtyBadge } from "../../core/components/CrudValueBadge";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import ProcessReturnModal from "../../core/modals/sales/ProcessReturnModal";
import SaleInvoiceModal from "../../core/modals/sales/SaleInvoiceModal";
import { downloadExcelExport } from "../../redux/utils/excelTransfer";
import { downloadRegisterPdf } from "../../utils/invoicePrint";

const money = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

const SalesReturn = () => {
  const dispatch = useDispatch();
  const { returns, loading } = useSelector((state) => state.returns);
  const { sales } = useSelector((state) => state.sales);
  const authUser = useSelector((state) => state.auth?.user);
  const settings = useSelector((state) => state.settings?.settings);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPickSale, setShowPickSale] = useState(false);
  const [pickedSale, setPickedSale] = useState(null);
  const [returnSale, setReturnSale] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [busyExport, setBusyExport] = useState(false);

  const reload = () => {
    dispatch(fetchAllReturnsAction());
    dispatch(fetchAllSalesAction());
  };

  useEffect(() => {
    reload();
  }, [dispatch]);

  const rows = Array.isArray(returns) ? returns : [];
  const saleRows = Array.isArray(sales) ? sales : [];

  const saleOptions = useMemo(
    () =>
      saleRows
        .filter((s) => {
          const st = String(s.status || "").toLowerCase();
          return st !== "returned" && st !== "cancelled" && st !== "canceled";
        })
        .map((s) => ({
          value: s._id,
          label: `${s.invoice_no || s._id} · ${s.customer_name || "Walk-in"} · ${money(s.net_amount)}`,
          sale: s,
        })),
    [saleRows],
  );

  const stats = useMemo(() => {
    const approved = rows.filter((r) =>
      ["approved", "completed", "refunded", "done"].includes(String(r.status || "").toLowerCase()),
    ).length;
    const pending = rows.filter((r) =>
      ["pending", "processing"].includes(String(r.status || "").toLowerCase()),
    ).length;
    const refundTotal = rows.reduce((s, r) => s + Number(r.refund_amount || 0), 0);
    return {
      total: rows.length,
      approved,
      pending,
      refundTotal,
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
      if (statusFilter === "approved" && !["approved", "completed", "refunded", "done"].includes(st)) {
        return false;
      }
      if (statusFilter === "pending" && !["pending", "processing"].includes(st)) return false;
      if (statusFilter === "rejected" && !["rejected", "cancelled", "canceled"].includes(st)) {
        return false;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["approved", "completed", "refunded", "done"].includes(st)) {
      return <span className="modern-crud-badge is-ok">{String(status).toUpperCase()}</span>;
    }
    if (["pending", "processing"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{String(status).toUpperCase()}</span>;
    }
    if (["rejected", "cancelled", "canceled"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{String(status).toUpperCase()}</span>;
    }
    return status;
  };

  const dataSource = useMemo(
    () =>
      filtered.map((r, i) => {
        const saleDoc = typeof r.sale_id === "object" ? r.sale_id : saleRows.find((s) => String(s._id) === String(r.sale_id));
        return {
          key: r._id || String(i),
          index: i + 1,
          invoice: saleDoc?.invoice_no || r.sale_id?.invoice_no || "-",
          customer: saleDoc?.customer_name || r.sale_id?.customer_name || "Walk-in Customer",
          product: r.product_id?.name || r.product_name || "-",
          qty: r.quantity ?? "-",
          reason: r.reason || "-",
          amount: Number(r.refund_amount || 0),
          status: r.status || "-",
          date: r.return_date || r.createdAt
            ? dayjs(r.return_date || r.createdAt).format("DD MMM YYYY, hh:mm A")
            : "-",
          sale: saleDoc,
        };
      }),
    [filtered, saleRows],
  );

  const columns = [
    { title: "#", dataIndex: "index", width: 56 },
    { title: "Invoice No", dataIndex: "invoice", render: (v) => <IdBadge value={v} /> },
    { title: "Customer", dataIndex: "customer" },
    { title: "Product", dataIndex: "product" },
    { title: "Qty", dataIndex: "qty", width: 80, render: (v) => <QtyBadge value={v} tone="dark" /> },
    { title: "Reason", dataIndex: "reason" },
    { title: "Refund", dataIndex: "amount", render: (v) => <MoneyBadge value={v} tone="warn" /> },
    { title: "Status", dataIndex: "status", render: statusBadge },
    { title: "Date", dataIndex: "date", render: (v) => <span className="mc-value-badge is-neutral">{v}</span> },
    {
      title: "Action",
      width: 80,
      render: (_, row) =>
        row.sale ? (
          <button
            type="button"
            className="modern-crud-icon-btn"
            title="View sale invoice"
            onClick={() =>
              setInvoiceSale({
                ...row.sale,
                cashier_name: row.sale.cashier_name || authUser?.name || "",
              })
            }
          >
            <Eye size={15} />
          </button>
        ) : null,
    },
  ];

  const onExportExcel = async () => {
    setBusyExport(true);
    try {
      await downloadExcelExport("/returns", "sales-returns-export.xlsx");
      toast.success("Excel downloaded");
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setBusyExport(false);
    }
  };

  const onExportPdf = async () => {
    try {
      const records = dataSource.map((r) => ({
        invoice_no: r.invoice,
        customer_name: `${r.customer} · ${r.product}`,
        date_label: r.date,
        total_amount: Number(r.amount || 0),
        net_amount: Number(r.amount || 0),
        status: `${r.status} · qty ${r.qty}`,
      }));
      await downloadRegisterPdf({
        records,
        subtitle: `${records.length} sales returns`,
        filename: "sales-returns.pdf",
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "PDF export failed");
    }
  };

  const startReturn = () => {
    if (!pickedSale?.sale) {
      toast.error("Select a sale first");
      return;
    }
    setReturnSale(pickedSale.sale);
    setShowPickSale(false);
    setPickedSale(null);
  };

  return (
    <>
      <ModernCrudShell
        title="Sales Returns"
        subtitle={`${stats.total} returns · ${money(stats.refundTotal)} refunded`}
        icon={<RotateCcw size={18} />}
        addLabel="Process Return"
        onAdd={() => setShowPickSale(true)}
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
            <div className="stock-stat-label">Total returns</div>
            <div className="stock-stat-value">{stats.total}</div>
            <div className="stock-stat-hint">All return records</div>
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Approved</div>
            <div className="stock-stat-value po-stat-received">{stats.approved}</div>
            <div className="stock-stat-hint">Processed refunds</div>
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Refund total</div>
            <div className="stock-stat-value stock-stat-value--sm">{money(stats.refundTotal)}</div>
            <div className="stock-stat-hint">Sum of return amounts</div>
          </div>
        </div>

        <CrudListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by invoice, product or reason"
          totalRecords={filtered.length}
          filterLabel="Status"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={[
            { value: "all", label: "All Status" },
            { value: "approved", label: "Approved" },
            { value: "pending", label: "Pending" },
            { value: "rejected", label: "Rejected" },
          ]}
        />

        <div className="modern-crud-table">
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
            locale={{ emptyText: loading ? "Loading..." : "No returns found" }}
            scroll={{ x: 1100 }}
          />
        </div>
      </ModernCrudShell>

      <Modal show={showPickSale} onHide={() => setShowPickSale(false)} centered dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>Select Sale for Return</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <label className="modern-form-label">
            Sale / Invoice <span className="text-danger">*</span>
          </label>
          <Select
            classNamePrefix="react-select"
            options={saleOptions}
            value={pickedSale}
            onChange={setPickedSale}
            placeholder="Select sale"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="modern-form-cancel" onClick={() => setShowPickSale(false)}>
            Cancel
          </Button>
          <Button className="modern-form-submit" onClick={startReturn}>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      <ProcessReturnModal
        show={Boolean(returnSale)}
        sale={returnSale}
        onClose={() => setReturnSale(null)}
        onSuccess={() => reload()}
      />

      <SaleInvoiceModal
        show={Boolean(invoiceSale)}
        sale={invoiceSale}
        template={
          settings?.invoiceDesign?.saleTemplate || settings?.invoiceDesign?.template
        }
        onClose={() => setInvoiceSale(null)}
      />
    </>
  );
};

export default SalesReturn;
