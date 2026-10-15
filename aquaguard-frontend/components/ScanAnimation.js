'use client';

export default function ScanAnimation({ preview }) {
  return (
    <div className="scan-overlay">
      <div className="scan-box">
        {preview && <img src={preview} alt="Scanning" />}
        <div className="scan-line" />
      </div>
      <div className="scan-pulse" />
      <div className="scan-text">Analyzing image...</div>
      <div className="scan-sub">Detecting garbage objects with YOLOv11</div>
    </div>
  );
}
