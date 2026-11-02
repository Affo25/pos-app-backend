import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Edit, Trash2, User } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import {
  createCustomerAction,
  deleteCustomerAction,
  fetchAllCustomersAction,
  updateCustomerAction,
} from "../../redux/customers/customerSlice";

const empty = {
  name: "",
  phone: "",
  email: "",
  address: "",
  opening_balance: "0",
  opening_balance_note: "",
};

const Customers = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { customers, loading } = useSelector((state) => state.customers);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllCustomersAction());
  }, [dispatch]);

  const rows = Array.isArray(customers) ? customers : [];

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      with: rows.filter((c) => !!c.email).length,
      without: rows.filter((c) => !c.email).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      const hay = `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.address || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (activeTab === "with" && !c.email) return false;
      if (activeTab === "without" && c.email) return false;
      return true;
    });
  }, [rows, search, activeTab]);

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditId(row._id);
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      opening_balance: String(row.opening_balance ?? 0),
      opening_balance_note: row.opening_balance_note || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(empty);
  };

  const onChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      opening_balance: Number(form.opening_balance || 0),
      opening_balance_note: form.opening_balance_note.trim() || undefined,
    };
    if (editId) dispatch(updateCustomerAction(editId, payload));
    else dispatch(createCustomerAction(payload));
    closeModal();
  };

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete customer?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteCustomerAction(id));
    });
  };

  const dataSource = useMemo(
    () =>
      filtered.map((c, i) => ({
        key: c._id || String(i),
        index: i + 1,
        ...c,
        openingBal: Number(c.opening_balance || 0).toFixed(2),
      })),
    [filtered],
  );

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    {
      title: "Customer",
      dataIndex: "name",
      sorter: (a, b) => String(a.name).localeCompare(String(b.name)),
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (v) => v || "-",
      sorter: (a, b) => String(a.email || "").localeCompare(String(b.email || "")),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      sorter: (a, b) => String(a.phone || "").localeCompare(String(b.phone || "")),
    },
    {
      title: "Address",
      dataIndex: "address",
      render: (v) => v || "-",
    },
    {
      title: "Opening Bal.",
      dataIndex: "openingBal",
      render: (v) => `PKR ${v}`,
      sorter: (a, b) => Number(a.opening_balance || 0) - Number(b.opening_balance || 0),
    },
    {
      title: "Action",
      width: 110,
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button type="button" className="modern-crud-icon-btn" onClick={() => openEdit(row)} title="Edit">
            <Edit size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            onClick={() => onDelete(row._id)}
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
    { key: "with", label: "With Email", count: tabCounts.with, tone: "ok" },
    { key: "without", label: "No Email", count: tabCounts.without, tone: "warn" },
  ];

  return (
    <>
      <ModernCrudShell
        title="Customers"
        subtitle="Manage your customers."
        icon={<User size={18} />}
        addLabel="Add Customer"
        onAdd={openCreate}
        excelResource="/customers"
        excelFileName="customers-export.xlsx"
        canImportExcel
        onExcelImported={() => dispatch(fetchAllCustomersAction())}
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
            locale={{ emptyText: loading ? "Loading..." : "No customers found" }}
          />
        </div>
      </ModernCrudShell>

      <Modal show={showModal} onHide={closeModal} centered size="lg" dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Edit Customer" : "Add Customer"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onSubmit}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Name <span className="text-danger">*</span>
                </label>
                <input className="form-control" value={form.name} onChange={onChange("name")} required />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Phone <span className="text-danger">*</span>
                </label>
                <input className="form-control" value={form.phone} onChange={onChange("phone")} required />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={onChange("email")} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Address</label>
                <input className="form-control" value={form.address} onChange={onChange("address")} />
              </div>
              <div className="col-md-3 mb-3">
                <label className="modern-form-label">Opening balance (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.opening_balance}
                  onChange={onChange("opening_balance")}
                />
              </div>
              <div className="col-md-3 mb-3">
                <label className="modern-form-label">Balance note</label>
                <input
                  className="form-control"
                  value={form.opening_balance_note}
                  onChange={onChange("opening_balance_note")}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit">
              {editId ? "Update Customer" : "Create Customer"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default Customers;
