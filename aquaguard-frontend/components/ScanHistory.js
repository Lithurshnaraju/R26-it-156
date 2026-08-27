'use client';

function getLevel(gdi) {
  if (gdi >= 75) return { label:'Critical', cls:'b-crit' };
  if (gdi >= 50) return { label:'High', cls:'b-high' };
  if (gdi >= 25) return { label:'Moderate', cls:'b-mod' };
  return { label:'Low', cls:'b-low' };
}

export default function ScanHistory({ history, onView }) {
  if (history.length === 0) {
    return (
      <div className="hist-card" style={{cursor:'default'}}>
        <div className="empty">
          <div className="empty-icon">📋</div>
          <h4>No scan history yet</h4>
          <p>Upload or capture a river photo to start scanning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list">
      <p style={{fontSize:13,color:'var(--text-3)',marginBottom:4}}>{history.length} scan{history.length!==1?'s':''} — click any result to view details with bounding boxes</p>
      {history.map((r, idx) => {
        const level = getLevel(r.gdi_score || 0);
        const loc = r.location || r.location_name || `River Scan #${history.length - idx}`;
        const time = r.timestamp ? new Date(r.timestamp).toLocaleString() : new Date().toLocaleString();

        return (
          <div className="hist-card" key={r.id || idx} onClick={() => onView(r)}>
            <div className="hist-top">
              <div>
                <div className="hist-title">{loc}</div>
                <div className="hist-time">{time}</div>
              </div>
              <span className={`hist-badge ${level.cls}`}>{level.label}</span>
            </div>
            <div className="hist-metrics">
              <div className="hist-m">
                <div className="hist-m-label">Objects</div>
                <div className="hist-m-val" style={{color:'var(--text)'}}>{r.num_objects || 0}</div>
              </div>
              <div className="hist-m">
                <div className="hist-m-label">GDI Score</div>
                <div className="hist-m-val" style={{color:'var(--green)'}}>{Number(r.gdi_score||0).toFixed(1)}</div>
              </div>
              <div className="hist-m">
                <div className="hist-m-label">Pollution</div>
                <div className="hist-m-val" style={{color:level.cls==='b-crit'?'var(--red)':level.cls==='b-high'?'var(--orange)':level.cls==='b-mod'?'var(--yellow)':'var(--green)'}}>{level.label}</div>
              </div>
            </div>
            {r.class_counts && Object.keys(r.class_counts).length > 0 && (
              <div className="hist-tags">
                {Object.entries(r.class_counts).map(([cls, count]) => (
                  <span key={cls} className="det-tag"><span className={`det-dot d-${cls}`} />{cls}: {count}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
