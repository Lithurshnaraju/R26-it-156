import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Radar, 
  Target, 
  Users, 
  Footprints,
  Compass
} from 'lucide-react';

export const ThreatRadar = ({ stats = {} }) => {
  const threatLevel = stats.threat_level || 'SAFE';
  const minDistance = stats.min_distance !== undefined ? stats.min_distance : null;
  const detectedAnimals = stats.detected_animals || [];
  const animalsCount = stats.animals_count || 0;
  const humansCount = stats.humans_count || 0;
  const statusText = stats.status_text || 'PERIMETER SECURE: NO THREAT';

  const isCritical = threatLevel === 'CRITICAL';
  const isWarning = threatLevel === 'WARNING';
  const isSafe = threatLevel === 'SAFE';

  // Distance range calculation (0 to 400px mapped to percentage)
  const distPercent = minDistance !== null ? Math.min(100, Math.max(10, (minDistance / 350) * 100)) : 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Radar className="w-5 h-5 text-amber-700 animate-spin-slow" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Threat & Proximity Radar
          </h3>
        </div>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
          isCritical
            ? 'bg-red-500/20 text-red-600 border-red-500/40 animate-pulse'
            : isWarning
            ? 'bg-amber-500/20 text-amber-700 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
        }`}>
          {threatLevel}
        </span>
      </div>

      {/* Main Threat Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center space-x-3.5 transition-all ${
        isCritical
          ? 'bg-red-50 border-red-200 text-red-800'
          : isWarning
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className={`p-2.5 rounded-xl ${
          isCritical ? 'bg-red-600 text-white' : isWarning ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isCritical ? <ShieldAlert className="w-6 h-6 animate-bounce" /> : isWarning ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-xs uppercase font-mono tracking-wider opacity-75 font-semibold">
            Current Security Assessment
          </div>
          <div className="text-sm font-bold mt-0.5">
            {statusText}
          </div>
        </div>
      </div>

      {/* Visual Proximity Meter (When both Animal and Human are detected) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-700" />
            Human-Animal Distance:
          </span>
          <span className="font-bold text-slate-900">
            {minDistance !== null ? `${Math.round(minDistance)} px` : 'N/A (No pair in frame)'}
          </span>
        </div>

        {/* Distance Bar */}
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              minDistance === null
                ? 'w-full bg-slate-300'
                : minDistance <= 220
                ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-emerald-500'
            }`}
            style={{ width: `${distPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>🚨 0px (Attack Contact)</span>
          <span>⚠️ 220px (Danger Limit)</span>
          <span>✅ 400px+ (Safe)</span>
        </div>
      </div>

      {/* Detections Counts Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-mono">Wild Animals</div>
            <div className="text-xl font-bold text-slate-900 font-mono">{animalsCount}</div>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-700 border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-mono">Humans On-Site</div>
            <div className="text-xl font-bold text-slate-900 font-mono">{humansCount}</div>
          </div>
        </div>
      </div>

      {/* Identified Species Tags */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-slate-500 uppercase font-mono font-semibold">
          Identified Species in Perimeter:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detectedAnimals.length > 0 ? (
            detectedAnimals.map((animal, idx) => (
              <span
                key={idx}
                className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg font-medium"
              >
                🐾 {animal}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500 italic">No wild animals currently detected</span>
          )}
        </div>
      </div>

      {/* Action Advisory */}
      <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
        <strong className="text-slate-700">Automated Protocol:</strong>{' '}
        {isCritical
          ? 'Dispatch immediate loudspeaker warning & security intervention team.'
          : isWarning
          ? 'Maintain camera tracking and observe perimeter fence.'
          : 'Standard surveillance monitoring active.'}
      </div>
    </div>
  );
};