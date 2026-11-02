import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { toast } from "react-toastify";
import { createUserAction } from "../../../redux/users/userSlice";
import { fetchAllRolesAction } from "../../../redux/roles/roleSlice";
import EntityImageUpload from "../../components/EntityImageUpload";
import {
  getPhoneErrorMessage,
  isValidPhoneInput,
  normalizePhoneInput,
} from "../../../utils/phoneUtils";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  role_id: "",
  status: "active",
  address: "",
  image: "",
};

const AddUsers = ({ show, onClose }) => {
  const dispatch = useDispatch();
  const { roles, loading: rolesLoading } = useSelector((state) => state.roles);
  const { loading } = useSelector((state) => state.users);
  const authUser = useSelector((state) => state.auth?.user);
  const isSuperAdmin = authUser?.user_type === "superAdmin";

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setConfirmPassword] = useState(false);

  useEffect(() => {
    if (show) dispatch(fetchAllRolesAction());
  }, [dispatch, show]);

  useEffect(() => {
    if (!show) {
      setForm(initialForm);
      setShowPassword(false);
      setConfirmPassword(false);
    }
  }, [show]);

  const roleOptions = useMemo(
    () =>
      (roles || [])
        .filter((role) => role.key !== "super_admin")
        .map((role) => ({
          value: role._id,
          label: role.name,
        })),
    [roles],
  );

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

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Password and confirm password do not match");
      return;
    }

    if (!form.role_id) {
      toast.error("Please select a role");
      return;
    }

    if (!isValidPhoneInput(form.phone)) {
      toast.error(getPhoneErrorMessage());
      return;
    }

    dispatch(
      createUserAction({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: normalizePhoneInput(form.phone),
        address: form.address.trim(),
        image: form.image || "",
        status: isSuperAdmin ? form.status : "active",
        role_id: form.role_id,
        user_type: "user",
      }),
    );

    handleClose();
  };

  return (
    <Modal show={Boolean(show)} onHide={handleClose} centered size="lg" dialogClassName="modern-form-modal">
      <Modal.Header closeButton>
        <Modal.Title>Add User</Modal.Title>
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
                  <label className="modern-form-label">
                    User name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="modern-form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+923247890891"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="modern-form-label">
                    Email <span className="text-danger">*</span>
                  </label>
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
              <label className="modern-form-label">
                Role <span className="text-danger">*</span>
              </label>
              <Select
                classNamePrefix="react-select"
                options={roleOptions}
                value={roleOptions.find((option) => option.value === form.role_id) || null}
                onChange={(option) => handleChange("role_id", option?.value || "")}
                placeholder={rolesLoading ? "Loading roles..." : "Choose role"}
                isDisabled={rolesLoading || !roleOptions.length}
              />
              {!rolesLoading && !roleOptions.length ? (
                <small className="text-muted">
                  No assignable roles yet. Create one in Roles &amp; Permissions first.
                </small>
              ) : null}
            </div>

            {isSuperAdmin ? (
              <div className="col-md-6 mb-3">
                <label className="modern-form-label">Status</label>
                <Select
                  classNamePrefix="react-select"
                  options={statusOptions}
                  value={statusOptions.find((option) => option.value === form.status) || statusOptions[0]}
                  onChange={(option) => handleChange("status", option?.value || "active")}
                  placeholder="Choose status"
                />
              </div>
            ) : null}

            <div className="col-md-6 mb-3">
              <label className="modern-form-label">
                Password <span className="text-danger">*</span>
              </label>
              <div className="pass-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="pass-input form-control"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <span
                  className={`fas toggle-password ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="modern-form-label">
                Confirm password <span className="text-danger">*</span>
              </label>
              <div className="pass-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="pass-input form-control"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="Confirm password"
                  required
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
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="modern-form-cancel" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" className="modern-form-submit" disabled={loading}>
            {loading ? "Saving..." : "Create User"}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

AddUsers.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func,
};

export default AddUsers;
