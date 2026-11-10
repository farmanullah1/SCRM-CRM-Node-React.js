import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, AlertCircle, ArrowRight } from "lucide-react";

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
      setError("Password confirmation does not match.");
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
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-circuit-page">
      <div className="auth-circuit-card">
        <div className="auth-circuit-header">
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>
            01 // REGISTRATION
          </div>
          <h2 className="auth-circuit-title">Initialize Account</h2>
          <p className="auth-circuit-sub">Deploy your personal CRM command center</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="circuit-form-group">
            <label className="circuit-label">Full Operator Name</label>
            <input
              type="text"
              required
              className="circuit-input"
              placeholder="Alex Vance"
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
              placeholder="alex@vance-defense.com"
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
              placeholder="••••••••••••"
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
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-cyan-cta" disabled={loading}>
            <span>{loading ? "Registering..." : "Create Workspace"}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-switch-text">
          Existing operator?
          <Link to="/login" className="auth-cyan-link">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
