import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/megalab-logo.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 14, border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)" }}
        />

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
