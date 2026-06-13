'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Exchange { name: string; country: string; open: boolean; }
interface CountryRisk { code: string; risk_score: number; risk_level: string; tags: string[]; }

const RISK_TOOLTIPS: Record<string, string> = {
  CRITICAL: 'Active conflict, sanctions, or major instability detected',
  HIGH: 'Elevated threat level — ongoing tensions or security concerns',
  ELEVATED: 'Moderate risk — political instability or regional disputes',
  LOW: 'Stable — no significant threats detected',
};

export default function GlobalStatusBar() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [risks, setRisks] = useState<CountryRisk[]>([]);
  const [cyber, setCyber] = useState<any>(null);
  const [openCount, setOpenCount] = useState(0);
  const [hoveredRisk, setHoveredRisk] = useState<CountryRisk | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [riskRes, cyberRes] = await Promise.allSettled([
          fetch('/api/country-risk'),
          fetch('/api/cyber-threats'),
        ]);
        if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
          const d = await riskRes.value.json();
          setExchanges(d.exchanges || []);
          setRisks(d.countries || []);
          setOpenCount(d.open_exchanges || 0);
        }
        if (cyberRes.status === 'fulfilled' && cyberRes.value.ok) {
          setCyber(await cyberRes.value.json());
        }
      } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }
    };
    fetchData();
    const iv = setInterval(fetchData, 1800000); // 30 min (was 5 min)
    return () => clearInterval(iv);
  }, []);

  const topRisks = risks.slice(0, 6);
  const cveCount = cyber?.stats?.active_cves || 0;

  const riskColor = (level: string) =>
    level === 'CRITICAL' ? '#FF3D3D' : level === 'HIGH' ? '#FF9500' : level === 'ELEVATED' ? '#FFD700' : '#00E676';

  const countryFlag = (code: string) => {
    try {
      return String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    } catch { return code; }
  };

  if (exchanges.length === 0 && risks.length === 0) return null;

  const tickerContent = (
    <>
      {exchanges.map(ex => (
        <span key={ex.name} className="inline-flex items-center gap-0.5 mx-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ex.open ? 'bg-[var(--alert-green)]' : 'bg-[var(--text-muted)]/30'}`} />
          <span className={`${ex.open ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]/40'}`}>{ex.name}</span>
        </span>
      ))}
      <span className="text-[var(--border-primary)] mx-1">|</span>
      {topRisks.map(r => (
        <span
          key={r.code}
          className="inline-flex items-center gap-0.5 mx-1.5 relative cursor-help pointer-events-auto"
          onMouseEnter={() => setHoveredRisk(r)}
          onMouseLeave={() => setHoveredRisk(null)}
        >
          <span className="text-[10px]">{countryFlag(r.code)}</span>
          <span style={{ color: riskColor(r.risk_level) }} className="font-bold">{r.risk_score}</span>
        </span>
      ))}
      <span className="text-[var(--border-primary)] mx-1">|</span>
      <span className="inline-flex items-center gap-1 mx-2">
        <span className="text-[#E040FB]">CYBER</span>
        <span className="text-[var(--text-primary)]">{cveCount} CVEs</span>
      </span>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 4, duration: 0.8 }}
      className="hidden md:block absolute bottom-0 left-0 right-0 z-[198] pointer-events-none"
    >
      <div className="h-[22px] overflow-hidden bg-black/90 border-t border-[var(--cyan-primary)]/40 flex items-center text-[8px] font-mono tracking-wider backdrop-blur-md relative" style={{ boxShadow: '0 -4px 20px rgba(0, 229, 255, 0.1)' }}>
        {/* Animated glitch line overlay */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan-primary)] to-transparent opacity-50" style={{ animation: 'hud-scanline 3s linear infinite' }} />
        
        {/* Static label */}
        <div className="flex-shrink-0 px-3 h-full flex items-center gap-1 border-r border-[var(--cyan-primary)]/30 bg-black pointer-events-auto relative z-10 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
          <span className="text-[var(--cyan-primary)]/50">MKT</span>
          <span className="text-[var(--cyan-primary)] font-bold">{openCount}/{exchanges.length}</span>
        </div>

        {/* CSS-animated ticker */}
        <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
          <div className="flex items-center animate-ticker whitespace-nowrap">
            {tickerContent}
            {tickerContent}
          </div>
        </div>
      </div>

      {/* Hover tooltip for risk scores */}
      {hoveredRisk && (
        <div
          className="absolute bottom-[28px] left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
        >
          <div className="glass-panel px-3 py-2 text-[10px] font-mono text-center whitespace-nowrap" style={{ borderColor: `${riskColor(hoveredRisk.risk_level)}40` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px]">{countryFlag(hoveredRisk.code)}</span>
              <span className="font-bold" style={{ color: riskColor(hoveredRisk.risk_level) }}>
                {hoveredRisk.risk_level}
              </span>
              <span className="text-[var(--text-muted)]">Score: {hoveredRisk.risk_score}/100</span>
            </div>
            <div className="text-[9px] text-[var(--text-secondary)]">
              {RISK_TOOLTIPS[hoveredRisk.risk_level] || 'Risk assessment based on global threat data'}
            </div>
            {hoveredRisk.tags?.length > 0 && (
              <div className="flex gap-1 mt-1 justify-center flex-wrap">
                {hoveredRisk.tags.slice(0, 3).map(t => (
                  <span key={t} className="px-1.5 py-0.5 rounded text-[8px]" style={{ backgroundColor: `${riskColor(hoveredRisk.risk_level)}15`, color: riskColor(hoveredRisk.risk_level) }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
