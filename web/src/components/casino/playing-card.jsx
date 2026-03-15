import { cn } from '../../lib/cn';

const SUIT_SYMBOLS = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  S: '\u2660',
  H: '\u2665',
  D: '\u2666',
  C: '\u2663',
};

const SUIT_COLORS = {
  spades: 'text-gray-900 dark:text-gray-100',
  hearts: 'text-red-600 dark:text-red-400',
  diamonds: 'text-red-600 dark:text-red-400',
  clubs: 'text-gray-900 dark:text-gray-100',
  S: 'text-gray-900 dark:text-gray-100',
  H: 'text-red-600 dark:text-red-400',
  D: 'text-red-600 dark:text-red-400',
  C: 'text-gray-900 dark:text-gray-100',
};

export function PlayingCard({ rank, suit, faceDown = false, className, animateIn = false, result }) {
  const suitSymbol = SUIT_SYMBOLS[suit] || suit;
  const suitColor = SUIT_COLORS[suit] || 'text-gray-900 dark:text-gray-100';

  const resultBorder = result === 'win' || result === 'blackjack'
    ? 'ring-2 ring-[#C5A55A] shadow-[0_0_12px_rgba(197,165,90,0.4)]'
    : result === 'bust'
      ? 'animate-[card-shake_0.4s_ease-in-out]'
      : '';

  if (faceDown) {
    return (
      <div
        className={cn(
          'relative w-[52px] h-[74px] sm:w-[60px] sm:h-[84px] rounded-lg border border-border shadow-sm overflow-hidden select-none shrink-0',
          'bg-gradient-to-br from-[#2D1B4E] via-[#3D2B5E] to-[#2D1B4E]',
          animateIn && 'animate-[card-deal_0.3s_ease-out]',
          className,
        )}
      >
        {/* Magical card back pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-1 border border-[#C5A55A]/40 rounded-md" />
          <div className="absolute inset-2 border border-[#C5A55A]/20 rounded-sm" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-[#C5A55A]/60 text-lg sm:text-xl flex items-center justify-center">
            &#x2726;
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-[52px] h-[74px] sm:w-[60px] sm:h-[84px] rounded-lg border border-border bg-white dark:bg-gray-50 shadow-sm select-none shrink-0 transition-shadow duration-300',
        animateIn && 'animate-[card-deal_0.3s_ease-out]',
        resultBorder,
        className,
      )}
    >
      {/* Top-left rank & suit */}
      <div className={cn('absolute top-0.5 left-1 flex flex-col items-center leading-none', suitColor)}>
        <span className="text-[10px] sm:text-xs font-bold">{rank}</span>
        <span className="text-[8px] sm:text-[10px] -mt-0.5">{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <div className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg sm:text-xl', suitColor)}>
        {suitSymbol}
      </div>

      {/* Bottom-right rank & suit (inverted) */}
      <div className={cn('absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180', suitColor)}>
        <span className="text-[10px] sm:text-xs font-bold">{rank}</span>
        <span className="text-[8px] sm:text-[10px] -mt-0.5">{suitSymbol}</span>
      </div>
    </div>
  );
}

export function CardHand({ cards = [], faceDownIndices = [], animateIn = false, result, className }) {
  return (
    <div className={cn('flex items-center', className)}>
      {cards.map((card, i) => (
        <div
          key={i}
          className={cn(i > 0 && '-ml-4 sm:-ml-5')}
          style={animateIn ? { animationDelay: `${i * 0.12}s` } : undefined}
        >
          <PlayingCard
            rank={card.rank}
            suit={card.suit}
            faceDown={faceDownIndices.includes(i)}
            animateIn={animateIn}
            result={result}
          />
        </div>
      ))}
    </div>
  );
}
