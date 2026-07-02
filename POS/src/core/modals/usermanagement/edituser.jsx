import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { updateUserAction } from "../../../redux/users/userSlice";
import { fetchAllRolesAction } from "../../../redux/roles/roleSlice";
import {
  getPhoneErrorMessage,
  isValidPhoneInput,
  normalizePhoneInput,
} from "../../../utils/phoneUtils";

const EditUser = ({ user, onClose }) => {
  const dispatch = useDispatch();
  const { roles, loading: rolesLoading } = useSelector((state) => state.roles);
  const { loading } = useSelector((state) => state.users);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_id: "",
    status: "active",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setConfirmPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchAllRolesAction());
  }, [dispatch]);

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
    });
  }, [user]);

  const roleOptions = useMemo(() => {
    const options = roles
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
      window.alert("Password and confirm password do not match.");
      return;
    }

    if (!isValidPhoneInput(form.phone)) {
      window.alert(getPhoneErrorMessage());
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: normalizePhoneInput(form.phone),
      address: form.address.trim(),
      status: form.status,
      role_id: form.role_id,
    };

    if (form.password.trim()) {
      payload.password = form.password;
    }

    dispatch(updateUserAction(user._id, payload));
    handleClose();
  };

  return (
    <Modal show={Boolean(user)} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton className="border-0">
        <Modal.Title>Edit User</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="row">
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>User Name</Form.Label>
                <Form.Control
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  required
                />
              </Form.Group>
            </div>
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={form.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  placeholder="+923247890891 or 03247890891"
                />
              </Form.Group>
            </div>
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  required
                />
              </Form.Group>
            </div>
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Select
                  className="select"
                  options={roleOptions}
                  value={
                    roleOptions.find((option) => option.value === form.role_id) || null
                  }
                  onChange={(option) => handleChange("role_id", option?.value || "")}
                  placeholder={rolesLoading ? "Loading roles..." : "Choose Role"}
                  isDisabled={rolesLoading || user?.user_type === "superAdmin"}
                />
              </Form.Group>
            </div>
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Select
                  className="select"
                  options={statusOptions}
                  value={
                    statusOptions.find((option) => option.value === form.status) ||
                    statusOptions[0]
                  }
                  onChange={(option) => handleChange("status", option?.value || "active")}
                  placeholder="Choose Status"
                />
              </Form.Group>
            </div>
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <div className="pass-group">
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    className="pass-input"
                    value={form.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                  <span
                    className={`fas toggle-password ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                    onClick={() => setShowPassword((prev) => !prev)}
                  />
                </div>
              </Form.Group>
            </div>
            <div className="col-lg-6">
              <Form.Group className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <div className="pass-group">
                  <Form.Control
                    type={showConfirmPassword ? "text" : "password"}
                    className="pass-input"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      handleChange("confirmPassword", event.target.value)
                    }
                    placeholder="Confirm new password"
                  />
                  <span
                    className={`fas toggle-password ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}
                    onClick={() => setConfirmPassword((prev) => !prev)}
                  />
                </div>
              </Form.Group>
            </div>
            <div className="col-lg-12">
              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.address}
                  onChange={(event) => handleChange("address", event.target.value)}
                />
              </Form.Group>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !user}>
            {loading ? "Saving..." : "Submit"}
          </Button>
        </Modal.Footer>
      </Form>
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
