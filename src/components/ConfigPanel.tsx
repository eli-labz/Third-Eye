'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, Save, RefreshCw, CheckCircle, AlertTriangle,
  Eye, EyeOff, ChevronDown, ChevronRight, Cpu, Database, Radio, Key
} from 'lucide-react';

interface ConfigValues {
  [key: string]: string;
}

const SECTIONS = [
  {
    id: 'ai',
    label: 'AI Intelligence Layer',
    icon: Cpu,
    color: '#D4AF37',
    keys: [
      { key: 'GEMINI_API_KEY_1', label: 'Gemini API Key 1', hint: 'AIza…', secret: true },
      { key: 'GEMINI_API_KEY_2', label: 'Gemini API Key 2', hint: 'AIza… (rotation slot 2)', secret: true },
      { key: 'GEMINI_API_KEY_3', label: 'Gemini API Key 3', hint: 'AIza… (rotation slot 3)', secret: true },
      { key: 'GEMINI_API_KEY_4', label: 'Gemini API Key 4', hint: 'rotation slot 4', secret: true },
      { key: 'GEMINI_API_KEY_5', label: 'Gemini API Key 5', hint: 'rotation slot 5', secret: true },
      { key: 'GEMINI_API_KEY_6', label: 'Gemini API Key 6', hint: 'rotation slot 6', secret: true },
      { key: 'GEMINI_API_KEY_7', label: 'Gemini API Key 7', hint: 'rotation slot 7', secret: true },
      { key: 'GEMINI_API_KEY_8', label: 'Gemini API Key 8', hint: 'rotation slot 8', secret: true },
    ],
  },
  {
    id: 'data',
    label: 'Data Source Keys',
    icon: Database,
    color: '#00E5FF',
    keys: [
      { key: 'FIRMS_API_KEY',        label: 'NASA FIRMS (Fires)',      hint: 'FIRMS API key', secret: true },
      { key: 'AIS_API_KEY',          label: 'AIS Stream (Maritime)',    hint: 'AIS API key', secret: true },
      { key: 'OPENSKY_CLIENT_ID',    label: 'OpenSky Client ID',       hint: 'opensky username', secret: false },
      { key: 'OPENSKY_CLIENT_SECRET',label: 'OpenSky Client Secret',   hint: 'opensky password', secret: true },
    ],
  },
  {
    id: 'scanner',
    label: 'Scanner Backend',
    icon: Radio,
    color: '#FF3D3D',
    keys: [
      { key: 'SCANNER_URL', label: 'Scanner URL', hint: 'http://your-scanner:7700', secret: false },
      { key: 'SCANNER_KEY', label: 'Scanner Key', hint: 'Authentication key', secret: true },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama Local Runtime',
    icon: Key,
    color: '#00E676',
    keys: [
      { key: 'OLLAMA_HOST',  label: 'Ollama Host',  hint: 'http://127.0.0.1:11434', secret: false },
      { key: 'OLLAMA_MODEL', label: 'Ollama Model', hint: 'e.g. lfm2.5-thinking:1.2b', secret: false },
    ],
  },
];

const SECTION_COLOR_CLASS: Record<string, string> = {
  '#D4AF37': 'text-[#D4AF37]',
  '#00E5FF': 'text-[#00E5FF]',
  '#FF3D3D': 'text-[#FF3D3D]',
  '#00E676': 'text-[#00E676]',
};

export default function ConfigPanel({ onClose }: { onClose: () => void }) {
  const [values, setValues] = useState<ConfigValues>({});
  const [saved, setSaved] = useState<ConfigValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [revealMap, setRevealMap] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ ai: true, data: true, scanner: false, ollama: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setValues(data.values ?? {});
        setSaved(data.values ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setSaved({ ...values });
        setSaveStatus('ok');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);

  const toggleReveal = (key: string) =>
    setRevealMap(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleSection = (id: string) =>
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="glass-panel w-[420px] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)] bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--gold-primary)]" />
          <span className="hud-text text-[12px] text-[var(--text-heading)]">CONFIGURATION</span>
          <span className="text-[8px] font-mono text-[var(--text-muted)] ml-1">.env.local</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors"
            title="Reload from file"
            aria-label="Reload configuration from file"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
            title="Close"
            aria-label="Close configuration panel"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto styled-scrollbar px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          SECTIONS.map(section => {
            const SectionIcon = section.icon;
            const isOpen = openSections[section.id] ?? true;
            const activeCount = section.keys.filter(k => values[k.key]?.trim()).length;

            return (
              <div key={section.id} className="rounded-lg border border-[var(--border-secondary)] overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-black/30 hover:bg-[var(--hover-accent)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SectionIcon className={`w-3.5 h-3.5 ${SECTION_COLOR_CLASS[section.color] ?? 'text-white'}`} />
                    <span className={`text-[10px] font-mono font-bold tracking-wider ${SECTION_COLOR_CLASS[section.color] ?? 'text-white'}`}>
                      {section.label}
                    </span>
                    {activeCount > 0 && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--alert-green)]/15 text-[var(--alert-green)] border border-[var(--alert-green)]/30">
                        {activeCount}/{section.keys.length}
                      </span>
                    )}
                  </div>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  }
                </button>

                {/* Section fields */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-2 space-y-2">
                        {section.keys.map(({ key, label, hint, secret }) => {
                          const val = values[key] ?? '';
                          const changed = val !== (saved[key] ?? '');
                          return (
                            <div key={key} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                                  {label}
                                </label>
                                {changed && (
                                  <span className="text-[8px] font-mono text-[var(--alert-orange)] tracking-wider">unsaved</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <input
                                  type={secret && !revealMap[key] ? 'password' : 'text'}
                                  value={val}
                                  onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                                  placeholder={hint}
                                  className={`flex-1 bg-[var(--bg-primary)]/60 border rounded px-2.5 py-1.5 text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-colors ${
                                    changed
                                      ? 'border-[var(--alert-orange)]/50 focus:border-[var(--alert-orange)]'
                                      : 'border-[var(--border-secondary)] focus:border-[var(--border-primary)]'
                                  }`}
                                />
                                {secret && (
                                  <button
                                    onClick={() => toggleReveal(key)}
                                    className="px-2 rounded border border-[var(--border-secondary)] hover:bg-[var(--hover-accent)] transition-colors"
                                    title={revealMap[key] ? 'Hide value' : 'Reveal value'}
                                    aria-label={revealMap[key] ? 'Hide value' : 'Reveal value'}
                                  >
                                    {revealMap[key]
                                      ? <EyeOff className="w-3 h-3 text-[var(--text-muted)]" />
                                      : <Eye className="w-3 h-3 text-[var(--text-muted)]" />
                                    }
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-[var(--border-secondary)] bg-black/40 flex items-center justify-between gap-3">
        <p className="text-[8px] font-mono text-[var(--text-muted)] leading-relaxed">
          Changes are written directly to <code className="text-[var(--cyan-primary)]">.env.local</code>.
          Restart the dev server to apply API key changes.
        </p>

        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-mono tracking-wider font-bold transition-all shrink-0 disabled:opacity-40 ${
            saveStatus === 'ok'
              ? 'bg-[var(--alert-green)]/20 border border-[var(--alert-green)]/40 text-[var(--alert-green)]'
              : saveStatus === 'error'
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : isDirty
              ? 'bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/40 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/25'
              : 'bg-white/5 border border-white/10 text-[var(--text-muted)]'
          }`}
          title="Save changes to .env.local"
          aria-label="Save configuration"
        >
          {saving ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : saveStatus === 'ok' ? (
            <CheckCircle className="w-3 h-3" />
          ) : saveStatus === 'error' ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {saveStatus === 'ok' ? 'SAVED' : saveStatus === 'error' ? 'ERROR' : 'SAVE'}
        </button>
      </div>
    </motion.div>
  );
}
