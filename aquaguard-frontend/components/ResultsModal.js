'use client';
import { useEffect, useRef } from 'react';

const CLASS_COLORS = {
  plastic: '#3B82F6',
  polythene: '#F97316',
  glass: '#8B5CF6',
  metal: '#6B7280',
  paper: '#22C55E',
};

function getLevel(gdi) {
  if (gdi >= 75) return { label:'Critical', color:'var(--red)', bg:'var(--red-l)' };
  if (gdi >= 50) return { label:'High', color:'var(--orange)', bg:'var(--orange-l)' };
  if (gdi >= 25) return { label:'Moderate', color:'var(--yellow)', bg:'var(--yellow-l)' };
  return { label:'Low', color:'var(--green)', bg:'var(--green-l)' };
}

export default function ResultsModal({ result, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const level = getLevel(result.gdi_score || 0);

  // Draw bounding boxes on the image
  useEffect(() => {
    if (!result.imageUrl || !result.detections || result.detections.length === 0) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas size to match displayed image size
      const container = canvas.parentElement;
      const displayWidth = container.offsetWidth;
      const displayHeight = (img.height / img.width) * displayWidth;

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      if (imgRef.current) {
        imgRef.current.style.width = '100%';
        imgRef.current.style.height = displayHeight + 'px';
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale factors from original image to displayed size
      const scaleX = displayWidth / img.width;
      const scaleY = displayHeight / img.height;

      result.detections.forEach(det => {
        const color = CLASS_COLORS[det.class] || '#16A34A';
        const [x1, y1, x2, y2] = det.bbox;

        const dx1 = x1 * scaleX;
        const dy1 = y1 * scaleY;
        const dx2 = x2 * scaleX;
        const dy2 = y2 * scaleY;
        const bw = dx2 - dx1;
        const bh = dy2 - dy1;

        // Draw box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(dx1, dy1, bw, bh);

        // Draw label background
        const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 12px DM Sans, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const labelH = 20;
        const labelY = dy1 > labelH ? dy1 - labelH : dy1;

        ctx.fillStyle = color;
        ctx.fillRect(dx1, labelY, textWidth + 12, labelH);

        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, dx1 + 6, labelY + 14);
      });
    };
    img.src = result.imageUrl;
  }, [result]);

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>🔍 Detection Results</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        {/* Location info */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:600}}>{result.location || 'Unknown Location'}</div>
          <div style={{fontSize:12,color:'var(--text-3)'}}>
            {result.timestamp ? new Date(result.timestamp).toLocaleString() : new Date().toLocaleString()}
          </div>
        </div>

        {/* Image with bounding boxes */}
        {result.imageUrl && (
          <div className="result-img-wrap">
            <img ref={imgRef} src={result.imageUrl} alt="Analyzed" style={{width:'100%',display:'block'}} />
            <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} />
          </div>
        )}

        {/* Summary metrics */}
        <div className="result-summary">
          <div className="result-s">
            <div className="result-s-label">Objects found</div>
            <div className="result-s-val" style={{color:'var(--blue)'}}>{result.num_objects || 0}</div>
          </div>
          <div className="result-s">
            <div className="result-s-label">GDI Score</div>
            <div className="result-s-val" style={{color:'var(--green)'}}>{Number(result.gdi_score || 0).toFixed(1)}</div>
          </div>
          <div className="result-s">
            <div className="result-s-label">Pollution</div>
            <div className="result-s-val" style={{color:level.color,fontSize:16}}>{level.label}</div>
          </div>
        </div>

        {/* Detected classes */}
        {result.class_counts && Object.keys(result.class_counts).length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Detected garbage types</div>
            <div className="hist-tags">
              {Object.entries(result.class_counts).map(([cls, count]) => (
                <span key={cls} className="det-tag" style={{fontSize:13,padding:'6px 14px'}}>
                  <span className={`det-dot d-${cls}`} style={{width:10,height:10}} />
                  <strong>{cls}</strong>: {count} detected
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Individual detections list */}
        {result.detections && result.detections.length > 0 && (
          <div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Detection details</div>
            <div style={{maxHeight:200,overflowY:'auto'}}>
              {result.detections.map((det, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:i%2===0?'var(--bg)':'transparent',borderRadius:6,fontSize:13}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className={`det-dot d-${det.class}`} style={{width:8,height:8}} />
                    <span style={{fontWeight:500}}>{det.class}</span>
                  </div>
                  <span style={{color:'var(--text-2)'}}>{(det.confidence * 100).toFixed(1)}% confidence</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No detections message */}
        {(!result.detections || result.detections.length === 0) && (
          <div className="empty" style={{padding:20}}>
            <div className="empty-icon">✅</div>
            <h4>No garbage detected</h4>
            <p>The river section appears clean in this image</p>
          </div>
        )}

        <button className="btn-analyze" onClick={onClose} style={{marginTop:16}}>
          ✅ Done
        </button>
      </div>
    </div>
  );
}
