import { useState, useEffect } from 'react';
import { cn } from '../../lib/cn';
import { useTranslation } from 'react-i18next';

export function EvolutionAnimation({ active, newStageName, onComplete }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('idle');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }

    setPhase('glow');
    const t1 = setTimeout(() => setPhase('flash'), 800);
    const t2 = setTimeout(() => setPhase('reveal'), 1600);
    const t3 = setTimeout(() => {
      setPhase('idle');
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active]);

  if (phase === 'idle') return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center',
        'motion-reduce:hidden'
      )}
      aria-live="assertive"
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-700',
          phase === 'glow' && 'bg-white/10',
          phase === 'flash' && 'bg-white/60',
          phase === 'reveal' && 'bg-white/5'
        )}
      />

      {/* Particle rain during flash */}
      {phase === 'flash' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className="absolute text-amber-300"
              style={{
                left: `${5 + Math.random() * 90}%`,
                top: '-5%',
                fontSize: 10 + Math.random() * 8,
                animationName: 'evo-particle-fall',
                animationDuration: `${800 + Math.random() * 600}ms`,
                animationDelay: `${Math.random() * 300}ms`,
                animationTimingFunction: 'ease-in',
                animationFillMode: 'forwards',
                opacity: 0,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {/* "Evolution successful" text */}
      {phase === 'reveal' && (
        <div className="relative z-10 text-center space-y-2">
          <p
            className="text-2xl font-heading font-bold text-amber-500"
            style={{
              animationName: 'evo-text-pop',
              animationDuration: '600ms',
              animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              animationFillMode: 'both',
            }}
          >
            {t('进化成功！')}
          </p>
          {newStageName && (
            <p
              className="text-sm text-text-secondary"
              style={{
                animationName: 'evo-text-fade-in',
                animationDuration: '400ms',
                animationDelay: '200ms',
                animationFillMode: 'both',
              }}
            >
              {newStageName}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes evo-particle-fall {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(100vh); }
        }
        @keyframes evo-text-pop {
          0% { opacity: 0; transform: scale(0.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes evo-text-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="evo-"] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
