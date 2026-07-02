import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { createUserAction } from "../../../redux/users/userSlice";
import { fetchAllRolesAction } from "../../../redux/roles/roleSlice";
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
};

const closeModal = (modalId) => {
  const modalElement = document.getElementById(modalId);
  if (!modalElement) return;

  if (window.bootstrap?.Modal) {
    const instance = window.bootstrap.Modal.getInstance(modalElement);
    instance?.hide();
    return;
  }

  modalElement.classList.remove("show");
  modalElement.style.display = "none";
  document.body.classList.remove("modal-open");
  document.querySelector(".modal-backdrop")?.remove();
};

const AddUsers = () => {
  const dispatch = useDispatch();
  const { roles, loading: rolesLoading } = useSelector((state) => state.roles);
  const { loading } = useSelector((state) => state.users);

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setConfirmPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchAllRolesAction());
  }, [dispatch]);

  const roleOptions = useMemo(
    () =>
      roles
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

  const resetForm = () => {
    setForm(initialForm);
    setShowPassword(false);
    setConfirmPassword(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return;
    }

    if (form.password !== form.confirmPassword) {
      window.alert("Password and confirm password do not match.");
      return;
    }

    if (!form.role_id) {
      window.alert("Please select a role.");
      return;
    }

    if (!isValidPhoneInput(form.phone)) {
      window.alert(getPhoneErrorMessage());
      return;
    }

    dispatch(
      createUserAction({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: normalizePhoneInput(form.phone),
        address: form.address.trim(),
        status: form.status,
        role_id: form.role_id,
        user_type: "user",
      }),
    );

    resetForm();
    closeModal("add-units");
  };

  return (
    <div className="modal fade" id="add-units">
      <div className="modal-dialog modal-dialog-centered custom-modal-two">
        <div className="modal-content">
          <div className="page-wrapper-new p-0">
            <div className="content">
              <div className="modal-header border-0 custom-modal-header">
                <div className="page-title">
                  <h4>Add User</h4>
                </div>
                <button
                  type="button"
                  className="close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={resetForm}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div className="modal-body custom-modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>User Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.name}
                          onChange={(event) => handleChange("name", event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.phone}
                          onChange={(event) => handleChange("phone", event.target.value)}
                          placeholder="+923247890891 or 03247890891"
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={form.email}
                          onChange={(event) => handleChange("email", event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>Role</label>
                        <Select
                          className="select"
                          options={roleOptions}
                          value={
                            roleOptions.find((option) => option.value === form.role_id) ||
                            null
                          }
                          onChange={(option) => handleChange("role_id", option?.value || "")}
                          placeholder={rolesLoading ? "Loading roles..." : "Choose Role"}
                          isDisabled={rolesLoading || !roleOptions.length}
                        />
                        {!rolesLoading && !roleOptions.length ? (
                          <small className="text-muted">
                            No assignable roles yet. Create one in Roles &amp; Permissions first.
                          </small>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>Status</label>
                        <Select
                          className="select"
                          options={statusOptions}
                          value={
                            statusOptions.find((option) => option.value === form.status) ||
                            statusOptions[0]
                          }
                          onChange={(option) =>
                            handleChange("status", option?.value || "active")
                          }
                          placeholder="Choose Status"
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>Password</label>
                        <div className="pass-group">
                          <input
                            type={showPassword ? "text" : "password"}
                            className="pass-input form-control"
                            value={form.password}
                            onChange={(event) => handleChange("password", event.target.value)}
                            placeholder="Enter password"
                            required
                          />
                          <span
                            className={`fas toggle-password ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                            onClick={() => setShowPassword((prev) => !prev)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="input-blocks">
                        <label>Confirm Password</label>
                        <div className="pass-group">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            className="pass-input form-control"
                            value={form.confirmPassword}
                            onChange={(event) =>
                              handleChange("confirmPassword", event.target.value)
                            }
                            placeholder="Confirm password"
                            required
                          />
                          <span
                            className={`fas toggle-password ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}
                            onClick={() => setConfirmPassword((prev) => !prev)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="mb-0 input-blocks">
                        <label className="form-label">Address</label>
                        <textarea
                          className="form-control mb-1"
                          value={form.address}
                          onChange={(event) => handleChange("address", event.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer-btn">
                    <button
                      type="button"
                      className="btn btn-cancel me-2"
                      data-bs-dismiss="modal"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-submit" disabled={loading}>
                      {loading ? "Saving..." : "Submit"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUsers;
