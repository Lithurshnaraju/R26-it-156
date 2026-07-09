'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const API_BASE = '/api/v1';

export default function Dashboard({ user, onLogout }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [classDistribution, setClassDistribution] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchSummary();
    fetchClassDistribution();
    fetchDetections();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/summary`);
      if (res.ok) setSummary(await res.json());
    } catch (e) {
      console.log('Backend not connected, using demo data');
      setSummary({
        total_scans: 24,
        total_objects_detected: 87,
        average_gdi_score: 42.5,
        average_dri_score: 35.8,
        alert_counts: { yellow_alerts: 8, orange_alerts: 3, red_alerts: 1, total_alerts: 12 },
      });
    }
  };

  const fetchClassDistribution = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/class-distribution`);
      if (res.ok) {
        const data = await res.json();
        setClassDistribution(data.class_distribution);
      }
    } catch (e) {
      setClassDistribution({ plastic: 38, polythene: 22, glass: 15, metal: 12 });
    }
  };

  const fetchDetections = async () => {
    try {
      const res = await fetch(`${API_BASE}/detections?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.detections || []);
      }
    } catch (e) {
      console.log('Using demo results');
    }
  };

  const handleAnalyzeComplete = (newResult) => {
    setResults((prev) => [newResult, ...prev]);
    setShowUploadModal(false);
    fetchSummary();
    fetchClassDistribution();
  };

  // Chart data
  const pieData = {
    labels: classDistribution ? Object.keys(classDistribution) : ['plastic', 'polythene', 'glass', 'metal'],
    datasets: [{
      data: classDistribution ? Object.values(classDistribution) : [38, 22, 15, 12],
      backgroundColor: ['#3498DB', '#E67E22', '#9B59B6', '#7F8C8D'],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }],
  };

  const barData = {
    labels: results.length > 0
      ? results.slice(0, 7).reverse().map((r, i) => `Scan ${i + 1}`)
      : ['Scan 1', 'Scan 2', 'Scan 3', 'Scan 4', 'Scan 5', 'Scan 6', 'Scan 7'],
    datasets: [
      {
        label: 'GDI Score',
        data: results.length > 0
          ? results.slice(0, 7).reverse().map((r) => r.gdi_score)
          : [25, 42, 18, 65, 38, 55, 30],
        backgroundColor: 'rgba(45, 122, 79, 0.7)',
        borderRadius: 6,
        barPercentage: 0.6,
      },
      {
        label: 'DRI Score',
        data: results.length > 0
          ? results.slice(0, 7).reverse().map((r) => r.dri_score)
          : [20, 38, 15, 58, 32, 48, 26],
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };

  const s = summary || {
    total_scans: 0,
    total_objects_detected: 0,
    average_gdi_score: 0,
    average_dri_score: 0,
    alert_counts: { yellow_alerts: 0, orange_alerts: 0, red_alerts: 0, total_alerts: 0 },
  };

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-icon">🌊</div>
          <span className="topbar-title">AquaGuard</span>
        </div>
        <div className="topbar-right">
          <button className="btn-upload" onClick={() => setShowUploadModal(true)}>
            <span>📷</span> Analyze Image
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user.name}
          </span>
          <button className="btn-logout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="welcome-section">
          <h2>Dashboard</h2>
          <p>Real-time river garbage monitoring — {user.role}</p>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card accent">
            <div className="stat-label">Total scans</div>
            <div className="stat-value">{s.total_scans}</div>
            <div className="stat-subtext">Images analyzed</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Objects detected</div>
            <div className="stat-value">{s.total_objects_detected}</div>
            <div className="stat-subtext">Garbage items found</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-label">Average GDI</div>
            <div className="stat-value">{Number(s.average_gdi_score).toFixed(1)}</div>
            <div className="stat-subtext">Garbage Density Index</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-label">Total alerts</div>
            <div className="stat-value">{s.alert_counts.total_alerts}</div>
            <div className="stat-subtext">
              {s.alert_counts.red_alerts} red · {s.alert_counts.orange_alerts} orange · {s.alert_counts.yellow_alerts} yellow
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Garbage class distribution</h3>
            <p className="chart-subtitle">Breakdown by waste type detected</p>
            <div className="chart-container" style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 240, height: 240 }}>
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12, family: 'DM Sans' } },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
          <div className="chart-card">
            <h3>GDI and DRI trends</h3>
            <p className="chart-subtitle">Risk scores per scan</p>
            <div className="chart-container">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      grid: { color: 'rgba(0,0,0,0.04)' },
                      ticks: { font: { size: 11, family: 'DM Sans' } },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { size: 11, family: 'DM Sans' } },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12, family: 'DM Sans' } },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Detection Results */}
        <div className="results-section">
          <div className="results-header">
            <h3>Detection results</h3>
            <span className="results-count">{results.length} scans</span>
          </div>

          {results.length === 0 ? (
            <div className="result-card">
              <div className="empty-state">
                <div className="empty-icon">📷</div>
                <h4>No scans yet</h4>
                <p>Click "Analyze Image" to upload a river photo and detect garbage</p>
              </div>
            </div>
          ) : (
            results.map((r, idx) => (
              <ResultCard key={r.id || idx} result={r} index={idx} />
            ))
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onComplete={handleAnalyzeComplete}
        />
      )}
    </div>
  );
}

/* ======== RESULT CARD COMPONENT ======== */
function ResultCard({ result, index }) {
  const badgeClass = {
    none: 'badge-none',
    yellow: 'badge-yellow',
    orange: 'badge-orange',
    red: 'badge-red',
  }[result.alert_tier] || 'badge-none';

  const tierLabel = {
    none: 'Safe',
    yellow: 'Caution',
    orange: 'Warning',
    red: 'Emergency',
  }[result.alert_tier] || 'Safe';

  const locationName = result.location || `River scan #${index + 1}`;
  const timestamp = result.timestamp
    ? new Date(result.timestamp).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="result-card">
      <div className="result-top">
        <div>
          <div className="result-title">{locationName}</div>
          <div className="result-time">{timestamp}</div>
        </div>
        <span className={`result-badge ${badgeClass}`}>{tierLabel}</span>
      </div>

      <div className="result-metrics">
        <div className="result-metric">
          <div className="result-metric-label">Objects</div>
          <div className="result-metric-value" style={{ color: 'var(--text-primary)' }}>
            {result.num_objects || 0}
          </div>
        </div>
        <div className="result-metric">
          <div className="result-metric-label">GDI Score</div>
          <div className="result-metric-value" style={{ color: 'var(--accent)' }}>
            {Number(result.gdi_score || 0).toFixed(1)}
          </div>
        </div>
        <div className="result-metric">
          <div className="result-metric-label">DRI Score</div>
          <div className="result-metric-value" style={{ color: 'var(--blue)' }}>
            {Number(result.dri_score || 0).toFixed(1)}
          </div>
        </div>
        <div className="result-metric">
          <div className="result-metric-label">Alert tier</div>
          <div className="result-metric-value" style={{
            color: result.alert_tier === 'red' ? 'var(--danger)' :
                   result.alert_tier === 'orange' ? 'var(--warning)' :
                   result.alert_tier === 'yellow' ? '#9A7D0A' : 'var(--accent)'
          }}>
            {tierLabel}
          </div>
        </div>
      </div>

      {result.class_counts && Object.keys(result.class_counts).length > 0 && (
        <div className="result-detections">
          {Object.entries(result.class_counts).map(([cls, count]) => (
            <span key={cls} className="detection-tag">
              <span className={`detection-dot dot-${cls}`} />
              {cls}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======== UPLOAD MODAL COMPONENT ======== */
function UploadModal({ onClose, onComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [latitude, setLatitude] = useState('6.9558');
  const [longitude, setLongitude] = useState('79.9164');
  const [locationName, setLocationName] = useState('Kelani River — Kelaniya Bridge');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (latitude) params.append('latitude', latitude);
      if (longitude) params.append('longitude', longitude);
      if (locationName) params.append('location_name', locationName);

      const res = await fetch(`${API_BASE}/detect?${params.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Detection failed');

      const data = await res.json();

      // Convert API response to result card format
      const result = {
        id: data.event_id,
        timestamp: data.timestamp,
        num_objects: data.num_objects_detected,
        class_counts: data.class_counts,
        gdi_score: data.risk_assessment?.gdi_score || data.gdi_score || 0,
        dri_score: data.risk_assessment?.dri_score || data.dri_score || 0,
        alert_tier: data.risk_assessment?.alert_tier || data.alert_tier || 'none',
        location: locationName,
        image_url: data.image_url,
      };

      onComplete(result);
    } catch (e) {
      console.error(e);
      setError('Could not connect to backend. Make sure the FastAPI server is running on port 8000.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>Analyze river image</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* Image Upload Zone */}
        <div
          className={`upload-zone ${file ? 'has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {preview ? (
            <div>
              <img
                src={preview}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', marginBottom: '8px' }}
              />
              <div className="file-name">{file.name}</div>
            </div>
          ) : (
            <div>
              <div className="upload-icon">📸</div>
              <div className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                JPG, PNG up to 10MB
              </div>
            </div>
          )}
        </div>

        {/* Location Fields */}
        <div className="form-group">
          <label className="form-label">River / location name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Kelani River — Kelaniya Bridge"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input
              type="text"
              className="form-input"
              placeholder="6.9558"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input
              type="text"
              className="form-input"
              placeholder="79.9164"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn-analyze"
          onClick={handleAnalyze}
          disabled={!file || analyzing}
        >
          {analyzing ? (
            <>
              <div className="spinner" />
              Analyzing...
            </>
          ) : (
            <>🔍 Analyze Image</>
          )}
        </button>
      </div>
    </div>
  );
}
