import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Sign in · SCRM");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "We could not sign you in. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="01 // Authentication"
      title="Sign in"
      subtitle="Resume your pipeline, contacts and live deal telemetry."
      footer={
        <>
          New to SCRM?{" "}
          <Link to="/signup" className="auth-link">
            Create an account
          </Link>
        </>
      }
    >
      {error && (
        <div className="form-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="operator@scrm.io"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Password
          </label>
          <div className="field-with-action">
            <input
              id="login-password"
              className="form-input"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="field-action"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={17} className="spin" aria-hidden="true" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
