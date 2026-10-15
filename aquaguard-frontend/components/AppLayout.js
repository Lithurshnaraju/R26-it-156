'use client';
import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import ScanHistory from './ScanHistory';
import AboutScanner from './AboutScanner';
import AlertsPage from './AlertsPage';
import AnalyzeModal from './AnalyzeModal';
import ResultsModal from './ResultsModal';
import ScanAnimation from './ScanAnimation';

const API = '/api/v1';
const SENTRY_URL = 'http://localhost:5173';

export default function AppLayout({ user, onLogout }) {
  const [page, setPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [clock, setClock] = useState('');
  const [rescanLocation, setRescanLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load history from backend database on startup
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API}/detections?limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (data.detections && data.detections.length > 0) {
            const dbHistory = data.detections.map(d => ({
              id: d.id,
              timestamp: d.timestamp,
              num_objects: d.num_objects,
              class_counts: d.class_counts,
              gdi_score: d.gdi_score,
              pollution_level: d.pollution_level || d.alert_tier || 'none',
              location: d.location,
              location_name: d.location,
              image_url: d.image_url,
              detections: d.detections || [],
            }));
            setHistory(dbHistory);
          }
        }
      } catch (e) {
        console.log('Backend not connected, starting with empty history');
      }
      setLoading(false);
    };
    loadHistory();
  }, []);

  const titles = { home:'Dashboard', history:'Scan History', about:'About Scanner', alerts:'Pollution Alerts', sentry:'Vision Sentry AI' };

  const alertCount = history.filter(h => (h.gdi_score || 0) >= 50).length;

  const handleComplete = (result, imageUrl) => {
    setShowAnalyze(false);
    setShowCamera(false);
    setScanPreview(imageUrl);
    setScanning(true);
    setRescanLocation(null);
    setTimeout(() => {
      setScanning(false);
      setLastResult({ ...result, imageUrl });
      setShowResult(true);
      setHistory(prev => [{ ...result, imageUrl, id: result.event_id || Date.now() }, ...prev]);
    }, 3000);
  };

  const viewHistoryItem = (item) => {
    // Fetch full detection details if not already loaded
    if (!item.detections || item.detections.length === 0) {
      fetch(`${API}/detections/${item.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setLastResult({ ...item, detections: data.detections || [], imageUrl: item.image_url });
          } else {
            setLastResult({ ...item, imageUrl: item.image_url });
          }
          setShowResult(true);
        })
        .catch(() => {
          setLastResult({ ...item, imageUrl: item.image_url });
          setShowResult(true);
        });
    } else {
      setLastResult({ ...item, imageUrl: item.image_url || item.imageUrl });
      setShowResult(true);
    }
  };

  const handleRescan = (alert) => {
    setRescanLocation({
      name: alert.location || alert.location_name || '',
      lat: alert.latitude || '6.9558',
      lng: alert.longitude || '79.9164',
    });
    setShowAnalyze(true);
  };

  const nav = (p) => { setPage(p); setSidebarOpen(false); };

  const actionButtons = {
    onUpload: () => { setRescanLocation(null); setShowAnalyze(true); },
    onCamera: () => { setRescanLocation(null); setShowCamera(true); },
  };

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--bg)'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>🌊</div>
          <div style={{fontSize:18,fontWeight:600,color:'var(--text)'}}>Loading AquaGuard...</div>
          <div style={{fontSize:13,color:'var(--text-3)',marginTop:6}}>Connecting to database</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className={`sb-overlay ${sidebarOpen?'show':''}`} onClick={()=>setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen?'open':''}`}>
        <div className="sb-head">
          <div className="sb-logo">
            <div className="sb-icon">🌊</div>
            <span className="sb-title">AquaGuard</span>
          </div>
        </div>
        <nav className="sb-nav">
          <button className={`sb-item ${page==='home'?'active':''}`} onClick={()=>nav('home')}>
            <span className="icon">📊</span> Dashboard
          </button>
          <button className={`sb-item ${page==='alerts'?'active':''}`} onClick={()=>nav('alerts')} style={{position:'relative'}}>
            <span className="icon">🚨</span> Pollution Alerts
            {alertCount > 0 && <span className="sb-alert-badge">{alertCount}</span>}
          </button>
          <button className={`sb-item ${page==='history'?'active':''}`} onClick={()=>nav('history')}>
            <span className="icon">📋</span> Scan History
          </button>
          <button className="sb-item" onClick={() => window.open(SENTRY_URL, '_blank', 'noopener,noreferrer')}>
  <span className="icon">🛡️</span> Vision Sentry AI <span style={{marginLeft:'auto',opacity:0.6}}>↗</span>
</button>
          <button className={`sb-item ${page==='about'?'active':''}`} onClick={()=>nav('about')}>
            <span className="icon">ℹ️</span> About Scanner
          </button>
        </nav>
        <div className="sb-bottom">
          <div className="sb-profile">
            <div className="sb-avatar">{user.name.charAt(0)}</div>
            <div><div className="sb-pname">{user.name}</div><div className="sb-prole">{user.role}</div></div>
          </div>
          <button className="sb-item" onClick={onLogout}><span className="icon">🚪</span> Sign Out</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="sb-toggle" onClick={()=>setSidebarOpen(true)}>☰</button>
            <h2>{titles[page]}</h2>
          </div>
          <div className="topbar-right">
            <div className="clock">{clock}</div>
            <button className="alert-bell" onClick={()=>nav('alerts')}>
              🔔
              {alertCount > 0 && <span className="alert-bell-badge">{alertCount}</span>}
            </button>
          </div>
        </header>
        <div className="content">
          {page==='home' && <Dashboard history={history} actions={actionButtons} />}
          {page==='alerts' && <AlertsPage history={history} onRescan={handleRescan} />}
          {page==='history' && <ScanHistory history={history} onView={viewHistoryItem} actions={actionButtons} />}
          {page==='about' && <AboutScanner />}
          {page==='sentry' && (
            <iframe
              src={SENTRY_URL}
              title="Vision Sentry AI"
              allow="fullscreen; autoplay"
              style={{
                width: '100%',
                height: 'calc(100vh - 120px)',
                border: 'none',
                borderRadius: 12,
                background: '#0b1220',
              }}
            />
          )}
        </div>
      </div>

      {showAnalyze && <AnalyzeModal mode="upload" onClose={()=>{setShowAnalyze(false);setRescanLocation(null)}} onComplete={handleComplete} prefill={rescanLocation} />}
      {showCamera && <AnalyzeModal mode="camera" onClose={()=>setShowCamera(false)} onComplete={handleComplete} />}
      {scanning && <ScanAnimation preview={scanPreview} />}
      {showResult && lastResult && <ResultsModal result={lastResult} onClose={()=>setShowResult(false)} />}
    </div>
  );
}