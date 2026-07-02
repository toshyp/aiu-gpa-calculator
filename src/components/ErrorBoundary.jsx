import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0b1120 0%, #0f1f3d 50%, #0b1120 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: "20px",
            padding: "40px", maxWidth: "460px", width: "100%",
            border: "1px solid rgba(255,255,255,0.08)", textAlign: "center"
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: "rgba(239,68,68,0.15)", margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px"
            }}>⚠</div>
            <h2 style={{ color: "white", fontSize: "20px", margin: "0 0 8px" }}>
              Something went wrong
            </h2>
            <p style={{ color: "rgba(148,163,184,0.7)", fontSize: "13px", margin: "0 0 24px", lineHeight: 1.5 }}>
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button onClick={() => window.location.reload()}
              style={{
                padding: "12px 28px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer"
              }}>
              Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: "16px", textAlign: "left" }}>
                <summary style={{ color: "#64748b", fontSize: "12px", cursor: "pointer" }}>
                  Error details
                </summary>
                <pre style={{
                  color: "#94a3b8", fontSize: "11px", marginTop: "8px",
                  background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px",
                  overflowX: "auto", whiteSpace: "pre-wrap"
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
