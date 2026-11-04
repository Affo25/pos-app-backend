import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Edit, Eye, Home, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  createBranchProfileAction,
  deleteBranchProfileAction,
  fetchAllBranchProfilesAction,
  updateBranchProfileAction,
} from "../../redux/branchProfiles/branchProfileSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import ModernViewDialog from "../../core/components/ModernViewDialog";

const empty = {
  branch_name: "",
  code: "",
  vp_name: "",
  vp_title: "",
  vp_contact: "",
  vp_email: "",
  city: "",
  status: "active",
};

const BranchProfiles = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { branchProfiles, loading } = useSelector((state) => state.branchProfiles);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    dispatch(fetchAllBranchProfilesAction());
  }, [dispatch]);

  const rows = Array.isArray(branchProfiles) ? branchProfiles : [];

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((b) => String(b.status || "").toLowerCase() === "active").length,
      inactive: rows.filter((b) => String(b.status || "").toLowerCase() !== "active").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      const hay = `${b.branch_name || ""} ${b.code || ""} ${b.city || ""} ${b.vp_email || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const st = String(b.status || "").toLowerCase();
      if (activeTab === "active" && st !== "active") return false;
      if (activeTab === "inactive" && st === "active") return false;
      return true;
    });
  }, [rows, search, activeTab]);

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      branch_name: row.branch_name || "",
      code: row.code || "",
      vp_name: row.vp_name || "",
      vp_title: row.vp_title || "",
      vp_contact: row.vp_contact || "",
      vp_email: row.vp_email || "",
      city: row.city || "",
      status: row.status || "active",
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
    if (!form.branch_name.trim() || !form.code.trim()) return;
    const payload = {
      ...form,
      branch_name: form.branch_name.trim(),
      code: form.code.trim(),
      vp_name: form.vp_name.trim() || "N/A",
      vp_title: form.vp_title.trim() || "Manager",
      vp_contact: form.vp_contact.trim() || "0000000000",
      vp_email: form.vp_email.trim() || "branch@example.com",
    };
    if (editId) dispatch(updateBranchProfileAction(editId, payload));
    else dispatch(createBranchProfileAction(payload));
    closeModal();
  };

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete branch?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteBranchProfileAction(id));
    });
  };

  const dataSource = useMemo(
    () =>
      filtered.map((b, i) => ({
        key: b._id || String(i),
        index: i + 1,
        id: b._id,
        branch_name: b.branch_name,
        code: b.code,
        vp_name: b.vp_name,
        vp_title: b.vp_title,
        vp_contact: b.vp_contact,
        vp_email: b.vp_email,
        city: b.city || "-",
        status: b.status || "-",
      })),
    [filtered],
  );

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    { title: "Branch", dataIndex: "branch_name", sorter: (a, b) => String(a.branch_name).localeCompare(String(b.branch_name)) },
    { title: "Code", dataIndex: "code" },
    { title: "Contact", dataIndex: "vp_contact" },
    { title: "Email", dataIndex: "vp_email" },
    { title: "City", dataIndex: "city" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) =>
        String(status).toLowerCase() === "active" ? (
          <span className="modern-crud-badge is-ok">{status}</span>
        ) : (
          <span className="modern-crud-badge is-warn">{status}</span>
        ),
    },
    {
      title: "Action",
      width: 130,
      render: (_, row) => (
        <div className="modern-crud-actions">
          <button
            type="button"
            className="modern-crud-icon-btn"
            onClick={() => setViewItem(row)}
            title="View"
          >
            <Eye size={15} />
          </button>
          <button type="button" className="modern-crud-icon-btn" onClick={() => openEdit(row)} title="Edit">
            <Edit size={15} />
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
    { key: "active", label: "Active", count: tabCounts.active, tone: "ok" },
    { key: "inactive", label: "Inactive", count: tabCounts.inactive, tone: "warn" },
  ];

  return (
    <>
      <ModernCrudShell
        title="Branches"
        subtitle="Manage store / branch profiles."
        icon={<Home size={18} />}
        totalRecords={filtered.length}
        addLabel="Add Branch"
        onAdd={openCreate}
        excelResource="/branchProfiles"
        excelFileName="branches-export.xlsx"
        canImportExcel
        onExcelImported={() => dispatch(fetchAllBranchProfilesAction())}
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
            locale={{ emptyText: loading ? "Loading..." : "No branches found" }}
          />
        </div>
      </ModernCrudShell>

      <ModernViewDialog
        show={Boolean(viewItem)}
        onHide={() => setViewItem(null)}
        title={viewItem?.branch_name || "Branch"}
        subtitle={viewItem?.code ? `Code ${viewItem.code}` : "Branch details"}
        badge={
          viewItem ? (
            <span
              className={`modern-crud-badge ${
                String(viewItem.status).toLowerCase() === "active" ? "is-ok" : "is-warn"
              }`}
            >
              {viewItem.status || "-"}
            </span>
          ) : null
        }
        fields={[
          { label: "Branch name", value: viewItem?.branch_name },
          { label: "Code", value: viewItem?.code, mono: true },
          { label: "VP / Contact name", value: viewItem?.vp_name },
          { label: "Title", value: viewItem?.vp_title },
          { label: "Contact", value: viewItem?.vp_contact },
          { label: "Email", value: viewItem?.vp_email },
          { label: "City", value: viewItem?.city },
          { label: "Status", value: viewItem?.status },
        ]}
        footerExtra={
          viewItem ? (
            <Button
              className="modern-form-submit"
              onClick={() => {
                const row = viewItem;
                setViewItem(null);
                openEdit(row);
              }}
            >
              Edit branch
            </Button>
          ) : null
        }
      />

      <Modal show={showModal} onHide={closeModal} centered size="lg" dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Edit Branch" : "Add Branch"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onSubmit}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Branch name <span className="text-danger">*</span>
                </label>
                <input className="form-control" value={form.branch_name} onChange={onChange("branch_name")} required />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">
                  Code <span className="text-danger">*</span>
                </label>
                <input className="form-control" value={form.code} onChange={onChange("code")} required />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">City</label>
                <input className="form-control" value={form.city} onChange={onChange("city")} />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Contact person</label>
                <input className="form-control" value={form.vp_name} onChange={onChange("vp_name")} />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Title</label>
                <input className="form-control" value={form.vp_title} onChange={onChange("vp_title")} />
              </div>
              <div className="col-md-4 mb-3">
                <label className="modern-form-label">Phone</label>
                <input className="form-control" value={form.vp_contact} onChange={onChange("vp_contact")} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Email</label>
                <input type="email" className="form-control" value={form.vp_email} onChange={onChange("vp_email")} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Status</label>
                <select className="form-select" value={form.status} onChange={onChange("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit">
              {editId ? "Update Branch" : "Create Branch"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default BranchProfiles;
