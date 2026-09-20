import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/megalab-logo.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
    } catch {
      setError("Couldn't sign in. Check the email and password and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="paper-grid"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          padding: 28,
          width: 320,
        }}
      >
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--teal-dark)", margin: "0 0 4px" }}>
          Lab operations · HR compliance
        </p>
        <img src={logo} alt="MegaLab" style={{ width: "100%", maxWidth: 220, height: "auto", margin: "0 0 20px" }} />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 10, border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)" }}
        />
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 38px 10px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute", insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", padding: 4, display: "flex", color: "var(--ink-soft)",
            }}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error && <p style={{ color: "var(--red-cap)", fontSize: 12, marginTop: -6, marginBottom: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", padding: 10, background: "var(--teal)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600 }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
