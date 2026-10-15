export default function VisionSentryPage() {
  return (
    <div style={{ height: "calc(100vh - 80px)" }}>
      <iframe
        src="http://localhost:5173"
        title="Vision Sentry AI"
        style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
        allow="fullscreen"
      />
    </div>
  );
}