import { cn } from '../../lib/cn';

// Dot positions for each face (row, col in a 3x3 grid, 0-indexed)
const DOT_POSITIONS = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const SIZE_MAP = {
  sm: { die: 'w-10 h-10', dot: 'w-1.5 h-1.5', gap: 'gap-[3px]', pad: 'p-1.5' },
  md: { die: 'w-14 h-14', dot: 'w-2 h-2', gap: 'gap-1', pad: 'p-2' },
  lg: { die: 'w-20 h-20', dot: 'w-2.5 h-2.5', gap: 'gap-1.5', pad: 'p-3' },
};

export function DiceDisplay({ value = 1, rolling = false, size = 'lg', className, result }) {
  const v = Math.max(1, Math.min(6, value));
  const dots = DOT_POSITIONS[v] || [];
  const s = SIZE_MAP[size] || SIZE_MAP.lg;

  const resultStyle = result === 'win'
    ? 'ring-2 ring-[#C5A55A] shadow-[0_0_16px_rgba(197,165,90,0.5)]'
    : result === 'lose'
      ? 'animate-[card-shake_0.3s_ease-in-out]'
      : '';

  return (
    <div
      className={cn(
        s.die,
        'rounded-xl border-2 border-border bg-white dark:bg-gray-50 shadow-md select-none transition-shadow duration-300',
        rolling && 'animate-[dice-roll_0.6s_ease-in-out_infinite]',
        !rolling && resultStyle,
        className,
      )}
    >
      <div className={cn('grid grid-cols-3 grid-rows-3 h-full w-full', s.pad, s.gap)}>
        {Array.from({ length: 9 }).map((_, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const hasDot = dots.some(([r, c]) => r === row && c === col);
          return (
            <div key={idx} className="flex items-center justify-center">
              {hasDot && (
                <div className={cn(s.dot, 'rounded-full bg-gray-800 dark:bg-gray-900')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DicePair({ dice = [1, 1], rolling = false, size = 'lg', className, result }) {
  return (
    <div className={cn('flex items-center gap-4 justify-center', className)}>
      <DiceDisplay value={dice[0]} rolling={rolling} size={size} result={result} />
      <DiceDisplay value={dice[1]} rolling={rolling} size={size} result={result} />
    </div>
  );
}
