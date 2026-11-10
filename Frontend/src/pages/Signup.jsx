import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, ArrowRight, Zap } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to register account. Please try again.");
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
            GET STARTED WITH SCRM
          </div>
          <h2 className="auth-circuit-title">Create Account</h2>
          <p className="auth-circuit-sub">Start managing contacts, pipeline deals, and scheduled tasks.</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="circuit-form-group">
            <label className="circuit-label">Full Name</label>
            <input
              type="text"
              required
              className="circuit-input"
              placeholder="e.g. Alex Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="circuit-form-group">
            <label className="circuit-label">Work Email</label>
            <input
              type="email"
              required
              className="circuit-input"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="circuit-form-group">
            <label className="circuit-label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="circuit-input"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="circuit-form-group" style={{ marginBottom: "2rem" }}>
            <label className="circuit-label">Confirm Password</label>
            <input
              type="password"
              required
              className="circuit-input"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary-yellow" style={{ width: "100%", height: "48px", justifyContent: "center" }} disabled={loading}>
            <span>{loading ? "Creating Account..." : "Create SCRM Account"}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-switch-text">
          Already registered?
          <Link to="/login" className="auth-cyan-link">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
