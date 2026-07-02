export default function Spinner({ size = 24, color = "#3b82f6", text = "" }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "12px", padding: "40px 20px"
    }}>
      <div style={{
        width: size, height: size,
        border: `3px solid rgba(255,255,255,0.08)`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      {text && <span style={{ color: "rgba(148,163,184,0.6)", fontSize: "13px" }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
