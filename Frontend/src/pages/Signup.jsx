import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { uploadImageKitProfileImage, uploadProfileAvatar } from "../services/api";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function Signup() {
  const { user, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    if (!companyName.trim()) {
      setError("Enter your organization or workspace name.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password, phone, companyName, title, {
        department,
        timezone,
        termsAccepted: true
      });
      if (avatarFile) {
        try {
          await uploadImageKitProfileImage("avatar", avatarFile);
        } catch (mediaError) {
          if (mediaError?.response?.status === 503) {
            try {
              await uploadProfileAvatar(avatarFile);
            } catch {
              // Account creation succeeded; the optional photo can be retried in Settings.
            }
          }
          // Account creation succeeded; other media errors can be retried in Settings.
        }
      }
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to register account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError("");
    if (!termsAccepted) {
      setError("Accept the Terms of Service and Privacy Policy before continuing with Google.");
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithGoogle(credential, true);
      if (result?.twoFactorRequired) {
        navigate("/login", { state: { message: "Complete two-step verification from the sign-in page." } });
        return;
      }
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-up could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-circuit-page">
      <div className="auth-circuit-card" style={{ maxWidth: "520px" }}>
        <div className="auth-circuit-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.85rem" }}>
            <BrandLogo variant="stacked" size={38} showTagline={false} />
          </div>
          <div className="eyebrow" style={{ marginBottom: "0.35rem" }}>
            GET STARTED WITH SCRM
          </div>
          <h2 className="auth-circuit-title">Create Account</h2>
          <p className="auth-circuit-sub">Provision your sales workspace, team contacts, and pipeline deals.</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="circuit-form-group">
            <label className="circuit-label">Full Name *</label>              <input
                type="text"
                required
                autoComplete="name"
                className="circuit-input"
                placeholder="e.g. Alex Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
          </div>

          <div className="circuit-form-group">
            <label className="circuit-label">Work Email *</label>              <input
                type="email"
                required
                autoComplete="email"
                className="circuit-input"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="circuit-form-group">
              <label className="circuit-label">Phone Number</label>
              <input
                type="tel"
                autoComplete="tel"
                className="circuit-input"
                placeholder="+1 (555) 234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="circuit-form-group">
              <label className="circuit-label">Job Title / Role</label>
              <input
                type="text"
                className="circuit-input"
                placeholder="e.g. Head of Growth"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="circuit-form-group">
            <label className="circuit-label">Organization / Workspace name *</label>
            <input
              type="text"
              required
              className="circuit-input"
              placeholder="e.g. Black Mesa Technologies"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="circuit-form-group">
              <label className="circuit-label">Department / team</label>
              <input
                type="text"
                className="circuit-input"
                placeholder="Sales, Support…"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="circuit-form-group">
              <label className="circuit-label">Time zone</label>
              <input
                type="text"
                className="circuit-input"
                placeholder="Europe/London"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>

          <div className="circuit-form-group">
            <label className="circuit-label">Profile photo (optional)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="circuit-input circuit-file-input"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
            <p className="field-hint">JPEG, PNG, WEBP or GIF up to 5 MB. You can add or change this later.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.75rem" }}>
            <div className="circuit-form-group">
              <label className="circuit-label">Password *</label>
              <input
                type="password"
                required
                minLength={12}
                className="circuit-input"
                autoComplete="new-password"
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="circuit-form-group">
              <label className="circuit-label">Confirm Password *</label>
              <input
                type="password"
                required
                className="circuit-input"
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <label className="signup-terms">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              I agree to the Terms of Service and Privacy Policy and consent to this account's
              workspace data being stored so I can use the CRM.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-yellow interactive-lift"
            style={{ width: "100%", height: "48px", justifyContent: "center" }}
          >
            <span>{loading ? "Creating Account..." : "Create SCRM Account"}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-divider" role="separator"><span>or continue with</span></div>
        <GoogleSignInButton onCredential={handleGoogle} disabled={loading} mode="signup" />

        <p className="auth-switch-text" style={{ marginTop: "1.25rem", textAlign: "center" }}>
          Already registered?{" "}
          <Link to="/login" className="auth-cyan-link">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
