import { useState } from "react";
import { useApp } from "../context/AppContext";
import { LogIn, Shield, User, GraduationCap, BookOpen, UserPlus, Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const { login, register, adminAccount, loginError, theme, setTheme } = useApp();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("student");
  const [subMode, setSubMode] = useState("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "admin") {
        if (userId === adminAccount.username && password === adminAccount.password) {
          login("admin_" + userId, password);
        } else {
          setError("Invalid admin credentials");
        }
      } else {
        if (!userId.trim() || !password.trim()) {
          setError("Please enter ID and password");
          setLoading(false);
          return;
        }
        if (subMode === "register") {
          if (password.length < 4) {
            setError("Password must be at least 4 characters");
            setLoading(false);
            return;
          }
          const err = await register(userId.trim(), password);
          if (err) setError(err);
        } else {
          const err = await login(userId.trim(), password);
          if (err) setError(err);
        }
      }
    } catch (e) {
      setError(e.message || "An error occurred");
    }
    setLoading(false);
  }

  const inputStyle = (field) => ({
    width: "100%", padding: "14px 16px 14px 44px",
    border: focusedField === field ? "1.5px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px", fontSize: "15px", outline: "none",
    background: focusedField === field ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.04)",
    color: "white", boxSizing: "border-box",
    transition: "all 0.25s ease",
  });

  return (
    <div className="page-wrapper" style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0b1120 0%, #0f1f3d 40%, #0b1120 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      position: "relative", overflow: "hidden"
    }}>
      <div className="login-circles">
        <div style={{
          position: "absolute", top: "-20%", right: "-10%", width: "500px", height: "500px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", left: "-10%", width: "400px", height: "400px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "800px", height: "800px",
          background: "radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 60%)",
        pointerEvents: "none"
      }} />
      </div>

      <div className="login-card" style={{
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)",
        borderRadius: "28px", padding: "48px 44px 40px", width: "100%", maxWidth: "420px",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset",
        position: "relative", zIndex: 1
      }}>
        {/* Theme toggle */}
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px", padding: "8px", cursor: "pointer",
            color: "rgba(148,163,184,0.6)", display: "flex",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(148,163,184,0.6)"; }}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "20px",
            background: "linear-gradient(135deg, #1e40af, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
            boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
            position: "relative"
          }}>
            <div style={{
              position: "absolute", inset: "3px",
              borderRadius: "17px", border: "2px solid rgba(255,255,255,0.15)",
            }} />
            <span style={{
              color: "white", fontSize: "28px", fontWeight: 800,
              letterSpacing: "1px", fontStyle: "italic"
            }}>AIU</span>
          </div>
          <h1 style={{
            color: "white", fontSize: "22px", fontWeight: 700,
            margin: "0 0 4px", letterSpacing: "-0.3px"
          }}>
            GPA Calculator
          </h1>
          <p style={{
            color: "rgba(148,163,184,0.8)", fontSize: "13px", margin: 0,
            lineHeight: 1.5
          }}>
            <GraduationCap size={14} style={{ verticalAlign: "middle", marginRight: "4px", opacity: 0.6 }} />
            Faculty of Computer Science & Engineering
          </p>
          <div style={{
            width: "40px", height: "3px",
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            borderRadius: "2px", margin: "16px auto 0"
          }} />
        </div>

        <div style={{
          display: "flex", background: "rgba(255,255,255,0.04)",
          borderRadius: "14px", padding: "5px", marginBottom: "28px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          <button onClick={() => { setMode("student"); setError(""); }}
            style={{
              flex: 1, padding: "11px", border: "none", borderRadius: "10px",
              cursor: "pointer", fontSize: "13px", fontWeight: 600,
              background: mode === "student"
                ? "linear-gradient(135deg, #2563eb, #3b82f6)"
                : "transparent",
              color: mode === "student" ? "white" : "rgba(148,163,184,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "all 0.25s ease",
              boxShadow: mode === "student" ? "0 4px 16px rgba(59,130,246,0.3)" : "none"
            }}>
            <User size={15} /> Student
          </button>
          <button onClick={() => { setMode("admin"); setError(""); }}
            style={{
              flex: 1, padding: "11px", border: "none", borderRadius: "10px",
              cursor: "pointer", fontSize: "13px", fontWeight: 600,
              background: mode === "admin"
                ? "linear-gradient(135deg, #7c3aed, #8b5cf6)"
                : "transparent",
              color: mode === "admin" ? "white" : "rgba(148,163,184,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "all 0.25s ease",
              boxShadow: mode === "admin" ? "0 4px 16px rgba(139,92,246,0.3)" : "none"
            }}>
            <Shield size={15} /> Admin
          </button>
        </div>

        {mode === "student" && (
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.04)",
            borderRadius: "10px", padding: "4px", marginBottom: "24px",
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <button onClick={() => { setSubMode("signin"); setError(""); }}
              style={{
                flex: 1, padding: "9px", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "12px", fontWeight: 600,
                background: subMode === "signin"
                  ? "linear-gradient(135deg, #2563eb, #3b82f6)"
                  : "transparent",
                color: subMode === "signin" ? "white" : "rgba(148,163,184,0.6)",
                transition: "all 0.25s ease",
                boxShadow: subMode === "signin" ? "0 4px 16px rgba(59,130,246,0.3)" : "none"
              }}>
              <LogIn size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              Sign In
            </button>
            <button onClick={() => { setSubMode("register"); setError(""); }}
              style={{
                flex: 1, padding: "9px", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "12px", fontWeight: 600,
                background: subMode === "register"
                  ? "linear-gradient(135deg, #2563eb, #3b82f6)"
                  : "transparent",
                color: subMode === "register" ? "white" : "rgba(148,163,184,0.6)",
                transition: "all 0.25s ease",
                boxShadow: subMode === "register" ? "0 4px 16px rgba(59,130,246,0.3)" : "none"
              }}>
              <UserPlus size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              Register
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px", position: "relative" }}>
            <label style={{
              color: "rgba(148,163,184,0.7)", fontSize: "12px",
              display: "block", marginBottom: "7px", fontWeight: 500,
              letterSpacing: "0.3px", textTransform: "uppercase"
            }}>
              {mode === "student" ? "Student ID" : "Username"}
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} style={{
                position: "absolute", left: "14px", top: "50%",
                transform: "translateY(-50%)",
                color: focusedField === "userId" ? "#3b82f6" : "rgba(148,163,184,0.4)",
                transition: "color 0.25s ease", pointerEvents: "none", zIndex: 1
              }} />
              <input
                type="text"
                value={userId}
                onFocus={() => setFocusedField("userId")}
                onBlur={() => setFocusedField(null)}
                onChange={e => setUserId(e.target.value)}
                placeholder={mode === "student" ? "e.g. 2024001" : "Admin username"}
                style={inputStyle("userId")}
              />
            </div>
          </div>

          <div style={{ marginBottom: "18px", position: "relative" }}>
            <label style={{
              color: "rgba(148,163,184,0.7)", fontSize: "12px",
              display: "block", marginBottom: "7px", fontWeight: 500,
              letterSpacing: "0.3px", textTransform: "uppercase"
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Shield size={16} style={{
                position: "absolute", left: "14px", top: "50%",
                transform: "translateY(-50%)",
                color: focusedField === "password" ? "#8b5cf6" : "rgba(148,163,184,0.4)",
                transition: "color 0.25s ease", pointerEvents: "none", zIndex: 1
              }} />
              <input
                type="password"
                value={password}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "admin" ? "Admin password" : (subMode === "register" ? "Create a password" : "Your password")}
                style={inputStyle("password")}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: "10px", marginBottom: "14px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", gap: "8px"
            }}>
              <span style={{ color: "#ef4444", fontSize: "12px" }}>⚠</span>
              <p style={{ color: "#fca5a5", fontSize: "13px", margin: 0 }}>{error || loginError}</p>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "15px", border: "none", borderRadius: "12px",
            fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.3px", opacity: loading ? 0.7 : 1,
            background: mode === "admin"
              ? "linear-gradient(135deg, #6d28d9, #8b5cf6)"
              : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color: "white", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "10px",
            transition: "all 0.25s ease",
            boxShadow: mode === "admin"
              ? "0 4px 20px rgba(139,92,246,0.35)"
              : "0 4px 20px rgba(59,130,246,0.35)",
          }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = mode === "admin" ? "0 6px 28px rgba(139,92,246,0.45)" : "0 6px 28px rgba(59,130,246,0.45)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = mode === "admin" ? "0 4px 20px rgba(139,92,246,0.35)" : "0 4px 20px rgba(59,130,246,0.35)"; }}
          >
            <LogIn size={18} />
            {loading ? "Please wait..." : (mode === "admin" ? "Admin Login" : (subMode === "register" ? "Create Account" : "Sign In"))}
          </button>

          <div style={{
            marginTop: "24px", textAlign: "center",
            color: "rgba(148,163,184,0.3)", fontSize: "11px",
            letterSpacing: "0.5px"
          }}>
            <BookOpen size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
            Alamein International University © {new Date().getFullYear()}
          </div>
        </form>
      </div>
    </div>
  );
}