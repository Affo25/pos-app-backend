import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Users as UsersIcon } from "feather-icons-react/build/IconComponents";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import ModernCrudShell from "../../core/components/ModernCrudShell";
import { all_routes } from "../../Router/all_routes";
import * as userService from "../../redux/users/userService";
import { fetchAllUsersAction } from "../../redux/users/userSlice";
import { resolveMediaUrl } from "../../redux/utils/uploadMedia";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const MySwal = withReactContent(Swal);
  const authUser = useSelector((state) => state.auth?.user);
  const isSuperAdmin = authUser?.user_type === "superAdmin";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await userService.fetchUserById(id);
      setUser(data);
    } catch (err) {
      toast.error(err?.message || "Failed to load user");
      navigate(all_routes.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const avatar = useMemo(() => resolveMediaUrl(user?.image), [user?.image]);
  const isActive = user?.status === "active";
  const isSelf = String(authUser?.id || authUser?._id) === String(user?._id);

  const onToggleStatus = async () => {
    if (!isSuperAdmin || !user?._id || isSelf) return;
    const next = isActive ? "inactive" : "active";
    const result = await MySwal.fire({
      title: next === "inactive" ? "Disable this user?" : "Enable this user?",
      text:
        next === "inactive"
          ? "They will not be able to sign in until re-enabled."
          : "They will be able to sign in again.",
      showCancelButton: true,
      confirmButtonText: next === "inactive" ? "Disable" : "Enable",
    });
    if (!result.isConfirmed) return;

    setToggling(true);
    try {
      const res = await userService.setUserStatus(user._id, next);
      setUser(res?.user || { ...user, status: next });
      dispatch(fetchAllUsersAction());
      toast.success(res?.message || `User ${next === "active" ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  return (
    <ModernCrudShell
      title="User details"
      subtitle="Profile, role, and account status."
      icon={<UsersIcon size={18} />}
      addLabel={null}
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <Link to={all_routes.users} className="btn btn-sm modern-crud-io-btn">
          <ArrowLeft size={14} /> Back to users
        </Link>
        {isSuperAdmin && user && !isSelf ? (
          <button
            type="button"
            className={`btn btn-sm ${isActive ? "btn-outline-danger" : "btn-primary"}`}
            disabled={toggling || loading}
            onClick={onToggleStatus}
          >
            {toggling ? "Updating..." : isActive ? "Disable user" : "Enable user"}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted mb-0">Loading user...</p>
      ) : user ? (
        <div className="user-detail-card">
          <div className="user-detail-hero">
            {avatar ? (
              <img src={avatar} alt="" className="modern-crud-avatar is-lg" />
            ) : (
              <span className="modern-crud-avatar is-lg d-inline-flex align-items-center justify-content-center fs-3 text-muted">
                {(user.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <h4>{user.name}</h4>
              <div className="text-muted">{user.email}</div>
              <div className="mt-2">
                {isActive ? (
                  <span className="modern-crud-badge is-ok">Active</span>
                ) : (
                  <span className="modern-crud-badge is-warn">Inactive</span>
                )}
                {user.is_blocked ? (
                  <span className="modern-crud-badge is-danger ms-2">Blocked</span>
                ) : null}
              </div>
              {!isSuperAdmin ? (
                <small className="text-muted d-block mt-2">
                  Only a super admin can enable or disable accounts.
                </small>
              ) : null}
            </div>
          </div>

          <dl className="user-detail-meta">
            <div>
              <dt>Phone</dt>
              <dd>{user.phone || "-"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user.role_id?.name || user.user_type || "-"}</dd>
            </div>
            <div>
              <dt>User type</dt>
              <dd>{user.user_type || "-"}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{user.plan || "-"}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{user.license_status || "-"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(user.updatedAt)}</dd>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <dt>Address</dt>
              <dd>{user.address || "-"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-muted mb-0">User not found</p>
      )}
    </ModernCrudShell>
  );
};

export default UserDetails;
