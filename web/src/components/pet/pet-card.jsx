import * as React from 'react';
import { cn } from '../../lib/cn';
import { Crown } from 'lucide-react';
import { PetSprite } from './pet-sprite';
import { RarityBadge } from './rarity-badge';
import { StarDisplay } from './star-display';

export function PetCard({
  pet,
  onClick,
  className,
}) {
  const {
    nickname,
    species_name,
    visual_key,
    level = 1,
    rarity = 'N',
    star = 0,
    is_primary = false,
    is_fainted = false,
    state,
    stage,
  } = pet || {};

  const isFainted = is_fainted || state === 'weak';
  const displayName = nickname || species_name || 'Unknown';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-[1.03] hover:shadow-md hover:border-border-strong',
        isFainted && 'opacity-50 grayscale',
        className
      )}
    >
      {/* Primary pet crown */}
      {is_primary && (
        <div className="absolute -top-2.5 -right-2.5 rounded-full bg-amber-100 dark:bg-amber-900/40 p-1">
          <Crown size={14} className="text-amber-500" />
        </div>
      )}

      {/* Rarity badge */}
      <div className="absolute top-2 left-2">
        <RarityBadge rarity={rarity} />
      </div>

      {/* Sprite */}
      <div className="pt-2">
        <PetSprite
          visualKey={visual_key}
          stage={stage}
          size="md"
          animated={!isFainted}
          state="idle"
          speciesName={species_name}
          rarity={rarity}
        />
      </div>

      {/* Name + Level */}
      <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
        <span className="text-sm font-medium text-text-primary truncate max-w-full">
          {displayName}
        </span>
        <span className="text-xs text-text-tertiary">
          Lv.{level}
        </span>
      </div>

      {/* Stars */}
      {star > 0 && (
        <StarDisplay star={star} size="sm" />
      )}
    </div>
  );
}
