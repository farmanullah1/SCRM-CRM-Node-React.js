import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, ArrowRight, Zap } from "lucide-react";

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
      setError(err.response?.data?.error || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-circuit-page">
      <div className="auth-circuit-card">
        <div className="auth-circuit-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
            <div className="brand-glyph">
              <Zap size={20} color="#F0FF60" />
            </div>
          </div>
          <div className="eyebrow" style={{ marginBottom: "0.35rem" }}>
            SCRM ACCESS
          </div>
          <h2 className="auth-circuit-title">Sign In</h2>
          <p className="auth-circuit-sub">Enter your credentials to access your CRM workspace.</p>
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
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="circuit-form-group" style={{ marginBottom: "2rem" }}>
            <label className="circuit-label">Password</label>
            <input
              type="password"
              required
              className="circuit-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center" }} disabled={loading}>
            <span>{loading ? "Signing In..." : "Sign In to SCRM"}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

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
