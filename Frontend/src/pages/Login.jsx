import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-circuit-page">
      <div className="auth-circuit-card">
        <div className="auth-circuit-header">
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>
            01 // AUTHENTICATION
          </div>
          <h2 className="auth-circuit-title">Sign In</h2>
          <p className="auth-circuit-sub">Access your SCRM workspace and deals</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="circuit-form-group">
            <label className="circuit-label">Email Address</label>
            <input
              type="email"
              required
              className="circuit-input"
              placeholder="operator@scrm.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="circuit-form-group" style={{ marginBottom: "2rem" }}>
            <label className="circuit-label">Security Key / Password</label>
            <input
              type="password"
              required
              className="circuit-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="button-cta-final" disabled={loading}>
            <span>{loading ? "Authorizing..." : "Authorize Access"}</span>
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <p className="auth-switch-text">
          Unregistered operator?
          <Link to="/signup" className="auth-cyan-link">
            Initialize Account
          </Link>
        </p>
      </div>
    </div>
  );
}
