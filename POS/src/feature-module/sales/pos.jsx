import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "feather-icons-react/build/IconComponents";
import { fetchAllProductsAction } from "../../redux/products/productSlice";
import { fetchAllCustomersAction } from "../../redux/customers/customerSlice";
import { fetchAllSalesAction } from "../../redux/sales/saleSlice";
import { fetchSettingsAction } from "../../redux/settings/settingSlice";
import * as saleService from "../../redux/sales/saleService";
import { getApiBase } from "../../config/runtimeConfig";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import {
  openInvoicePreview,
  saleToInvoicePayload,
} from "../../utils/invoicePrint";

const resolveProductImage = (image) => {
  if (!image) return null;
  if (/^https?:\/\//i.test(image) || image.startsWith("data:") || image.startsWith("blob:")) {
    return image;
  }
  if (image.startsWith("/uploads/") || image.startsWith("/api/") || image.includes("/api/uploads/")) {
    const origin = getApiBase().replace(/\/api\/?$/, "");
    return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
  }
  return image;
};

const Pos = () => {
  const dispatch = useDispatch();
  const { products, loading: productsLoading } = useSelector((state) => state.products);
  const { customers } = useSelector((state) => state.customers);
  const { loading: saleLoading } = useSelector((state) => state.sales);
  const settings = useSelector((state) => state.settings?.settings);
  const posLayout = settings?.invoiceDesign?.posLayout === "gridview" ? "gridview" : "tabular";
  const invoiceTemplate = settings?.invoiceDesign?.template || undefined;

  const [customer, setCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [amountReceived, setAmountReceived] = useState("");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    dispatch(fetchAllProductsAction());
    dispatch(fetchAllCustomersAction());
    dispatch(fetchSettingsAction());
  }, [dispatch]);

  const customerOptions = useMemo(
    () =>
      (customers || []).map((c) => ({
        value: c._id,
        label: `${c.name}${c.phone ? ` (${c.phone})` : ""}`,
        name: c.name,
      })),
    [customers],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(products) ? products : [];
    if (!q) return list;
    return list.filter((p) => {
      const hay = `${p.name || ""} ${p.sku || ""} ${p.category?.name || ""} ${p.batch_number || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, search]);

  const addToCart = (product) => {
    const stock = Number(product.available_quantity ?? 0);
    if (stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product._id);
      if (existing) {
        if (existing.quantity + 1 > stock) {
          toast.error(`Only ${stock} available`);
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product._id
            ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.unit_price }
            : i,
        );
      }
      const unit_price = Number(product.unit_price || 0);
      return [
        ...prev,
        {
          product_id: product._id,
          product_name: product.name,
          image: product.image,
          quantity: 1,
          unit_price,
          discount: 0,
          tax: 0,
          line_total: unit_price,
          max_qty: stock,
        },
      ];
    });
  };

  const updateQty = (productId, quantity) => {
    const item = cart.find((i) => i.product_id === productId);
    const max = Number(item?.max_qty || 9999);
    const qty = Math.max(1, Math.min(max, Number(quantity) || 1));
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId
          ? { ...i, quantity: qty, line_total: qty * i.unit_price }
          : i,
      ),
    );
  };

  const bumpQty = (productId, delta) => {
    const item = cart.find((i) => i.product_id === productId);
    if (!item) return;
    updateQty(productId, item.quantity + delta);
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const totals = useMemo(() => {
    const total_amount = cart.reduce((sum, i) => sum + Number(i.line_total || 0), 0);
    return {
      total_amount,
      discount_amount: 0,
      tax_amount: 0,
      net_amount: total_amount,
    };
  }, [cart]);

  const checkout = async () => {
    if (!cart.length) {
      toast.error("Add at least one product");
      return;
    }
    const payload = {
      customer_id: customer?.value || undefined,
      customer_name: customer?.name || "Walk-in Customer",
      items: cart.map(({ product_id, product_name, quantity, unit_price, discount, tax, line_total }) => ({
        product_id,
        product_name,
        quantity,
        unit_price,
        discount,
        tax,
        line_total,
      })),
      total_amount: totals.total_amount,
      discount_amount: 0,
      tax_amount: 0,
      net_amount: totals.net_amount,
      amount_received: Number(amountReceived || totals.net_amount),
      payment_method: paymentMethod,
      sale_date: new Date().toISOString(),
      status: "completed",
    };
    setCheckingOut(true);
    try {
      const sale = await saleService.createSale(payload);
      toast.success("Sale completed");
      setCart([]);
      setAmountReceived("");
      setCustomer(null);
      dispatch(fetchAllProductsAction());
      dispatch(fetchAllSalesAction());
      try {
        await openInvoicePreview(saleToInvoicePayload(sale), invoiceTemplate);
      } catch (printErr) {
        toast.error(printErr?.message || "Sale saved, but invoice PDF failed");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to complete sale");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="page-wrapper modern-crud-page pos-page">
      <div className="content">
        <div className="modern-crud-header modern-crud-header--outside">
          <div>
            <h4 className="modern-crud-title">
              <span className="modern-crud-title-icon">
                <ShoppingCart size={18} />
              </span>
              POS
            </h4>
            <p className="modern-crud-subtitle">Quick checkout with product images</p>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-8 col-lg-7">
            <div className="modern-crud-shell pos-panel">
              <div className="pos-toolbar">
                <div className="modern-crud-search pos-search">
                  <Search size={16} className="modern-crud-search-icon" />
                  <input
                    type="search"
                    placeholder="Search product, SKU, batch..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="modern-crud-total">{filteredProducts.length} products</span>
              </div>

              {productsLoading ? <p className="text-muted mb-0">Loading products...</p> : null}

              <div className={`pos-product-grid${posLayout === "tabular" ? " is-tabular" : " is-grid"}`}>
                {filteredProducts.map((p) => {
                  const img = resolveProductImage(p.image);
                  const qty = Number(p.available_quantity ?? 0);
                  const out = qty <= 0;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      className={`pos-product-card${out ? " is-out" : ""}`}
                      onClick={() => addToCart(p)}
                      disabled={out}
                    >
                      <div className="pos-product-thumb">
                        {img ? (
                          <img src={img} alt={p.name} />
                        ) : (
                          <ImageWithBasePath alt={p.name} src="assets/img/products/product1.jpg" />
                        )}
                        {out ? <span className="pos-stock-tag is-danger">Out</span> : null}
                        {!out && qty <= 5 ? <span className="pos-stock-tag is-warn">Low</span> : null}
                      </div>
                      <div className="pos-product-meta">
                        <div className="pos-product-name">{p.name}</div>
                        <div className="pos-product-price">PKR {Number(p.unit_price || 0).toFixed(2)}</div>
                        <div className="pos-product-stock">Qty {qty}</div>
                      </div>
                    </button>
                  );
                })}
                {!productsLoading && !filteredProducts.length ? (
                  <div className="text-muted py-4">No products found</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-xl-4 col-lg-5">
            <div className="modern-crud-shell pos-cart-panel">
              <div className="pos-cart-head">
                <h5 className="mb-0">Cart</h5>
                {cart.length ? (
                  <button type="button" className="btn btn-sm modern-crud-io-btn" onClick={() => setCart([])}>
                    <X size={14} /> Clear
                  </button>
                ) : null}
              </div>

              <div className="mb-2">
                <label className="modern-form-label">Customer</label>
                <Select
                  classNamePrefix="react-select"
                  options={customerOptions}
                  value={customer}
                  onChange={setCustomer}
                  isClearable
                  placeholder="Walk-in customer"
                />
              </div>

              <div className="pos-cart-list">
                {cart.map((item) => {
                  const img = resolveProductImage(item.image);
                  return (
                    <div className="pos-cart-item" key={item.product_id}>
                      <div className="pos-cart-thumb">
                        {img ? (
                          <img src={img} alt={item.product_name} />
                        ) : (
                          <ImageWithBasePath alt={item.product_name} src="assets/img/products/product1.jpg" />
                        )}
                      </div>
                      <div className="pos-cart-info">
                        <div className="pos-cart-name">{item.product_name}</div>
                        <div className="pos-cart-unit">PKR {Number(item.unit_price).toFixed(2)}</div>
                        <div className="pos-qty-ctrl">
                          <button type="button" onClick={() => bumpQty(item.product_id, -1)}>
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQty(item.product_id, e.target.value)}
                          />
                          <button type="button" onClick={() => bumpQty(item.product_id, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="pos-cart-side">
                        <strong>PKR {Number(item.line_total).toFixed(2)}</strong>
                        <button type="button" className="pos-cart-remove" onClick={() => removeItem(item.product_id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!cart.length ? <div className="text-muted text-center py-4">Cart is empty</div> : null}
              </div>

              <div className="pos-cart-footer">
                <div className="d-flex justify-content-between mb-2">
                  <span>Items</span>
                  <strong>{cart.reduce((s, i) => s + i.quantity, 0)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Net amount</span>
                  <strong>PKR {totals.net_amount.toFixed(2)}</strong>
                </div>
                <div className="mb-2">
                  <label className="modern-form-label">Payment method</label>
                  <select
                    className="form-select form-select-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="modern-form-label">Amount received</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={amountReceived}
                    placeholder={String(totals.net_amount.toFixed(2))}
                    onChange={(e) => setAmountReceived(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn modern-form-submit w-100"
                  disabled={saleLoading || checkingOut || !cart.length}
                  onClick={checkout}
                >
                  {checkingOut || saleLoading ? "Processing..." : "Complete Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pos;
