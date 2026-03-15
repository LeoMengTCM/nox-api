import * as React from 'react';
import { cn } from '../../../lib/cn';
import { CREATURE_DATA, SSR_CREATURES } from './creature-data';

const SIZES = { sm: 48, md: 96, lg: 192 };

// ─── Egg pattern generators ──────────────────────────────────────────────────

function eggPatternSpots(id, patternColor) {
  return (
    <g>
      <circle cx="48" cy="42" r="4" fill={patternColor} opacity="0.7" />
      <circle cx="72" cy="50" r="3.5" fill={patternColor} opacity="0.6" />
      <circle cx="55" cy="65" r="3" fill={patternColor} opacity="0.65" />
      <circle cx="68" cy="72" r="4.5" fill={patternColor} opacity="0.55" />
      <circle cx="52" cy="80" r="3" fill={patternColor} opacity="0.5" />
      <circle cx="63" cy="38" r="2.5" fill={patternColor} opacity="0.6" />
    </g>
  );
}

function eggPatternStripes(id, patternColor) {
  return (
    <g opacity="0.5">
      <path d="M42 45 Q60 42 78 45" stroke={patternColor} strokeWidth="2.5" fill="none" />
      <path d="M40 55 Q60 52 80 55" stroke={patternColor} strokeWidth="3" fill="none" />
      <path d="M41 65 Q60 62 79 65" stroke={patternColor} strokeWidth="2.5" fill="none" />
      <path d="M43 75 Q60 72 77 75" stroke={patternColor} strokeWidth="2" fill="none" />
    </g>
  );
}

function eggPatternSwirl(id, patternColor) {
  return (
    <g opacity="0.45">
      <path
        d="M60 40 Q70 45 65 55 Q58 65 65 72 Q72 80 60 85"
        stroke={patternColor}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M52 44 Q46 55 50 62 Q55 70 48 78"
        stroke={patternColor}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function eggPatternCracks(id, patternColor) {
  return (
    <g opacity="0.6">
      <path d="M55 38 L52 48 L58 52 L54 60" stroke={patternColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M68 42 L72 50 L66 56" stroke={patternColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M50 68 L56 72 L52 80" stroke={patternColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M70 65 L66 72 L70 78" stroke={patternColor} strokeWidth="1" fill="none" strokeLinecap="round" />
    </g>
  );
}

function eggPatternRunes(id, patternColor) {
  return (
    <g opacity="0.5" stroke={patternColor} strokeWidth="1.5" fill="none">
      {/* Rune 1: diamond */}
      <path d="M52 42 L56 38 L60 42 L56 46 Z" />
      {/* Rune 2: arrow */}
      <path d="M66 50 L70 46 L74 50 M70 46 L70 56" />
      {/* Rune 3: cross */}
      <path d="M48 60 L56 60 M52 56 L52 64" />
      {/* Rune 4: zigzag */}
      <path d="M64 65 L68 61 L72 65 L76 61" />
      {/* Rune 5: circle */}
      <circle cx="55" cy="76" r="3" />
    </g>
  );
}

function eggPatternScales(id, patternColor) {
  return (
    <g opacity="0.4">
      {[44, 54, 64, 74].map((y) =>
        [48, 56, 64, 72].map((x) => (
          <path
            key={`${x}-${y}`}
            d={`M${x - 4} ${y} Q${x} ${y - 4} ${x + 4} ${y}`}
            stroke={patternColor}
            strokeWidth="1.2"
            fill="none"
          />
        ))
      )}
    </g>
  );
}

const EGG_PATTERNS = {
  spots: eggPatternSpots,
  stripes: eggPatternStripes,
  swirl: eggPatternSwirl,
  cracks: eggPatternCracks,
  runes: eggPatternRunes,
  scales: eggPatternScales,
};

// ─── Body shape renderers ────────────────────────────────────────────────────
// Each returns { body, eyePositions } where eyePositions is [[lx,ly],[rx,ry]]

function bodyRound(colors, isAdult) {
  const r = isAdult ? 26 : 20;
  const cy = isAdult ? 54 : 56;
  return {
    body: (
      <g>
        <circle cx="60" cy={cy} r={r} fill={colors.primary} />
        <circle cx="60" cy={cy - r * 0.15} r={r * 0.85} fill={colors.secondary} opacity="0.3" />
      </g>
    ),
    eyePositions: [
      [60 - r * 0.35, cy - r * 0.2],
      [60 + r * 0.35, cy - r * 0.2],
    ],
    headCenter: [60, cy - r * 0.2],
    bodyBottom: cy + r,
  };
}

function bodyOval(colors, isAdult) {
  const rx = isAdult ? 20 : 16;
  const ry = isAdult ? 30 : 24;
  const cy = isAdult ? 56 : 58;
  return {
    body: (
      <g>
        <ellipse cx="60" cy={cy} rx={rx} ry={ry} fill={colors.primary} />
        <ellipse cx="60" cy={cy - ry * 0.15} rx={rx * 0.8} ry={ry * 0.7} fill={colors.secondary} opacity="0.25" />
      </g>
    ),
    eyePositions: [
      [60 - rx * 0.4, cy - ry * 0.35],
      [60 + rx * 0.4, cy - ry * 0.35],
    ],
    headCenter: [60, cy - ry * 0.35],
    bodyBottom: cy + ry,
  };
}

function bodySerpent(colors, isAdult) {
  const t = isAdult ? 1 : 0.75;
  const sw = isAdult ? 12 : 9;
  return {
    body: (
      <g>
        {/* S-curve serpent body */}
        <path
          d={`M${60 - 15 * t} ${35 * t + 20} Q${60 + 20 * t} ${45 * t + 20} ${60} ${55 * t + 20} Q${60 - 20 * t} ${65 * t + 20} ${60 + 10 * t} ${80 * t + 15}`}
          stroke={colors.primary}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
        />
        {/* Lighter belly stripe */}
        <path
          d={`M${60 - 15 * t} ${35 * t + 20} Q${60 + 20 * t} ${45 * t + 20} ${60} ${55 * t + 20} Q${60 - 20 * t} ${65 * t + 20} ${60 + 10 * t} ${80 * t + 15}`}
          stroke={colors.secondary}
          strokeWidth={sw * 0.4}
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        />
        {/* Head */}
        <ellipse cx={60 - 15 * t} cy={35 * t + 20} rx={sw * 0.7} ry={sw * 0.55} fill={colors.primary} />
      </g>
    ),
    eyePositions: [
      [60 - 15 * t - 3, 35 * t + 18],
      [60 - 15 * t + 3, 35 * t + 18],
    ],
    headCenter: [60 - 15 * t, 35 * t + 18],
    bodyBottom: 80 * t + 20,
  };
}

function bodyBird(colors, isAdult) {
  const s = isAdult ? 1 : 0.75;
  const cy = isAdult ? 55 : 60;
  const r = 22 * s;
  return {
    body: (
      <g>
        {/* Round body */}
        <ellipse cx="60" cy={cy} rx={r} ry={r * 0.85} fill={colors.primary} />
        {/* Chest highlight */}
        <ellipse cx="60" cy={cy + 2} rx={r * 0.6} ry={r * 0.5} fill={colors.secondary} opacity="0.35" />
        {/* Triangular tail */}
        <polygon
          points={`${60 + r * 0.7},${cy} ${60 + r * 1.4},${cy - 6 * s} ${60 + r * 1.4},${cy + 6 * s}`}
          fill={colors.primary}
        />
        {/* Beak */}
        <polygon
          points={`${60 - r},${cy - 3} ${60 - r - 8 * s},${cy} ${60 - r},${cy + 3}`}
          fill={colors.accent}
        />
        {/* Legs */}
        <line x1={60 - 6 * s} y1={cy + r * 0.8} x2={60 - 8 * s} y2={cy + r * 0.8 + 10 * s} stroke={colors.accent} strokeWidth="2" />
        <line x1={60 + 6 * s} y1={cy + r * 0.8} x2={60 + 4 * s} y2={cy + r * 0.8 + 10 * s} stroke={colors.accent} strokeWidth="2" />
      </g>
    ),
    eyePositions: [
      [60 - r * 0.5, cy - r * 0.25],
      [60 - r * 0.15, cy - r * 0.25],
    ],
    headCenter: [60 - r * 0.3, cy - r * 0.25],
    bodyBottom: cy + r * 0.8 + 10 * s,
  };
}

function bodyHorse(colors, isAdult) {
  const s = isAdult ? 1 : 0.75;
  const cy = isAdult ? 58 : 62;
  return {
    body: (
      <g>
        {/* Torso */}
        <ellipse cx="60" cy={cy} rx={22 * s} ry={14 * s} fill={colors.primary} />
        {/* Neck */}
        <ellipse cx={60 - 16 * s} cy={cy - 16 * s} rx={8 * s} ry={12 * s} fill={colors.primary} transform={`rotate(-15, ${60 - 16 * s}, ${cy - 16 * s})`} />
        {/* Head */}
        <ellipse cx={60 - 22 * s} cy={cy - 26 * s} rx={9 * s} ry={7 * s} fill={colors.primary} />
        {/* Lighter area */}
        <ellipse cx="60" cy={cy + 1} rx={18 * s} ry={10 * s} fill={colors.secondary} opacity="0.25" />
        {/* Front legs */}
        <rect x={60 - 14 * s} y={cy + 12 * s} width={3 * s} height={18 * s} rx="1.5" fill={colors.primary} />
        <rect x={60 - 8 * s} y={cy + 12 * s} width={3 * s} height={18 * s} rx="1.5" fill={colors.primary} />
        {/* Back legs */}
        <rect x={60 + 8 * s} y={cy + 12 * s} width={3 * s} height={18 * s} rx="1.5" fill={colors.primary} />
        <rect x={60 + 14 * s} y={cy + 12 * s} width={3 * s} height={18 * s} rx="1.5" fill={colors.primary} />
        {/* Hooves */}
        {[-14, -8, 8, 14].map((xo) => (
          <rect key={xo} x={60 + xo * s - 0.5} y={cy + 30 * s - 2} width={4 * s} height={3 * s} rx="1" fill={colors.accent} />
        ))}
      </g>
    ),
    eyePositions: [
      [60 - 25 * s, cy - 27 * s],
      [60 - 19 * s, cy - 27 * s],
    ],
    headCenter: [60 - 22 * s, cy - 27 * s],
    bodyBottom: cy + 30 * s,
  };
}

function bodyFeline(colors, isAdult) {
  const s = isAdult ? 1 : 0.75;
  const cy = isAdult ? 58 : 62;
  return {
    body: (
      <g>
        {/* Body */}
        <ellipse cx="60" cy={cy} rx={20 * s} ry={14 * s} fill={colors.primary} />
        {/* Head */}
        <circle cx={60 - 14 * s} cy={cy - 16 * s} r={12 * s} fill={colors.primary} />
        {/* Lighter belly */}
        <ellipse cx="60" cy={cy + 2} rx={14 * s} ry={9 * s} fill={colors.secondary} opacity="0.3" />
        {/* Ears */}
        <polygon
          points={`${60 - 22 * s},${cy - 24 * s} ${60 - 18 * s},${cy - 34 * s} ${60 - 14 * s},${cy - 24 * s}`}
          fill={colors.primary}
        />
        <polygon
          points={`${60 - 14 * s},${cy - 24 * s} ${60 - 10 * s},${cy - 34 * s} ${60 - 6 * s},${cy - 24 * s}`}
          fill={colors.primary}
        />
        {/* Inner ears */}
        <polygon
          points={`${60 - 21 * s},${cy - 24 * s} ${60 - 18 * s},${cy - 31 * s} ${60 - 15 * s},${cy - 24 * s}`}
          fill={colors.accent}
          opacity="0.5"
        />
        <polygon
          points={`${60 - 13 * s},${cy - 24 * s} ${60 - 10 * s},${cy - 31 * s} ${60 - 7 * s},${cy - 24 * s}`}
          fill={colors.accent}
          opacity="0.5"
        />
        {/* Tail */}
        <path
          d={`M${60 + 18 * s} ${cy} Q${60 + 30 * s} ${cy - 10 * s} ${60 + 28 * s} ${cy - 24 * s}`}
          stroke={colors.primary}
          strokeWidth={3 * s}
          fill="none"
          strokeLinecap="round"
        />
        {/* Legs */}
        <rect x={60 - 12 * s} y={cy + 12 * s} width={3 * s} height={12 * s} rx="1.5" fill={colors.primary} />
        <rect x={60 - 5 * s} y={cy + 12 * s} width={3 * s} height={12 * s} rx="1.5" fill={colors.primary} />
        <rect x={60 + 5 * s} y={cy + 12 * s} width={3 * s} height={12 * s} rx="1.5" fill={colors.primary} />
        <rect x={60 + 12 * s} y={cy + 12 * s} width={3 * s} height={12 * s} rx="1.5" fill={colors.primary} />
      </g>
    ),
    eyePositions: [
      [60 - 18 * s, cy - 17 * s],
      [60 - 10 * s, cy - 17 * s],
    ],
    headCenter: [60 - 14 * s, cy - 16 * s],
    bodyBottom: cy + 24 * s,
  };
}

function bodyHumanoid(colors, isAdult) {
  const s = isAdult ? 1 : 0.75;
  const cy = isAdult ? 50 : 55;
  return {
    body: (
      <g>
        {/* Head */}
        <circle cx="60" cy={cy - 14 * s} r={10 * s} fill={colors.primary} />
        {/* Torso */}
        <ellipse cx="60" cy={cy + 6 * s} rx={12 * s} ry={16 * s} fill={colors.primary} />
        <ellipse cx="60" cy={cy + 6 * s} rx={9 * s} ry={12 * s} fill={colors.secondary} opacity="0.25" />
        {/* Arms */}
        <rect x={60 - 18 * s} y={cy - 2 * s} width={4 * s} height={16 * s} rx="2" fill={colors.primary} transform={`rotate(10, ${60 - 18 * s}, ${cy - 2 * s})`} />
        <rect x={60 + 14 * s} y={cy - 2 * s} width={4 * s} height={16 * s} rx="2" fill={colors.primary} transform={`rotate(-10, ${60 + 14 * s}, ${cy - 2 * s})`} />
        {/* Legs */}
        <rect x={60 - 7 * s} y={cy + 20 * s} width={5 * s} height={18 * s} rx="2" fill={colors.primary} />
        <rect x={60 + 2 * s} y={cy + 20 * s} width={5 * s} height={18 * s} rx="2" fill={colors.primary} />
      </g>
    ),
    eyePositions: [
      [60 - 4 * s, cy - 15 * s],
      [60 + 4 * s, cy - 15 * s],
    ],
    headCenter: [60, cy - 14 * s],
    bodyBottom: cy + 38 * s,
  };
}

function bodyInsect(colors, isAdult) {
  const s = isAdult ? 1 : 0.75;
  const cy = isAdult ? 56 : 60;
  return {
    body: (
      <g>
        {/* Abdomen */}
        <ellipse cx={60 + 10 * s} cy={cy + 4 * s} rx={14 * s} ry={10 * s} fill={colors.primary} />
        {/* Thorax */}
        <circle cx={60 - 6 * s} cy={cy} r={10 * s} fill={colors.primary} />
        {/* Head */}
        <circle cx={60 - 18 * s} cy={cy - 6 * s} r={7 * s} fill={colors.secondary} />
        {/* Legs */}
        {[-4, 2, 8].map((yo) => (
          <React.Fragment key={yo}>
            <line
              x1={60 - 6 * s}
              y1={cy + yo * s}
              x2={60 - 18 * s}
              y2={cy + (yo + 10) * s}
              stroke={colors.primary}
              strokeWidth={1.5 * s}
            />
            <line
              x1={60 - 6 * s}
              y1={cy + yo * s}
              x2={60 + 6 * s}
              y2={cy + (yo + 10) * s}
              stroke={colors.primary}
              strokeWidth={1.5 * s}
            />
          </React.Fragment>
        ))}
      </g>
    ),
    eyePositions: [
      [60 - 20 * s, cy - 7 * s],
      [60 - 16 * s, cy - 7 * s],
    ],
    headCenter: [60 - 18 * s, cy - 6 * s],
    bodyBottom: cy + 14 * s,
  };
}

const BODY_RENDERERS = {
  round: bodyRound,
  oval: bodyOval,
  serpent: bodySerpent,
  bird: bodyBird,
  horse: bodyHorse,
  feline: bodyFeline,
  humanoid: bodyHumanoid,
  insect: bodyInsect,
};

// ─── Feature renderers ───────────────────────────────────────────────────────
// Each receives (colors, headCenter, bodyBottom, isAdult) and returns SVG elements

function featureWings(colors, hc, bb, isAdult) {
  const s = isAdult ? 1 : 0.7;
  return (
    <g opacity="0.8">
      <ellipse cx={hc[0] - 22 * s} cy={hc[1] + 10 * s} rx={10 * s} ry={16 * s} fill={colors.accent} transform={`rotate(20, ${hc[0] - 22 * s}, ${hc[1] + 10 * s})`} />
      <ellipse cx={hc[0] + 22 * s} cy={hc[1] + 10 * s} rx={10 * s} ry={16 * s} fill={colors.accent} transform={`rotate(-20, ${hc[0] + 22 * s}, ${hc[1] + 10 * s})`} />
    </g>
  );
}

function featureLargeWings(colors, hc, bb, isAdult) {
  const s = isAdult ? 1 : 0.7;
  return (
    <g opacity="0.85">
      <path
        d={`M${hc[0] - 8} ${hc[1] + 8} L${hc[0] - 35 * s} ${hc[1] - 15 * s} L${hc[0] - 30 * s} ${hc[1] + 20 * s} Z`}
        fill={colors.accent || colors.secondary}
      />
      <path
        d={`M${hc[0] + 8} ${hc[1] + 8} L${hc[0] + 35 * s} ${hc[1] - 15 * s} L${hc[0] + 30 * s} ${hc[1] + 20 * s} Z`}
        fill={colors.accent || colors.secondary}
      />
    </g>
  );
}

function featureBatWings(colors, hc, bb, isAdult) {
  const s = isAdult ? 1 : 0.7;
  return (
    <g opacity="0.8">
      <path
        d={`M${hc[0] - 6} ${hc[1] + 5} L${hc[0] - 30 * s} ${hc[1] - 10 * s} L${hc[0] - 25 * s} ${hc[1] + 5} L${hc[0] - 32 * s} ${hc[1] + 15 * s} L${hc[0] - 10} ${hc[1] + 18 * s} Z`}
        fill={colors.secondary}
      />
      <path
        d={`M${hc[0] + 6} ${hc[1] + 5} L${hc[0] + 30 * s} ${hc[1] - 10 * s} L${hc[0] + 25 * s} ${hc[1] + 5} L${hc[0] + 32 * s} ${hc[1] + 15 * s} L${hc[0] + 10} ${hc[1] + 18 * s} Z`}
        fill={colors.secondary}
      />
    </g>
  );
}

function featureButterflyWings(colors, hc, bb, isAdult) {
  const s = isAdult ? 1 : 0.7;
  return (
    <g opacity="0.75">
      {/* Upper wings */}
      <ellipse cx={hc[0] - 20 * s} cy={hc[1] - 4 * s} rx={14 * s} ry={10 * s} fill={colors.accent} transform={`rotate(-20, ${hc[0] - 20 * s}, ${hc[1] - 4 * s})`} />
      <ellipse cx={hc[0] + 20 * s} cy={hc[1] - 4 * s} rx={14 * s} ry={10 * s} fill={colors.accent} transform={`rotate(20, ${hc[0] + 20 * s}, ${hc[1] - 4 * s})`} />
      {/* Lower wings */}
      <ellipse cx={hc[0] - 16 * s} cy={hc[1] + 12 * s} rx={8 * s} ry={6 * s} fill={colors.secondary} transform={`rotate(-10, ${hc[0] - 16 * s}, ${hc[1] + 12 * s})`} />
      <ellipse cx={hc[0] + 16 * s} cy={hc[1] + 12 * s} rx={8 * s} ry={6 * s} fill={colors.secondary} transform={`rotate(10, ${hc[0] + 16 * s}, ${hc[1] + 12 * s})`} />
    </g>
  );
}

function featureFlameWings(colors, hc, bb, isAdult) {
  const s = isAdult ? 1 : 0.7;
  return (
    <g opacity="0.9">
      <path
        d={`M${hc[0] - 6} ${hc[1] + 4} Q${hc[0] - 28 * s} ${hc[1] - 20 * s} ${hc[0] - 34 * s} ${hc[1] - 8 * s} Q${hc[0] - 38 * s} ${hc[1] + 5 * s} ${hc[0] - 28 * s} ${hc[1] + 18 * s} Z`}
        fill={colors.secondary}
      />
      <path
        d={`M${hc[0] + 6} ${hc[1] + 4} Q${hc[0] + 28 * s} ${hc[1] - 20 * s} ${hc[0] + 34 * s} ${hc[1] - 8 * s} Q${hc[0] + 38 * s} ${hc[1] + 5 * s} ${hc[0] + 28 * s} ${hc[1] + 18 * s} Z`}
        fill={colors.secondary}
      />
      <path
        d={`M${hc[0] - 6} ${hc[1] + 4} Q${hc[0] - 22 * s} ${hc[1] - 14 * s} ${hc[0] - 26 * s} ${hc[1] - 4 * s} Q${hc[0] - 28 * s} ${hc[1] + 6 * s} ${hc[0] - 18 * s} ${hc[1] + 14 * s} Z`}
        fill={colors.accent}
        opacity="0.6"
      />
      <path
        d={`M${hc[0] + 6} ${hc[1] + 4} Q${hc[0] + 22 * s} ${hc[1] - 14 * s} ${hc[0] + 26 * s} ${hc[1] - 4 * s} Q${hc[0] + 28 * s} ${hc[1] + 6 * s} ${hc[0] + 18 * s} ${hc[1] + 14 * s} Z`}
        fill={colors.accent}
        opacity="0.6"
      />
    </g>
  );
}

function featureSmallWings(colors, hc, bb, isAdult) {
  const s = isAdult ? 0.7 : 0.5;
  return featureWings(colors, hc, bb, false);
}

function featureHorns(colors, hc) {
  return (
    <g>
      <polygon points={`${hc[0] - 8},${hc[1] - 6} ${hc[0] - 5},${hc[1] - 18} ${hc[0] - 2},${hc[1] - 6}`} fill={colors.accent} />
      <polygon points={`${hc[0] + 2},${hc[1] - 6} ${hc[0] + 5},${hc[1] - 18} ${hc[0] + 8},${hc[1] - 6}`} fill={colors.accent} />
    </g>
  );
}

function featureHorn(colors, hc) {
  return (
    <polygon
      points={`${hc[0] - 2},${hc[1] - 8} ${hc[0]},${hc[1] - 22} ${hc[0] + 2},${hc[1] - 8}`}
      fill={colors.accent}
    />
  );
}

function featureAntlers(colors, hc) {
  return (
    <g stroke={colors.accent} strokeWidth="2" fill="none" strokeLinecap="round">
      <path d={`M${hc[0] - 5} ${hc[1] - 8} L${hc[0] - 10} ${hc[1] - 20} M${hc[0] - 8} ${hc[1] - 15} L${hc[0] - 14} ${hc[1] - 18}`} />
      <path d={`M${hc[0] + 5} ${hc[1] - 8} L${hc[0] + 10} ${hc[1] - 20} M${hc[0] + 8} ${hc[1] - 15} L${hc[0] + 14} ${hc[1] - 18}`} />
    </g>
  );
}

function featureTail(colors, hc, bb) {
  return (
    <path
      d={`M${hc[0] + 15} ${bb - 8} Q${hc[0] + 28} ${bb - 16} ${hc[0] + 22} ${bb - 26}`}
      stroke={colors.primary}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function featureLongTail(colors, hc, bb) {
  return (
    <path
      d={`M${hc[0] + 15} ${bb - 8} Q${hc[0] + 35} ${bb - 20} ${hc[0] + 30} ${bb - 36} Q${hc[0] + 28} ${bb - 42} ${hc[0] + 32} ${bb - 48}`}
      stroke={colors.primary}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function featureFireTail(colors, hc, bb) {
  return (
    <g>
      <path
        d={`M${hc[0] + 16} ${bb - 6} Q${hc[0] + 28} ${bb - 14} ${hc[0] + 24} ${bb - 24}`}
        stroke={colors.accent}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={hc[0] + 24} cy={bb - 26} r="4" fill={colors.accent} opacity="0.8" />
      <circle cx={hc[0] + 24} cy={bb - 26} r="2.5" fill="#FFD700" opacity="0.9" />
    </g>
  );
}

function featureTailSpikes(colors, hc, bb) {
  return (
    <g>
      <path d={`M${hc[0] + 18} ${bb - 6} Q${hc[0] + 32} ${bb - 14} ${hc[0] + 28} ${bb - 24}`} stroke={colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" />
      {[0, 8, 16].map((off) => (
        <polygon
          key={off}
          points={`${hc[0] + 22 + off * 0.3} ${bb - 10 - off} ${hc[0] + 25 + off * 0.3} ${bb - 16 - off} ${hc[0] + 28 + off * 0.3} ${bb - 10 - off}`}
          fill={colors.accent}
        />
      ))}
    </g>
  );
}

function featureLongTailFeathers(colors, hc, bb) {
  return (
    <g>
      <path d={`M${hc[0] + 18} ${bb - 12} Q${hc[0] + 38} ${bb - 6} ${hc[0] + 42} ${bb - 20}`} stroke={colors.accent || colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d={`M${hc[0] + 18} ${bb - 10} Q${hc[0] + 36} ${bb - 2} ${hc[0] + 40} ${bb - 14}`} stroke={colors.secondary} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={`M${hc[0] + 18} ${bb - 14} Q${hc[0] + 34} ${bb - 10} ${hc[0] + 38} ${bb - 26}`} stroke={colors.primary} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function featureBeak(colors, hc) {
  return (
    <polygon
      points={`${hc[0] - 4},${hc[1] + 1} ${hc[0] - 12},${hc[1] + 4} ${hc[0] - 4},${hc[1] + 6}`}
      fill={colors.accent}
    />
  );
}

function featureLongBeak(colors, hc) {
  return (
    <polygon
      points={`${hc[0] - 4},${hc[1]} ${hc[0] - 18},${hc[1] + 5} ${hc[0] - 4},${hc[1] + 6}`}
      fill={colors.accent}
    />
  );
}

function featureDuckBill(colors, hc) {
  return (
    <ellipse cx={hc[0]} cy={hc[1] + 6} rx="8" ry="3.5" fill={colors.accent} />
  );
}

function featureShell(colors, hc, bb) {
  return (
    <path
      d={`M${hc[0] - 16} ${bb - 14} Q${hc[0]} ${bb - 36} ${hc[0] + 16} ${bb - 14}`}
      fill={colors.accent}
      opacity="0.5"
    />
  );
}

function featureMane(colors, hc) {
  return (
    <g opacity="0.7">
      {[-10, -6, -2, 2, 6, 10].map((xo) => (
        <ellipse
          key={xo}
          cx={hc[0] + xo}
          cy={hc[1] - 8}
          rx="4"
          ry="6"
          fill={colors.accent || colors.secondary}
        />
      ))}
    </g>
  );
}

function featureGlow(colors, hc) {
  return (
    <circle cx={hc[0]} cy={hc[1]} r="30" fill={colors.accent} opacity="0.12" />
  );
}

function featureFangs(colors, hc) {
  return (
    <g>
      <line x1={hc[0] - 3} y1={hc[1] + 6} x2={hc[0] - 3} y2={hc[1] + 11} stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={hc[0] + 3} y1={hc[1] + 6} x2={hc[0] + 3} y2={hc[1] + 11} stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function featureBigEyes() {
  return null; // Handled by making eye radius larger in the eye renderer
}

function featureCrest(colors, hc) {
  return (
    <g>
      <ellipse cx={hc[0]} cy={hc[1] - 10} rx="3" ry="8" fill={colors.accent} />
      <ellipse cx={hc[0] - 4} cy={hc[1] - 8} rx="2.5" ry="6" fill={colors.accent} opacity="0.7" />
      <ellipse cx={hc[0] + 4} cy={hc[1] - 8} rx="2.5" ry="6" fill={colors.accent} opacity="0.7" />
    </g>
  );
}

function featureFluffy(colors, hc, bb) {
  const bumps = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = hc[0] + Math.cos(angle) * 18;
    const y = hc[1] + 4 + Math.sin(angle) * 16;
    bumps.push(<circle key={i} cx={x} cy={y} r="6" fill={colors.secondary} opacity="0.4" />);
  }
  return <g>{bumps}</g>;
}

function featureTongue(colors, hc) {
  return (
    <path
      d={`M${hc[0]} ${hc[1] + 6} Q${hc[0] + 3} ${hc[1] + 14} ${hc[0] + 1} ${hc[1] + 16}`}
      stroke="#FF69B4"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function featureTentacles(colors, hc, bb) {
  return (
    <g>
      {[-12, -6, 0, 6, 12].map((xo) => (
        <path
          key={xo}
          d={`M${hc[0] + xo} ${bb - 4} Q${hc[0] + xo + 4} ${bb + 8} ${hc[0] + xo - 2} ${bb + 14}`}
          stroke={colors.accent || colors.primary}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function featureTentacleMouth(colors, hc) {
  return (
    <g>
      {[-5, 0, 5].map((xo) => (
        <path
          key={xo}
          d={`M${hc[0] + xo} ${hc[1] + 6} Q${hc[0] + xo + 2} ${hc[1] + 14} ${hc[0] + xo - 1} ${hc[1] + 18}`}
          stroke={colors.accent}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function featureThickHide(colors, hc, bb) {
  return (
    <g opacity="0.3">
      {[[-8, -4], [6, -2], [-3, 8], [10, 6]].map(([xo, yo], i) => (
        <rect key={i} x={hc[0] + xo} y={hc[1] + yo} width="6" height="4" rx="2" fill={colors.accent} />
      ))}
    </g>
  );
}

function featureWebbed(colors, hc, bb) {
  return (
    <g opacity="0.5">
      <path d={`M${hc[0] - 14} ${bb + 2} L${hc[0] - 20} ${bb + 8} L${hc[0] - 8} ${bb + 6} Z`} fill={colors.accent} />
      <path d={`M${hc[0] + 14} ${bb + 2} L${hc[0] + 20} ${bb + 8} L${hc[0] + 8} ${bb + 6} Z`} fill={colors.accent} />
    </g>
  );
}

function featureScales(colors, hc, bb) {
  return (
    <g opacity="0.35">
      {[[-6, -4], [4, -2], [-2, 4], [8, 2], [-8, 8], [2, 10]].map(([xo, yo], i) => (
        <path
          key={i}
          d={`M${hc[0] + xo - 3} ${hc[1] + yo} Q${hc[0] + xo} ${hc[1] + yo - 3} ${hc[0] + xo + 3} ${hc[1] + yo}`}
          stroke={colors.accent}
          strokeWidth="1"
          fill="none"
        />
      ))}
    </g>
  );
}

function featureSilverScales(colors, hc, bb) {
  return (
    <g opacity="0.4">
      {[[-6, -4], [4, -2], [-2, 4], [8, 2], [-8, 8], [2, 10]].map(([xo, yo], i) => (
        <path
          key={i}
          d={`M${hc[0] + xo - 3} ${hc[1] + yo} Q${hc[0] + xo} ${hc[1] + yo - 3} ${hc[0] + xo + 3} ${hc[1] + yo}`}
          stroke="#C0C0C0"
          strokeWidth="1.2"
          fill="none"
        />
      ))}
    </g>
  );
}

function featureThreeHeads(colors, hc) {
  const r = 4;
  return (
    <g>
      <circle cx={hc[0] - 8} cy={hc[1] - 5} r={r} fill={colors.secondary} />
      <circle cx={hc[0] + 8} cy={hc[1] - 5} r={r} fill={colors.secondary} />
      {/* Extra eyes for side heads */}
      <circle cx={hc[0] - 9} cy={hc[1] - 6} r="1.2" fill={colors.eye} />
      <circle cx={hc[0] + 9} cy={hc[1] - 6} r="1.2" fill={colors.eye} />
    </g>
  );
}

function featurePouch(colors, hc, bb) {
  return (
    <ellipse cx={hc[0]} cy={bb - 6} rx="8" ry="5" fill={colors.accent} opacity="0.5" />
  );
}

function featureThinLegs(colors, hc, bb) {
  return (
    <g>
      <line x1={hc[0] - 6} y1={bb} x2={hc[0] - 10} y2={bb + 16} stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
      <line x1={hc[0] + 6} y1={bb} x2={hc[0] + 10} y2={bb + 16} stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function featureTwigArms(colors, hc) {
  return (
    <g stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round">
      <path d={`M${hc[0] - 10} ${hc[1] + 2} L${hc[0] - 22} ${hc[1] - 4} M${hc[0] - 18} ${hc[1] - 2} L${hc[0] - 22} ${hc[1] - 10}`} />
      <path d={`M${hc[0] + 10} ${hc[1] + 2} L${hc[0] + 22} ${hc[1] - 4} M${hc[0] + 18} ${hc[1] - 2} L${hc[0] + 22} ${hc[1] - 10}`} />
    </g>
  );
}

function featureLeafCrown(colors, hc) {
  return (
    <g>
      {[-6, -2, 2, 6].map((xo) => (
        <ellipse key={xo} cx={hc[0] + xo} cy={hc[1] - 10} rx="2" ry="4" fill={colors.secondary} transform={`rotate(${xo * 3}, ${hc[0] + xo}, ${hc[1] - 10})`} />
      ))}
    </g>
  );
}

function featureLongHair(colors, hc) {
  return (
    <g opacity="0.6">
      {[-10, -5, 0, 5, 10].map((xo) => (
        <path
          key={xo}
          d={`M${hc[0] + xo} ${hc[1] - 6} Q${hc[0] + xo + 3} ${hc[1] + 10} ${hc[0] + xo - 2} ${hc[1] + 20}`}
          stroke={colors.secondary}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function featureLongFur(colors, hc, bb) {
  return (
    <g opacity="0.5">
      {[-12, -6, 0, 6, 12].map((xo) => (
        <path
          key={xo}
          d={`M${hc[0] + xo} ${hc[1] + 4} Q${hc[0] + xo + 2} ${hc[1] + 16} ${hc[0] + xo - 1} ${hc[1] + 22}`}
          stroke={colors.secondary}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function featureBow(colors, hc) {
  return (
    <g>
      <circle cx={hc[0] + 8} cy={hc[1] - 6} r="2" fill={colors.accent} />
      <polygon points={`${hc[0] + 4},${hc[1] - 8} ${hc[0] + 8},${hc[1] - 6} ${hc[0] + 4},${hc[1] - 4}`} fill={colors.accent} />
      <polygon points={`${hc[0] + 12},${hc[1] - 8} ${hc[0] + 8},${hc[1] - 6} ${hc[0] + 12},${hc[1] - 4}`} fill={colors.accent} />
    </g>
  );
}

function featureLargeEars(colors, hc) {
  return (
    <g>
      <ellipse cx={hc[0] - 10} cy={hc[1] - 12} rx="4" ry="10" fill={colors.primary} transform={`rotate(-15, ${hc[0] - 10}, ${hc[1] - 12})`} />
      <ellipse cx={hc[0] + 10} cy={hc[1] - 12} rx="4" ry="10" fill={colors.primary} transform={`rotate(15, ${hc[0] + 10}, ${hc[1] - 12})`} />
      <ellipse cx={hc[0] - 10} cy={hc[1] - 12} rx="2.5" ry="7" fill={colors.accent} opacity="0.4" transform={`rotate(-15, ${hc[0] - 10}, ${hc[1] - 12})`} />
      <ellipse cx={hc[0] + 10} cy={hc[1] - 12} rx="2.5" ry="7" fill={colors.accent} opacity="0.4" transform={`rotate(15, ${hc[0] + 10}, ${hc[1] - 12})`} />
    </g>
  );
}

function featureSpots(colors, hc, bb) {
  return (
    <g opacity="0.4">
      {[[-8, -3], [5, -6], [-4, 5], [8, 3], [-6, 12], [4, 14]].map(([xo, yo], i) => (
        <circle key={i} cx={hc[0] + xo} cy={hc[1] + yo} r="2" fill={colors.accent} />
      ))}
    </g>
  );
}

function featureStripes(colors, hc, bb) {
  return (
    <g opacity="0.35">
      {[-6, 0, 6, 12].map((yo) => (
        <path
          key={yo}
          d={`M${hc[0] - 10} ${hc[1] + yo} L${hc[0] + 10} ${hc[1] + yo}`}
          stroke={colors.accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function featureGems(colors, hc, bb) {
  return (
    <g>
      {[[-6, -8], [6, -4], [0, 4]].map(([xo, yo], i) => (
        <polygon
          key={i}
          points={`${hc[0] + xo},${hc[1] + yo - 3} ${hc[0] + xo + 2.5},${hc[1] + yo} ${hc[0] + xo},${hc[1] + yo + 3} ${hc[0] + xo - 2.5},${hc[1] + yo}`}
          fill={colors.accent}
          opacity="0.8"
        />
      ))}
    </g>
  );
}

function featureClaws(colors, hc, bb) {
  return (
    <g>
      {[-10, 10].map((xo) => (
        <g key={xo}>
          <line x1={hc[0] + xo} y1={bb + 2} x2={hc[0] + xo - 2} y2={bb + 7} stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
          <line x1={hc[0] + xo + 2} y1={bb + 2} x2={hc[0] + xo + 4} y2={bb + 7} stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

function featureStinger(colors, hc, bb) {
  return (
    <polygon
      points={`${hc[0] + 20} ${bb - 4} ${hc[0] + 30} ${bb - 8} ${hc[0] + 22} ${bb + 2}`}
      fill={colors.accent}
    />
  );
}

function featureCocoon(colors, hc, bb) {
  return (
    <ellipse cx={hc[0]} cy={bb + 4} rx="6" ry="4" fill={colors.accent} opacity="0.4" />
  );
}

function featureShadow(colors, hc) {
  return (
    <ellipse cx={hc[0]} cy={hc[1] + 4} rx="20" ry="14" fill={colors.secondary} opacity="0.15" />
  );
}

function featureShapeless(colors, hc) {
  return (
    <g opacity="0.3">
      {[[-8, -10], [10, -6], [-12, 6], [8, 10], [0, -14]].map(([xo, yo], i) => (
        <circle key={i} cx={hc[0] + xo} cy={hc[1] + yo} r={3 + (i % 3)} fill={colors.secondary} />
      ))}
    </g>
  );
}

function featureLightning(colors, hc) {
  return (
    <path
      d={`M${hc[0] + 20} ${hc[1] - 16} L${hc[0] + 14} ${hc[1] - 6} L${hc[0] + 20} ${hc[1] - 6} L${hc[0] + 12} ${hc[1] + 6}`}
      stroke={colors.accent}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function featureTalons(colors, hc, bb) {
  return (
    <g>
      {[-8, 4].map((xo) => (
        <g key={xo}>
          {[-2, 0, 2].map((t) => (
            <line key={t} x1={hc[0] + xo + t} y1={bb + 2} x2={hc[0] + xo + t - 1} y2={bb + 6} stroke={colors.accent} strokeWidth="1" strokeLinecap="round" />
          ))}
        </g>
      ))}
    </g>
  );
}

function featureRedHat(colors, hc) {
  return (
    <g>
      <ellipse cx={hc[0]} cy={hc[1] - 10} rx="12" ry="5" fill={colors.accent} />
      <path d={`M${hc[0] - 8} ${hc[1] - 10} Q${hc[0]} ${hc[1] - 22} ${hc[0] + 6} ${hc[1] - 12}`} fill={colors.accent} />
    </g>
  );
}

function featureClub(colors, hc, bb) {
  return (
    <g>
      <line x1={hc[0] + 16} y1={hc[1]} x2={hc[0] + 16} y2={hc[1] + 24} stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx={hc[0] + 16} cy={hc[1] + 25} rx="4" ry="5" fill="#6B3410" />
    </g>
  );
}

function featureHorseBody(colors, hc, bb) {
  return (
    <g>
      {/* Extended horse lower body for centaur */}
      <ellipse cx={hc[0]} cy={bb + 6} rx="18" ry="10" fill={colors.secondary} />
      {/* Extra legs */}
      <rect x={hc[0] + 8} y={bb + 14} width="3" height="14" rx="1.5" fill={colors.secondary} />
      <rect x={hc[0] + 14} y={bb + 14} width="3" height="14" rx="1.5" fill={colors.secondary} />
    </g>
  );
}

function featureBowWeapon(colors, hc) {
  return (
    <g>
      <path d={`M${hc[0] - 20} ${hc[1] - 8} Q${hc[0] - 28} ${hc[1] + 4} ${hc[0] - 20} ${hc[1] + 16}`} stroke="#8B4513" strokeWidth="1.5" fill="none" />
      <line x1={hc[0] - 20} y1={hc[1] - 8} x2={hc[0] - 20} y2={hc[1] + 16} stroke="#C0C0C0" strokeWidth="0.8" />
    </g>
  );
}

function featureStars(colors, hc) {
  return (
    <g opacity="0.5">
      {[[-18, -20], [16, -18], [-20, 4], [20, 8]].map(([xo, yo], i) => (
        <polygon
          key={i}
          points={`${hc[0] + xo},${hc[1] + yo - 2} ${hc[0] + xo + 1},${hc[1] + yo - 0.5} ${hc[0] + xo + 2.5},${hc[1] + yo - 0.5} ${hc[0] + xo + 1.4},${hc[1] + yo + 0.8} ${hc[0] + xo + 1.8},${hc[1] + yo + 2.5} ${hc[0] + xo},${hc[1] + yo + 1.4} ${hc[0] + xo - 1.8},${hc[1] + yo + 2.5} ${hc[0] + xo - 1.4},${hc[1] + yo + 0.8} ${hc[0] + xo - 2.5},${hc[1] + yo - 0.5} ${hc[0] + xo - 1},${hc[1] + yo - 0.5}`}
          fill="#FFD700"
        />
      ))}
    </g>
  );
}

function featureLongBody(colors, hc, bb) {
  return (
    <ellipse cx={hc[0]} cy={hc[1] + 8} rx="24" ry="8" fill={colors.primary} opacity="0.5" />
  );
}

function featureSharpTeeth(colors, hc) {
  return (
    <g>
      {[-4, -1.5, 1.5, 4].map((xo) => (
        <polygon key={xo} points={`${hc[0] + xo - 1},${hc[1] + 5} ${hc[0] + xo},${hc[1] + 9} ${hc[0] + xo + 1},${hc[1] + 5}`} fill="#FFFFFF" />
      ))}
    </g>
  );
}

function featureFerret() {
  return null; // Shape handled by bodyType oval
}

function featureRoundBody() {
  return null; // Shape handled by bodyType
}

function featureVibrant(colors, hc) {
  return (
    <circle cx={hc[0]} cy={hc[1]} r="16" fill={colors.secondary} opacity="0.15" />
  );
}

function featureRaggedFeathers(colors, hc, bb) {
  return (
    <g opacity="0.5">
      {[-12, -6, 0, 6, 12].map((xo) => (
        <path
          key={xo}
          d={`M${hc[0] + xo} ${hc[1] + 8} L${hc[0] + xo + 2} ${hc[1] + 18} L${hc[0] + xo - 2} ${hc[1] + 16}`}
          fill={colors.secondary}
        />
      ))}
    </g>
  );
}

function featureMournful() {
  return null; // Handled by overall creature mood via eye rendering
}

function featureFeathers(colors, hc) {
  return (
    <g opacity="0.4">
      {[-8, 0, 8].map((xo) => (
        <ellipse key={xo} cx={hc[0] + xo} cy={hc[1] - 6} rx="2" ry="5" fill={colors.secondary} transform={`rotate(${xo * 2}, ${hc[0] + xo}, ${hc[1] - 6})`} />
      ))}
    </g>
  );
}

function featurePoisonBreath(colors, hc) {
  return (
    <g opacity="0.3">
      {[0, 4, 8].map((off) => (
        <circle key={off} cx={hc[0] - 16 - off} cy={hc[1] + 2 - off} r={3 - off * 0.2} fill={colors.accent} />
      ))}
    </g>
  );
}

function featureDeadlyEyes() {
  return null; // Handled by eye rendering
}

function featureSkeletal(colors, hc, bb) {
  return (
    <g opacity="0.3">
      {/* Rib-like lines */}
      {[-6, -2, 2, 6].map((yo) => (
        <path
          key={yo}
          d={`M${hc[0] - 8} ${hc[1] + yo + 8} Q${hc[0]} ${hc[1] + yo + 6} ${hc[0] + 8} ${hc[1] + yo + 8}`}
          stroke={colors.accent}
          strokeWidth="1"
          fill="none"
        />
      ))}
    </g>
  );
}

function featureGhostly(colors, hc) {
  return (
    <circle cx={hc[0]} cy={hc[1]} r="28" fill={colors.accent} opacity="0.06" />
  );
}

function featureFireBreath(colors, hc) {
  return (
    <g opacity="0.7">
      <ellipse cx={hc[0] - 20} cy={hc[1] + 2} rx="6" ry="4" fill={colors.accent} />
      <ellipse cx={hc[0] - 26} cy={hc[1] + 2} rx="4" ry="3" fill="#FFD700" opacity="0.6" />
    </g>
  );
}

function featureFireTrail(colors, hc, bb) {
  return (
    <g opacity="0.5">
      {[0, 6, 12, 18].map((off) => (
        <circle key={off} cx={hc[0] + 20 + off * 0.8} cy={bb - 4 + off * 0.5} r={3 - off * 0.12} fill={colors.secondary} />
      ))}
    </g>
  );
}

function featureSpikes(colors, hc) {
  return (
    <g>
      {[-8, -3, 2, 7].map((xo) => (
        <polygon
          key={xo}
          points={`${hc[0] + xo - 1.5},${hc[1] - 8} ${hc[0] + xo},${hc[1] - 15} ${hc[0] + xo + 1.5},${hc[1] - 8}`}
          fill={colors.accent}
        />
      ))}
    </g>
  );
}

function featureGentle(colors, hc) {
  return (
    <circle cx={hc[0]} cy={hc[1]} r="22" fill={colors.accent} opacity="0.08" />
  );
}

function featureLarge() {
  return null; // Handled by scale
}

function featureMassive() {
  return null; // Handled by scale
}

function featureSmall() {
  return null; // Handled by scale
}

const FEATURE_MAP = {
  'wings': featureWings,
  'large-wings': featureLargeWings,
  'bat-wings': featureBatWings,
  'butterfly-wings': featureButterflyWings,
  'flame-wings': featureFlameWings,
  'small-wings': featureSmallWings,
  'horns': featureHorns,
  'horn': featureHorn,
  'antlers': featureAntlers,
  'tail': featureTail,
  'long-tail': featureLongTail,
  'fire-tail': featureFireTail,
  'tail-spikes': featureTailSpikes,
  'long-tail-feathers': featureLongTailFeathers,
  'beak': featureBeak,
  'long-beak': featureLongBeak,
  'duck-bill': featureDuckBill,
  'shell': featureShell,
  'mane': featureMane,
  'glow': featureGlow,
  'fangs': featureFangs,
  'big-eyes': featureBigEyes,
  'crest': featureCrest,
  'fluffy': featureFluffy,
  'tongue': featureTongue,
  'tentacles': featureTentacles,
  'tentacle-mouth': featureTentacleMouth,
  'thick-hide': featureThickHide,
  'webbed': featureWebbed,
  'scales': featureScales,
  'silver-scales': featureSilverScales,
  'three-heads': featureThreeHeads,
  'pouch': featurePouch,
  'thin-legs': featureThinLegs,
  'twig-arms': featureTwigArms,
  'leaf-crown': featureLeafCrown,
  'long-hair': featureLongHair,
  'long-fur': featureLongFur,
  'hair-bow': featureBow,
  'large-ears': featureLargeEars,
  'spots': featureSpots,
  'stripes': featureStripes,
  'gems': featureGems,
  'claws': featureClaws,
  'stinger': featureStinger,
  'cocoon': featureCocoon,
  'shadow': featureShadow,
  'shapeless': featureShapeless,
  'lightning': featureLightning,
  'talons': featureTalons,
  'red-hat': featureRedHat,
  'club': featureClub,
  'horse-body': featureHorseBody,
  'bow': featureBowWeapon,
  'stars': featureStars,
  'long-body': featureLongBody,
  'sharp-teeth': featureSharpTeeth,
  'ferret': featureFerret,
  'round-body': featureRoundBody,
  'vibrant': featureVibrant,
  'ragged-feathers': featureRaggedFeathers,
  'mournful': featureMournful,
  'feathers': featureFeathers,
  'poison-breath': featurePoisonBreath,
  'deadly-eyes': featureDeadlyEyes,
  'skeletal': featureSkeletal,
  'ghostly': featureGhostly,
  'fire-breath': featureFireBreath,
  'fire-trail': featureFireTrail,
  'spikes': featureSpikes,
  'gentle': featureGentle,
  'large': featureLarge,
  'massive': featureMassive,
  'small': featureSmall,
};

// ─── SSR glow effect ─────────────────────────────────────────────────────────

function SSRGlow({ id, hc }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-ssrglow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#9B59B6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#9B59B6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={hc[0]} cy={hc[1]} r="42" fill={`url(#${id}-ssrglow)`} className={`${id}-ssrpulse`} />
      {/* Particles */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const px = hc[0] + Math.cos(rad) * 32;
        const py = hc[1] + Math.sin(rad) * 28;
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r="1.5"
            fill="#FFD700"
            opacity="0.6"
            className={`${id}-particle`}
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        );
      })}
    </g>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PixelCreature({ creatureId, size = 'md', stage = 1, animated = true, className }) {
  const data = CREATURE_DATA[creatureId];
  const px = SIZES[size] || SIZES.md;

  // Fallback for unknown creatures
  if (!data) {
    return (
      <svg
        viewBox="0 0 120 120"
        width={px}
        height={px}
        className={cn('select-none', className)}
        role="img"
        aria-label="Unknown Creature"
      >
        <circle cx="60" cy="60" r="28" fill="#9CA3AF" />
        <text x="60" y="66" textAnchor="middle" fontSize="24" fill="#FFFFFF">?</text>
      </svg>
    );
  }

  const uniqueId = `pc-${creatureId}`;
  const isSSR = SSR_CREATURES.has(creatureId);

  // ── Stage 0: Egg ──
  if (stage === 0) {
    const { eggColors, eggPattern, name } = data;
    const patternRenderer = EGG_PATTERNS[eggPattern] || eggPatternSpots;

    return (
      <svg
        viewBox="0 0 120 120"
        width={px}
        height={px}
        className={cn('select-none', className)}
        role="img"
        aria-label={`${name} Egg`}
      >
        <style>{`
          @keyframes ${uniqueId}-wobble {
            0%, 100% { transform: rotate(0deg); }
            20% { transform: rotate(2deg); }
            40% { transform: rotate(-2deg); }
            60% { transform: rotate(1.5deg); }
            80% { transform: rotate(-1deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .${uniqueId}-egg { animation: none !important; }
          }
        `}</style>
        <defs>
          <radialGradient id={`${uniqueId}-egggrad`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={eggColors.base} />
            <stop offset="100%" stopColor={eggColors.base} stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id={`${uniqueId}-eggshine`} cx="35%" cy="25%" r="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g
          className={`${uniqueId}-egg`}
          style={animated ? { animation: `${uniqueId}-wobble 3s ease-in-out infinite`, transformOrigin: '60px 62px' } : undefined}
        >
          {/* Shadow */}
          <ellipse cx="60" cy="100" rx="22" ry="5" fill="#1A1A1A" opacity="0.08" />
          {/* Egg body */}
          <ellipse cx="60" cy="60" rx="26" ry="34" fill={`url(#${uniqueId}-egggrad)`} />
          {/* Shine */}
          <ellipse cx="60" cy="60" rx="26" ry="34" fill={`url(#${uniqueId}-eggshine)`} />
          {/* Pattern overlay */}
          {patternRenderer(uniqueId, eggColors.pattern)}
          {/* Subtle outline */}
          <ellipse cx="60" cy="60" rx="26" ry="34" fill="none" stroke={eggColors.pattern} strokeWidth="0.5" opacity="0.3" />
        </g>
      </svg>
    );
  }

  // ── Stage 1 (Baby) or Stage 2 (Adult) ──
  const isAdult = stage >= 2;
  const { colors, bodyType, features, name } = data;
  const renderer = BODY_RENDERERS[bodyType] || bodyRound;
  const { body, eyePositions, headCenter, bodyBottom } = renderer(colors, isAdult);

  const hasBigEyes = features.includes('big-eyes');
  const eyeR = isAdult ? (hasBigEyes ? 4 : 3) : (hasBigEyes ? 3.5 : 2.5);
  const pupilR = eyeR * 0.5;

  const animName = isAdult ? `${uniqueId}-sway` : `${uniqueId}-bounce`;
  const animCSS = isAdult
    ? `@keyframes ${uniqueId}-sway { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(2px); } }`
    : `@keyframes ${uniqueId}-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }`;
  const animDur = isAdult ? '3s' : '2s';

  // Determine which features to render: baby gets first 2, adult gets all
  const activeFeatures = isAdult ? features : features.slice(0, 2);

  return (
    <svg
      viewBox="0 0 120 120"
      width={px}
      height={px}
      className={cn('select-none', className)}
      role="img"
      aria-label={`${name} ${isAdult ? 'Adult' : 'Baby'}`}
    >
      <style>{`
        ${animCSS}
        @keyframes ${uniqueId}-particlefloat {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-6px); opacity: 0.2; }
        }
        @keyframes ${uniqueId}-ssrpulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .${uniqueId}-body, .${uniqueId}-particle, .${uniqueId}-ssrpulse { animation: none !important; }
        }
      `}</style>
      <g
        className={`${uniqueId}-body`}
        style={animated ? { animation: `${animName} ${animDur} ease-in-out infinite`, transformOrigin: '60px 60px' } : undefined}
      >
        {/* Shadow */}
        <ellipse cx="60" cy={Math.min(bodyBottom + 4, 108)} rx={isAdult ? 20 : 14} ry="4" fill="#1A1A1A" opacity="0.08" />

        {/* SSR glow (behind body) */}
        {isSSR && isAdult && <SSRGlow id={uniqueId} hc={headCenter} />}

        {/* Features that go behind body (wings, glow) */}
        {activeFeatures.map((feat) => {
          if (['wings', 'large-wings', 'bat-wings', 'butterfly-wings', 'flame-wings', 'small-wings', 'glow', 'ghostly', 'gentle', 'shadow'].includes(feat)) {
            const fn = FEATURE_MAP[feat];
            return fn ? <React.Fragment key={feat}>{fn(colors, headCenter, bodyBottom, isAdult)}</React.Fragment> : null;
          }
          return null;
        })}

        {/* Body */}
        {body}

        {/* Features that go on top of body */}
        {activeFeatures.map((feat) => {
          if (['wings', 'large-wings', 'bat-wings', 'butterfly-wings', 'flame-wings', 'small-wings', 'glow', 'ghostly', 'gentle', 'shadow'].includes(feat)) {
            return null; // Already rendered behind body
          }
          const fn = FEATURE_MAP[feat];
          return fn ? <React.Fragment key={feat}>{fn(colors, headCenter, bodyBottom, isAdult)}</React.Fragment> : null;
        })}

        {/* Eyes */}
        {eyePositions.map(([ex, ey], i) => (
          <g key={i}>
            <circle cx={ex} cy={ey} r={eyeR} fill="#FFFFFF" />
            <circle cx={ex + 0.5} cy={ey} r={pupilR} fill={colors.eye} />
            {/* Eye shine */}
            <circle cx={ex - eyeR * 0.2} cy={ey - eyeR * 0.25} r={eyeR * 0.25} fill="#FFFFFF" opacity="0.8" />
          </g>
        ))}

        {/* Baby blush marks */}
        {!isAdult && (
          <g opacity="0.2">
            <ellipse cx={eyePositions[0][0] - 3} cy={eyePositions[0][1] + eyeR + 2} rx="3" ry="1.5" fill="#FF69B4" />
            <ellipse cx={eyePositions[1][0] + 3} cy={eyePositions[1][1] + eyeR + 2} rx="3" ry="1.5" fill="#FF69B4" />
          </g>
        )}
      </g>
    </svg>
  );
}
