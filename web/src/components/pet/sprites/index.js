import React from 'react';
import { PixelCreature } from './pixel-creature';
import { CREATURE_DATA } from './creature-data';

// Generate wrapper components for each creature
function makeSprite(creatureId) {
  return function CreatureSprite({ size, animated, state, stage, className }) {
    return (
      <PixelCreature
        creatureId={creatureId}
        size={size}
        stage={stage ?? 1}
        animated={animated}
        className={className}
      />
    );
  };
}

export const SPRITE_MAP = {};
for (const key of Object.keys(CREATURE_DATA)) {
  SPRITE_MAP[key] = makeSprite(key);
}

export { PixelCreature } from './pixel-creature';
export { CREATURE_DATA, SSR_CREATURES } from './creature-data';
