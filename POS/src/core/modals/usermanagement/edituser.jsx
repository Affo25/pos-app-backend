import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { toast } from "react-toastify";
import { updateUserAction } from "../../../redux/users/userSlice";
import { fetchAllRolesAction } from "../../../redux/roles/roleSlice";
import EntityImageUpload from "../../components/EntityImageUpload";
import {
  getPhoneErrorMessage,
  isValidPhoneInput,
  normalizePhoneInput,
} from "../../../utils/phoneUtils";

const EditUser = ({ user, onClose }) => {
  const dispatch = useDispatch();
  const { roles, loading: rolesLoading } = useSelector((state) => state.roles);
  const { loading } = useSelector((state) => state.users);
  const authUser = useSelector((state) => state.auth?.user);
  const isSuperAdmin = authUser?.user_type === "superAdmin";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_id: "",
    status: "active",
    address: "",
    image: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) dispatch(fetchAllRolesAction());
  }, [dispatch, user]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
      password: "",
      confirmPassword: "",
      role_id: user.role_id?._id || user.role_id || "",
      status: user.status || "active",
      address: user.address || "",
      image: user.image || "",
    });
  }, [user]);

  const roleOptions = useMemo(() => {
    const options = (roles || [])
      .filter((role) => role.key !== "super_admin" || user?.user_type === "superAdmin")
      .map((role) => ({
        value: role._id,
        label: role.name,
      }));

    if (
      user?.role_id &&
      typeof user.role_id === "object" &&
      user.role_id.key === "super_admin" &&
      !options.some((option) => option.value === user.role_id._id)
    ) {
      options.unshift({
        value: user.role_id._id,
        label: user.role_id.name,
      });
    }

    return options;
  }, [roles, user]);

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    onClose?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!user?._id) return;

    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Password and confirm password do not match");
      return;
    }

    if (!isValidPhoneInput(form.phone)) {
      toast.error(getPhoneErrorMessage());
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: normalizePhoneInput(form.phone),
      address: form.address.trim(),
      image: form.image || "",
      role_id: form.role_id,
    };

    if (isSuperAdmin) {
      payload.status = form.status;
    }

    if (form.password.trim()) {
      payload.password = form.password;
    }

    dispatch(updateUserAction(user._id, payload));
    handleClose();
  };

  return (
    <Modal show={Boolean(user)} onHide={handleClose} centered size="lg" dialogClassName="modern-form-modal">
      <Modal.Header closeButton>
        <Modal.Title>Edit User</Modal.Title>
      </Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="row">
            <div className="col-md-5 mb-3">
              <EntityImageUpload
                label="Profile photo"
                folder="users"
                value={form.image}
                onChange={(url) => handleChange("image", url || "")}
              />
            </div>
            <div className="col-md-7">
              <div className="row">
                <div className="col-md-12 mb-3">
                  <label className="modern-form-label">User name</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="modern-form-label">Phone</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+923247890891"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="modern-form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="modern-form-label">Role</label>
              <Select
                classNamePrefix="react-select"
                options={roleOptions}
                value={roleOptions.find((option) => option.value === form.role_id) || null}
                onChange={(option) => handleChange("role_id", option?.value || "")}
                placeholder={rolesLoading ? "Loading roles..." : "Choose role"}
                isDisabled={rolesLoading || user?.user_type === "superAdmin"}
              />
            </div>

            {isSuperAdmin ? (
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Status</label>
                <Select
                  classNamePrefix="react-select"
                  options={statusOptions}
                  value={statusOptions.find((option) => option.value === form.status) || statusOptions[0]}
                  onChange={(option) => handleChange("status", option?.value || "active")}
                />
                <small className="text-muted">Enable / disable is super-admin only.</small>
              </div>
            ) : null}

            <div className="col-md-6 mb-3">
              <label className="modern-form-label">New password</label>
              <div className="pass-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="pass-input form-control"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Leave blank to keep current"
                />
                <span
                  className={`fas toggle-password ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="modern-form-label">Confirm password</label>
              <div className="pass-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="pass-input form-control"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="Confirm new password"
                />
                <span
                  className={`fas toggle-password ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}
                  onClick={() => setConfirmPassword((prev) => !prev)}
                />
              </div>
            </div>

            <div className="col-md-12 mb-1">
              <label className="modern-form-label">Address</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="modern-form-cancel" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" className="modern-form-submit" disabled={loading || !user}>
            {loading ? "Saving..." : "Update User"}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

EditUser.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    email: PropTypes.string,
    status: PropTypes.string,
    address: PropTypes.string,
    image: PropTypes.string,
    user_type: PropTypes.string,
    role_id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        key: PropTypes.string,
      }),
    ]),
  }),
  onClose: PropTypes.func,
};

export default EditUser;
