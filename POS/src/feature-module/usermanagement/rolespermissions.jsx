import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, ChevronUp, MoreVertical, Plus, Shield } from "react-feather";
import {
  assignPermissionsAction,
  createRoleAction,
  deleteRoleAction,
  fetchAllRolesAction,
  removePermissionsAction,
  selectRoleAction,
} from "../../redux/roles/roleSlice";

const ACTION_LABELS = {
  add: "Create",
  edit: "Edit",
  delete: "Delete",
  view: "View",
};

const buildSelectionKey = (component, action) => `${component}:${action}`;

const SecurityPermissionManager = () => {
  const dispatch = useDispatch();
  const { roles, selectedRole, assigned, available, loading } = useSelector(
    (state) => state.roles,
  );

  const [expandedAssigned, setExpandedAssigned] = useState({});
  const [expandedAvailable, setExpandedAvailable] = useState({});
  const [selectedAssigned, setSelectedAssigned] = useState(new Set());
  const [selectedAvailable, setSelectedAvailable] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  useEffect(() => {
    dispatch(fetchAllRolesAction());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      dispatch(selectRoleAction(roles[0]._id));
    }
  }, [dispatch, roles, selectedRole]);

  useEffect(() => {
    setSelectedAssigned(new Set());
    setSelectedAvailable(new Set());
    setExpandedAssigned({});
    setExpandedAvailable({});
  }, [selectedRole?._id]);

  const selectedRoleId = selectedRole?._id;

  const toggleAssignedExpand = (component) => {
    setExpandedAssigned((prev) => ({ ...prev, [component]: !prev[component] }));
  };

  const toggleAvailableExpand = (component) => {
    setExpandedAvailable((prev) => ({ ...prev, [component]: !prev[component] }));
  };

  const toggleAssignedSelection = (component, action) => {
    const key = buildSelectionKey(component, action);
    setSelectedAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAvailableSelection = (component, action) => {
    const key = buildSelectionKey(component, action);
    setSelectedAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildSelections = (keys) => {
    const map = new Map();
    keys.forEach((key) => {
      const [component, action] = key.split(":");
      if (!map.has(component)) map.set(component, []);
      map.get(component).push(action);
    });
    return Array.from(map.entries()).map(([component, actions]) => ({
      component,
      actions,
    }));
  };

  const handleAssign = () => {
    if (!selectedRoleId || selectedAvailable.size === 0) return;
    dispatch(
      assignPermissionsAction(
        selectedRoleId,
        buildSelections(Array.from(selectedAvailable)),
      ),
    );
  };

  const handleRemove = () => {
    if (!selectedRoleId || selectedAssigned.size === 0) return;
    dispatch(
      removePermissionsAction(
        selectedRoleId,
        buildSelections(Array.from(selectedAssigned)),
      ),
    );
  };

  const handleCreateRole = (event) => {
    event.preventDefault();
    if (!newRoleName.trim()) return;
    dispatch(
      createRoleAction({
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
      }),
    );
    setShowAddModal(false);
    setNewRoleName("");
    setNewRoleDescription("");
  };

  const handleDeleteRole = (role) => {
    if (role.isSystem) return;
    if (window.confirm(`Delete role "${role.name}"?`)) {
      dispatch(deleteRoleAction(role._id));
    }
  };

  const assignedCountLabel = useMemo(
    () => assigned.reduce((total, group) => total + group.grantedActions.length, 0),
    [assigned],
  );

  const availableCountLabel = useMemo(
    () => available.reduce((total, group) => total + group.missingActions.length, 0),
    [available],
  );

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Security &amp; Permission Management</h4>
              <h6>Manage security groups and assign permissions</h6>
            </div>
          </div>
        </div>

        <div className="row g-3 security-permission-layout">
          <div className="col-lg-3">
            <div className="card security-panel h-100">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0">Security Groups</h5>
                  <small className="text-muted">{roles.length} groups</small>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={14} className="me-1" />
                  Add
                </button>
              </div>
              <div className="card-body p-0 security-group-list">
                {roles.map((role) => {
                  const isActive = selectedRoleId === role._id;
                  return (
                    <button
                      key={role._id}
                      type="button"
                      className={`security-group-item ${isActive ? "active" : ""}`}
                      onClick={() => dispatch(selectRoleAction(role._id))}
                    >
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div className="text-start">
                          <div className="fw-semibold">{role.name}</div>
                          <small>
                            {role.permissionCount || 0} Permissions
                          </small>
                        </div>
                        {!role.isSystem ? (
                          <span
                            className="security-group-menu"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteRole(role);
                            }}
                          >
                            <MoreVertical size={16} />
                          </span>
                        ) : (
                          <Shield size={16} />
                        )}
                      </div>
                    </button>
                  );
                })}
                {!roles.length && !loading ? (
                  <div className="p-3 text-muted">No roles found.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card security-panel h-100">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0">Assigned Permissions</h5>
                  <small className="text-muted">
                    {selectedRole?.name || "Select a group"} · {assignedCountLabel} selected
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  disabled={!selectedAssigned.size || loading}
                  onClick={handleRemove}
                >
                  Remove
                </button>
              </div>
              <div className="card-body permission-scroll">
                {assigned.map((group) => {
                  const expanded = expandedAssigned[group.component] ?? true;
                  return (
                    <div key={group.component} className="permission-group">
                      <button
                        type="button"
                        className="permission-group-header"
                        onClick={() => toggleAssignedExpand(group.component)}
                      >
                        <span>
                          {group.label} ({group.grantedActions.length}/
                          {group.actions.length} selected)
                        </span>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {expanded ? (
                        <div className="permission-group-body">
                          {group.grantedActions.map((action) => {
                            const key = buildSelectionKey(group.component, action);
                            return (
                              <label key={key} className="permission-check-row">
                                <input
                                  type="checkbox"
                                  checked={selectedAssigned.has(key)}
                                  onChange={() =>
                                    toggleAssignedSelection(group.component, action)
                                  }
                                />
                                <span>{ACTION_LABELS[action] || action}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!assigned.length ? (
                  <div className="text-muted py-3">No permissions assigned yet.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card security-panel h-100">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0">Available Permissions</h5>
                  <small className="text-muted">
                    {availableCountLabel} permissions available
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!selectedAvailable.size || loading}
                  onClick={handleAssign}
                >
                  Assign
                </button>
              </div>
              <div className="card-body permission-scroll">
                {available.map((group) => {
                  const expanded = expandedAvailable[group.component] ?? false;
                  return (
                    <div key={group.component} className="permission-group">
                      <button
                        type="button"
                        className="permission-group-header"
                        onClick={() => toggleAvailableExpand(group.component)}
                      >
                        <span>{group.label}</span>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {expanded ? (
                        <div className="permission-group-body">
                          {group.missingActions.map((action) => {
                            const key = buildSelectionKey(group.component, action);
                            return (
                              <label key={key} className="permission-check-row">
                                <input
                                  type="checkbox"
                                  checked={selectedAvailable.has(key)}
                                  onChange={() =>
                                    toggleAvailableSelection(group.component, action)
                                  }
                                />
                                <span>{ACTION_LABELS[action] || action}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!available.length ? (
                  <div className="text-muted py-3">
                    All permissions are already assigned to this group.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Security Group</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateRole}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Role Name</Form.Label>
              <Form.Control
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="e.g. HR Admin"
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newRoleDescription}
                onChange={(event) => setNewRoleDescription(event.target.value)}
                placeholder="Optional description"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Role
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityPermissionManager;
