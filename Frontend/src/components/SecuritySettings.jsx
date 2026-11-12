import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import {
  disable2FA,
  enable2FA,
  get2FAStatus,
  linkGoogleAccount,
  regenerateRecoveryCodes,
  setup2FA,
  unlinkGoogleAccount
} from "../services/api";
import GoogleSignInButton from "./GoogleSignInButton";

function downloadRecoveryCodes(codes) {
  const blob = new Blob(
    [`SCRM recovery codes\nGenerated ${new Date().toISOString()}\n\n${codes.join("\n")}\n\nEach code works once. Store these offline.\n`],
    { type: "text/plain" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "scrm-recovery-codes.txt";
  link.click();
  URL.revokeObjectURL(url);
}

export default function SecuritySettings({ user, refreshUser, showToast }) {
  const statusQuery = useQuery({
    queryKey: ["twoFactorStatus"],
    queryFn: get2FAStatus
  });
  const status = statusQuery.data;
  const enabled = Boolean(status?.enabled);

  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [unlinkPassword, setUnlinkPassword] = useState("");

  useEffect(() => {
    if (statusQuery.error) {
      setError(statusQuery.error.response?.data?.error || "Could not read your security settings.");
    }
  }, [statusQuery.error]);

  const startSetup = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setBusy("setup");
    try {
      const data = await setup2FA({ currentPassword: password });
      setSetup(data);
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Authenticator setup could not be started.");
    } finally {
      setBusy("");
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    setError("");
    setBusy("enable");
    try {
      const data = await enable2FA({ code });
      setRecoveryCodes(data.recoveryCodes || []);
      setSetup(null);
      setCode("");
      setInfo("Authenticator-app verification is enabled. Save your recovery codes now.");
      await statusQuery.refetch();
      await refreshUser?.();
      showToast("Two-step verification enabled.");
    } catch (err) {
      setError(err.response?.data?.error || "That verification code could not be accepted.");
    } finally {
      setBusy("");
    }
  };

  const disable = async (event) => {
    event.preventDefault();
    if (!window.confirm("Disable two-step verification for this account?")) return;
    setError("");
    setInfo("");
    setBusy("disable");
    try {
      await disable2FA({ currentPassword: password });
      setPassword("");
      setRecoveryCodes([]);
      await statusQuery.refetch();
      await refreshUser?.();
      showToast("Two-step verification disabled.");
    } catch (err) {
      setError(err.response?.data?.error || "Two-step verification could not be disabled.");
    } finally {
      setBusy("");
    }
  };

  const rotateCodes = async (event) => {
    event.preventDefault();
    setError("");
    setBusy("rotate");
    try {
      const data = await regenerateRecoveryCodes({ currentPassword: password, code });
      setRecoveryCodes(data.recoveryCodes || []);
      setPassword("");
      setCode("");
      await statusQuery.refetch();
      setInfo("New recovery codes generated. Previous codes no longer work.");
    } catch (err) {
      setError(err.response?.data?.error || "Recovery codes could not be regenerated.");
    } finally {
      setBusy("");
    }
  };

  const linkGoogle = async (credential) => {
    setError("");
    setInfo("");
    try {
      await linkGoogleAccount({ credential });
      await refreshUser?.();
      setInfo("Google sign-in is linked to this account.");
    } catch (err) {
      setError(err.response?.data?.error || "Google account could not be linked.");
    }
  };

  const unlinkGoogle = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await unlinkGoogleAccount({ currentPassword: unlinkPassword });
      setUnlinkPassword("");
      await refreshUser?.();
      setInfo("Google sign-in unlinked.");
    } catch (err) {
      setError(err.response?.data?.error || "Google account could not be unlinked.");
    }
  };

  return (
    <div className="settings-grid">
      <section className="settings-card settings-card--wide" aria-labelledby="totp-title">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <Smartphone size={18} aria-hidden="true" />
            <span id="totp-title">Authenticator app</span>
          </div>
          <span className={`status-badge ${enabled && status?.method === "totp" ? "won" : "in-progress"}`}>
            {statusQuery.isLoading ? "Checking…" : status?.method === "totp" ? "Enabled" : "Not enrolled"}
          </span>
        </div>

        {error && (
          <div className="settings-banner settings-banner--error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="settings-banner settings-banner--success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{info}</span>
          </div>
        )}

        {status?.method === "email_legacy" && (
          <div className="settings-banner settings-banner--warning" role="status">
            <AlertCircle size={16} aria-hidden="true" />
            <span>
              This account still uses the older email-code sign-in. Enrol an authenticator app below; the email
              fallback remains only until you confirm the first authenticator code.
            </span>
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div className="recovery-code-panel">
            <div className="recovery-code-head">
              <div>
                <strong>Save these recovery codes</strong>
                <p>Each code works once. They are shown only now.</p>
              </div>
              <div className="recovery-code-actions">
                <button
                  type="button"
                  className="btn-ghost-dark small"
                  onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}
                >
                  <Copy size={14} aria-hidden="true" /> Copy all
                </button>
                <button type="button" className="btn-ghost-dark small" onClick={() => downloadRecoveryCodes(recoveryCodes)}>
                  <Download size={14} aria-hidden="true" /> Download
                </button>
              </div>
            </div>
            <ol className="recovery-code-grid">
              {recoveryCodes.map((recoveryCode) => (
                <li key={recoveryCode}><code>{recoveryCode}</code></li>
              ))}
            </ol>
          </div>
        )}

        {!enabled || status?.method === "email_legacy" ? (
          !setup ? (
            <form onSubmit={startSetup} className="security-form">
              <p className="settings-card-copy">
                Use any TOTP authenticator app (1Password, Authy, Google Authenticator, Microsoft Authenticator).
                Setup requires your current password.
              </p>
              <div className="form-group-circuit">
                <label htmlFor="totp-current-password">Current password</label>
                <input
                  id="totp-current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary-yellow" disabled={busy === "setup"}>
                {busy === "setup" ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
                <span>{busy === "setup" ? "Starting…" : "Set up authenticator"}</span>
              </button>
            </form>
          ) : (
            <div className="totp-enrollment">
              <div className="totp-qr">
                <img src={setup.qrDataUrl} alt="Authenticator setup QR code" width="220" height="220" />
              </div>
              <div className="totp-enrollment-copy">
                <p>Scan this QR code, or enter the setup key manually:</p>
                <code className="totp-secret">{setup.secret}</code>
                <form onSubmit={confirmSetup}>
                  <div className="form-group-circuit">
                    <label htmlFor="totp-confirm-code">Current 6-digit code</label>
                    <input
                      id="totp-confirm-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <div className="inline-actions">
                    <button type="submit" className="btn-primary-yellow" disabled={busy === "enable"}>
                      {busy === "enable" ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                      <span>Confirm and enable</span>
                    </button>
                    <button type="button" className="btn-ghost-dark" onClick={() => { setSetup(null); setCode(""); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        ) : (
          <div className="security-enabled-panel">
            <p className="settings-card-copy">
              Sign-in requires a code from your authenticator app. Recovery codes remaining:{" "}
              <strong>{status?.recoveryCodesRemaining ?? 0}</strong>.
            </p>
            <form onSubmit={rotateCodes} className="security-form">
              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label htmlFor="rotate-password">Current password</label>
                  <input
                    id="rotate-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="form-group-circuit">
                  <label htmlFor="rotate-code">Authenticator code</label>
                  <input
                    id="rotate-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
              <button type="submit" className="btn-ghost-dark" disabled={busy === "rotate"}>
                <KeyRound size={16} aria-hidden="true" />
                <span>{busy === "rotate" ? "Generating…" : "Regenerate recovery codes"}</span>
              </button>
            </form>
            <form onSubmit={disable} className="security-form security-form--danger">
              <div className="form-group-circuit">
                <label htmlFor="disable-password">Current password to disable</label>
                <input
                  id="disable-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <button type="submit" className="btn-danger" disabled={busy === "disable"}>
                <Lock size={16} aria-hidden="true" />
                <span>{busy === "disable" ? "Disabling…" : "Disable two-step verification"}</span>
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="settings-card" aria-labelledby="google-link-title">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <span id="google-link-title">Google sign-in</span>
          </div>
          <span className={`status-badge ${user?.googleLinked ? "won" : "in-progress"}`}>
            {user?.googleLinked ? "Linked" : "Not linked"}
          </span>
        </div>
        <p className="settings-card-copy">
          Link only a Google account that uses this exact email address. If your account uses two-step verification,
          you will still be asked for it after Google sign-in.
        </p>
        {!user?.googleLinked ? (
          <GoogleSignInButton onCredential={linkGoogle} mode="signin" />
        ) : (
          <form onSubmit={unlinkGoogle} className="security-form">
            <div className="form-group-circuit">
              <label htmlFor="unlink-google-password">Current password</label>
              <input
                id="unlink-google-password"
                type="password"
                required
                autoComplete="current-password"
                value={unlinkPassword}
                onChange={(event) => setUnlinkPassword(event.target.value)}
              />
            </div>
            <button type="submit" className="btn-ghost-dark">Unlink Google</button>
          </form>
        )}
      </section>
    </div>
  );
}
