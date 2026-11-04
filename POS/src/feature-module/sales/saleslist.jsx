import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  Check,
  Eye,
  FileText,
  Printer,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { all_routes } from "../../Router/all_routes";
import {
  deleteSaleAction,
  fetchAllSalesAction,
} from "../../redux/sales/saleSlice";
import { fetchAllReturnsAction } from "../../redux/returns/returnSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import { IdBadge, MoneyBadge } from "../../core/components/CrudValueBadge";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import SaleInvoiceModal from "../../core/modals/sales/SaleInvoiceModal";
import ProcessReturnModal from "../../core/modals/sales/ProcessReturnModal";
import { downloadExcelExport } from "../../redux/utils/excelTransfer";
import {
  downloadInvoicePdf,
  downloadRegisterPdf,
  openInvoicePreview,
  saleToInvoicePayload,
} from "../../utils/invoicePrint";

const money = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

const isCompleted = (st) => ["completed", "paid", "done", "partially_returned"].includes(st);
const isReturnedLike = (st) => ["returned", "cancelled", "canceled"].includes(st);

const SalesList = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { sales, loading } = useSelector((state) => state.sales);
  const { returns, loading: returnsLoading } = useSelector((state) => state.returns);
  const authUser = useSelector((state) => state.auth?.user);
  const settings = useSelector((state) => state.settings?.settings);

  const [search, setSearch] = useState("");
  const [mainTab, setMainTab] = useState("active");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState("all");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [returnSale, setReturnSale] = useState(null);
  const [busyExport, setBusyExport] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const reload = () => {
    dispatch(fetchAllSalesAction());
    dispatch(fetchAllReturnsAction());
  };

  useEffect(() => {
    reload();
  }, [dispatch]);

  const rows = Array.isArray(sales) ? sales : [];
  const returnRows = Array.isArray(returns) ? returns : [];

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

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      const hay = `${s.invoice_no || ""} ${s.customer_name || ""} ${s.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (!inDateRange(s.sale_date || s.createdAt)) return false;
      const st = String(s.status || "").toLowerCase();
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (mainTab === "active" && !isCompleted(st)) return false;
      if (mainTab === "history" && !isReturnedLike(st) && st !== "partially_returned") return false;
      return true;
    });
  }, [rows, search, statusFilter, dateMode, rangeFrom, rangeTo, mainTab]);

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returnRows.filter((r) => {
      const invoice = r.sale_id?.invoice_no || "";
      const productName = r.product_id?.name || r.product_name || "";
      const hay = `${invoice} ${productName} ${r.reason || ""} ${r.status || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (!inDateRange(r.return_date || r.createdAt)) return false;
      return true;
    });
  }, [returnRows, search, dateMode, rangeFrom, rangeTo]);

  const stats = useMemo(() => {
    const base = dateMode === "all" && statusFilter === "all" && !search.trim()
      ? rows
      : rows.filter((s) => {
          const hay = `${s.invoice_no || ""} ${s.customer_name || ""} ${s.status || ""}`.toLowerCase();
          if (search.trim() && !hay.includes(search.trim().toLowerCase())) return false;
          if (!inDateRange(s.sale_date || s.createdAt)) return false;
          const st = String(s.status || "").toLowerCase();
          if (statusFilter !== "all" && st !== statusFilter) return false;
          return true;
        });
    const completed = base.filter((s) => isCompleted(String(s.status || "").toLowerCase()));
    const revenue = completed.reduce((sum, s) => sum + Number(s.net_amount || 0), 0);
    return {
      totalSales: base.length,
      revenue,
      completed: completed.length,
      returns: returnRows.length,
    };
  }, [rows, returnRows, search, statusFilter, dateMode, rangeFrom, rangeTo]);

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete sale?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteSaleAction(id));
    });
  };

  const withCashier = (sale) => ({
    ...sale,
    cashier_name: sale.cashier_name || authUser?.name || "",
  });

  const onViewOrPrint = (sale) => setInvoiceSale(withCashier(sale));

  const onPrintDirect = async (sale) => {
    try {
      await downloadInvoicePdf(
        saleToInvoicePayload(withCashier(sale)),
        settings?.invoiceDesign?.saleTemplate || settings?.invoiceDesign?.template,
        `sale-${sale.invoice_no || sale._id || "invoice"}.pdf`,
      );
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "Failed to generate invoice PDF");
    }
  };

  const canReturn = (sale) => {
    const st = String(sale?.status || "").toLowerCase();
    return st !== "returned" && st !== "cancelled" && st !== "canceled";
  };

  const onExportExcel = async () => {
    setBusyExport(true);
    try {
      await downloadExcelExport("/sales", "sales-export.xlsx");
      toast.success("Excel downloaded");
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setBusyExport(false);
    }
  };

  const buildPrintTable = (title, bodyHtml) => {
    const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (!win) {
      toast.error("Popup blocked");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f4f6}
      h1{font-size:18px;margin:0 0 8px}.meta{color:#6b7280;margin-bottom:16px}</style></head><body>
      <h1>${title}</h1>
      <div class="meta">${dayjs().format("DD MMM YYYY, hh:mm A")} · ${filteredSales.length} sales</div>
      <table>${bodyHtml}</table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const onExportPdf = async () => {
    try {
      const records = filteredSales.map((s) => ({
        invoice_no: s.invoice_no || "-",
        customer_name: s.customer_name || "Walk-in Customer",
        date_label: s.sale_date ? dayjs(s.sale_date).format("DD MMM YYYY, hh:mm A") : "-",
        total_amount: Number(s.total_amount || 0),
        net_amount: Number(s.net_amount || 0),
        status: s.status || "-",
      }));
      await downloadRegisterPdf({
        records,
        subtitle: `${records.length} sales · filtered list`,
        filename: "sales-list.pdf",
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err?.message || "PDF export failed");
    }
  };

  const onPreviewRegister = () => {
    const total = filteredSales.reduce((s, x) => s + Number(x.net_amount || 0), 0);
    const cash = filteredSales
      .filter((s) => String(s.payment_method || "cash").toLowerCase() === "cash")
      .reduce((s, x) => s + Number(x.net_amount || 0), 0);
    buildPrintTable(
      "Sales Register Preview",
      `<thead><tr><th>Metric</th><th>Value</th></tr></thead>
       <tbody>
         <tr><td>Sales count</td><td>${filteredSales.length}</td></tr>
         <tr><td>Net revenue</td><td>${total.toFixed(2)}</td></tr>
         <tr><td>Cash sales</td><td>${cash.toFixed(2)}</td></tr>
         <tr><td>Returns</td><td>${filteredReturns.length}</td></tr>
       </tbody>`,
    );
  };

  const onPrintAllA4 = async () => {
    const list =
      selectedRowKeys.length > 0
        ? filteredSales.filter((s) => selectedRowKeys.includes(s._id))
        : filteredSales;
    if (!list.length) {
      toast.error("No sales to print");
      return;
    }
    try {
      for (const sale of list.slice(0, 20)) {
        await openInvoicePreview(
          saleToInvoicePayload(withCashier(sale)),
          settings?.invoiceDesign?.saleTemplate ||
            settings?.invoiceDesign?.template ||
            "modern_sale_a4",
        );
      }
      if (list.length > 20) toast.info("Printed first 20 invoices");
    } catch (err) {
      toast.error(err?.message || "Failed to print invoices");
    }
  };

  const statusBadge = (status) => {
    const st = String(status || "").toLowerCase();
    if (["completed", "paid", "done", "approved"].includes(st)) {
      return (
        <span className="modern-crud-badge is-ok">
          <Check size={12} /> {String(status).toUpperCase()}
        </span>
      );
    }
    if (["pending", "partial", "partially_returned"].includes(st)) {
      return <span className="modern-crud-badge is-warn">{String(status).replace(/_/g, " ").toUpperCase()}</span>;
    }
    if (["cancelled", "canceled", "returned", "rejected"].includes(st)) {
      return <span className="modern-crud-badge is-danger">{String(status).toUpperCase()}</span>;
    }
    return status;
  };

  const saleDataSource = useMemo(
    () =>
      filteredSales.map((s, i) => ({
        key: s._id || String(i),
        index: i + 1,
        id: s._id,
        raw: s,
        invoice: s.invoice_no || "-",
        datetime: s.sale_date ? dayjs(s.sale_date).format("DD MMM YYYY, hh:mm A") : "-",
        customer: s.customer_name || "Walk-in Customer",
        total: Number(s.total_amount || 0),
        net: Number(s.net_amount || 0),
        status: s.status || "-",
      })),
    [filteredSales],
  );

  const returnDataSource = useMemo(
    () =>
      filteredReturns.map((r, i) => ({
        key: r._id || String(i),
        index: i + 1,
        invoice: r.sale_id?.invoice_no || "-",
        product: r.product_id?.name || r.product_name || "-",
        qty: r.quantity ?? "-",
        reason: r.reason || "-",
        amount: Number(r.refund_amount || 0),
        status: r.status || "-",
        date: r.return_date || r.createdAt
          ? dayjs(r.return_date || r.createdAt).format("DD MMM YYYY, hh:mm A")
          : "-",
      })),
    [filteredReturns],
  );

  const saleColumns = [
    { title: "#", dataIndex: "index", width: 56 },
    {
      title: "Invoice No",
      dataIndex: "invoice",
      sorter: (a, b) => String(a.invoice).localeCompare(String(b.invoice)),
      render: (v) => <IdBadge value={v} />,
    },
    {
      title: "Date & Time",
      dataIndex: "datetime",
      sorter: (a, b) => String(a.datetime).localeCompare(String(b.datetime)),
      render: (v) => <span className="mc-value-badge is-neutral">{v}</span>,
    },
    {
      title: "Customer",
      dataIndex: "customer",
      sorter: (a, b) => String(a.customer).localeCompare(String(b.customer)),
    },
    {
      title: "Total Amount",
      dataIndex: "total",
      sorter: (a, b) => a.total - b.total,
      render: (v) => <MoneyBadge value={v} tone="muted" />,
    },
    {
      title: "Net Amount",
      dataIndex: "net",
      sorter: (a, b) => a.net - b.net,
      render: (v) => <MoneyBadge value={v} tone="info" />,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: statusBadge,
    },
    {
      title: "Action",
      width: 140,
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button
            type="button"
            className="modern-crud-icon-btn"
            title="View invoice"
            onClick={() => onViewOrPrint(row.raw)}
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn"
            title="Print invoice"
            onClick={() => onPrintDirect(row.raw)}
          >
            <Printer size={15} />
          </button>
          {canReturn(row.raw) ? (
            <button
              type="button"
              className="modern-crud-icon-btn"
              title="Process return"
              onClick={() => setReturnSale(row.raw)}
            >
              <RotateCcw size={15} />
            </button>
          ) : null}
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
    { title: "#", dataIndex: "index", width: 56 },
    {
      title: "Invoice No",
      dataIndex: "invoice",
      render: (v) => <IdBadge value={v} />,
    },
    { title: "Product", dataIndex: "product" },
    {
      title: "Qty",
      dataIndex: "qty",
      width: 80,
      render: (v) => <span className="mc-value-badge is-qty is-dark">{v}</span>,
    },
    { title: "Reason", dataIndex: "reason" },
    {
      title: "Refund",
      dataIndex: "amount",
      render: (v) => <MoneyBadge value={v} tone="warn" />,
    },
    { title: "Status", dataIndex: "status", render: statusBadge },
    {
      title: "Date",
      dataIndex: "date",
      render: (v) => <span className="mc-value-badge is-neutral">{v}</span>,
    },
  ];

  const showingReturns = mainTab === "returns";

  return (
    <>
      <ModernCrudShell
        title="Sales Management"
        subtitle={`${stats.totalSales} sales in view · ${stats.returns} returns`}
        icon={<ShoppingCart size={18} />}
        addLabel="Open POS"
        addTo={route.pos}
        headerExtra={
          <>
            <button type="button" className="btn modern-crud-io-btn" onClick={onExportExcel} disabled={busyExport}>
              Excel
            </button>
            <button type="button" className="btn modern-crud-io-btn" onClick={onExportPdf}>
              <FileText size={15} />
              PDF
            </button>
            <button type="button" className="btn modern-crud-io-btn" onClick={onPreviewRegister}>
              Preview register
            </button>
            <button type="button" className="btn modern-crud-io-btn" onClick={onPrintAllA4}>
              <Printer size={15} />
              Print all (A4)
            </button>
          </>
        }
      >
        <div className="stock-stat-grid">
          <div className="stock-stat-card">
            <div className="stock-stat-label">Total sales</div>
            <div className="stock-stat-value">{stats.totalSales}</div>
            <div className="stock-stat-hint">Matching filters</div>
            <div className="stock-stat-spark is-purple" aria-hidden="true" />
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Total revenue</div>
            <div className="stock-stat-value stock-stat-value--sm">{money(stats.revenue)}</div>
            <div className="stock-stat-hint">Net from completed sales</div>
            <div className="stock-stat-spark is-amber" aria-hidden="true" />
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Completed orders</div>
            <div className="stock-stat-value po-stat-received">{stats.completed}</div>
            <div className="stock-stat-hint">Successful checkouts</div>
            <div className="stock-stat-spark is-green" aria-hidden="true" />
          </div>
          <div className="stock-stat-card">
            <div className="stock-stat-label">Returns</div>
            <div className="stock-stat-value">{stats.returns}</div>
            <div className="stock-stat-hint">Returned / refund flow</div>
            <div className="stock-stat-spark is-blue" aria-hidden="true" />
          </div>
        </div>

        <div className="modern-crud-tabs" role="tablist">
          {[
            { key: "active", label: "Active Sales", count: rows.filter((s) => isCompleted(String(s.status || "").toLowerCase())).length },
            { key: "history", label: "Sales History", count: rows.filter((s) => isReturnedLike(String(s.status || "").toLowerCase()) || String(s.status).toLowerCase() === "partially_returned").length },
            { key: "returns", label: "Returns", count: returnRows.length },
            { key: "all", label: "All Sales", count: rows.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`modern-crud-tab${mainTab === tab.key ? " active" : ""}`}
              onClick={() => setMainTab(tab.key)}
            >
              {tab.label}
              <span className="modern-crud-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <CrudListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by customer or invoice"
          totalRecords={showingReturns ? filteredReturns.length : filteredSales.length}
          filterLabel="Status"
          filterValue={statusFilter}
          onFilterChange={setStatusFilter}
          filterOptions={
            showingReturns
              ? []
              : [
                  { value: "all", label: "All Status" },
                  { value: "completed", label: "Completed" },
                  { value: "partially_returned", label: "Partially returned" },
                  { value: "returned", label: "Returned" },
                  { value: "cancelled", label: "Cancelled" },
                ]
          }
          dateMode={dateMode}
          onDateModeChange={setDateMode}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onRangeFromChange={setRangeFrom}
          onRangeToChange={setRangeTo}
        />

        <div className="modern-crud-table">
          {showingReturns ? (
            <Table
              columns={returnColumns}
              dataSource={returnDataSource}
              loading={returnsLoading}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
              locale={{ emptyText: returnsLoading ? "Loading..." : "No returns found" }}
              scroll={{ x: 1000 }}
            />
          ) : (
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              columns={saleColumns}
              dataSource={saleDataSource}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
              locale={{ emptyText: loading ? "Loading..." : "No sales found" }}
              scroll={{ x: 1100 }}
            />
          )}
        </div>
      </ModernCrudShell>

      <SaleInvoiceModal
        show={Boolean(invoiceSale)}
        sale={invoiceSale}
        template={
          settings?.invoiceDesign?.saleTemplate || settings?.invoiceDesign?.template
        }
        onClose={() => setInvoiceSale(null)}
      />

      <ProcessReturnModal
        show={Boolean(returnSale)}
        sale={returnSale}
        onClose={() => setReturnSale(null)}
        onSuccess={() => reload()}
      />
    </>
  );
};

export default SalesList;
