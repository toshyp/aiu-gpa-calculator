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
          background: "var(--bg-gradient)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: "var(--card-bg)", borderRadius: "20px",
            padding: "40px", maxWidth: "460px", width: "100%",
            border: "1px solid var(--card-border)", textAlign: "center"
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: "var(--danger-bg)", margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px"
            }}>⚠</div>
            <h2 style={{ color: "var(--text)", fontSize: "20px", margin: "0 0 8px" }}>
              Something went wrong
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 24px", lineHeight: 1.5 }}>
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button onClick={() => window.location.reload()}
              style={{
                padding: "12px 28px", borderRadius: "12px", border: "none",
                background: "var(--accent-gradient-2)",
                color: "var(--btn-text)", fontSize: "14px", fontWeight: 600, cursor: "pointer"
              }}>
              Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: "16px", textAlign: "left" }}>
                <summary style={{ color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>
                  Error details
                </summary>
                <pre style={{
                  color: "var(--text-secondary-2)", fontSize: "11px", marginTop: "8px",
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
