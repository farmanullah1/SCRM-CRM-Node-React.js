import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";
import { AlertCircle, ArrowRight, Shield, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { forgotPassword, resetPassword } from "../services/api";

export default function Login() {
  const { user, login, complete2FA } = useAuth();
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

  // Mode: "login" | "2fa" | "forgot"
  const [mode, setMode] = useState("login");

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
        setMode("2fa");
        setSuccessMsg(res.message || "Enter the 6-digit verification code sent to your email.");
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
            {mode === "2fa" ? "SECURITY VERIFICATION" : mode === "forgot" ? "ACCOUNT RECOVERY" : "SCRM ACCESS"}
          </div>
          <h2 className="auth-circuit-title">
            {mode === "2fa" ? "Two-Factor Auth" : mode === "forgot" ? "Reset Password" : "Sign In"}
          </h2>
          <p className="auth-circuit-sub">
            {mode === "2fa"
              ? "Enter the 6-digit OTP code sent to your registered email."
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

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "13px", width: "100%", marginTop: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ArrowLeft size={14} /> Back to Sign In
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
