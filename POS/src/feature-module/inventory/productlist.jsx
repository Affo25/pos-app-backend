import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table } from "antd";
import { Edit, Eye, PlusCircle, Trash2 } from "feather-icons-react/build/IconComponents";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { all_routes } from "../../Router/all_routes";
import {
  deleteProductAction,
  fetchAllProductsAction,
} from "../../redux/products/productSlice";
import ImageWithBasePath from "../../core/img/imagewithbasebath";

const ProductList = () => {
  const route = all_routes;
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const { products, loading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchAllProductsAction());
  }, [dispatch]);

  const dataSource = useMemo(
    () =>
      (products || []).map((item, index) => ({
        key: item._id || String(index),
        id: item._id,
        name: item.name || "-",
        sku: item.sku || "-",
        category: item.category?.name || "-",
        price: item.unit_price != null ? Number(item.unit_price).toFixed(2) : "-",
        qty: item.available_quantity ?? 0,
        supplier: item.supplier_name || "-",
        image: item.image || "assets/img/products/product1.jpg",
        hasRemoteImage: Boolean(
          item.image &&
            (/^https?:\/\//i.test(item.image) ||
              String(item.image).includes("/api/uploads/")),
        ),
      })),
    [products],
  );

  const confirmDelete = (id) => {
    MySwal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonColor: "#00ff00",
      confirmButtonText: "Yes, delete it!",
      cancelButtonColor: "#ff0000",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteProductAction(id));
      }
    });
  };

  const columns = [
    {
      title: "Product",
      dataIndex: "name",
      render: (text, record) => (
        <span className="productimgname">
          <Link to={route.productdetails} className="product-img stock-img">
            {record.hasRemoteImage || record.image?.startsWith("http") || record.image?.includes("/api/uploads/") ? (
              <img
                alt={text}
                src={record.image}
                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }}
              />
            ) : (
              <ImageWithBasePath alt={text} src={record.image} />
            )}
          </Link>
          <Link to={route.productdetails}>{text}</Link>
        </span>
      ),
      sorter: (a, b) => String(a.name).localeCompare(String(b.name)),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      sorter: (a, b) => String(a.sku).localeCompare(String(b.sku)),
    },
    {
      title: "Category",
      dataIndex: "category",
      sorter: (a, b) => String(a.category).localeCompare(String(b.category)),
    },
    {
      title: "Price",
      dataIndex: "price",
      sorter: (a, b) => Number(a.price) - Number(b.price),
    },
    {
      title: "Qty",
      dataIndex: "qty",
      sorter: (a, b) => Number(a.qty) - Number(b.qty),
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      sorter: (a, b) => String(a.supplier).localeCompare(String(b.supplier)),
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (_text, record) => (
        <div className="edit-delete-action">
          <Link className="me-2 p-2" to={route.productdetails}>
            <Eye className="feather-view" />
          </Link>
          <Link className="me-2 p-2" to={route.editproduct}>
            <Edit className="feather-edit" />
          </Link>
          <Link
            className="confirm-text p-2"
            to="#"
            onClick={(e) => {
              e.preventDefault();
              confirmDelete(record.id);
            }}
          >
            <Trash2 className="feather-trash-2" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Product List</h4>
            <h6>Manage your products</h6>
          </div>
          <div className="page-btn">
            <Link to={route.addproduct} className="btn btn-added">
              <PlusCircle className="me-2" />
              Add New Product
            </Link>
          </div>
        </div>

        <div className="card table-list-card">
          <div className="card-body">
            <div className="table-responsive">
              <Table
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
