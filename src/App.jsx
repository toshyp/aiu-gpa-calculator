import { Component, useEffect } from "react";
import { useApp } from "./context/AppContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error?.message || "Unknown error" };
  }
  componentDidCatch(error, info) {
    console.error("RENDER ERROR:", error, info);
    this.setState({ info: info?.componentStack });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#0f172a", color: "white", padding: "40px", fontFamily: "monospace" }}>
          <h1 style={{ color: "#ef4444", marginBottom: "16px" }}>Rendering Error</h1>
          <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 8px", fontSize: "14px" }}>Error Message:</h3>
            <pre style={{ color: "#f87171", fontSize: "14px", whiteSpace: "pre-wrap", margin: 0 }}>
              {this.state.error}
            </pre>
          </div>
          {this.state.info && (
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px" }}>
              <h3 style={{ color: "#fbbf24", margin: "0 0 8px", fontSize: "14px" }}>Component Stack:</h3>
              <pre style={{ color: "#94a3b8", fontSize: "12px", whiteSpace: "pre-wrap", margin: 0 }}>
                {this.state.info}
              </pre>
            </div>
          )}
          <button onClick={() => window.location.reload()} style={{
            marginTop: "20px", padding: "12px 24px", background: "#3b82f6",
            color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px"
          }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", e => {
  console.error("GLOBAL ERROR:", e.error?.message || e.message, e.error?.stack);
});
window.addEventListener("unhandledrejection", e => {
  console.error("UNHANDLED PROMISE:", e.reason?.message || e.reason);
});

const AppContent = () => {
  const { user, selectedProgram, selectedTrack } = useApp();

  useEffect(() => {
    console.log("App state:", { user, selectedProgram, selectedTrack });
  });

  if (!user) return <LoginPage />;
  if (user.startsWith("admin_")) return <AdminPanel />;

  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
};

export default function App() {
  return <AppContent />;
}
