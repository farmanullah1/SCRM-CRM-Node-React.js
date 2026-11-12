import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { AlertCircle, ArrowRight, Shield, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { forgotPassword, resetPassword } from "../services/api";

export default function Login() {
  const { user, login, complete2FA, completeRecovery, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Only internal workspace destinations are honoured after authentication.
  const returnTo = String(location.state?.from || "").startsWith("/app/")
    ? location.state.from
    : "/app/dashboard";
  const stateMessage = location.state?.message || "";

  React.useEffect(() => {
    if (user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate, returnTo]);

  // Mode: "login" | "2fa" | "recovery" | "forgot"
  const [mode, setMode] = useState("login");
  const [mfaMethod, setMfaMethod] = useState("totp");
  const [recoveryCode, setRecoveryCode] = useState("");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState("request"); // "request" | "reset"

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res?.twoFactorRequired) {
        setTempToken(res.tempToken);
        setMfaMethod(res.method || "totp");
        setMode("2fa");
        setSuccessMsg(res.message || "Complete two-step verification to continue.");
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await complete2FA(tempToken, otpCode);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Invalid verification code. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError("");
    setLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res?.twoFactorRequired) {
        setTempToken(res.tempToken);
        setMfaMethod(res.method || "totp");
        setMode("2fa");
        setSuccessMsg(res.message || "Complete two-step verification to continue.");
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await completeRecovery(tempToken, recoveryCode);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "That recovery code is invalid or already used.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await forgotPassword({ email: forgotEmail });
      setSuccessMsg(res.message || "If an account exists, instructions have been dispatched.");
      setForgotStep("reset");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await resetPassword({
        email: forgotEmail,
        resetToken,
        newPassword
      });
      setSuccessMsg(res.message || "Password successfully reset! You can now log in.");
      setMode("login");
      setEmail(forgotEmail);
    } catch (err) {
      setError(err.response?.data?.error || "Password reset failed. Verify your token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-circuit-page">
      <div className="auth-circuit-card">
        {/* Header */}
        <div className="auth-circuit-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.85rem" }}>
            <BrandLogo variant="stacked" size={38} showTagline={false} />
          </div>
          <div className="eyebrow" style={{ marginBottom: "0.35rem" }}>
            {mode === "2fa" || mode === "recovery" ? "SECURITY VERIFICATION" : mode === "forgot" ? "ACCOUNT RECOVERY" : "SCRM ACCESS"}
          </div>
          <h2 className="auth-circuit-title">
            {mode === "2fa" ? "Two-step verification" : mode === "recovery" ? "Recovery code" : mode === "forgot" ? "Reset Password" : "Sign In"}
          </h2>
          <p className="auth-circuit-sub">
            {mode === "2fa"
              ? mfaMethod === "totp"
                ? "Enter the current 6-digit code from your authenticator app."
                : "Enter the 6-digit code sent to your registered email."
              : mode === "recovery"
              ? "Enter one of the single-use recovery codes you saved when enabling two-step verification."
              : mode === "forgot"
              ? "Recover access to your SCRM workspace."
              : "Enter your credentials to access your CRM workspace."}
          </p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {(successMsg || stateMessage) && (
          <div role="status" style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.4)", borderRadius: "8px", padding: "10px 14px", marginBottom: "1.25rem", color: "#22C55E", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} />
            <span>{successMsg || stateMessage}</span>
          </div>
        )}

        {/* MODE 1: STANDARD LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit}>
            <div className="circuit-form-group">
              <label className="circuit-label">Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="circuit-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="circuit-form-group" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="circuit-label">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setForgotEmail(email);
                    setError("");
                    setSuccessMsg("");
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="circuit-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center", marginTop: "1rem" }} disabled={loading}>
              <span>{loading ? "Signing In..." : "Sign In to SCRM"}</span>
              {!loading && <ArrowRight size={18} />}
            </button>

            <div className="auth-divider" role="separator"><span>or continue with</span></div>
            <GoogleSignInButton onCredential={handleGoogle} disabled={loading} mode="signin" />
          </form>
        )}

        {/* MODE 2: TWO-FACTOR AUTH (2FA) */}
        {mode === "2fa" && (
          <form onSubmit={handle2FASubmit}>
            <div className="circuit-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="circuit-label">6-Digit Verification Code</label>
              <input
                type="text"
                required
                maxLength="6"
                autoFocus
                className="circuit-input"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={{ textAlign: "center", letterSpacing: "8px", fontSize: "20px", fontFamily: "var(--font-mono)", fontWeight: "bold" }}
              />
            </div>

            <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center" }} disabled={loading}>
              <span>{loading ? "Verifying..." : "Confirm & Enter Dashboard"}</span>
              {!loading && <Shield size={18} />}
            </button>

            {mfaMethod === "totp" && (
              <button
                type="button"
                onClick={() => { setMode("recovery"); setError(""); setSuccessMsg(""); }}
                style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "13px", width: "100%", marginTop: "0.9rem", cursor: "pointer" }}
              >
                Use a recovery code instead
              </button>
            )}

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "13px", width: "100%", marginTop: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}

        {mode === "recovery" && (
          <form onSubmit={handleRecoverySubmit}>
            <div className="circuit-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="circuit-label">Recovery code</label>
              <input
                type="text"
                required
                autoFocus
                autoComplete="one-time-code"
                className="circuit-input"
                placeholder="XXXXXX-XXXXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center" }} disabled={loading}>
              <span>{loading ? "Verifying..." : "Use recovery code"}</span>
              {!loading && <KeyRound size={18} />}
            </button>
            <button
              type="button"
              onClick={() => { setMode("2fa"); setError(""); setSuccessMsg(""); }}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "13px", width: "100%", marginTop: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ArrowLeft size={14} /> Back to authenticator code
            </button>
          </form>
        )}

        {/* MODE 3: FORGOT / RESET PASSWORD */}
        {mode === "forgot" && (
          <div>
            {forgotStep === "request" ? (
              <form onSubmit={handleForgotRequest}>
                <div className="circuit-form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="circuit-label">Registered Account Email</label>
                  <input
                    type="email"
                    required
                    className="circuit-input"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center" }} disabled={loading}>
                  <span>{loading ? "Dispatching Reset Email..." : "Send Reset Instructions"}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Reset Token (from Email)</label>
                  <input
                    type="text"
                    required
                    className="circuit-input"
                    placeholder="Paste 64-character token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                  />
                </div>
                <div className="circuit-form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="circuit-label">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    className="circuit-input"
                    placeholder="Enter new secure password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center" }} disabled={loading}>
                  <span>{loading ? "Updating Password..." : "Update Password"}</span>
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); setForgotStep("request"); }}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "13px", width: "100%", marginTop: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        )}

        <p className="auth-switch-text">
          Don't have an account?
          <Link to="/signup" className="auth-cyan-link">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
