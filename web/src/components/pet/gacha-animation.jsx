import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { PetSprite } from './pet-sprite';
import { RarityBadge } from './rarity-badge';

const RARITY_COLORS = {
  N: { glow: 'rgba(148,163,184,0.6)', particle: '#94a3b8', ring: 'rgba(148,163,184,0.3)' },
  R: { glow: 'rgba(96,165,250,0.7)', particle: '#60a5fa', ring: 'rgba(96,165,250,0.3)' },
  SR: { glow: 'rgba(168,85,247,0.8)', particle: '#a855f7', ring: 'rgba(168,85,247,0.4)' },
  SSR: { glow: 'rgba(251,191,36,0.9)', particle: '#fbbf24', ring: 'rgba(251,191,36,0.5)' },
};

function Particles({ rarity, count }) {
  const particles = useMemo(() => {
    const color = RARITY_COLORS[rarity]?.particle || '#94a3b8';
    return Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i + Math.random() * 20;
      const distance = 60 + Math.random() * 80;
      const size = 3 + Math.random() * 4;
      const delay = Math.random() * 0.3;
      return { angle, distance, size, delay, color };
    });
  }, [rarity, count]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full gacha-particle"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            '--tx': `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
            '--ty': `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SingleResult({ result, onDone }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('egg'); // egg -> shake -> burst -> reveal
  const rarity = result.rarity || 'N';
  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.N;

  useEffect(() => {
    const timers = [];
    timers.push(setTimeout(() => setPhase('shake'), 300));
    timers.push(setTimeout(() => setPhase('burst'), 1100));
    timers.push(setTimeout(() => setPhase('reveal'), 1600));
    timers.push(setTimeout(() => onDone?.(), 5000));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const particleCount = rarity === 'SSR' ? 24 : rarity === 'SR' ? 16 : rarity === 'R' ? 8 : 4;

  return (
    <div className="flex flex-col items-center justify-center gap-6 relative" onClick={onDone}>
      {/* SSR full-screen flash */}
      {rarity === 'SSR' && phase === 'burst' && (
        <div className="fixed inset-0 z-[60] gacha-ssr-flash pointer-events-none" />
      )}

      {/* Egg / burst area */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Glow ring */}
        {(phase === 'burst' || phase === 'reveal') && (
          <div
            className="absolute inset-0 rounded-full gacha-ring-expand"
            style={{
              background: `radial-gradient(circle, ${colors.ring} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Particles */}
        {(phase === 'burst' || phase === 'reveal') && (
          <Particles rarity={rarity} count={particleCount} />
        )}

        {/* Egg */}
        {(phase === 'egg' || phase === 'shake') && (
          <div
            className={cn(
              'w-20 h-24 rounded-[50%] relative gacha-egg-appear',
              phase === 'shake' && 'gacha-egg-shake'
            )}
            style={{
              background: `radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.4) 0%, ${colors.glow} 50%, rgba(0,0,0,0.2) 100%)`,
              boxShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.ring}`,
            }}
          >
            <div
              className="absolute inset-[15%] rounded-[50%] opacity-40"
              style={{
                background: `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
              }}
            />
          </div>
        )}

        {/* Burst flash */}
        {phase === 'burst' && (
          <div
            className="absolute w-32 h-32 rounded-full gacha-burst"
            style={{
              background: `radial-gradient(circle, white 0%, ${colors.glow} 40%, transparent 70%)`,
            }}
          />
        )}

        {/* Revealed pet */}
        {phase === 'reveal' && (
          <div className="gacha-reveal relative z-10">
            <PetSprite visualKey={result.visual_key} stage={0} size="lg" />
          </div>
        )}
      </div>

      {/* Info below pet */}
      {phase === 'reveal' && (
        <div className="flex flex-col items-center gap-2 gacha-reveal">
          <span className="text-lg font-heading text-white drop-shadow-lg">
            {result.species_name}
          </span>
          <RarityBadge rarity={rarity} className="text-sm px-2.5 py-1" />
          {result.is_pity && (
            <span className="text-xs font-bold text-amber-300 gacha-pity-bounce">
              {t('保底!')}
            </span>
          )}
          <span className="text-xs text-white/50 mt-4">{t('点击任意处继续')}</span>
        </div>
      )}
    </div>
  );
}

function MultiResult({ results, onDone }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('eggs'); // eggs -> burst -> grid

  useEffect(() => {
    const timers = [];
    timers.push(setTimeout(() => setPhase('burst'), 800));
    timers.push(setTimeout(() => setPhase('grid'), 2000));
    timers.push(setTimeout(() => onDone?.(), 10000));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  if (phase === 'eggs' || phase === 'burst') {
    return (
      <div className="flex flex-col items-center justify-center gap-4" onClick={phase === 'burst' ? () => setPhase('grid') : undefined}>
        <div className="grid grid-cols-5 gap-3">
          {results.map((r, i) => {
            const colors = RARITY_COLORS[r.rarity] || RARITY_COLORS.N;
            return (
              <div key={i} className="relative w-14 h-14 flex items-center justify-center">
                {phase === 'eggs' && (
                  <div
                    className="w-10 h-12 rounded-[50%] gacha-egg-appear"
                    style={{
                      background: `radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.3) 0%, ${colors.glow} 50%, rgba(0,0,0,0.2) 100%)`,
                      boxShadow: `0 0 20px ${colors.ring}`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                )}
                {phase === 'burst' && (
                  <div
                    className="absolute w-12 h-12 rounded-full gacha-burst"
                    style={{
                      background: `radial-gradient(circle, white 0%, ${colors.glow} 40%, transparent 70%)`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid phase
  return (
    <div className="flex flex-col items-center gap-4 max-w-lg w-full" onClick={onDone}>
      <div className="grid grid-cols-5 gap-3 w-full">
        {results.map((r, i) => {
          const isHighRarity = r.rarity === 'SSR' || r.rarity === 'SR';
          return (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl p-2 gacha-grid-item',
                r.rarity === 'SSR' && 'gacha-ssr-border',
                r.rarity === 'SR' && 'bg-purple-500/10 ring-1 ring-purple-500/30'
              )}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <PetSprite visualKey={r.visual_key} stage={0} size="sm" />
              <span className="text-[10px] text-white/80 text-center leading-tight truncate w-full">
                {r.species_name}
              </span>
              <RarityBadge rarity={r.rarity} />
              {r.is_pity && (
                <span className="text-[8px] font-bold text-amber-300">{t('保底')}</span>
              )}
            </div>
          );
        })}
      </div>
      <span className="text-xs text-white/50 mt-2">{t('点击任意处继续')}</span>
    </div>
  );
}

export function GachaAnimation({ results, mode = 'single', onComplete }) {
  const [visible, setVisible] = useState(true);
  const prefersReduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  );

  const handleDone = useCallback(() => {
    setVisible(false);
    setTimeout(() => onComplete?.(), 200);
  }, [onComplete]);

  if (!results || results.length === 0) return null;

  // Reduced motion: skip animation, show results directly
  if (prefersReduced) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
        onClick={handleDone}
      >
        <div className="flex flex-col items-center gap-4 max-w-lg w-full px-4">
          <div className={cn('grid gap-3 w-full', results.length > 1 ? 'grid-cols-5' : 'grid-cols-1')}>
            {results.map((r, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl p-3">
                <PetSprite visualKey={r.visual_key} stage={0} size={results.length > 1 ? 'sm' : 'lg'} />
                <span className="text-sm text-white">{r.species_name}</span>
                <RarityBadge rarity={r.rarity} />
                {r.is_pity && (
                  <span className="text-xs font-bold text-amber-300">保底!</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center cursor-pointer',
        'gacha-overlay-enter'
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 px-4 w-full flex items-center justify-center">
        {mode === 'single' || results.length === 1 ? (
          <SingleResult result={results[0]} onDone={handleDone} />
        ) : (
          <MultiResult results={results} onDone={handleDone} />
        )}
      </div>

      <style>{`
        @keyframes gacha-overlay-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .gacha-overlay-enter {
          animation: gacha-overlay-fadein 0.3s ease-out forwards;
        }

        @keyframes gacha-egg-scale {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .gacha-egg-appear {
          animation: gacha-egg-scale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes gacha-shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          15% { transform: translateX(-4px) rotate(-3deg); }
          30% { transform: translateX(4px) rotate(3deg); }
          45% { transform: translateX(-5px) rotate(-4deg); }
          60% { transform: translateX(5px) rotate(4deg); }
          75% { transform: translateX(-3px) rotate(-2deg); }
          90% { transform: translateX(3px) rotate(2deg); }
        }
        .gacha-egg-shake {
          animation: gacha-shake 0.8s ease-in-out;
        }

        @keyframes gacha-burst-expand {
          from { transform: scale(0.5); opacity: 1; }
          to { transform: scale(3); opacity: 0; }
        }
        .gacha-burst {
          animation: gacha-burst-expand 0.5s ease-out forwards;
        }

        @keyframes gacha-ring-grow {
          from { transform: scale(0.3); opacity: 0.8; }
          to { transform: scale(2); opacity: 0; }
        }
        .gacha-ring-expand {
          animation: gacha-ring-grow 1s ease-out forwards;
        }

        @keyframes gacha-reveal-up {
          from { transform: translateY(20px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .gacha-reveal {
          animation: gacha-reveal-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes gacha-particle-fly {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
        .gacha-particle {
          animation: gacha-particle-fly 0.8s ease-out forwards;
        }

        @keyframes gacha-ssr-flash-kf {
          0% { background: rgba(251,191,36,0.6); }
          50% { background: rgba(255,255,255,0.4); }
          100% { background: transparent; }
        }
        .gacha-ssr-flash {
          animation: gacha-ssr-flash-kf 0.6s ease-out forwards;
        }

        @keyframes gacha-grid-pop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .gacha-grid-item {
          animation: gacha-grid-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }

        @keyframes gacha-ssr-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.4), inset 0 0 8px rgba(251,191,36,0.1); }
          50% { box-shadow: 0 0 16px rgba(251,191,36,0.7), inset 0 0 12px rgba(251,191,36,0.2); }
        }
        .gacha-ssr-border {
          background: rgba(251,191,36,0.08);
          ring: 1px solid rgba(251,191,36,0.4);
          outline: 1px solid rgba(251,191,36,0.4);
          animation: gacha-ssr-glow 2s ease-in-out infinite;
        }

        @keyframes gacha-pity-bounce-kf {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .gacha-pity-bounce {
          animation: gacha-pity-bounce-kf 0.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .gacha-overlay-enter,
          .gacha-egg-appear,
          .gacha-egg-shake,
          .gacha-burst,
          .gacha-ring-expand,
          .gacha-reveal,
          .gacha-particle,
          .gacha-ssr-flash,
          .gacha-grid-item,
          .gacha-ssr-border,
          .gacha-pity-bounce {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
