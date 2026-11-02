import React, { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Edit, Eye, Trash2, Users as UsersIcon } from "feather-icons-react/build/IconComponents";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import AddUsers from "../../core/modals/usermanagement/addusers";
import EditUser from "../../core/modals/usermanagement/edituser";
import {
  deleteUserAction,
  fetchAllUsersAction,
} from "../../redux/users/userSlice";
import { fetchAllRolesAction } from "../../redux/roles/roleSlice";
import CrudListToolbar from "../../core/components/CrudListToolbar";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import { resolveMediaUrl } from "../../redux/utils/uploadMedia";
import { all_routes } from "../../Router/all_routes";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const mapUserToRow = (user) => ({
  key: user._id,
  id: user._id,
  _id: user._id,
  username: user.name,
  phone: user.phone || "-",
  email: user.email,
  role: user.role_id?.name || user.user_type || "-",
  roleId: user.role_id?._id || user.role_id || "",
  createdon: formatDate(user.createdAt),
  status: user.status === "active" ? "Active" : "Inactive",
  rawStatus: user.status || "inactive",
  image: user.image || "",
  raw: user,
});

const Users = () => {
  const dispatch = useDispatch();
  const { users, loading } = useSelector((state) => state.users);
  const { roles } = useSelector((state) => state.roles);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    dispatch(fetchAllUsersAction());
    dispatch(fetchAllRolesAction());
  }, [dispatch]);

  const rows = useMemo(() => (users || []).map(mapUserToRow), [users]);

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.rawStatus === "active").length,
      inactive: rows.filter((r) => r.rawStatus !== "active").length,
    }),
    [rows],
  );

  const roleFilterOptions = useMemo(
    () => [
      { value: "all", label: "All roles" },
      ...(roles || []).map((role) => ({ value: role._id, label: role.name })),
    ],
    [roles],
  );

  const tableData = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.username.toLowerCase().includes(search) ||
        row.email.toLowerCase().includes(search) ||
        row.phone.toLowerCase().includes(search) ||
        row.role.toLowerCase().includes(search);
      const matchesRole = roleFilter === "all" || String(row.roleId) === roleFilter;
      const matchesStatus =
        activeTab === "all" ||
        (activeTab === "active" && row.rawStatus === "active") ||
        (activeTab === "inactive" && row.rawStatus !== "active");
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [rows, searchText, roleFilter, activeTab]);

  const MySwal = withReactContent(Swal);

  const handleDelete = (user) => {
    MySwal.fire({
      title: "Are you sure?",
      text: `Delete user "${user.name}"?`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteUserAction(user._id));
    });
  };

  const columns = [
    {
      title: "User Name",
      dataIndex: "username",
      render: (text, record) => {
        const img = resolveMediaUrl(record.image);
        return (
          <Link
            to={`${all_routes.users}/${record.id}`}
            className="d-inline-flex align-items-center gap-2 text-decoration-none"
          >
            {img ? (
              <img src={img} alt="" className="modern-crud-avatar" />
            ) : (
              <span className="modern-crud-avatar d-inline-flex align-items-center justify-content-center text-muted">
                {(text || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-dark">{text}</span>
          </Link>
        );
      },
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      sorter: (a, b) => a.phone.localeCompare(b.phone),
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: "Role",
      dataIndex: "role",
      sorter: (a, b) => a.role.localeCompare(b.role),
    },
    {
      title: "Created On",
      dataIndex: "createdon",
      sorter: (a, b) => a.createdon.localeCompare(b.createdon),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text) =>
        text === "Active" ? (
          <span className="modern-crud-badge is-ok">{text}</span>
        ) : (
          <span className="modern-crud-badge is-warn">{text}</span>
        ),
      sorter: (a, b) => a.status.localeCompare(b.status),
    },
    {
      title: "Actions",
      width: 140,
      render: (_, record) => (
        <div className="modern-crud-actions">
          <Link
            to={`${all_routes.users}/${record.id}`}
            className="modern-crud-icon-btn"
            title="View details"
          >
            <Eye size={15} />
          </Link>
          <button
            type="button"
            className="modern-crud-icon-btn"
            onClick={() => setEditingUser(record.raw)}
            title="Edit"
          >
            <Edit size={15} />
          </button>
          <button
            type="button"
            className="modern-crud-icon-btn is-danger"
            onClick={() => handleDelete(record.raw)}
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
        title="Users"
        subtitle="Manage your users."
        icon={<UsersIcon size={18} />}
        addLabel="Add User"
        onAdd={() => setShowAdd(true)}
      >
        <CrudListToolbar
          search={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="Search"
          totalRecords={tableData.length}
          filterLabel="Role"
          filterValue={roleFilter}
          onFilterChange={setRoleFilter}
          filterOptions={roleFilterOptions}
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
            dataSource={tableData}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
            locale={{ emptyText: loading ? "Loading..." : "No users found" }}
          />
        </div>
      </ModernCrudShell>

      <AddUsers show={showAdd} onClose={() => setShowAdd(false)} />
      <EditUser user={editingUser} onClose={() => setEditingUser(null)} />
    </>
  );
};

export default Users;
