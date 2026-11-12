import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserX
} from "lucide-react";
import {
  cloneAccessRole,
  createAccessRole,
  deleteAccessRole,
  getAccessCatalog,
  getAccessRoles,
  getAccessUsers,
  revokeUserSessions,
  updateAccessRole,
  updateUserAccess
} from "../services/api";

function rolePermissionKeys(role, catalog) {
  if (!role) return [];
  if (role.all) return catalog.map((item) => item.key);
  return role.permissions || [];
}

function PermissionPicker({ catalog, selected, onChange, canGrant, disabled }) {
  return (
    <div className="permission-picker">
      {catalog.groups.map((group) => {
        const groupPermissions = catalog.permissions.filter((item) => item.group === group.key);
        if (groupPermissions.length === 0) return null;
        return (
          <fieldset key={group.key} className="permission-group">
            <legend>{group.label}</legend>
            <div className="permission-resource-list">
              {group.resources.map(([resource, label]) => {
                const resourcePermissions = groupPermissions.filter((item) => item.resource === resource);
                if (resourcePermissions.length === 0) return null;
                return (
                  <div className="permission-resource" key={resource}>
                    <span className="permission-resource-name">{label}</span>
                    <div className="permission-chips">
                      {resourcePermissions.map((item) => {
                        const checked = selected.includes(item.key);
                        const allowed = canGrant(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`permission-chip${checked ? " is-checked" : ""}${!allowed ? " is-locked" : ""}`}
                            title={!allowed ? "You cannot grant a permission you do not hold" : item.key}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled || !allowed}
                              onChange={(event) => {
                                onChange(
                                  event.target.checked
                                    ? [...selected, item.key]
                                    : selected.filter((key) => key !== item.key)
                                );
                              }}
                            />
                            <span>{item.action.replace(/_/g, " ")}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export default function AccessManagement({ user, showToast }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleId, setRoleId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [roleDraft, setRoleDraft] = useState(null);

  const catalogQuery = useQuery({ queryKey: ["accessCatalog"], queryFn: getAccessCatalog });
  const usersQuery = useQuery({ queryKey: ["accessUsers"], queryFn: getAccessUsers });
  const rolesQuery = useQuery({ queryKey: ["accessRoles"], queryFn: getAccessRoles });

  const catalog = catalogQuery.data;
  const users = usersQuery.data?.users || [];
  const roles = rolesQuery.data?.roles || [];
  const actorAll = Boolean(catalog?.actor?.all);
  const actorPermissions = useMemo(() => new Set(catalog?.actor?.permissions || []), [catalog]);
  const canGrant = (key) => actorAll || actorPermissions.has(key);

  const selectedUser = users.find((item) => item.id === selectedUserId) || null;
  const filteredUsers = users.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [item.name, item.email, item.role_display_name, item.department]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  useEffect(() => {
    if (!selectedUser || !catalog) return;
    setRoleId(String(selectedUser.role_id || ""));
    setSelectedPermissions(selectedUser.effective?.permissions || []);
    setMessage("");
    setError("");
  }, [selectedUserId, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accessUsers"] }),
      queryClient.invalidateQueries({ queryKey: ["accessRoles"] })
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => updateUserAccess({ id: selectedUser.id, data: payload }),
    onSuccess: async () => {
      setMessage("Access saved. This user's existing sessions were revoked.");
      setError("");
      await invalidate();
      showToast?.("User access updated.");
    },
    onError: (err) => {
      setMessage("");
      setError(err.response?.data?.error || "Access could not be updated.");
    }
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeUserSessions(selectedUser.id),
    onSuccess: async () => {
      setMessage("All sessions revoked.");
      setError("");
      await invalidate();
    },
    onError: (err) => setError(err.response?.data?.error || "Sessions could not be revoked.")
  });

  const roleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        role_name: roleDraft.role_name,
        display_name: roleDraft.display_name,
        description: roleDraft.description,
        permissions: roleDraft.permissions
      };
      if (roleDraft.id) return updateAccessRole({ id: roleDraft.id, data: payload });
      return createAccessRole(payload);
    },
    onSuccess: async (data) => {
      setMessage(data.message || "Role saved.");
      setError("");
      setRoleDraft(null);
      await invalidate();
    },
    onError: (err) => setError(err.response?.data?.error || "Role could not be saved.")
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => deleteAccessRole(id),
    onSuccess: async (data) => {
      setMessage(data.message || "Role deleted.");
      setRoleDraft(null);
      await invalidate();
    },
    onError: (err) => setError(err.response?.data?.error || "Role could not be deleted.")
  });

  const selectRole = (nextRoleId) => {
    setRoleId(nextRoleId);
    const role = roles.find((item) => String(item.id) === String(nextRoleId));
    setSelectedPermissions(rolePermissionKeys(role, catalog?.permissions || []));
  };

  const cloneRole = async (source) => {
    setError("");
    const key = `${source.role_name}_copy`;
    try {
      const data = await cloneAccessRole({ id: source.id, data: { role_name: key } });
      setMessage(data.message || "Role cloned.");
      await invalidate();
      setRoleDraft({
        id: data.role.id,
        role_name: data.role.role_name,
        display_name: data.role.display_name,
        description: data.role.description,
        permissions: data.role.permissions
      });
    } catch (err) {
      setError(err.response?.data?.error || "Role could not be cloned.");
    }
  };

  const saveUser = () => {
    if (!selectedUser) return;
    const allKeys = catalog.permissions.map((item) => item.key);
    const revoked = allKeys.filter((key) => !selectedPermissions.includes(key));
    saveMutation.mutate({
      role_id: roleId ? Number(roleId) : undefined,
      permissions: selectedPermissions,
      revoked
    });
  };

  const toggleStatus = () => {
    saveMutation.mutate({ is_active: !selectedUser.is_active });
  };

  if (catalogQuery.isLoading || usersQuery.isLoading || rolesQuery.isLoading) {
    return (
      <div className="settings-card access-loading" role="status">
        <Loader2 size={20} className="spin" /> Loading users, roles and permissions…
      </div>
    );
  }

  if (catalogQuery.isError || usersQuery.isError || rolesQuery.isError) {
    return (
      <div className="settings-banner settings-banner--error" role="alert">
        <AlertCircle size={16} />
        <span>
          {catalogQuery.error?.response?.data?.error ||
            usersQuery.error?.response?.data?.error ||
            "Users and access could not be loaded."}
        </span>
      </div>
    );
  }

  return (
    <div className="access-view">
      <header className="access-header">
        <div>
          <span className="eyebrow">Workspace administration</span>
          <h2 className="settings-view-title">Users &amp; access</h2>
          <p className="settings-view-subtitle">
            Grant only the roles and permissions each person needs. Changes revoke existing sessions immediately.
          </p>
        </div>
        <div className="access-summary">
          <span><strong>{users.length}</strong> users</span>
          <span><strong>{roles.length}</strong> roles</span>
          <span><strong>{catalog.total}</strong> permissions</span>
        </div>
      </header>

      {message && (
        <div className="settings-banner settings-banner--success" role="status">
          <CheckCircle2 size={16} /><span>{message}</span>
        </div>
      )}
      {error && (
        <div className="settings-banner settings-banner--error" role="alert">
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}

      <div className="access-layout">
        <section className="settings-card access-user-list" aria-labelledby="access-users-title">
          <div className="settings-card-header">
            <div className="settings-card-title">
              <UserCog size={18} />
              <span id="access-users-title">People</span>
            </div>
          </div>
          <label className="access-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search users</span>
            <input
              type="search"
              placeholder="Search name, email, role…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="access-user-list-items">
            {filteredUsers.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`access-user-row${selectedUserId === item.id ? " is-selected" : ""}`}
                onClick={() => setSelectedUserId(item.id)}
              >
                <span className="access-user-avatar" aria-hidden="true">
                  {item.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                </span>
                <span className="access-user-main">
                  <span className="access-user-name">
                    {item.name}
                    {item.id === user?.id && <em>You</em>}
                  </span>
                  <span className="access-user-meta">{item.email}</span>
                </span>
                <span className="access-user-side">
                  <span className="tag-pill">{item.role_display_name}</span>
                  <span className={`access-state ${item.is_active ? "is-active" : "is-suspended"}`}>
                    {item.is_active ? "Active" : "Suspended"}
                  </span>
                </span>
              </button>
            ))}
            {filteredUsers.length === 0 && <p className="settings-card-copy">No users match this search.</p>}
          </div>
        </section>

        <section className="settings-card access-editor" aria-labelledby="access-editor-title">
          {!selectedUser ? (
            <div className="access-empty">
              <ShieldCheck size={28} />
              <h3 id="access-editor-title">Select a person</h3>
              <p>Choose a user to review their effective permissions and assign a role.</p>
            </div>
          ) : (
            <>
              <div className="settings-card-header">
                <div className="settings-card-title">
                  <ShieldCheck size={18} />
                  <span id="access-editor-title">{selectedUser.name}</span>
                </div>
                <span className={`status-badge ${selectedUser.is_active ? "won" : "lost"}`}>
                  {selectedUser.is_active ? "Active" : "Suspended"}
                </span>
              </div>

              <dl className="access-facts">
                <div><dt>Email</dt><dd>{selectedUser.email}</dd></div>
                <div><dt>Department</dt><dd>{selectedUser.department || "—"}</dd></div>
                <div><dt>Last sign-in</dt><dd>{selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : "Never"}</dd></div>
                <div><dt>MFA</dt><dd>{selectedUser.two_factor_method === "totp" ? "Authenticator app" : selectedUser.two_factor_enabled ? "Legacy email code" : "Not enabled"}</dd></div>
                <div><dt>Google</dt><dd>{selectedUser.google_linked ? "Linked" : "Not linked"}</dd></div>
                <div><dt>Permissions</dt><dd>{selectedUser.effective?.all ? "Full access" : `${selectedUser.effective?.permissions?.length || 0} granted`}</dd></div>
              </dl>

              {selectedUser.id === user?.id ? (
                <p className="settings-card-copy">You cannot change your own role, permissions or account status.</p>
              ) : (
                <>
                  <div className="form-group-circuit">
                    <label htmlFor="access-role">Assigned role</label>
                    <select
                      id="access-role"
                      value={roleId}
                      onChange={(event) => selectRole(event.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.display_name} {role.is_system ? "(system)" : "(custom)"}
                        </option>
                      ))}
                    </select>
                    <p className="field-hint">
                      {roles.find((role) => String(role.id) === String(roleId))?.description || "Choose the starting permission set."}
                    </p>
                  </div>

                  <details className="access-permissions-details">
                    <summary>
                      Fine-tune individual permissions
                      <span>{selectedPermissions.length} selected</span>
                    </summary>
                    <PermissionPicker
                      catalog={catalog}
                      selected={selectedPermissions}
                      onChange={setSelectedPermissions}
                      canGrant={canGrant}
                      disabled={saveMutation.isPending}
                    />
                  </details>

                  <div className="access-editor-actions">
                    <button type="button" className="btn-primary-yellow" onClick={saveUser} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                      <span>{saveMutation.isPending ? "Saving…" : "Save access"}</span>
                    </button>
                    <button type="button" className="btn-ghost-dark" onClick={toggleStatus} disabled={saveMutation.isPending}>
                      {selectedUser.is_active ? <UserX size={16} /> : <CheckCircle2 size={16} />}
                      <span>{selectedUser.is_active ? "Suspend account" : "Reactivate account"}</span>
                    </button>
                    <button type="button" className="btn-ghost-dark" onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending}>
                      <RefreshCw size={16} />
                      <span>{revokeMutation.isPending ? "Revoking…" : "Revoke sessions"}</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      <section className="settings-card access-roles" aria-labelledby="access-roles-title">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <KeyRound size={18} />
            <span id="access-roles-title">Roles</span>
          </div>
          <button
            type="button"
            className="btn-ghost-dark small"
            onClick={() => setRoleDraft({ role_name: "", display_name: "", description: "", permissions: [] })}
          >
            <Plus size={15} /> New custom role
          </button>
        </div>
        <p className="settings-card-copy">
          System templates are read-only. Clone one to make a custom role, then assign it to any user.
        </p>
        <div className="role-card-grid">
          {roles.map((role) => (
            <article className={`role-card${role.is_system ? " is-system" : ""}`} key={role.id}>
              <div className="role-card-head">
                <div>
                  <strong>{role.display_name}</strong>
                  <code>{role.role_name}</code>
                </div>
                <span className="tag-pill">{role.all ? "Full access" : `${role.permissions.length} perms`}</span>
              </div>
              <p>{role.description || "No description."}</p>
              <div className="role-card-actions">
                <button type="button" className="btn-ghost-dark small" onClick={() => cloneRole(role)}>
                  <Copy size={14} /> Clone
                </button>
                {!role.is_system && (
                  <>
                    <button
                      type="button"
                      className="btn-ghost-dark small"
                      onClick={() => setRoleDraft({ ...role, permissions: role.permissions })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost-dark small"
                      onClick={() => deleteRoleMutation.mutate(role.id)}
                      disabled={deleteRoleMutation.isPending}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        {roleDraft && (
          <div className="role-editor">
            <h3>{roleDraft.id ? "Edit custom role" : "New custom role"}</h3>
            <div className="form-row-2col">
              <div className="form-group-circuit">
                <label htmlFor="role-key">Role key</label>
                <input
                  id="role-key"
                  type="text"
                  value={roleDraft.role_name}
                  disabled={Boolean(roleDraft.id)}
                  onChange={(event) => setRoleDraft({ ...roleDraft, role_name: event.target.value })}
                  placeholder="sales_east"
                />
              </div>
              <div className="form-group-circuit">
                <label htmlFor="role-name">Display name</label>
                <input
                  id="role-name"
                  type="text"
                  value={roleDraft.display_name}
                  onChange={(event) => setRoleDraft({ ...roleDraft, display_name: event.target.value })}
                  placeholder="Sales — East"
                />
              </div>
            </div>
            <div className="form-group-circuit">
              <label htmlFor="role-description">Description</label>
              <input
                id="role-description"
                type="text"
                value={roleDraft.description}
                onChange={(event) => setRoleDraft({ ...roleDraft, description: event.target.value })}
              />
            </div>
            <PermissionPicker
              catalog={catalog}
              selected={roleDraft.permissions}
              onChange={(permissions) => setRoleDraft({ ...roleDraft, permissions })}
              canGrant={canGrant}
              disabled={roleMutation.isPending}
            />
            <div className="inline-actions">
              <button type="button" className="btn-primary-yellow" onClick={() => roleMutation.mutate()} disabled={roleMutation.isPending}>
                {roleMutation.isPending ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                <span>{roleMutation.isPending ? "Saving…" : "Save role"}</span>
              </button>
              <button type="button" className="btn-ghost-dark" onClick={() => setRoleDraft(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
