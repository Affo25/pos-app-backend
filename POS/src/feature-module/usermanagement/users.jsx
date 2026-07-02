import React, { useEffect, useMemo, useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import { ChevronUp, RotateCcw } from "feather-icons-react/build/IconComponents";
import { setToogleHeader } from "../../core/redux/action";
import { useDispatch, useSelector } from "react-redux";
import { Filter, PlusCircle, StopCircle, User, Zap } from "react-feather";
import Select from "react-select";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import Table from "../../core/pagination/datatable";
import AddUsers from "../../core/modals/usermanagement/addusers";
import EditUser from "../../core/modals/usermanagement/edituser";
import {
  deleteUserAction,
  fetchAllUsersAction,
} from "../../redux/users/userSlice";
import { fetchAllRolesAction } from "../../redux/roles/roleSlice";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const mapUserToRow = (user) => ({
  id: user._id,
  _id: user._id,
  username: user.name,
  phone: user.phone || "-",
  email: user.email,
  role: user.role_id?.name || user.user_type || "-",
  createdon: formatDate(user.createdAt),
  status: user.status === "active" ? "Active" : "Inactive",
  img: "assets/img/users/user-01.jpg",
  raw: user,
});

const Users = () => {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.toggle_header);
  const { users, loading } = useSelector((state) => state.users);
  const { roles } = useSelector((state) => state.roles);

  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterRole, setFilterRole] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchAllUsersAction());
    dispatch(fetchAllRolesAction());
  }, [dispatch]);

  const roleFilterOptions = useMemo(
    () => [
      { value: "all", label: "All Roles" },
      ...roles.map((role) => ({ value: role._id, label: role.name })),
    ],
    [roles],
  );

  const statusFilterOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const tableData = useMemo(() => {
    return users
      .map(mapUserToRow)
      .filter((row) => {
        const search = searchText.trim().toLowerCase();
        const matchesSearch =
          !search ||
          row.username.toLowerCase().includes(search) ||
          row.email.toLowerCase().includes(search) ||
          row.phone.toLowerCase().includes(search) ||
          row.role.toLowerCase().includes(search);

        const matchesStatus =
          !filterStatus ||
          filterStatus.value === "all" ||
          row.raw.status === filterStatus.value;

        const matchesRole =
          !filterRole ||
          filterRole.value === "all" ||
          row.raw.role_id?._id === filterRole.value ||
          row.raw.role_id === filterRole.value;

        return matchesSearch && matchesStatus && matchesRole;
      });
  }, [users, searchText, filterStatus, filterRole]);

  const toggleFilterVisibility = () => {
    setIsFilterVisible((prevVisibility) => !prevVisibility);
  };

  const MySwal = withReactContent(Swal);

  const handleDelete = (user) => {
    MySwal.fire({
      title: "Are you sure?",
      text: `Delete user "${user.name}"?`,
      showCancelButton: true,
      confirmButtonColor: "#ff9f43",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteUserAction(user._id));
      }
    });
  };

  const columns = [
    {
      title: "User Name",
      dataIndex: "username",
      render: (text, record) => (
        <span className="userimgname">
          <Link to="#" className="userslist-img bg-img">
            <ImageWithBasePath alt="" src={record.img} />
          </Link>
          <div>
            <Link to="#">{text}</Link>
          </div>
        </span>
      ),
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
      render: (text) => (
        <div>
          {text === "Active" && (
            <span className="badge badge-linesuccess">{text}</span>
          )}
          {text === "Inactive" && (
            <span className="badge badge-linedanger">{text}</span>
          )}
        </div>
      ),
      sorter: (a, b) => a.status.localeCompare(b.status),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      render: (_, record) => (
        <div className="edit-delete-action">
          <Link
            className="me-2 p-2"
            to="#"
            onClick={(event) => {
              event.preventDefault();
              setEditingUser(record.raw);
            }}
          >
            <i data-feather="edit" className="feather-edit"></i>
          </Link>
          <Link
            className="confirm-text p-2"
            to="#"
            onClick={(event) => {
              event.preventDefault();
              handleDelete(record.raw);
            }}
          >
            <i data-feather="trash-2" className="feather-trash-2"></i>
          </Link>
        </div>
      ),
    },
  ];

  const renderTooltip = (label) => {
    const TooltipContent = (props) => (
      <Tooltip id={`${label}-tooltip`} {...props}>
        {label}
      </Tooltip>
    );
    TooltipContent.displayName = `TooltipContent(${label})`;
    return TooltipContent;
  };

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>User List</h4>
                <h6>Manage Your Users</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <li>
                <OverlayTrigger placement="top" overlay={renderTooltip("Refresh")}>
                  <Link
                    to="#"
                    onClick={(event) => {
                      event.preventDefault();
                      dispatch(fetchAllUsersAction());
                    }}
                  >
                    <RotateCcw />
                  </Link>
                </OverlayTrigger>
              </li>
              <li>
                <OverlayTrigger placement="top" overlay={renderTooltip("Collapse")}>
                  <Link
                    to="#"
                    id="collapse-header"
                    className={data ? "active" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      dispatch(setToogleHeader(!data));
                    }}
                  >
                    <ChevronUp />
                  </Link>
                </OverlayTrigger>
              </li>
            </ul>
            <div className="page-btn">
              <button
                type="button"
                className="btn btn-added"
                data-bs-toggle="modal"
                data-bs-target="#add-units"
              >
                <PlusCircle className="me-2" />
                Add New User
              </button>
            </div>
          </div>

          <div className="card table-list-card">
            <div className="card-body">
              <div className="table-top">
                <div className="search-set">
                  <div className="search-input">
                    <input
                      type="text"
                      placeholder="Search users"
                      className="form-control form-control-sm formsearch"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                    />
                    <Link to="#" className="btn btn-searchset">
                      <i data-feather="search" className="feather-search" />
                    </Link>
                  </div>
                </div>
                <div className="search-path">
                  <Link
                    className={`btn btn-filter ${isFilterVisible ? "setclose" : ""}`}
                    to="#"
                    onClick={(event) => {
                      event.preventDefault();
                      toggleFilterVisibility();
                    }}
                  >
                    <Filter className="filter-icon" />
                    <span onClick={toggleFilterVisibility}>
                      <ImageWithBasePath src="assets/img/icons/closes.svg" alt="img" />
                    </span>
                  </Link>
                </div>
              </div>

              <div
                className={`card${isFilterVisible ? " visible" : ""}`}
                id="filter_inputs"
                style={{ display: isFilterVisible ? "block" : "none" }}
              >
                <div className="card-body pb-0">
                  <div className="row">
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="input-blocks">
                        <StopCircle className="info-img" />
                        <Select
                          className="select"
                          options={statusFilterOptions}
                          value={filterStatus}
                          onChange={setFilterStatus}
                          placeholder="Choose Status"
                          isClearable
                        />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="input-blocks">
                        <Zap className="info-img" />
                        <Select
                          className="select"
                          options={roleFilterOptions}
                          value={filterRole}
                          onChange={setFilterRole}
                          placeholder="Choose Role"
                          isClearable
                        />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="input-blocks">
                        <button
                          type="button"
                          className="btn btn-filters ms-auto"
                          onClick={() => {
                            setFilterStatus(null);
                            setFilterRole(null);
                            setSearchText("");
                          }}
                        >
                          <User className="me-2" size={16} />
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                {loading && !tableData.length ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : (
                  <Table columns={columns} dataSource={tableData} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddUsers />
      <EditUser user={editingUser} onClose={() => setEditingUser(null)} />
    </div>
  );
};

export default Users;
