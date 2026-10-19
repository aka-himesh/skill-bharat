/**
 * LoginPage — Simple login form for the AI-LMIS demo.
 *
 * Uses PIN + password auth matching the backend's /api/auth/login.
 * Shown when the user is not authenticated and tries to access protected data.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import { LogIn, AlertCircle, Shield } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [pin, setPin] = useState("26246");
  const [password, setPassword] = useState("zeroone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login({ pin, password });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Login failed");
    } else {
      navigate("/overview");
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "32px 28px", boxShadow: "var(--shadow-md)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: "50%", background: "var(--color-primary)", marginBottom: 12 }}>
            <Shield size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--color-text-primary)" }}>
            {config.appShortName} Login
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
            Enter your access credentials to view the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="pin" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Access PIN
            </label>
            <input
              id="pin"
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              autoComplete="username"
              placeholder="26246"
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 13, background: "var(--color-background)", color: "var(--color-text-primary)", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••"
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 13, background: "var(--color-background)", color: "var(--color-text-primary)", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fdf2f2", border: "1px solid #c0392b40", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 12, color: "#c0392b" }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            <LogIn size={15} />
            {loading ? "Logging in…" : "Login"}
          </button>

          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6, marginTop: 4 }}>
            Demo credentials: PIN <code style={{ background: "#f0f3f8", padding: "1px 5px", borderRadius: 2 }}>26246</code> / Password <code style={{ background: "#f0f3f8", padding: "1px 5px", borderRadius: 2 }}>zeroone</code>
          </div>
        </form>
      </div>
    </div>
  );
}
