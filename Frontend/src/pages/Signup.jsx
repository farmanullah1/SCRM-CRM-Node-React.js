import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Create account · SCRM");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "We could not create your workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="01 // Registration"
      title="Create workspace"
      subtitle="One account, one pipeline — ready in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
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
          <label className="form-label" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            className="form-input"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Alex Vance"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="signup-email">
            Work email
          </label>
          <input
            id="signup-email"
            className="form-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="alex@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="signup-password">
            Password
          </label>
          <div className="field-with-action">
            <input
              id="signup-password"
              className="form-input"
              type={showPassword ? "text" : "password"}
              name="new-password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              required
              minLength={6}
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
          <p className="form-hint">Use 6 or more characters.</p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="signup-confirm">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            className="form-input"
            type={showPassword ? "text" : "password"}
            name="confirm-password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={17} className="spin" aria-hidden="true" />
              <span>Creating workspace…</span>
            </>
          ) : (
            <>
              <span>Create workspace</span>
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
