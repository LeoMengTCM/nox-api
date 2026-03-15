import { useState, useEffect } from 'react';
import { cn } from '../../lib/cn';

const EFFECT_DURATION = 1500;

const EFFECTS = {
  feed: {
    particles: ['❤️', '❤️', '❤️', '💕', '❤️'],
    keyframes: 'pet-float-up-feed',
  },
  play: {
    particles: ['✨', '♪', '⭐', '♫', '✨'],
    keyframes: 'pet-float-up-play',
  },
  clean: {
    particles: ['💧', '○', '💧', '○', '💧'],
    keyframes: 'pet-float-up-clean',
  },
};

export function InteractionEffects({ effect, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!effect) return;
    const config = EFFECTS[effect];
    if (!config) return;

    const newParticles = config.particles.map((char, i) => ({
      id: `${Date.now()}-${i}`,
      char,
      left: 20 + Math.random() * 60,
      delay: i * 120,
      animName: config.keyframes,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, EFFECT_DURATION + 600);

    return () => clearTimeout(timer);
  }, [effect]);

  if (!particles.length) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        'motion-reduce:hidden'
      )}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-lg"
          style={{
            left: `${p.left}%`,
            bottom: '20%',
            animationName: p.animName,
            animationDuration: `${EFFECT_DURATION}ms`,
            animationDelay: `${p.delay}ms`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            opacity: 0,
          }}
        >
          {p.char}
        </span>
      ))}
      <style>{`
        @keyframes pet-float-up-feed {
          0% { opacity: 0; transform: translateY(20px) scale(0.5); }
          20% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
        }
        @keyframes pet-float-up-play {
          0% { opacity: 0; transform: translateY(10px) scale(0.5) rotate(-15deg); }
          25% { opacity: 1; transform: translateY(-20px) scale(1.1) rotate(5deg); }
          100% { opacity: 0; transform: translateY(-90px) scale(0.7) rotate(15deg); }
        }
        @keyframes pet-float-up-clean {
          0% { opacity: 0; transform: translateY(0) scale(0.4); }
          30% { opacity: 1; transform: translateY(-15px) scale(1); }
          100% { opacity: 0; transform: translateY(-70px) scale(0.6); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pet-float-up"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
