'use client';
import { useState } from 'react';

function getLevel(gdi) {
  if (gdi >= 75) return { label:'Critical', cls:'b-crit', color:'var(--red)', bg:'var(--red-l)', icon:'🔴', priority:'URGENT' };
  if (gdi >= 50) return { label:'High', cls:'b-high', color:'var(--orange)', bg:'var(--orange-l)', icon:'🟠', priority:'HIGH' };
  return { label:'Moderate', cls:'b-mod', color:'var(--yellow)', bg:'var(--yellow-l)', icon:'🟡', priority:'MEDIUM' };
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs>1?'s':''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days>1?'s':''} ago`;
}

const CLEANUP_ACTIONS = {
  critical: [
    {
      id: 'emergency_crew',
      label: '🚨 Deploy Emergency Cleanup Crew',
      description: 'Immediately dispatch a cleanup team. High garbage concentration poses severe environmental and safety risks.',
      steps: ['Contact municipal cleanup department', 'Send GPS coordinates to field team', 'Deploy team within 24 hours', 'Document before/after with photos']
    },
    {
      id: 'debris_barrier',
      label: '🚧 Install Temporary Debris Barrier',
      description: 'Place a floating debris barrier upstream to prevent further garbage accumulation.',
      steps: ['Identify upstream installation point', 'Deploy boom barrier across river width', 'Schedule daily collection from barrier', 'Monitor barrier integrity weekly']
    },
    {
      id: 'notify_authority',
      label: '🏛️ Escalate to Government Authority',
      description: 'Report critical pollution to CEA or local Pradeshiya Sabha for official intervention.',
      steps: ['Generate pollution report with GDI data', 'Submit report to CEA regional office', 'Request official site inspection', 'Follow up within 48 hours']
    },
  ],
  high: [
    {
      id: 'scheduled_cleanup',
      label: '📅 Schedule Weekly Cleanup Drive',
      description: 'Organize regular cleanup to prevent pollution from reaching critical levels.',
      steps: ['Set weekly cleanup schedule', 'Recruit 10-15 volunteers per session', 'Provide gloves, bags, and sorting bins', 'Track GDI reduction after each cleanup']
    },
    {
      id: 'collection_bins',
      label: '🗑️ Install Garbage Collection Points',
      description: 'Place collection bins at nearby access points to prevent illegal dumping.',
      steps: ['Identify 3-5 high-traffic access points', 'Install labeled bins for each waste type', 'Arrange weekly bin collection service', 'Add signage about river pollution']
    },
    {
      id: 'awareness_program',
      label: '📢 Conduct Community Awareness Program',
      description: 'Educate nearby communities about river pollution impact.',
      steps: ['Identify nearby communities and schools', 'Organize awareness workshop with data', 'Distribute educational materials', 'Establish community river monitoring group']
    },
  ],
};

export default function AlertsPage({ history, onRescan }) {
  const [activeTab, setActiveTab] = useState('alerts');
  const [selectedActions, setSelectedActions] = useState({});
  const [expandedCard, setExpandedCard] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [completedItems, setCompletedItems] = useState([]);
  const [showSuccess, setShowSuccess] = useState(null);

  // Filter alerts: GDI >= 50, not in pending or completed
  const pendingIds = pendingItems.map(p => p.alertId);
  const completedIds = completedItems.map(c => c.alertId);
  const alerts = history
    .filter(h => (h.gdi_score || 0) >= 50)
    .filter(h => !pendingIds.includes(h.id) && !completedIds.includes(h.id))
    .sort((a, b) => (b.gdi_score || 0) - (a.gdi_score || 0));

  const handleSubmitAction = (alert, actionId) => {
    const actionType = (alert.gdi_score || 0) >= 75 ? 'critical' : 'high';
    const action = CLEANUP_ACTIONS[actionType].find(a => a.id === actionId);
    if (!action) return;

    const pendingItem = {
      alertId: alert.id,
      alert: alert,
      action: action,
      submittedAt: new Date().toISOString(),
    };

    setPendingItems(prev => [pendingItem, ...prev]);
    setSelectedActions({});
    setExpandedCard(null);

    // Show success popup
    setShowSuccess({
      action: action.label,
      location: alert.location || alert.location_name || 'River Location',
      priority: (alert.gdi_score || 0) >= 75 ? 'URGENT' : 'HIGH',
    });
  };

  const handleMarkComplete = (pendingItem) => {
    setPendingItems(prev => prev.filter(p => p.alertId !== pendingItem.alertId));
    setCompletedItems(prev => [{
      ...pendingItem,
      completedAt: new Date().toISOString(),
    }, ...prev]);
  };

  const tabCounts = {
    alerts: alerts.length,
    pending: pendingItems.length,
    completed: completedItems.length,
  };

  return (
    <div className="alerts-page">
      {/* Tabs */}
      <div className="alert-tabs">
        <button className={`alert-tab ${activeTab==='alerts'?'active tab-red':''}`} onClick={()=>setActiveTab('alerts')}>
          🚨 Alerts {tabCounts.alerts > 0 && <span className="tab-badge tab-badge-red">{tabCounts.alerts}</span>}
        </button>
        <button className={`alert-tab ${activeTab==='pending'?'active tab-yellow':''}`} onClick={()=>setActiveTab('pending')}>
          ⏳ Pending {tabCounts.pending > 0 && <span className="tab-badge tab-badge-yellow">{tabCounts.pending}</span>}
        </button>
        <button className={`alert-tab ${activeTab==='completed'?'active tab-green':''}`} onClick={()=>setActiveTab('completed')}>
          ✅ Completed {tabCounts.completed > 0 && <span className="tab-badge tab-badge-green">{tabCounts.completed}</span>}
        </button>
      </div>

      {/* =================== ALERTS TAB =================== */}
      {activeTab === 'alerts' && (
        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="alert-empty">
              <div className="empty-icon">🔔</div>
              <h4>No new alerts</h4>
              <p>All pollution alerts have been actioned. Scan more locations to monitor.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => {
              const level = getLevel(alert.gdi_score || 0);
              const loc = alert.location || alert.location_name || 'River Scan';
              const time = alert.timestamp ? new Date(alert.timestamp).toLocaleString() : new Date().toLocaleString();
              const isExpanded = expandedCard === `alert-${idx}`;
              const actionType = (alert.gdi_score || 0) >= 75 ? 'critical' : 'high';
              const actions = CLEANUP_ACTIONS[actionType];
              const selected = selectedActions[`alert-${idx}`];

              return (
                <div className="alert-card" key={alert.id || idx}>
                  <div className="alert-header">
                    <div className="alert-header-left">
                      <span className="alert-pulse-icon">{level.icon}</span>
                      <div>
                        <div className="alert-title">{loc}</div>
                        <div className="alert-time">{time}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span className={`hist-badge ${level.cls}`}>{level.label}</span>
                      <div style={{fontSize:10,color:level.color,fontWeight:700,marginTop:4}}>{level.priority}</div>
                    </div>
                  </div>

                  <div className="alert-metrics">
                    <div className="alert-metric">
                      <div className="alert-metric-label">GDI Score</div>
                      <div className="alert-metric-val" style={{color:level.color}}>{Number(alert.gdi_score||0).toFixed(1)}</div>
                    </div>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Objects</div>
                      <div className="alert-metric-val" style={{color:'var(--blue)'}}>{alert.num_objects||0}</div>
                    </div>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Severity</div>
                      <div className="alert-metric-val" style={{color:level.color,fontSize:15,fontWeight:700}}>{level.label}</div>
                    </div>
                  </div>

                  {alert.class_counts && Object.keys(alert.class_counts).length > 0 && (
                    <div className="hist-tags" style={{marginBottom:14}}>
                      {Object.entries(alert.class_counts).map(([cls, count]) => (
                        <span key={cls} className="det-tag"><span className={`det-dot d-${cls}`}/>{cls}: {count}</span>
                      ))}
                    </div>
                  )}

                  <button className="alert-action-toggle" onClick={()=>setExpandedCard(isExpanded?null:`alert-${idx}`)}>
                    <span>🛠️ Select Cleanup Action</span>
                    <span style={{transform:isExpanded?'rotate(180deg)':'none',transition:'transform .2s'}}>▼</span>
                  </button>

                  {isExpanded && (
                    <div className="alert-actions">
                      {actions.map(action => (
                        <div
                          key={action.id}
                          className={`alert-action-card ${selected===action.id?'selected':''}`}
                          onClick={()=>setSelectedActions(prev=>({...prev,[`alert-${idx}`]:selected===action.id?null:action.id}))}
                        >
                          <div className="alert-action-header">
                            <span className="alert-action-label">{action.label}</span>
                            <span className="alert-action-check">{selected===action.id?'✅':'○'}</span>
                          </div>
                          <p className="alert-action-desc">{action.description}</p>
                        </div>
                      ))}

                      {selected && (
                        <button className="btn-submit-action" onClick={()=>handleSubmitAction(alert,selected)}>
                          ✅ Submit Action
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =================== PENDING TAB =================== */}
      {activeTab === 'pending' && (
        <div className="alert-list">
          {pendingItems.length === 0 ? (
            <div className="alert-empty">
              <div className="empty-icon">⏳</div>
              <h4>No pending works</h4>
              <p>Submit a cleanup action from the Alerts tab to see it here.</p>
            </div>
          ) : (
            pendingItems.map((item, idx) => {
              const level = getLevel(item.alert.gdi_score || 0);
              const loc = item.alert.location || item.alert.location_name || 'River Location';

              return (
                <div className="alert-card pending-card" key={idx}>
                  <div className="pending-status">⏳ PENDING — Awaiting cleanup</div>

                  <div className="alert-header">
                    <div className="alert-header-left">
                      <span>{level.icon}</span>
                      <div>
                        <div className="alert-title">{loc}</div>
                        <div className="alert-time">Submitted: {timeAgo(item.submittedAt)}</div>
                      </div>
                    </div>
                    <span className={`hist-badge ${level.cls}`}>{level.label}</span>
                  </div>

                  <div className="pending-action-info">
                    <div className="pending-action-label">Assigned Action:</div>
                    <div className="pending-action-name">{item.action.label}</div>
                  </div>

                  <div className="pending-steps">
                    <div className="pending-steps-title">Action Steps:</div>
                    {item.action.steps.map((step, i) => (
                      <div key={i} className="alert-step">
                        <span className="alert-step-num">{i+1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="alert-metrics" style={{marginTop:14}}>
                    <div className="alert-metric">
                      <div className="alert-metric-label">GDI Score</div>
                      <div className="alert-metric-val" style={{color:level.color}}>{Number(item.alert.gdi_score||0).toFixed(1)}</div>
                    </div>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Objects</div>
                      <div className="alert-metric-val" style={{color:'var(--blue)'}}>{item.alert.num_objects||0}</div>
                    </div>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Status</div>
                      <div className="alert-metric-val" style={{color:'var(--yellow)',fontSize:14,fontWeight:700}}>PENDING</div>
                    </div>
                  </div>

                  <button className="btn-mark-complete" onClick={()=>handleMarkComplete(item)}>
                    ✅ Mark as Complete
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =================== COMPLETED TAB =================== */}
      {activeTab === 'completed' && (
        <div className="alert-list">
          {completedItems.length === 0 ? (
            <div className="alert-empty">
              <div className="empty-icon">✅</div>
              <h4>No completed works yet</h4>
              <p>Complete a pending cleanup to see it here.</p>
            </div>
          ) : (
            completedItems.map((item, idx) => {
              const level = getLevel(item.alert.gdi_score || 0);
              const loc = item.alert.location || item.alert.location_name || 'River Location';

              return (
                <div className="alert-card completed-card" key={idx}>
                  <div className="completed-status">✅ COMPLETED</div>

                  <div className="alert-header">
                    <div className="alert-header-left">
                      <span>✅</span>
                      <div>
                        <div className="alert-title" style={{textDecoration:'line-through',opacity:.6}}>{loc}</div>
                        <div className="alert-time">Completed: {timeAgo(item.completedAt)}</div>
                      </div>
                    </div>
                    <span className="hist-badge b-low">Done</span>
                  </div>

                  <div className="pending-action-info" style={{opacity:.7}}>
                    <div className="pending-action-label">Action Taken:</div>
                    <div className="pending-action-name">{item.action.label}</div>
                  </div>

                  <div className="alert-metrics" style={{marginTop:14}}>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Original GDI</div>
                      <div className="alert-metric-val" style={{color:level.color}}>{Number(item.alert.gdi_score||0).toFixed(1)}</div>
                    </div>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Objects Found</div>
                      <div className="alert-metric-val" style={{color:'var(--blue)'}}>{item.alert.num_objects||0}</div>
                    </div>
                    <div className="alert-metric">
                      <div className="alert-metric-label">Status</div>
                      <div className="alert-metric-val" style={{color:'var(--green)',fontSize:14,fontWeight:700}}>DONE</div>
                    </div>
                  </div>

                  <button className="btn-rescan" onClick={()=>onRescan(item.alert)}>
                    🔄 Rescan This Location
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =================== SUCCESS POPUP =================== */}
      {showSuccess && (
        <div className="modal-bg" onClick={()=>setShowSuccess(null)}>
          <div className="success-popup" onClick={e=>e.stopPropagation()}>
            <div className="success-icon">✅</div>
            <h3 className="success-title">Suggestion Submitted Successfully!</h3>
            <div className="success-details">
              <div className="success-row">
                <span className="success-label">Action:</span>
                <span className="success-value">{showSuccess.action}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Location:</span>
                <span className="success-value">{showSuccess.location}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Priority:</span>
                <span className="success-value" style={{color:showSuccess.priority==='URGENT'?'var(--red)':'var(--orange)',fontWeight:700}}>{showSuccess.priority}</span>
              </div>
            </div>
            <p className="success-note">This has been moved to Pending Works.</p>
            <button className="btn-success-done" onClick={()=>setShowSuccess(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}