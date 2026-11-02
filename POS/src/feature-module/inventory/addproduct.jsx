import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Select from "react-select";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { all_routes } from "../../Router/all_routes";
import { createProductAction } from "../../redux/products/productSlice";
import { fetchAllCategoriesAction } from "../../redux/categories/categorySlice";
import { uploadProductImage } from "../../redux/products/productService";
import { PlusCircle, X } from "feather-icons-react/build/IconComponents";

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
  tax: "0",
  image: "",
  notes: "",
};

const AddProduct = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useSelector(
    (state) => state.categories,
  );
  const { loading: productLoading } = useSelector((state) => state.products);

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    dispatch(fetchAllCategoriesAction());
  }, [dispatch]);

  const categoryOptions = useMemo(
    () =>
      (categories || []).map((c) => ({
        value: c._id,
        label: c.name,
      })),
    [categories],
  );

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
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

    try {
      let imageUrl = form.image || "";
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadProductImage(imageFile);
      }

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
        tax: Number(form.tax || 0),
        notes: form.notes.trim() || undefined,
        image: imageUrl || undefined,
      };

      dispatch(createProductAction(payload));
      toast.success("Product created");
      navigate(route.productlist);
    } catch (err) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading || productLoading || categoriesLoading;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>New Product</h4>
              <h6>Create product and upload image to Cloudflare R2</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <div className="page-btn">
                <Link to={route.productlist} className="btn btn-secondary">
                  Back to Product List
                </Link>
              </div>
            </li>
          </ul>
        </div>

        <form className="card" onSubmit={handleSubmit}>
          <div className="card-body">
            <div className="row">
              <div className="col-lg-8">
                <div className="row">
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Product Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => onChange("name", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>SKU</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.sku}
                        onChange={(e) => onChange("sku", e.target.value)}
                        placeholder="Leave blank to auto-generate"
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Batch Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.batch_number}
                        onChange={(e) => onChange("batch_number", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Expiry Date <span className="text-danger">*</span>
                      </label>
                      <DatePicker
                        className="form-control"
                        value={form.expiry_date ? dayjs(form.expiry_date) : null}
                        onChange={(date) => onChange("expiry_date", date)}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Category <span className="text-danger">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={categoryOptions}
                        value={form.category}
                        onChange={(opt) => onChange("category", opt)}
                        placeholder="Select category"
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Supplier Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.supplier_name}
                        onChange={(e) => onChange("supplier_name", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Quantity <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.available_quantity}
                        onChange={(e) =>
                          onChange("available_quantity", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>
                        Unit Price <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={form.unit_price}
                        onChange={(e) => onChange("unit_price", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-4 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>Min Stock Alert</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.minimum_stock_alert}
                        onChange={(e) =>
                          onChange("minimum_stock_alert", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>Manufacturer</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.manufacturer}
                        onChange={(e) => onChange("manufacturer", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label>Rack Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.rack_location}
                        onChange={(e) => onChange("rack_location", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="input-blocks">
                      <label>Notes</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => onChange("notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="input-blocks">
                  <label>Product Image</label>
                  <div className="image-upload">
                    <input type="file" accept="image/*" onChange={onPickImage} />
                    <div className="image-uploads">
                      <PlusCircle className="plus-down-add me-0" />
                      <h4>Upload Image</h4>
                    </div>
                  </div>
                </div>
                {imagePreview ? (
                  <div className="phone-img position-relative d-inline-block mt-2">
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{
                        width: 160,
                        height: 160,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute top-0 end-0"
                      onClick={clearImage}
                      style={{ transform: "translate(30%, -30%)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="col-lg-12 mt-3">
              <button type="submit" className="btn btn-submit me-2" disabled={busy}>
                {uploading ? "Uploading image..." : busy ? "Saving..." : "Create Product"}
              </button>
              <Link to={route.productlist} className="btn btn-cancel">
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
