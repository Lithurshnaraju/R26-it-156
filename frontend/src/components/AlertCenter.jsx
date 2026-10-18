import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Check, 
  Trash2, 
  ExternalLink,
  Clock,
  Camera
} from 'lucide-react';
import { acknowledgeAlert } from '../services/api';

export const AlertCenter = ({ alerts = [], onSelectAlert, onAlertAck }) => {
  const handleAck = async (e, id) => {
    e.stopPropagation();
    try {
      await acknowledgeAlert(id);
      if (onAlertAck) onAlertAck(id);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Real-Time Alert Feed
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {alerts.length} events logged
        </span>
      </div>

      <div className="p-3 overflow-y-auto space-y-2.5 max-h-[460px] flex-1">
        {alerts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-600" />
            No security or drowning incidents recorded.
          </div>
        ) : (
          alerts.slice(0, 15).map((alert) => {
            const isCritical = alert.threat_level === 'CRITICAL';
            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                  isCritical
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-900">
                      {alert.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                  {alert.message}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isCritical ? 'bg-red-500/15 text-red-700' : 'bg-amber-500/15 text-amber-700'
                    }`}>
                      {alert.threat_level}
                    </span>
                    {alert.snapshot_filename && (
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Camera className="w-3 h-3" />
                        <span>Snapshot</span>
                      </span>
                    )}
                  </div>

                  {!alert.is_acknowledged && (
                    <button
                      onClick={(e) => handleAck(e, alert.id)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition font-medium"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};