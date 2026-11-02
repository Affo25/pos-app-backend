import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { all_routes } from "../../Router/all_routes";
import { createProductAction } from "../../redux/products/productSlice";
import { fetchAllCategoriesAction } from "../../redux/categories/categorySlice";
import { uploadProductImage } from "../../redux/products/productService";
import ProductFormTabs from "../../core/components/ProductFormTabs";

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

const parseAlternatives = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const AddProduct = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { categories, loading: categoriesLoading } = useSelector((state) => state.categories);
  const { loading: productLoading } = useSelector((state) => state.products);

  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    dispatch(fetchAllCategoriesAction());
  }, [dispatch]);

  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c._id, label: c.name })),
    [categories],
  );

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
    await uploadFile(input.files?.[0]);
    input.value = "";
  };

  const clearImage = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setImagePreview("");
    onChange("image", "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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

    dispatch(createProductAction(payload));
    toast.success("Product created");
    navigate(route.productlist);
  };

  const busy = uploading || productLoading || categoriesLoading;

  return (
    <div className="page-wrapper modern-crud-page">
      <div className="content">
        <div className="modern-crud-header modern-crud-header--outside">
          <div>
            <h4 className="modern-crud-title">New Product</h4>
            <p className="modern-crud-subtitle">Create product with full medicine details</p>
          </div>
          <Link to={route.productlist} className="btn modern-form-cancel">
            Back to list
          </Link>
        </div>

        <form className="modern-crud-shell" onSubmit={handleSubmit} noValidate>
          <ProductFormTabs
            form={form}
            onChange={onChange}
            categoryOptions={categoryOptions}
            imagePreview={imagePreview}
            uploading={uploading}
            dragging={dragging}
            setDragging={setDragging}
            onPickImage={onPickImage}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              await uploadFile(e.dataTransfer?.files?.[0]);
            }}
            onClearImage={clearImage}
            fileInputRef={fileInputRef}
          />

          <div className="d-flex justify-content-end gap-2 mt-3">
            <Link to={route.productlist} className="btn modern-form-cancel">
              Cancel
            </Link>
            <button type="submit" className="btn modern-form-submit" disabled={busy}>
              {uploading ? "Wait for upload…" : busy ? "Saving…" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
