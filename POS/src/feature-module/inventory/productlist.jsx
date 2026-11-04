import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table } from "antd";
import { Modal, Button } from "react-bootstrap";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Box, Edit, Eye, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  createProductAction,
  deleteProductAction,
  fetchAllProductsAction,
  updateProductAction,
} from "../../redux/products/productSlice";
import { fetchAllCategoriesAction } from "../../redux/categories/categorySlice";
import { uploadProductImage } from "../../redux/products/productService";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import { IdBadge, MoneyBadge, QtyBadge } from "../../core/components/CrudValueBadge";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import ModernViewDialog from "../../core/components/ModernViewDialog";
import ProductFormTabs from "../../core/components/ProductFormTabs";
import { getApiBase } from "../../config/runtimeConfig";

const emptyForm = {
  name: "",
  sku: "",
  batch_number: "",
  expiry_date: null,
  available_quantity: "",
  minimum_stock_alert: "0",
  unit_price: "",
  supplier_name: "",
  manufacturer: "",
  category: null,
  rack_location: "",
  discount: "0",
  gst: "0",
  alternative_medicines: "",
  image: "",
  storage_instructions: "",
  notes: "",
  is_prescription_required: false,
  status: "active",
  manufacturer_license_no: "",
  medicine_size: "",
  manufacturer_registration_no: "",
};

const resolveProductImage = (image) => {
  if (!image) return "assets/img/products/product1.jpg";
  if (/^https?:\/\//i.test(image) || image.startsWith("data:") || image.startsWith("blob:")) {
    return image;
  }
  if (image.startsWith("/uploads/") || image.startsWith("/api/") || image.includes("/api/uploads/")) {
    const origin = getApiBase().replace(/\/api\/?$/, "");
    return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
  }
  return image;
};

const parseAlternatives = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const ProductList = () => {
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const fileInputRef = useRef(null);
  const { products, loading, error } = useSelector((state) => state.products);
  const { categories, loading: categoriesLoading } = useSelector((state) => state.categories);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    dispatch(fetchAllProductsAction());
    dispatch(fetchAllCategoriesAction());
  }, [dispatch]);

  const productRows = Array.isArray(products) ? products : [];

  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c._id, label: c.name })),
    [categories],
  );

  const tabCounts = useMemo(() => {
    const low = productRows.filter((p) => {
      const qty = Number(p.available_quantity ?? 0);
      return qty > 0 && qty <= 5;
    }).length;
    const out = productRows.filter((p) => Number(p.available_quantity ?? 0) <= 0).length;
    const inStock = productRows.filter((p) => Number(p.available_quantity ?? 0) > 5).length;
    return { all: productRows.length, inStock, low, out };
  }, [productRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productRows.filter((item) => {
      const catName = item.category?.name || "";
      const catId = item.category?._id || item.category || "";
      const hay = `${item.name || ""} ${item.sku || ""} ${catName} ${item.supplier_name || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (categoryFilter !== "all" && String(catId) !== categoryFilter) return false;
      const qty = Number(item.available_quantity ?? 0);
      if (activeTab === "inStock" && qty <= 5) return false;
      if (activeTab === "low" && !(qty > 0 && qty <= 5)) return false;
      if (activeTab === "out" && qty > 0) return false;
      return true;
    });
  }, [productRows, search, categoryFilter, activeTab]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setImagePreview("");
    setShowModal(true);
  };

  const openEdit = (row) => {
    const source = productRows.find((p) => p._id === row.id) || row;
    const catId = source.category?._id || source.category || "";
    setEditId(source._id || row.id);
    setForm({
      name: source.name || "",
      sku: source.sku || "",
      batch_number: source.batch_number || "",
      expiry_date: source.expiry_date ? dayjs(source.expiry_date) : null,
      available_quantity: String(source.available_quantity ?? ""),
      minimum_stock_alert: String(source.minimum_stock_alert ?? 0),
      unit_price: String(source.unit_price ?? ""),
      supplier_name: source.supplier_name || "",
      manufacturer: source.manufacturer || "",
      category: categoryOptions.find((o) => o.value === catId) || null,
      rack_location: source.rack_location || "",
      discount: String(source.discount ?? 0),
      gst: String(source.gst ?? source.tax ?? 0),
      alternative_medicines: Array.isArray(source.alternative_medicines)
        ? source.alternative_medicines.join(", ")
        : "",
      image: source.image || "",
      storage_instructions: source.storage_instructions || "",
      notes: source.notes || "",
      is_prescription_required: Boolean(source.is_prescription_required),
      status: source.status === "inactive" ? "inactive" : "active",
      manufacturer_license_no: source.manufacturer_license_no || "",
      medicine_size: source.medicine_size || "",
      manufacturer_registration_no: source.manufacturer_registration_no || "",
    });
    setImagePreview(source.image ? resolveProductImage(source.image) : "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
    setImagePreview("");
    setDragging(false);
  };

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setUploading(true);
    try {
      const imageUrl = await uploadProductImage(file);
      onChange("image", imageUrl);
      setImagePreview(imageUrl);
      toast.success("Image uploaded");
    } catch (err) {
      setImagePreview("");
      onChange("image", "");
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickImage = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    await uploadFile(file);
    input.value = "";
  };

  const clearImage = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setImagePreview("");
    onChange("image", "");
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    await uploadFile(file);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Product name is required");
    if (!form.batch_number.trim()) return toast.error("Batch number is required");
    if (!form.expiry_date) return toast.error("Expiry date is required");
    if (!form.category?.value) return toast.error("Category is required");
    if (form.available_quantity === "" || Number(form.available_quantity) < 0) {
      return toast.error("Available quantity is required");
    }
    if (form.unit_price === "" || Number(form.unit_price) < 0) {
      return toast.error("Unit price is required");
    }
    if (!form.supplier_name.trim()) return toast.error("Supplier name is required");
    if (uploading) return toast.info("Please wait for image upload to finish");

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      batch_number: form.batch_number.trim(),
      expiry_date: dayjs(form.expiry_date).toISOString(),
      available_quantity: Number(form.available_quantity),
      minimum_stock_alert: Number(form.minimum_stock_alert || 0),
      unit_price: Number(form.unit_price),
      supplier_name: form.supplier_name.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      category: form.category.value,
      rack_location: form.rack_location.trim() || undefined,
      discount: Number(form.discount || 0),
      gst: Number(form.gst || 0),
      alternative_medicines: parseAlternatives(form.alternative_medicines),
      image: form.image || undefined,
      storage_instructions: form.storage_instructions.trim() || undefined,
      notes: form.notes.trim() || undefined,
      is_prescription_required: Boolean(form.is_prescription_required),
      status: form.status === "inactive" ? "inactive" : "active",
      manufacturer_license_no: form.manufacturer_license_no.trim() || undefined,
      medicine_size: form.medicine_size.trim() || undefined,
      manufacturer_registration_no: form.manufacturer_registration_no.trim() || undefined,
    };

    if (editId) {
      dispatch(updateProductAction(editId, payload));
      toast.success("Product updated");
    } else {
      dispatch(createProductAction(payload));
      toast.success("Product created");
    }
    closeModal();
  };

  const confirmDelete = (id) => {
    MySwal.fire({
      title: "Delete product?",
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteProductAction(id));
    });
  };

  const dataSource = useMemo(
    () =>
      filtered.map((item, index) => ({
        key: item._id || String(index),
        index: index + 1,
        id: item._id,
        raw: item,
        name: item.name || "-",
        sku: item.sku || "-",
        batch: item.batch_number || "-",
        expiry: item.expiry_date ? dayjs(item.expiry_date).format("YYYY-MM-DD") : "-",
        category: item.category?.name || "-",
        price: item.unit_price != null ? Number(item.unit_price).toFixed(2) : "-",
        priceNum: Number(item.unit_price || 0),
        qty: item.available_quantity ?? 0,
        minAlert: item.minimum_stock_alert ?? 0,
        totalValue:
          item.total_value != null
            ? Number(item.total_value).toFixed(2)
            : (Number(item.unit_price || 0) * Number(item.available_quantity || 0)).toFixed(2),
        supplier: item.supplier_name || "-",
        manufacturer: item.manufacturer || "-",
        rack: item.rack_location || "-",
        discount: item.discount != null ? `${item.discount}%` : "-",
        gst: item.gst != null ? `${item.gst}%` : "-",
        size: item.medicine_size || "-",
        status: item.status === "inactive" ? "inactive" : "active",
        rx: Boolean(item.is_prescription_required),
        image: resolveProductImage(item.image),
        hasRemoteImage: Boolean(
          item.image &&
            (/^https?:\/\//i.test(item.image) ||
              String(item.image).includes("/api/uploads/") ||
              String(item.image).startsWith("/uploads/")),
        ),
      })),
    [filtered],
  );

  const productViewHighlights = useMemo(() => {
    if (!viewItem) return [];
    const p = viewItem;
    const qty = Number(p.available_quantity ?? 0);
    const money = (n) =>
      `PKR ${Number(n || 0).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    return [
      { label: "Unit price", value: money(p.unit_price), tone: "info" },
      {
        label: "In stock",
        value: qty,
        tone: qty <= 0 ? "danger" : qty <= 5 ? "warn" : "ok",
      },
      {
        label: "Stock value",
        value: money(p.total_value ?? Number(p.unit_price || 0) * qty),
        tone: "ok",
      },
      {
        label: "Category",
        value: p.category?.name || p.category || "—",
        tone: "neutral",
      },
    ];
  }, [viewItem]);

  const productViewSections = useMemo(() => {
    if (!viewItem) return [];
    const p = viewItem;
    const money = (n) =>
      n == null || n === ""
        ? null
        : `PKR ${Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return [
      {
        title: "Product identity",
        fields: [
          { label: "Product name", value: p.name },
          { label: "SKU", value: p.sku, mono: true },
          { label: "Batch number", value: p.batch_number, mono: true },
          {
            label: "Expiry date",
            value: p.expiry_date ? dayjs(p.expiry_date).format("MMM D, YYYY") : null,
          },
          { label: "Medicine size", value: p.medicine_size },
          {
            label: "Prescription required",
            value: p.is_prescription_required,
            type: "bool",
          },
          { label: "Status", value: p.status === "inactive" ? "Inactive" : "Active" },
          { label: "Rack location", value: p.rack_location },
        ],
      },
      {
        title: "Pricing & tax",
        fields: [
          { label: "Unit price", value: money(p.unit_price) },
          {
            label: "Total stock value",
            value: money(
              p.total_value ?? Number(p.unit_price || 0) * Number(p.available_quantity || 0),
            ),
          },
          { label: "Discount", value: p.discount != null ? `${p.discount}%` : null },
          { label: "GST / Tax", value: (p.gst ?? p.tax) != null ? `${p.gst ?? p.tax}%` : null },
          { label: "Available quantity", value: p.available_quantity },
          { label: "Minimum stock alert", value: p.minimum_stock_alert },
        ],
      },
      {
        title: "Supplier & manufacturer",
        fields: [
          { label: "Supplier", value: p.supplier_name },
          { label: "Manufacturer", value: p.manufacturer },
          { label: "License number", value: p.manufacturer_license_no, mono: true },
          { label: "Registration number", value: p.manufacturer_registration_no, mono: true },
        ],
      },
      {
        title: "Notes & history",
        fullWidth: true,
        fields: [
          {
            label: "Alternative medicines",
            value: Array.isArray(p.alternative_medicines)
              ? p.alternative_medicines
              : p.alternative_medicines,
            type: "list",
            span: 2,
            hideIfEmpty: true,
          },
          {
            label: "Storage instructions",
            value: p.storage_instructions,
            span: 2,
            hideIfEmpty: true,
          },
          { label: "Notes", value: p.notes, span: 2, hideIfEmpty: true },
          {
            label: "Created",
            value: p.createdAt ? dayjs(p.createdAt).format("MMM D, YYYY h:mm A") : null,
          },
          {
            label: "Last updated",
            value: p.updatedAt ? dayjs(p.updatedAt).format("MMM D, YYYY h:mm A") : null,
          },
        ],
      },
    ];
  }, [viewItem]);

  const stockBadge = (qty) => {
    if (qty <= 0) return <span className="modern-crud-badge is-danger">Out</span>;
    if (qty <= 5) return <span className="modern-crud-badge is-warn">Low</span>;
    return <span className="modern-crud-badge is-ok">In stock</span>;
  };

  const columns = [
    { title: "#", dataIndex: "index", width: 56 },
    {
      title: "Product",
      dataIndex: "name",
      sorter: (a, b) => String(a.name).localeCompare(String(b.name)),
      render: (text, record) => (
        <div className="mc-cell-product">
          {record.hasRemoteImage ? (
            <img alt={text} src={record.image} className="mc-cell-product__img" />
          ) : (
            <span className="mc-cell-product__img is-fallback">
              <ImageWithBasePath alt={text} src={record.image} />
            </span>
          )}
          <div className="mc-cell-stack">
            <div className="mc-cell-title">{text}</div>
            <div className="mc-cell-meta">
              <IdBadge value={record.sku} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      sorter: (a, b) => String(a.category).localeCompare(String(b.category)),
      render: (v) => <span className="mc-value-badge is-neutral">{v}</span>,
    },
    {
      title: "Price",
      dataIndex: "price",
      render: (v) => <MoneyBadge value={v} tone="info" prefix="PKR" />,
      sorter: (a, b) => a.priceNum - b.priceNum,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      sorter: (a, b) => Number(a.qty) - Number(b.qty),
      render: (qty) => (
        <span className="d-inline-flex align-items-center gap-2">
          <QtyBadge
            value={qty}
            tone={Number(qty) <= 0 ? "danger" : Number(qty) <= 5 ? "warn" : "ok"}
          />
          {stockBadge(qty)}
        </span>
      ),
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      sorter: (a, b) => String(a.supplier).localeCompare(String(b.supplier)),
      ellipsis: true,
    },
    {
      title: "Action",
      width: 130,
      render: (_text, record) => (
        <div className="modern-crud-actions">
          <button
            type="button"
            className="modern-crud-icon-btn"
            onClick={() => setViewItem(record.raw)}
            title="View details"
          >
            <Eye size={15} />
          </button>
          <button type="button" className="modern-crud-icon-btn" onClick={() => openEdit(record)} title="Edit">
            <Edit size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            onClick={() => confirmDelete(record.id)}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const filterOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...(categories || []).map((c) => ({ value: c._id, label: c.name })),
    ],
    [categories],
  );

  const busy = uploading || loading || categoriesLoading;

  return (
    <>
      <ModernCrudShell
        title="Products"
        subtitle="Manage your products."
        icon={<Box size={18} />}
        totalRecords={filtered.length}
        addLabel="Add Product"
        onAdd={openCreate}
        excelResource="/products"
        excelFileName="products-export.xlsx"
        canImportExcel
        onExcelImported={() => dispatch(fetchAllProductsAction())}
      >
        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}
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
            { value: "inStock", label: "In Stock", count: tabCounts.inStock, tone: "ok" },
            { value: "low", label: "Low Stock", count: tabCounts.low, tone: "warn" },
            { value: "out", label: "Out of Stock", count: tabCounts.out, tone: "danger" },
          ]}
          tabs={[
            { key: "all", label: "All", count: tabCounts.all },
            { key: "inStock", label: "In Stock", count: tabCounts.inStock, tone: "ok" },
            { key: "low", label: "Low Stock", count: tabCounts.low, tone: "warn" },
            { key: "out", label: "Out of Stock", count: tabCounts.out, tone: "danger" },
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
            locale={{ emptyText: loading ? "Loading..." : "No products found" }}
          />
        </div>
      </ModernCrudShell>

      <ModernViewDialog
        show={Boolean(viewItem)}
        onHide={() => setViewItem(null)}
        title={viewItem?.name || "Product"}
        subtitle={viewItem?.sku ? `SKU ${viewItem.sku}` : "Product details"}
        imageUrl={viewItem?.image ? resolveProductImage(viewItem.image) : ""}
        imageAlt={viewItem?.name || "Product"}
        badge={
          viewItem ? (
            <span
              className={`modern-crud-badge ${
                viewItem.status === "inactive" ? "is-danger" : "is-ok"
              }`}
            >
              {viewItem.status === "inactive" ? "Inactive" : "Active"}
            </span>
          ) : null
        }
        highlights={productViewHighlights}
        sections={productViewSections}
        sectionColumns={2}
        size="lg"
        footerExtra={
          viewItem ? (
            <Button
              className="modern-form-submit"
              onClick={() => {
                const row = dataSource.find((r) => r.id === viewItem._id);
                setViewItem(null);
                if (row) openEdit(row);
              }}
            >
              Edit product
            </Button>
          ) : null
        }
      />

      <Modal show={showModal} onHide={closeModal} centered size="xl" scrollable dialogClassName="modern-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Edit Product" : "Add Product"}</Modal.Title>
        </Modal.Header>
        <form onSubmit={onSubmit} noValidate>
          <Modal.Body>
            <ProductFormTabs
              key={editId || "new-product"}
              form={form}
              onChange={onChange}
              categoryOptions={categoryOptions}
              imagePreview={imagePreview}
              uploading={uploading}
              dragging={dragging}
              setDragging={setDragging}
              onPickImage={onPickImage}
              onDrop={onDrop}
              onClearImage={clearImage}
              fileInputRef={fileInputRef}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="modern-form-cancel" onClick={closeModal} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" className="modern-form-submit" disabled={busy}>
              {uploading ? "Wait for upload…" : editId ? "Update Product" : "Create Product"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default ProductList;
