import React, { useState, useEffect, useRef } from 'react';
import {
  BABA_PRESETS,
  generateRandomBaba,
  renderBabaEntity,
  type BabaEntityConfig,
  type BabaBlobType
} from '../renderer/stylizedEntityRenderer';
import { Sparkles, Dices, Copy, Check, Eye, X, Maximize2, Play, Pause, Shield, Sword } from 'lucide-react';

interface PreviewProps {
  onClose?: () => void;
}

export const StylizedEntityPreview: React.FC<PreviewProps> = ({ onClose }) => {
  const [selectedScale, setSelectedScale] = useState<number>(128); // 64, 96, 128, 160
  const [activeConfig, setActiveConfig] = useState<BabaEntityConfig>(BABA_PRESETS[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [babaList, setBabaList] = useState<BabaEntityConfig[]>(BABA_PRESETS);
  const [isWobbling, setIsWobbling] = useState<boolean>(true);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animated wiggle loop
  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const loop = () => {
      const now = isWobbling ? performance.now() - startTime : 0;
      if (mainCanvasRef.current) {
        const ctx = mainCanvasRef.current.getContext('2d');
        if (ctx) {
          renderBabaEntity(ctx, activeConfig, 256, 256, now);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [activeConfig, isWobbling]);

  const handleGenerateRandom = () => {
    const newEnt = generateRandomBaba();
    setActiveConfig(newEnt);
    setBabaList((prev) => [newEnt, ...prev.slice(0, 15)]);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md text-zinc-100 p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-950/80 border border-amber-500/30 rounded-xl text-amber-400">
            <Sword className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-zinc-100 flex items-center gap-2">
              Frame of Reference (4 Core Entities)
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Baseline Set
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Champion Is Baba (Player), Keke (Ghost), Jiji (Slime), and Me (Bot) — our clean frame of reference.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsWobbling((prev) => !prev)}
            className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition"
          >
            {isWobbling ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isWobbling ? 'Wobble: ON' : 'Wobble: OFF'}</span>
          </button>

          <button
            onClick={handleGenerateRandom}
            className="flex items-center space-x-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-amber-600/20 active:scale-95"
          >
            <Dices className="w-4 h-4" />
            <span>Generate Random Baseline Variant</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inspector & Customizer */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3 self-start flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Active Frame of Reference Entity
            </span>

            {/* Canvas Preview Box */}
            <div className="relative w-full aspect-square max-w-[240px] bg-[#1e1414] border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `radial-gradient(circle, #f59e0b 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              />
              <canvas ref={mainCanvasRef} width={256} height={256} className="w-full h-full object-contain relative z-10" />
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-lg font-bold text-zinc-100">{activeConfig.name}</h2>
              <p className="text-xs text-zinc-400">
                Type: <span className="capitalize text-amber-300">{activeConfig.blobType.replace('_', ' ')}</span>
              </p>
            </div>
          </div>

          {/* Tweaker Form */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Entity Parameters
            </h3>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Frame of Reference Model</label>
              <select
                value={activeConfig.blobType}
                onChange={(e) => setActiveConfig({ ...activeConfig, blobType: e.target.value as BabaBlobType })}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-amber-500 capitalize font-medium"
              >
                <option value="warrior_champion">Champion Is Baba (Player Warrior)</option>
                <option value="keke_ghost">Keke (Ghost Blob)</option>
                <option value="jiji_slime">Jiji (Slime Blob)</option>
                <option value="me_bot">Me (Boxy Bot Blob)</option>
              </select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Blob Fill Color</label>
                <input
                  type="color"
                  value={activeConfig.primaryColor}
                  onChange={(e) => setActiveConfig({ ...activeConfig, primaryColor: e.target.value })}
                  className="w-full h-8 bg-zinc-950 border border-zinc-700 rounded cursor-pointer p-0.5"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Helmet / Secondary</label>
                <input
                  type="color"
                  value={activeConfig.secondaryColor}
                  onChange={(e) => setActiveConfig({ ...activeConfig, secondaryColor: e.target.value })}
                  className="w-full h-8 bg-zinc-950 border border-zinc-700 rounded cursor-pointer p-0.5"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Eye / Visor Glow</label>
                <input
                  type="color"
                  value={activeConfig.eyeColor}
                  onChange={(e) => setActiveConfig({ ...activeConfig, eyeColor: e.target.value })}
                  className="w-full h-8 bg-zinc-950 border border-zinc-700 rounded cursor-pointer p-0.5"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Plume Accent</label>
                <input
                  type="color"
                  value={activeConfig.accentColor || '#f43f5e'}
                  onChange={(e) => setActiveConfig({ ...activeConfig, accentColor: e.target.value })}
                  className="w-full h-8 bg-zinc-950 border border-zinc-700 rounded cursor-pointer p-0.5"
                />
              </div>
            </div>

            <button
              onClick={handleCopyJson}
              className="w-full flex items-center justify-center space-x-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Configuration!' : 'Copy Code Preset'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Readability Scale Tester & Preset Gallery */}
        <div className="lg:col-span-8 space-y-6">
          {/* Scale Tester Bar */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-zinc-300 font-medium">
              <Maximize2 className="w-4 h-4 text-amber-400" />
              <span>Display Scale:</span>
            </div>

            <div className="flex items-center space-x-2">
              {[64, 96, 128, 160].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedScale(size)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    selectedScale === size
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Preset Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wide text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Frame of Reference Gallery ({babaList.length})
              </h3>
              <span className="text-xs text-zinc-500">Click any entity to inspect & edit</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {babaList.map((config) => (
                <BabaCard
                  key={config.id}
                  config={config}
                  displaySize={selectedScale}
                  isSelected={activeConfig.id === config.id}
                  onClick={() => setActiveConfig(config)}
                  isWobbling={isWobbling}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for gallery cards
interface BabaCardProps {
  config: BabaEntityConfig;
  displaySize: number;
  isSelected: boolean;
  onClick: () => void;
  isWobbling: boolean;
}

const BabaCard: React.FC<BabaCardProps> = ({ config, displaySize, isSelected, onClick, isWobbling }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const loop = () => {
      const now = isWobbling ? performance.now() - startTime : 0;
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          renderBabaEntity(ctx, config, displaySize, displaySize, now);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [config, displaySize, isWobbling]);

  const isWarrior = config.blobType === 'warrior_champion';

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer bg-zinc-900/90 border rounded-xl p-3 flex flex-col items-center transition-all duration-200 hover:-translate-y-0.5 ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-950/20 shadow-lg'
          : isWarrior
          ? 'border-amber-900/40 hover:border-amber-500/60'
          : 'border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      <div
        className="flex items-center justify-center bg-[#1e1414] rounded-lg p-2 border border-zinc-800/50 overflow-hidden"
        style={{ width: `${Math.max(80, displaySize)}px`, height: `${Math.max(80, displaySize)}px` }}
      >
        <canvas ref={canvasRef} width={displaySize} height={displaySize} className="object-contain" />
      </div>

      <div className="mt-2 text-center w-full truncate">
        <div className="text-xs font-semibold text-zinc-200 truncate flex items-center justify-center gap-1">
          {isWarrior && <Shield className="w-3 h-3 text-amber-400 flex-shrink-0" />}
          <span className="truncate">{config.name}</span>
        </div>
        <div className="text-[10px] text-amber-400 capitalize truncate">
          {config.blobType.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
};
