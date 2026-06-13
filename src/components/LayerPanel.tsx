'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Activity, Sun, AlertTriangle, Camera, Flame, Target,
  CloudLightning, Radiation, Tv, Anchor, Ship, Newspaper,
  Network, Share2, Radio
} from 'lucide-react';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  isMobile?: boolean;
}

const LAYER_GROUPS = [
  {
    label: 'SDK',
    fullLabel: 'THIRD EYE SDK',
    color: '#1565C0',
    layers: [
      { key: 'sdk_sea', label: 'Maritime Lines', icon: Anchor, color: '#4FC3F7', dataKey: 'sdk_entities' },
      { key: 'sdk_ransomware', label: 'Ransomware Feed', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'AVIATION',
    fullLabel: 'AVIATION',
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: 'Commercial', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Private', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: 'Private Jets', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: 'Military', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
    ],
  },
  {
    label: 'MARITIME',
    fullLabel: 'MARITIME & SPACE',
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: 'Maritime / Naval', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
      { key: 'cables', label: 'Submarine Cables', icon: Share2, color: '#4FC3F7', dataKey: 'submarine_cables' },
      { key: 'satellites', label: 'Satellites', icon: Satellite, color: '#D4AF37', dataKey: 'satellites' },
    ],
  },
  {
    label: 'SURVEIL',
    fullLabel: 'SURVEILLANCE',
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'CCTV Cameras', icon: Camera, color: '#39FF14', dataKey: 'cameras' },
      { key: 'live_news', label: 'Live News Feeds', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
    ],
  },
  {
    label: 'HAZARD',
    fullLabel: 'NATURAL HAZARDS',
    color: '#FF9500',
    layers: [
      { key: 'earthquakes', label: 'Earthquakes (24h)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Active Fires', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'weather', label: 'Severe Weather', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
    ],
  },
  {
    label: 'THREAT',
    fullLabel: 'THREATS & INFRA',
    color: '#FF3D3D',
    layers: [
      { key: 'infrastructure', label: 'Nuclear Facilities', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
      { key: 'global_incidents', label: 'Global Incidents', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'gps_jamming', label: 'GPS Jamming', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
    ],
  },
  {
    label: 'DISPLAY',
    fullLabel: 'DISPLAY',
    color: '#448AFF',
    layers: [
      { key: 'day_night', label: 'Day / Night Cycle', icon: Sun, color: '#448AFF', dataKey: '' },
    ],
  },
];

const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

const GROUP_TEXT_CLASS: Record<string, string> = {
  SDK: 'text-[#1565C0] drop-shadow-[0_0_8px_rgba(21,101,192,0.45)]',
  AVIATION: 'text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.45)]',
  MARITIME: 'text-[#00BCD4] drop-shadow-[0_0_8px_rgba(0,188,212,0.45)]',
  SURVEIL: 'text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.45)]',
  HAZARD: 'text-[#FF9500] drop-shadow-[0_0_8px_rgba(255,149,0,0.45)]',
  THREAT: 'text-[#FF3D3D] drop-shadow-[0_0_8px_rgba(255,61,61,0.45)]',
  DISPLAY: 'text-[#448AFF] drop-shadow-[0_0_8px_rgba(68,138,255,0.45)]',
};

const GROUP_DOT_CLASS: Record<string, string> = {
  SDK: 'bg-[#1565C0] shadow-[0_0_8px_#1565C0]',
  AVIATION: 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]',
  MARITIME: 'bg-[#00BCD4] shadow-[0_0_8px_#00BCD4]',
  SURVEIL: 'bg-[#39FF14] shadow-[0_0_8px_#39FF14]',
  HAZARD: 'bg-[#FF9500] shadow-[0_0_8px_#FF9500]',
  THREAT: 'bg-[#FF3D3D] shadow-[0_0_8px_#FF3D3D]',
  DISPLAY: 'bg-[#448AFF] shadow-[0_0_8px_#448AFF]',
};

const LAYER_ACTIVE_CLASS: Record<string, string> = {
  '#4FC3F7': 'text-[#4FC3F7] shadow-[0_0_8px_#4FC3F7]',
  '#FF3D3D': 'text-[#FF3D3D] shadow-[0_0_8px_#FF3D3D]',
  '#00E5FF': 'text-[#00E5FF] shadow-[0_0_8px_#00E5FF]',
  '#00E676': 'text-[#00E676] shadow-[0_0_8px_#00E676]',
  '#FF69B4': 'text-[#FF69B4] shadow-[0_0_8px_#FF69B4]',
  '#00BCD4': 'text-[#00BCD4] shadow-[0_0_8px_#00BCD4]',
  '#D4AF37': 'text-[#D4AF37] shadow-[0_0_8px_#D4AF37]',
  '#39FF14': 'text-[#39FF14] shadow-[0_0_8px_#39FF14]',
  '#FF4081': 'text-[#FF4081] shadow-[0_0_8px_#FF4081]',
  '#FF9500': 'text-[#FF9500] shadow-[0_0_8px_#FF9500]',
  '#FF6B00': 'text-[#FF6B00] shadow-[0_0_8px_#FF6B00]',
  '#E040FB': 'text-[#E040FB] shadow-[0_0_8px_#E040FB]',
  '#76FF03': 'text-[#76FF03] shadow-[0_0_8px_#76FF03]',
  '#FF4444': 'text-[#FF4444] shadow-[0_0_8px_#FF4444]',
  '#448AFF': 'text-[#448AFF] shadow-[0_0_8px_#448AFF]',
};

// SVG component for Shield which was missing in the imports above
function Shield(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function LayerPanel({ data, activeLayers, setActiveLayers, isMobile }: LayerPanelProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const toggle = (key: string) => setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  
  const getCount = (dk: string): number | null => {
    if (!dk) return null;
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 py-2">
        {LAYER_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <div className={`text-[10px] font-bold font-mono tracking-widest border-b border-white/10 pb-1 ${GROUP_TEXT_CLASS[group.label] || 'text-white'}`}>
              {group.fullLabel}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.layers.map((layer) => {
                const isLayerActive = activeLayers[layer.key];
                const count = getCount(layer.dataKey);
                
                return (
                  <button
                    key={layer.key}
                    onClick={() => {
                      if (layer.key === 'sdk_ransomware') {
                        alert('Ransomware Feed - Coming Soon');
                      } else {
                        toggle(layer.key);
                      }
                    }}
                    className={`flex items-center gap-2 px-2 py-2 rounded border transition-colors ${
                      isLayerActive 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-transparent border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full border flex-shrink-0 transition-all ${
                        isLayerActive
                          ? `bg-current border-current scale-100 ${LAYER_ACTIVE_CLASS[layer.color] || 'text-white'}`
                          : 'bg-transparent border-white/30 scale-75'
                      }`}
                    />
                    <span className={`text-[9px] font-mono uppercase tracking-wider flex-1 text-left ${isLayerActive ? 'text-white' : 'text-white/60'}`}>
                      {layer.label}
                    </span>
                    {count !== null && (
                      <span className="text-[8px] font-mono tabular-nums opacity-60">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 h-full w-[80px] border-r border-white/5 flex flex-col pt-32 pb-8 z-50 pointer-events-auto bg-black/20 backdrop-blur-[2px]">
      
      <div className="flex-1 flex flex-col gap-8 px-2">
        {LAYER_GROUPS.map((group) => {
          const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
          const isActive = groupActiveCount > 0;
          const isHovered = hoveredGroup === group.label;

          return (
            <div 
              key={group.label} 
              className="relative flex justify-center items-center"
              onMouseEnter={() => setHoveredGroup(group.label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              {/* The Vertical Label */}
              <div
                className={`text-[10px] font-mono font-bold cursor-pointer select-none transition-all duration-300 flex items-center justify-center tracking-[0.1em] ${
                  isActive ? (GROUP_TEXT_CLASS[group.label] || 'text-white') : 'text-white/40'
                } ${isActive || isHovered ? 'opacity-100' : 'opacity-50'}`}
              >
                {/* Active Indicator dot */}
                {isActive && (
                  <div className={`absolute -left-1 w-1 h-1 rounded-full animate-pulse ${GROUP_DOT_CLASS[group.label] || 'bg-white'}`} />
                )}
                {group.label}
              </div>

              {/* Slide-out Menu */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -5, filter: 'blur(2px)' }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute left-[70px] top-1/2 -translate-y-1/2 min-w-[240px] bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-2xl z-50 pointer-events-auto"
                  >
                    <div className={`text-[11px] font-bold font-mono mb-3 tracking-widest border-b border-white/10 pb-2 ${GROUP_TEXT_CLASS[group.label] || 'text-white'}`}>
                      {group.fullLabel}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {group.layers.map((layer) => {
                        const isLayerActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKey);
                        const Icon = layer.icon || Shield;
                        
                        return (
                          <button
                            key={layer.key}
                            onClick={() => {
                              if (layer.key === 'sdk_ransomware') {
                                alert('Ransomware Feed - Coming Soon');
                              } else {
                                toggle(layer.key);
                              }
                            }}
                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded bg-transparent hover:bg-white/5 transition-colors group"
                          >
                            <div
                              className={`w-2 h-2 rounded-full border flex-shrink-0 transition-all duration-300 ${
                                isLayerActive
                                  ? `bg-current border-current scale-100 ${LAYER_ACTIVE_CLASS[layer.color] || 'text-white'}`
                                  : 'bg-transparent border-white/30 scale-75'
                              }`}
                            />
                            <span className={`text-[11px] font-mono uppercase tracking-wider flex-1 text-left transition-colors duration-200 ${isLayerActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                              {layer.label}
                            </span>
                            {count !== null && (
                              <span className="text-[9px] font-mono tabular-nums opacity-60">
                                {count.toLocaleString()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(LayerPanel);
