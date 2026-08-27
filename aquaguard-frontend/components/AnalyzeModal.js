'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const API = '/api/v1';

export default function AnalyzeModal({ mode, onClose, onComplete, prefill }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lat, setLat] = useState(prefill?.lat || '6.9558');
  const [lng, setLng] = useState(prefill?.lng || '79.9164');
  const [locName, setLocName] = useState(prefill?.name || 'Kelani River — Kelaniya Bridge');
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState('');

  // Camera state
  const [cameraActive, setCameraActive] = useState(mode === 'camera');
  const [facingMode, setFacingMode] = useState('environment'); // back camera
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  // Start camera
  const startCamera = useCallback(async (facing) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error('Camera error:', e);
      setErr('Camera access denied. Please allow camera permission in your browser settings.');
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [mode, startCamera]);

  const switchCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(blob => {
      const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFile(capturedFile);
      setPreview(canvas.toDataURL('image/jpeg'));
      setCameraActive(false);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setCameraActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const retake = () => {
    setFile(null);
    setPreview(null);
    setCameraActive(true);
    startCamera(facingMode);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setErr('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (lat) params.append('latitude', lat);
      if (lng) params.append('longitude', lng);
      if (locName) params.append('location_name', locName);

      const res = await fetch(`${API}/detect?${params}`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Detection failed');

      const data = await res.json();

      const result = {
        event_id: data.event_id,
        timestamp: data.timestamp,
        num_objects: data.num_objects_detected,
        class_counts: data.class_counts,
        detections: data.detections,
        gdi_score: data.risk_assessment?.gdi_score ?? data.gdi_score ?? 0,
        pollution_level: data.risk_assessment?.alert_tier ?? data.alert_tier ?? 'none',
        location: locName,
        location_name: locName,
        image_url: data.image_url,
      };

      onComplete(result, preview);
    } catch (e) {
      setErr('Cannot connect to backend. Make sure FastAPI is running on port 8000.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{mode === 'camera' ? '📷 Take Photo' : '🔍 Analyze Image'}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        {err && <div className="msg-err" style={{marginBottom:14}}>{err}</div>}

        {/* Camera view */}
        {cameraActive && mode === 'camera' && (
          <>
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline muted style={{width:'100%'}} />
            </div>
            <div className="cam-controls">
              <button className="cam-btn" onClick={switchCamera}>🔄 Flip Camera</button>
              <button className="cam-btn active" onClick={capturePhoto}>📸 Capture</button>
            </div>
          </>
        )}

        {/* Upload zone (for upload mode or after camera capture) */}
        {!cameraActive && (
          <div
            className={`upload-zone ${file ? 'has-file' : ''}`}
            onClick={() => !file && fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}} />
            {preview ? (
              <div>
                <img src={preview} alt="Preview" style={{maxWidth:'100%',maxHeight:180,borderRadius:8,marginBottom:8}} />
                <div className="file-name">{file?.name || 'Captured photo'}</div>
                {mode === 'camera' && (
                  <button onClick={retake} style={{marginTop:8,padding:'6px 16px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-card)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>
                    🔄 Retake
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="upload-icon">📸</div>
                <div className="upload-txt"><strong>Click to upload</strong> or drag and drop</div>
                <div style={{fontSize:11,color:'var(--text-3)',marginTop:4}}>JPG, PNG up to 10MB</div>
              </div>
            )}
          </div>
        )}

        {/* Location fields */}
        <div className="fg">
          <label className="fl">River / Location name</label>
          <input className="fi" placeholder="e.g. Kelani River" value={locName} onChange={e=>setLocName(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="fg">
            <label className="fl">Latitude</label>
            <input className="fi" placeholder="6.9558" value={lat} onChange={e=>setLat(e.target.value)} />
          </div>
          <div className="fg">
            <label className="fl">Longitude</label>
            <input className="fi" placeholder="79.9164" value={lng} onChange={e=>setLng(e.target.value)} />
          </div>
        </div>

        <button className="btn-analyze" onClick={analyze} disabled={!file || analyzing}>
          {analyzing ? (
            <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .8s linear infinite'}} /> Analyzing...</>
          ) : (
            <>🔍 Analyze Image</>
          )}
        </button>
      </div>
    </div>
  );
}