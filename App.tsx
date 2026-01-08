
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { GridAsset, AssetType, GridStats } from './types';

// Components
const AssetIcon: React.FC<{ type: AssetType; className?: string }> = ({ type, className = "w-6 h-6" }) => {
  switch (type) {
    case AssetType.SOLAR: return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
    );
    case AssetType.WIND: return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 12a3 3 0 1 0-5.997.125L4 12h7Z"/><path d="M13 12a3 3 0 1 1 5.997-.125L20 12h-7Z"/><path d="M12 4v16"/><path d="M12 4L9.5 2"/><path d="M12 4l2.5-2"/></svg>
    );
    case AssetType.BATTERY: return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="7" rx="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>
    );
    case AssetType.BUILDING: return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="9" x2="9" y1="22" y2="22"/><line x1="15" x2="15" y1="22" y2="22"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M16 18h.01"/></svg>
    );
    default: return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    );
  }
};

const INITIAL_ASSETS: GridAsset[] = [
  { id: '1', name: 'Sunny Meadows PV', type: AssetType.SOLAR, capacity: 50, currentOutput: 35, status: 'active', x: 15, y: 20 },
  { id: '2', name: 'West Ridge Wind', type: AssetType.WIND, capacity: 80, currentOutput: 42, status: 'active', x: 80, y: 15 },
  { id: '3', name: 'Central Battery B1', type: AssetType.BATTERY, capacity: 40, currentOutput: -10, status: 'active', x: 50, y: 50 },
  { id: '4', name: 'Downtown Hub', type: AssetType.BUILDING, capacity: 30, currentOutput: 25, status: 'active', x: 45, y: 75 },
  { id: '5', name: 'Tech Park A', type: AssetType.FACTORY, capacity: 100, currentOutput: 85, status: 'active', x: 75, y: 80 },
  { id: '6', name: 'Supercharger Lot', type: AssetType.EV_STATION, capacity: 20, currentOutput: 12, status: 'active', x: 20, y: 85 },
];

const App: React.FC = () => {
  const [assets, setAssets] = useState<GridAsset[]>(INITIAL_ASSETS);
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>(["Grid initialized...", "VPP systems operational."]);
  const [aiAdvice, setAiAdvice] = useState<string>("Waiting for system telemetry...");
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  // Stats calculation
  const stats: GridStats = useMemo(() => {
    let gen = 0;
    let cons = 0;
    assets.forEach(a => {
      if ([AssetType.SOLAR, AssetType.WIND].includes(a.type)) gen += a.currentOutput;
      else if ([AssetType.BUILDING, AssetType.FACTORY, AssetType.EV_STATION].includes(a.type)) cons += a.currentOutput;
      else if (a.type === AssetType.BATTERY) {
        if (a.currentOutput > 0) gen += a.currentOutput; // Discharging
        else cons += Math.abs(a.currentOutput); // Charging
      }
    });
    return {
      totalGeneration: Math.round(gen * 10) / 10,
      totalConsumption: Math.round(cons * 10) / 10,
      netLoad: Math.round((cons - gen) * 10) / 10,
      storageLevel: 65, // Mock storage
      gridFrequency: 50 + (Math.random() - 0.5) * 0.1
    };
  }, [assets]);

  // Update history
  useEffect(() => {
    const timer = setInterval(() => {
      setHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          generation: stats.totalGeneration,
          consumption: stats.totalConsumption,
          net: stats.netLoad
        };
        const next = [...prev, newPoint];
        return next.slice(-20); // Keep last 20
      });

      // Fluctuate outputs slightly
      setAssets(prev => prev.map(a => ({
        ...a,
        currentOutput: Math.max(0, Math.min(a.capacity, a.currentOutput + (Math.random() - 0.5) * 2))
      })));
    }, 3000);
    return () => clearInterval(timer);
  }, [stats]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10));
  };

  const runSimulation = (type: 'heatwave' | 'storm' | 'blackout' | 'peak') => {
    addLog(`Initiating ${type} simulation...`);
    setAssets(prev => prev.map(a => {
      if (type === 'heatwave') {
        if (a.type === AssetType.SOLAR) return { ...a, currentOutput: a.capacity * 0.95 };
        if (a.type === AssetType.BUILDING) return { ...a, currentOutput: a.capacity * 0.9 };
      }
      if (type === 'storm') {
        if (a.type === AssetType.WIND) return { ...a, currentOutput: a.capacity * 0.8, status: 'warning' as const };
        if (a.type === AssetType.SOLAR) return { ...a, currentOutput: a.capacity * 0.1 };
      }
      if (type === 'blackout') {
        if (a.type !== AssetType.BATTERY) return { ...a, currentOutput: 0, status: 'offline' as const };
        return { ...a, currentOutput: a.capacity * 0.5 };
      }
      return a;
    }));
    setTimeout(() => {
        getAiStrategy(type);
    }, 500);
  };

  const getAiStrategy = async (context: string = "general") => {
    setIsLoadingAdvice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are SparkGrid AI, a Virtual Power Plant optimizer. 
      Current Grid Status:
      - Total Gen: ${stats.totalGeneration}MW
      - Total Cons: ${stats.totalConsumption}MW
      - Net Load: ${stats.netLoad}MW
      - Scenario: ${context}
      
      Give a concise (2-3 sentence) technical advice on how to optimize this VPP. Focus on demand response or storage management. Output plain text.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiAdvice(response.text || "Optimize storage to balance peaks.");
    } catch (e) {
      setAiAdvice("AI Advice unavailable. Manual override suggested.");
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            SG
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SparkGrid <span className="text-cyan-400 font-light">VPP</span></h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Distributed Energy Orchestration</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full bg-emerald-500 ${stats.gridFrequency > 50.05 || stats.gridFrequency < 49.95 ? 'bg-amber-500' : ''} status-pulse`} />
            <span className="text-xs mono">{stats.gridFrequency.toFixed(3)} Hz</span>
          </div>
          <button 
            onClick={() => getAiStrategy()}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-sm font-medium transition-all shadow-lg shadow-cyan-900/20"
          >
            Refresh AI Advice
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column - Map & Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <p className="text-xs text-slate-400 uppercase mb-1">Total Generation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400">{stats.totalGeneration}</span>
                <span className="text-sm text-slate-500">MW</span>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <p className="text-xs text-slate-400 uppercase mb-1">Total Demand</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-400">{stats.totalConsumption}</span>
                <span className="text-sm text-slate-500">MW</span>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <p className="text-xs text-slate-400 uppercase mb-1">Net Flow</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${stats.netLoad > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {stats.netLoad > 0 ? `+${stats.netLoad}` : stats.netLoad}
                </span>
                <span className="text-sm text-slate-500">MW</span>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <p className="text-xs text-slate-400 uppercase mb-1">Storage Level</p>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${stats.storageLevel}%` }} />
              </div>
              <p className="text-right text-[10px] text-slate-500 mt-1">{stats.storageLevel}% SoC</p>
            </div>
          </div>

          {/* Interactive Grid Map */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl relative overflow-hidden min-h-[400px]">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-10" style={{ 
              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} />
            
            {/* Energy Flows (SVG Overlay) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {assets.map(asset => {
                const centerX = 50, centerY = 50; // Grid center hub
                const isActive = asset.status === 'active';
                const isWarning = asset.status === 'warning';
                
                return (
                  <g key={`flow-${asset.id}`}>
                    <path 
                      d={`M ${asset.x}% ${asset.y}% L ${centerX}% ${centerY}%`} 
                      stroke={isWarning ? "#f59e0b" : "#334155"} 
                      strokeWidth="1" 
                      fill="none" 
                    />
                    {isActive && (
                      <path 
                        d={`M ${asset.x}% ${asset.y}% L ${centerX}% ${centerY}%`} 
                        stroke={asset.currentOutput > 0 ? "#10b981" : "#f59e0b"} 
                        strokeWidth="1" 
                        fill="none" 
                        className="flow-line"
                        style={{ 
                          strokeDasharray: '4,4', 
                          animationDirection: asset.currentOutput > 0 ? 'normal' : 'reverse' 
                        }}
                      />
                    )}
                  </g>
                );
              })}
              {/* Central Hub */}
              <circle cx="50%" cy="50%" r="8" fill="#0ea5e9" className="animate-pulse" />
            </svg>

            {/* Asset Markers */}
            {assets.map(asset => (
              <div 
                key={asset.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                onClick={() => addLog(`Inspecting ${asset.name}: ${asset.currentOutput} MW`)}
              >
                <div className={`p-2 rounded-lg bg-slate-800 border-2 transition-all ${
                  asset.status === 'active' ? 'border-slate-700 group-hover:border-cyan-500' : 
                  asset.status === 'warning' ? 'border-amber-500' : 'border-rose-500 grayscale'
                }`}>
                  <AssetIcon type={asset.type} className="w-5 h-5 text-slate-300" />
                </div>
                {/* Tooltip on hover */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-700 whitespace-nowrap z-10 shadow-xl pointer-events-none">
                  <p className="font-bold">{asset.name}</p>
                  <p className="text-slate-400">P: {asset.currentOutput.toFixed(1)} / {asset.capacity} MW</p>
                  <p className={`${asset.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>{asset.status.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Simulation Controls */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold text-slate-500 uppercase">Simulate Scenario:</span>
            <button onClick={() => runSimulation('heatwave')} className="px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/50 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition-colors">🔥 Heatwave</button>
            <button onClick={() => runSimulation('storm')} className="px-3 py-1.5 rounded bg-sky-500/10 border border-sky-500/50 text-sky-500 text-xs font-semibold hover:bg-sky-500/20 transition-colors">⛈️ Wind Storm</button>
            <button onClick={() => runSimulation('blackout')} className="px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/50 text-rose-500 text-xs font-semibold hover:bg-rose-500/20 transition-colors">🌑 Grid Outage</button>
            <button onClick={() => setAssets(INITIAL_ASSETS)} className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">🔄 Reset Grid</button>
          </div>
        </div>

        {/* Right Column - Data & Intelligence */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* AI Intelligence Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800/50 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider">SparkGen Intelligence</h3>
            </div>
            <div className="relative min-h-[100px] flex items-center">
              {isLoadingAdvice ? (
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed italic">
                  "{aiAdvice}"
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-800/30">
              <p className="text-[10px] text-indigo-400 font-mono">LLM: Gemini-3-Flash // Latency: 450ms</p>
            </div>
          </div>

          {/* Real-time Load Chart */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex-1 min-h-[250px] flex flex-col">
            <h3 className="text-sm font-bold mb-4 text-slate-300">Live Load Curve (MW)</h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#475569" fontSize={10} tickFormatter={(v) => `${v}MW`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Area type="monotone" dataKey="generation" stroke="#10b981" fillOpacity={1} fill="url(#colorGen)" strokeWidth={2} name="Generation" />
                  <Area type="monotone" dataKey="consumption" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCons)" strokeWidth={2} name="Demand" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl h-48 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">System Logs</h3>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-mono">
        <div className="flex gap-6">
          <span>Grid Health: <span className="text-emerald-500">OPTIMAL</span></span>
          <span>Assets Online: <span className="text-white">{assets.filter(a => a.status === 'active').length}/{assets.length}</span></span>
          <span>Encryption: AES-256</span>
        </div>
        <div>
          <span>SparkGrid OS v4.2.0-stable</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
