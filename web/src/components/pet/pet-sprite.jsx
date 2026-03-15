import * as React from 'react';
import { cn } from '../../lib/cn';
import { SPRITE_MAP } from './sprites';

export function PetSprite({ visualKey, stage, size = 'md', animated = true, state = 'idle', className, speciesName, rarity }) {
  const SpriteComponent = SPRITE_MAP[visualKey];

  if (!SpriteComponent) {
    const sizePx = { sm: 48, md: 96, lg: 192 }[size] || 96;
    const fontSize = { sm: 'text-base', md: 'text-2xl', lg: 'text-4xl' }[size] || 'text-2xl';
    const rarityColors = {
      N: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      R: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
      SR: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300',
      SSR: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
    };
    const colorClass = rarityColors[rarity] || rarityColors.N;
    const displayChar = speciesName ? speciesName.charAt(0) : '?';
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-bold',
          colorClass,
          fontSize,
          className
        )}
        style={{ width: sizePx, height: sizePx }}
      >
        {displayChar}
      </div>
    );
  }

  return (
    <SpriteComponent
      size={size}
      animated={animated}
      state={state}
      stage={stage}
      className={className}
    />
  );
}
