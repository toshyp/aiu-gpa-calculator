export default function Spinner({ size = 24, color = "var(--accent)", text = "" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "12px", padding: "40px 20px"
    }}>
      <div style={{
        width: size, height: size,
        border: `3px solid var(--card-border)`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      {text && <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
