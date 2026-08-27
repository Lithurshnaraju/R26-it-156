'use client';

export default function AboutScanner() {
  return (
    <>
      <div className="about-card">
        <h3>🌊 About AquaGuard</h3>
        <p>
          AquaGuard is a real-time river garbage detection system built for Sri Lanka.
          It uses YOLOv8 deep learning to detect floating garbage in rivers, calculates
          a Garbage Density Index (GDI) to assess pollution severity, and triggers
          alerts for cleanup teams. The system is designed to help government agencies
          like CEA and NARA monitor river pollution efficiently.
        </p>
      </div>

      <div className="about-card">
        <h3>🎯 What it detects</h3>
        <p>The AI model is trained to detect 4 categories of river garbage:</p>
        <div className="about-classes">
          <div className="about-cls">
            <div className="about-cls-dot" style={{background:'#3B82F6'}} />
            <div>
              <div className="about-cls-name">Plastic</div>
              <div style={{fontSize:'12px',color:'var(--text-3)'}}>Bottles, containers, cups</div>
            </div>
          </div>
          <div className="about-cls">
            <div className="about-cls-dot" style={{background:'#F97316'}} />
            <div>
              <div className="about-cls-name">Polythene</div>
              <div style={{fontSize:'12px',color:'var(--text-3)'}}>Bags, packaging, wrappers</div>
            </div>
          </div>
          <div className="about-cls">
            <div className="about-cls-dot" style={{background:'#8B5CF6'}} />
            <div>
              <div className="about-cls-name">Glass</div>
              <div style={{fontSize:'12px',color:'var(--text-3)'}}>Bottles, broken glass</div>
            </div>
          </div>
          <div className="about-cls">
            <div className="about-cls-dot" style={{background:'#6B7280'}} />
            <div>
              <div className="about-cls-name">Metal</div>
              <div style={{fontSize:'12px',color:'var(--text-3)'}}>Cans, tins, metal scraps</div>
            </div>
          </div>
        </div>
      </div>

      <div className="about-card">
        <h3>📊 Garbage Density Index (GDI)</h3>
        <p>
          GDI is a score from 0 to 100 that measures how polluted a river section is.
          It's calculated using the number of detected objects, their type, and detection confidence.
          More dangerous waste types (like polythene bags) contribute more to the score.
        </p>
        <div className="about-classes" style={{marginTop:'14px'}}>
          <div className="about-cls" style={{background:'var(--green-l)'}}>
            <div className="about-cls-dot" style={{background:'var(--green)'}} />
            <div><div className="about-cls-name">Low (0–25)</div><div style={{fontSize:'12px',color:'var(--text-3)'}}>Relatively clean</div></div>
          </div>
          <div className="about-cls" style={{background:'var(--yellow-l)'}}>
            <div className="about-cls-dot" style={{background:'var(--yellow)'}} />
            <div><div className="about-cls-name">Moderate (25–50)</div><div style={{fontSize:'12px',color:'var(--text-3)'}}>Regular monitoring needed</div></div>
          </div>
          <div className="about-cls" style={{background:'var(--orange-l)'}}>
            <div className="about-cls-dot" style={{background:'var(--orange)'}} />
            <div><div className="about-cls-name">High (50–75)</div><div style={{fontSize:'12px',color:'var(--text-3)'}}>Schedule cleanup</div></div>
          </div>
          <div className="about-cls" style={{background:'var(--red-l)'}}>
            <div className="about-cls-dot" style={{background:'var(--red)'}} />
            <div><div className="about-cls-name">Critical (75–100)</div><div style={{fontSize:'12px',color:'var(--text-3)'}}>Immediate action required</div></div>
          </div>
        </div>
      </div>

      <div className="about-card">
        <h3>🛠️ Technology stack</h3>
        <p>
          <strong>AI model:</strong> YOLOv8-nano trained on custom Sri Lankan river dataset<br/>
          <strong>Backend:</strong> Python FastAPI with SQLite database<br/>
          <strong>Frontend:</strong> Next.js (React) with Chart.js<br/>
          <strong>Training:</strong> Google Colab with T4 GPU
        </p>
      </div>
    </>
  );
}
