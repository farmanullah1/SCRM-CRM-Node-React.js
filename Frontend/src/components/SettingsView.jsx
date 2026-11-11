import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  Upload
} from "lucide-react";
import {
  assetUrl,
  getSmtpStatus,
  removeProfileAvatar,
  removeProfileCover,
  sendSmtpTest,
  toggle2FA,
  updateProfile,
  uploadProfileAvatar,
  uploadProfileCover
} from "../services/api";
import useModalAccessibility from "../hooks/useModalAccessibility";

const TABS = [
  { key: "profile", label: "My account" },
  { key: "security", label: "Security" },
  { key: "email", label: "Email & SMTP", adminOnly: true },
  { key: "account", label: "Account" }
];

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

function initialsOf(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function SettingsView({ user, refreshUser, logout, showToast }) {
  const { tab: rawTab } = useParams();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const tab = TABS.some((item) => item.key === rawTab) ? rawTab : "profile";

  const [profile, setProfile] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    company_name: user?.company_name || "",
    title: user?.title || "",
    bio: user?.bio || ""
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [mediaError, setMediaError] = useState("");
  const [mediaBusy, setMediaBusy] = useState("");
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [smtpRecipient, setSmtpRecipient] = useState(user?.email || "");
  const [smtpResult, setSmtpResult] = useState(null);
  const [smtpBusy, setSmtpBusy] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useModalAccessibility(signOutOpen, () => setSignOutOpen(false));

  useEffect(() => {
    if (!rawTab) navigate("/app/settings/profile", { replace: true });
  }, [rawTab, navigate]);

  useEffect(() => {
    setProfile({
      name: user?.name || "",
      phone: user?.phone || "",
      company_name: user?.company_name || "",
      title: user?.title || "",
      bio: user?.bio || ""
    });
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (data) => {
      setFormError("");
      setFormMessage(data.message || "Profile updated.");
      await refreshUser?.();
      showToast("Profile settings saved.");
    },
    onError: (err) => {
      setFormMessage("");
      setFormError(err.response?.data?.error || "Could not update your profile.");
    }
  });

  const toggle2FAMutation = useMutation({
    mutationFn: toggle2FA,
    onSuccess: async (data) => {
      await refreshUser?.();
      showToast(data.message || "Two-step verification updated.");
    },
    onError: (err) => showToast(err.response?.data?.error || "Could not update two-step verification.")
  });

  const smtpQuery = useQuery({
    queryKey: ["smtpStatus"],
    queryFn: getSmtpStatus,
    enabled: tab === "email" && isAdmin,
    retry: false
  });

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");
    if (!profile.name.trim()) {
      setFormError("Your full name is required.");
      return;
    }
    updateProfileMutation.mutate(profile);
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");
    if (passwords.next !== passwords.confirm) {
      setFormError("The new password and confirmation do not match.");
      return;
    }
    if (passwords.next.length < 8) {
      setFormError("Choose a new password with at least 8 characters.");
      return;
    }
    updateProfileMutation.mutate(
      { currentPassword: passwords.current, newPassword: passwords.next },
      {
        onSuccess: (data) => {
          setPasswords({ current: "", next: "", confirm: "" });
          setFormMessage(data.message || "Password updated.");
        }
      }
    );
  };

  const handleMedia = async (kind, file) => {
    if (!file) return;
    const max = kind === "avatar" ? MAX_AVATAR_BYTES : MAX_COVER_BYTES;
    setMediaError("");

    if (!file.type.startsWith("image/")) {
      setMediaError("Choose a JPEG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > max) {
      setMediaError(`That image is larger than ${Math.round(max / 1024 / 1024)} MB.`);
      return;
    }

    setMediaBusy(kind);
    try {
      if (kind === "avatar") await uploadProfileAvatar(file);
      else await uploadProfileCover(file);
      await refreshUser?.();
      showToast(kind === "avatar" ? "Profile photo updated." : "Cover photo updated.");
    } catch (err) {
      setMediaError(err.response?.data?.error || "The image could not be uploaded.");
    } finally {
      setMediaBusy("");
    }
  };

  const handleRemoveMedia = async (kind) => {
    setMediaError("");
    setMediaBusy(kind);
    try {
      if (kind === "avatar") await removeProfileAvatar();
      else await removeProfileCover();
      await refreshUser?.();
      showToast(kind === "avatar" ? "Profile photo removed." : "Cover photo removed.");
    } catch (err) {
      setMediaError(err.response?.data?.error || "The image could not be removed.");
    } finally {
      setMediaBusy("");
    }
  };

  const handleSmtpTest = async (event) => {
    event.preventDefault();
    setSmtpResult(null);
    if (!smtpRecipient.trim()) return;
    setSmtpBusy(true);
    try {
      const result = await sendSmtpTest(smtpRecipient.trim());
      setSmtpResult({ ok: true, message: result.message || "The SMTP server accepted the test message." });
    } catch (err) {
      setSmtpResult({
        ok: false,
        message: err.response?.data?.error || "The test message could not be sent."
      });
    } finally {
      setSmtpBusy(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const result = await logout();
    setSigningOut(false);
    navigate("/login", {
      replace: true,
      state: {
        message: result?.serverRevoked
          ? "You have been signed out on this device."
          : "Signed out locally. The server session could not be confirmed as revoked."
      }
    });
  };

  const smtpStatus = smtpQuery.data;

  return (
    <div className="settings-view-stack">
      <header className="settings-view-header">
        <span className="eyebrow">Account</span>
        <h1 className="settings-view-title">Settings</h1>
        <p className="settings-view-subtitle">
          Manage your profile, security and workspace communication preferences.
        </p>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {TABS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.key}
            to={`/app/settings/${item.key}`}
            className={({ isActive }) => `settings-tab${isActive ? " is-active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {formMessage && (
        <div className="settings-banner settings-banner--success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{formMessage}</span>
        </div>
      )}
      {formError && (
        <div className="settings-banner settings-banner--error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}
      {mediaError && (
        <div className="settings-banner settings-banner--error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{mediaError}</span>
        </div>
      )}

      {tab === "profile" && (
        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="profile-media-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <Camera size={18} aria-hidden="true" />
                <span id="profile-media-title">Profile photo & cover</span>
              </div>
            </div>

            <div className="profile-cover">
              {user?.cover_url ? (
                <img src={assetUrl(user.cover_url)} alt="Your cover" className="profile-cover-img" />
              ) : (
                <div className="profile-cover-placeholder" aria-hidden="true" />
              )}
              <div className="profile-cover-actions">
                <label className="btn-ghost-dark small">
                  <Upload size={14} aria-hidden="true" />
                  <span>{mediaBusy === "cover" ? "Uploading…" : "Upload cover"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => handleMedia("cover", event.target.files?.[0])}
                    disabled={Boolean(mediaBusy)}
                  />
                </label>
                {user?.cover_url && (
                  <button
                    type="button"
                    className="btn-ghost-dark small"
                    onClick={() => handleRemoveMedia("cover")}
                    disabled={Boolean(mediaBusy)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {user?.avatar_url ? (
                  <img src={assetUrl(user.avatar_url)} alt="" className="profile-avatar-img" />
                ) : (
                  <span className="profile-avatar-initials">{initialsOf(user?.name)}</span>
                )}
              </div>
              <div className="profile-avatar-copy">
                <p className="profile-avatar-title">Profile photo</p>
                <p className="profile-avatar-hint">
                  JPEG, PNG, WEBP or GIF · up to 5 MB. Crop controls are not available yet; images are
                  fitted inside the frame.
                </p>
                <div className="profile-avatar-actions">
                  <label className="btn-ghost-dark small">
                    <Upload size={14} aria-hidden="true" />
                    <span>{mediaBusy === "avatar" ? "Uploading…" : "Upload photo"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => handleMedia("avatar", event.target.files?.[0])}
                      disabled={Boolean(mediaBusy)}
                    />
                  </label>
                  {user?.avatar_url && (
                    <button
                      type="button"
                      className="btn-ghost-dark small"
                      onClick={() => handleRemoveMedia("avatar")}
                      disabled={Boolean(mediaBusy)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="profile-details-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <ShieldCheck size={18} aria-hidden="true" />
                <span id="profile-details-title">Personal profile</span>
              </div>
              <span className="tag-pill">{user?.role || "member"}</span>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div className="form-group-circuit">
                <label htmlFor="profile-name">Full name *</label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />
              </div>

              <div className="form-group-circuit">
                <label htmlFor="profile-email">Work email</label>
                <input id="profile-email" type="email" value={user?.email || ""} disabled />
                <p className="field-hint">Changing your email requires re-verification and is not available yet.</p>
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label htmlFor="profile-phone">Phone number</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 555 0199"
                    value={profile.phone}
                    onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                  />
                  <p className="field-hint">Unverified contact number. No SMS is sent automatically.</p>
                </div>
                <div className="form-group-circuit">
                  <label htmlFor="profile-title">Job title</label>
                  <input
                    id="profile-title"
                    type="text"
                    autoComplete="organization-title"
                    placeholder="Sales Director"
                    value={profile.title}
                    onChange={(event) => setProfile({ ...profile, title: event.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-circuit">
                <label htmlFor="profile-company">Company / organization</label>
                <input
                  id="profile-company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Acme Enterprise"
                  value={profile.company_name}
                  onChange={(event) => setProfile({ ...profile, company_name: event.target.value })}
                />
              </div>

              <div className="form-group-circuit">
                <label htmlFor="profile-bio">Short bio</label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  maxLength={280}
                  placeholder="What you work on and who you help."
                  value={profile.bio}
                  onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                />
                <p className="field-hint">{profile.bio.length}/280 characters</p>
              </div>

              <button type="submit" className="btn-primary-yellow" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving…" : "Save profile"}
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === "security" && (
        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="two-step-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <ShieldCheck size={18} aria-hidden="true" />
                <span id="two-step-title">Two-step verification</span>
              </div>
              <span className={`status-badge ${user?.twoFactorEnabled ? "won" : "in-progress"}`}>
                {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <p className="settings-card-copy">
              When enabled, signing in requires a 6-digit one-time code delivered to your verified email
              address. Authenticator-app and recovery-code factors are not implemented yet.
            </p>

            <button
              type="button"
              className={user?.twoFactorEnabled ? "btn-ghost-dark" : "btn-primary-yellow"}
              onClick={() => toggle2FAMutation.mutate()}
              disabled={toggle2FAMutation.isPending}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                {toggle2FAMutation.isPending
                  ? "Updating…"
                  : user?.twoFactorEnabled
                    ? "Disable two-step verification"
                    : "Enable two-step verification"}
              </span>
            </button>
          </section>

          <section className="settings-card" aria-labelledby="password-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <Lock size={18} aria-hidden="true" />
                <span id="password-title">Password</span>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group-circuit">
                <label htmlFor="current-password">Current password *</label>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passwords.current}
                  onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                />
              </div>
              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label htmlFor="new-password">New password *</label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={passwords.next}
                    onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                  />
                </div>
                <div className="form-group-circuit">
                  <label htmlFor="confirm-password">Confirm new password *</label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={passwords.confirm}
                    onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary-yellow small" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Updating…" : "Update password"}
              </button>
            </form>
          </section>

          <section className="settings-card" aria-labelledby="session-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <LogOut size={18} aria-hidden="true" />
                <span id="session-title">Session</span>
              </div>
            </div>
            <p className="settings-card-copy">
              Signing out ends this device session and clears the access token stored in this browser.
            </p>
            <button type="button" className="btn-ghost-dark" onClick={() => setSignOutOpen(true)}>
              <LogOut size={16} aria-hidden="true" />
              <span>Sign out…</span>
            </button>
          </section>
        </div>
      )}

      {tab === "email" && isAdmin && (
        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="smtp-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <Mail size={18} aria-hidden="true" />
                <span id="smtp-title">Email delivery (SMTP)</span>
              </div>
              <span className={`status-badge ${smtpStatus?.configured ? (smtpStatus.connected ? "won" : "in-progress") : "lost"}`}>
                {smtpQuery.isLoading
                  ? "Checking…"
                  : smtpStatus?.configured
                    ? smtpStatus.connected
                      ? "Connected"
                      : "Configured · failing"
                    : "Not configured"}
              </span>
            </div>

            <p className="settings-card-copy">
              SMTP credentials live only on the server. This page shows non-secret connection details and
              sends a real diagnostic message through the configured relay.
            </p>

            {smtpQuery.isError && (
              <div className="settings-banner settings-banner--error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>
                  {smtpQuery.error?.response?.data?.error || "Could not read the SMTP configuration."}
                </span>
              </div>
            )}

            <dl className="smtp-facts">
              <div>
                <dt>Relay</dt>
                <dd>{smtpStatus?.relay || "—"}</dd>
              </div>
              <div>
                <dt>Host</dt>
                <dd>{smtpStatus?.host || "—"}</dd>
              </div>
              <div>
                <dt>Port</dt>
                <dd>{smtpStatus?.port ?? "—"}</dd>
              </div>
              <div>
                <dt>Encryption</dt>
                <dd>{smtpStatus?.secure ? "TLS (implicit)" : smtpStatus?.host ? "STARTTLS" : "—"}</dd>
              </div>
              <div>
                <dt>Sender</dt>
                <dd>{smtpStatus?.fromAddress || "—"}</dd>
              </div>
            </dl>

            <p className={`settings-card-copy ${smtpStatus?.connected ? "" : "is-muted"}`}>
              {smtpStatus?.message || "Connection status is checked when this page opens."}
            </p>

            <button
              type="button"
              className="btn-ghost-dark small"
              onClick={() => smtpQuery.refetch()}
              disabled={smtpQuery.isFetching}
            >
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{smtpQuery.isFetching ? "Verifying…" : "Verify connection"}</span>
            </button>

            <form className="smtp-test-form" onSubmit={handleSmtpTest}>
              <div className="form-group-circuit">
                <label htmlFor="smtp-recipient">Send a real test email to</label>
                <input
                  id="smtp-recipient"
                  type="email"
                  required
                  value={smtpRecipient}
                  onChange={(event) => setSmtpRecipient(event.target.value)}
                />
                <p className="field-hint">
                  The recipient will receive a real message. SMTP acceptance does not guarantee inbox delivery.
                </p>
              </div>
              <button type="submit" className="btn-primary-yellow small" disabled={smtpBusy}>
                {smtpBusy ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />}
                <span>{smtpBusy ? "Sending…" : "Send test email"}</span>
              </button>
            </form>

            {smtpResult && (
              <div
                className={`settings-banner ${smtpResult.ok ? "settings-banner--success" : "settings-banner--error"}`}
                role="status"
              >
                {smtpResult.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
                <span>{smtpResult.message}</span>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "account" && (
        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="account-details-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <span id="account-details-title">Account details</span>
              </div>
            </div>
            <dl className="smtp-facts">
              <div>
                <dt>Name</dt>
                <dd>{user?.name || "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user?.email || "—"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{user?.role || "—"}</dd>
              </div>
              <div>
                <dt>Two-step verification</dt>
                <dd>{user?.twoFactorEnabled ? "Enabled" : "Disabled"}</dd>
              </div>
            </dl>
          </section>

          <section className="settings-card danger-zone-card" aria-labelledby="signout-title">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <LogOut size={18} aria-hidden="true" />
                <span id="signout-title">Sign out</span>
              </div>
            </div>
            <p className="settings-card-copy">
              Ending your session revokes this browser's access. Signing out of all devices is not
              implemented yet.
            </p>
            <button type="button" className="btn-danger" onClick={() => setSignOutOpen(true)}>
              <LogOut size={16} aria-hidden="true" />
              <span>Sign out…</span>
            </button>
          </section>
        </div>
      )}

      {tab === "email" && !isAdmin && (
        <div className="settings-card">
          <h2 className="settings-card-title">Email delivery is restricted</h2>
          <p className="settings-card-copy">
            Only workspace administrators can view SMTP configuration and send diagnostic messages.
          </p>
        </div>
      )}

      {signOutOpen && (
        <div className="modal-overlay-circuit" onClick={() => setSignOutOpen(false)}>
          <div className="modal-box-circuit" onClick={(event) => event.stopPropagation()}>
            <h3>Sign out of SCRM?</h3>
            <p className="settings-card-copy">
              This device session will be signed out and its access token cleared. You will need to sign
              in again to return to the workspace.
            </p>
            <div className="modal-footer-btns">
              <button type="button" className="btn-ghost-dark" onClick={() => setSignOutOpen(false)} disabled={signingOut}>
                Stay signed in
              </button>
              <button type="button" className="btn-danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
                <span>{signingOut ? "Signing out…" : "Sign out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
