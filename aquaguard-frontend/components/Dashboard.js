'use client';
import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API = '/api/v1';

function getPollutionLevel(gdi) {
  if (gdi >= 75) return { label:'Critical', color:'var(--red)', bg:'var(--red-l)', fill:'#DC2626' };
  if (gdi >= 50) return { label:'High', color:'var(--orange)', bg:'var(--orange-l)', fill:'#EA580C' };
  if (gdi >= 25) return { label:'Moderate', color:'var(--yellow)', bg:'var(--yellow-l)', fill:'#CA8A04' };
  return { label:'Low', color:'var(--green)', bg:'var(--green-l)', fill:'#16A34A' };
}

export default function Dashboard({ history, actions }) {
  const [summary, setSummary] = useState(null);
  const [classDist, setClassDist] = useState(null);

  useEffect(() => {
    fetch(`${API}/analytics/summary`).then(r=>r.ok?r.json():null).then(d=>{if(d)setSummary(d)}).catch(()=>{
      setSummary({ total_scans:0, total_objects_detected:0, average_gdi_score:0, alert_counts:{yellow_alerts:0,orange_alerts:0,red_alerts:0,total_alerts:0} });
    });
    fetch(`${API}/analytics/class-distribution`).then(r=>r.ok?r.json():null).then(d=>{if(d)setClassDist(d.class_distribution)}).catch(()=>{
      setClassDist({ plastic:0, polythene:0, glass:0, metal:0 });
    });
  }, [history]);

  const totalScans = (summary?.total_scans || 0) + history.length;
  const totalObjects = (summary?.total_objects_detected || 0) + history.reduce((s,h) => s + (h.num_objects || 0), 0);
  const localGdis = history.map(h => h.gdi_score || 0);
  const avgGdi = localGdis.length > 0 ? localGdis.reduce((a,b)=>a+b,0)/localGdis.length : (summary?.average_gdi_score || 0);
  const totalAlerts = (summary?.alert_counts?.total_alerts || 0) + history.filter(h => h.pollution_level !== 'low').length;

  const mergedDist = { ...(classDist || {}) };
  history.forEach(h => {
    if (h.class_counts) Object.entries(h.class_counts).forEach(([k,v]) => { mergedDist[k] = (mergedDist[k]||0) + v; });
  });

  const pollution = getPollutionLevel(avgGdi);

  const pieData = {
    labels: Object.keys(mergedDist).length > 0 ? Object.keys(mergedDist) : ['No data'],
    datasets: [{
      data: Object.keys(mergedDist).length > 0 ? Object.values(mergedDist) : [1],
      backgroundColor: Object.keys(mergedDist).length > 0
        ? Object.keys(mergedDist).map(k => ({ plastic:'#3B82F6', polythene:'#F97316', glass:'#8B5CF6', metal:'#6B7280', paper:'#22C55E' }[k] || '#9CA3AE'))
        : ['#E5E7EB'],
      borderWidth: 2, borderColor: '#fff',
    }],
  };

  const barData = {
    labels: history.length > 0
      ? history.slice(0,8).reverse().map((_,i) => `Scan ${i+1}`)
      : ['Scan 1','Scan 2','Scan 3','Scan 4','Scan 5'],
    datasets: [{
      label: 'GDI Score',
      data: history.length > 0
        ? history.slice(0,8).reverse().map(h => h.gdi_score || 0)
        : [0,0,0,0,0],
      backgroundColor: 'rgba(22,163,74,0.7)',
      borderRadius: 6, barPercentage: 0.6,
    }],
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn action-camera" onClick={actions.onCamera}>
          <div className="action-btn-icon">📷</div>
          <div className="action-btn-text">
            <span className="action-btn-title">Take Photo</span>
            <span className="action-btn-sub">Use camera to scan</span>
          </div>
        </button>
        <button className="action-btn action-upload" onClick={actions.onUpload}>
          <div className="action-btn-icon">🔍</div>
          <div className="action-btn-text">
            <span className="action-btn-title">Analyze Image</span>
            <span className="action-btn-sub">Upload from gallery</span>
          </div>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-icon" style={{background:'var(--green-l)'}}>📷</div>
          <div className="kpi-label">Total scans</div>
          <div className="kpi-val" style={{color:'var(--green)'}}>{totalScans}</div>
          <div className="kpi-sub">Images analyzed</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon" style={{background:'var(--blue-l)'}}>🎯</div>
          <div className="kpi-label">Objects detected</div>
          <div className="kpi-val" style={{color:'var(--blue)'}}>{totalObjects}</div>
          <div className="kpi-sub">Garbage items found</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon" style={{background:'var(--purple-l)'}}>📈</div>
          <div className="kpi-label">Average GDI</div>
          <div className="kpi-val" style={{color:'var(--purple)'}}>{avgGdi.toFixed(1)}</div>
          <div className="kpi-sub">Garbage Density Index</div>
        </div>
        <div className="kpi">
          <div className="kpi-icon" style={{background:'var(--red-l)'}}>🚨</div>
          <div className="kpi-label">Pollution alerts</div>
          <div className="kpi-val" style={{color:'var(--red)'}}>{totalAlerts}</div>
          <div className="kpi-sub">Moderate+ incidents</div>
        </div>
      </div>

      {/* Pollution Level Bar */}
      <div className="poll-bar">
        <h3>Current pollution level</h3>
        <div className="poll-track">
          <div className="poll-fill" style={{ width:`${Math.min(avgGdi,100)}%`, background:`linear-gradient(90deg,#16A34A,${avgGdi>50?'#EA580C':'#CA8A04'},${avgGdi>75?'#DC2626':'#EA580C'})` }} />
        </div>
        <div className="poll-labels">
          <span>Low (0-25)</span><span>Moderate (25-50)</span><span>High (50-75)</span><span>Critical (75-100)</span>
        </div>
        <div className="poll-badge" style={{ background:pollution.bg, color:pollution.color }}>
          <span style={{width:8,height:8,borderRadius:'50%',background:pollution.color,display:'inline-block'}} />
          {pollution.label} — GDI: {avgGdi.toFixed(1)}
        </div>
      </div>

      {/* Charts */}
      <div className="charts">
        <div className="chart-card">
          <h3>Garbage class distribution</h3>
          <p className="chart-sub">Breakdown by waste type</p>
          <div className="chart-wrap" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:220,height:220}}>
              <Pie data={pieData} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ padding:14, usePointStyle:true, pointStyle:'circle', font:{size:11,family:'Plus Jakarta Sans'} }}}}} />
            </div>
          </div>
        </div>
        <div className="chart-card">
          <h3>GDI trend per scan</h3>
          <p className="chart-sub">Garbage density over scans</p>
          <div className="chart-wrap">
            <Bar data={barData} options={{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, max:100, grid:{color:'rgba(0,0,0,.04)'}, ticks:{font:{size:11,family:'Plus Jakarta Sans'}}}, x:{ grid:{display:false}, ticks:{font:{size:11,family:'Plus Jakarta Sans'}}}}, plugins:{ legend:{ display:false }}}} />
          </div>
        </div>
      </div>
    </>
  );
}