import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { Edit, Layers, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import { fetchAllCategoriesAction } from "../../redux/categories/categorySlice";
import {
  createSubCategoryAction,
  deleteSubCategoryAction,
  fetchAllSubCategoriesAction,
  updateSubCategoryAction,
} from "../../redux/subCategories/subCategorySlice";

const empty = { name: "", description: "", category: null };

const SubCategories = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { categories } = useSelector((state) => state.categories);
  const { subCategories, loading } = useSelector((state) => state.subCategories);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchAllCategoriesAction());
    dispatch(fetchAllSubCategoriesAction());
  }, [dispatch]);

  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c._id, label: c.name })),
    [categories],
  );

  const categoryNameById = useMemo(() => {
    const map = {};
    (categories || []).forEach((c) => {
      map[c._id] = c.name;
    });
    return map;
  }, [categories]);

  const rows = Array.isArray(subCategories) ? subCategories : [];

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      linked: rows.filter((s) => !!s.category_id).length,
      orphan: rows.filter((s) => !s.category_id).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      const catName = categoryNameById[s.category_id] || "";
      const hay = `${s.name || ""} ${s.description || ""} ${catName}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (categoryFilter !== "all" && String(s.category_id) !== categoryFilter) return false;
      if (activeTab === "linked" && !s.category_id) return false;
      if (activeTab === "orphan" && s.category_id) return false;
      return true;
    });
  }, [rows, search, categoryFilter, activeTab, categoryNameById]);

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditId(row._id);
    setForm({
      name: row.name || "",
      description: row.description || "",
      category:
        categoryOptions.find((o) => o.value === row.category_id) || {
          value: row.category_id,
          label: categoryNameById[row.category_id] || "Category",
        },
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(empty);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category?.value) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category_id: form.category.value,
    };
    if (editId) dispatch(updateSubCategoryAction(editId, payload));
    else dispatch(createSubCategoryAction(payload));
    closeModal();
  };

  const onDelete = (id) => {
    MySwal.fire({
      title: "Delete subcategory?",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteSubCategoryAction(id));
    });
  };

  const dataSource = useMemo(
    () =>
      filtered.map((s, i) => ({
        key: s._id || String(i),
        index: i + 1,
        ...s,
        categoryName: categoryNameById[s.category_id] || "-",
      })),
    [filtered, categoryNameById],
  );

  const columns = [
    { title: "#", dataIndex: "index", width: 60 },
    {
      title: "Sub Category",
      dataIndex: "name",
      sorter: (a, b) => String(a.name).localeCompare(String(b.name)),
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      sorter: (a, b) => String(a.categoryName).localeCompare(String(b.categoryName)),
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (v) => v || "-",
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

  const filterOptions = useMemo(
    () => [{ value: "all", label: "All categories" }, ...categoryOptions.map((c) => ({ value: c.value, label: c.label }))],
    [categoryOptions],
  );

  return (
    <>
      <ModernCrudShell
        title="Sub Categories"
        subtitle="Manage your sub categories."
        icon={<Layers size={18} />}
        addLabel="Add Sub Category"
        onAdd={openCreate}
        excelResource="/subCategorys"
        excelFileName="subcategories-export.xlsx"
        canImportExcel
        onExcelImported={() => dispatch(fetchAllSubCategoriesAction())}
      >
        <CrudListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search"
          totalRecords={filtered.length}
          filterLabel="Category"
          filterValue={categoryFilter}
          onFilterChange={setCategoryFilter}
          filterOptions={filterOptions}
          showFiltersButton
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          stockFilterValue={activeTab}
          onStockFilterChange={setActiveTab}
          stockFilterOptions={[
            { value: "all", label: "All", count: tabCounts.all },
            { value: "linked", label: "Linked", count: tabCounts.linked, tone: "ok" },
            { value: "orphan", label: "Unlinked", count: tabCounts.orphan, tone: "danger" },
          ]}
          tabs={[
            { key: "all", label: "All", count: tabCounts.all },
            { key: "linked", label: "Linked", count: tabCounts.linked, tone: "ok" },
            { key: "orphan", label: "Unlinked", count: tabCounts.orphan, tone: "danger" },
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
            locale={{ emptyText: loading ? "Loading..." : "No sub categories found" }}
          />
        </div>
      </ModernCrudShell>

      <Modal show={showModal} onHide={closeModal} centered size="lg" dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Edit Sub Category" : "Add Sub Category"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onSubmit}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">
                  Category <span className="text-danger">*</span>
                </label>
                <Select
                  classNamePrefix="react-select"
                  options={categoryOptions}
                  value={form.category}
                  onChange={(opt) => setForm((p) => ({ ...p, category: opt }))}
                  placeholder="Select category"
                />
              </div>
              <div className="col-md-6 mb-3">
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
              <div className="col-12 mb-3">
                <label className="modern-form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Optional details"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit">
              {editId ? "Update Sub Category" : "Create Sub Category"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default SubCategories;
