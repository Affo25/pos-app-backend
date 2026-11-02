import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Edit, Grid, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import dayjs from "dayjs";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import {
  createCategoryAction,
  deleteCategoryAction,
  fetchAllCategoriesAction,
  updateCategoryAction,
} from "../../redux/categories/categorySlice";

const empty = { name: "", description: "" };

const CategoryList = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { categories, loading } = useSelector((state) => state.categories);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllCategoriesAction());
  }, [dispatch]);

  const rows = Array.isArray(categories) ? categories : [];

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      described: rows.filter((c) => !!String(c.description || "").trim()).length,
      plain: rows.filter((c) => !String(c.description || "").trim()).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      const hay = `${c.name || ""} ${c.description || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const hasDesc = !!String(c.description || "").trim();
      if (activeTab === "described" && !hasDesc) return false;
      if (activeTab === "plain" && hasDesc) return false;
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
    setForm({ name: row.name || "", description: row.description || "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(empty);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    };
    if (editId) dispatch(updateCategoryAction(editId, payload));
    else dispatch(createCategoryAction(payload));
    closeModal();
  };

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete category?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteCategoryAction(id));
    });
  };

  const dataSource = useMemo(
    () =>
      filtered.map((c, i) => ({
        key: c._id || String(i),
        index: i + 1,
        ...c,
        created: c.createdAt ? dayjs(c.createdAt).format("YYYY-MM-DD") : "-",
      })),
    [filtered],
  );

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    {
      title: "Category",
      dataIndex: "name",
      sorter: (a, b) => String(a.name).localeCompare(String(b.name)),
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (v) => v || "-",
    },
    {
      title: "Created",
      dataIndex: "created",
      sorter: (a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
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

  return (
    <>
      <ModernCrudShell
        title="Categories"
        subtitle="Manage your categories."
        icon={<Grid size={18} />}
        addLabel="Add Category"
        onAdd={openCreate}
        excelResource="/categorys"
        excelFileName="categories-export.xlsx"
        canImportExcel
        onExcelImported={() => dispatch(fetchAllCategoriesAction())}
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
          stockFilterOptions={[
            { value: "all", label: "All", count: tabCounts.all },
            { value: "described", label: "With Description", count: tabCounts.described, tone: "ok" },
            { value: "plain", label: "No Description", count: tabCounts.plain, tone: "warn" },
          ]}
          tabs={[
            { key: "all", label: "All", count: tabCounts.all },
            { key: "described", label: "With Description", count: tabCounts.described, tone: "ok" },
            { key: "plain", label: "No Description", count: tabCounts.plain, tone: "warn" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="modern-crud-table">
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
            locale={{ emptyText: loading ? "Loading..." : "No categories found" }}
          />
        </div>
      </ModernCrudShell>

      <Modal show={showModal} onHide={closeModal} centered dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Edit Category" : "Add Category"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onSubmit}>
          <Modal.Body>
            <div className="mb-3">
              <label className="modern-form-label">
                Name <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="mb-3">
              <label className="modern-form-label">Description</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Optional details"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit">
              {editId ? "Update Category" : "Create Category"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default CategoryList;
