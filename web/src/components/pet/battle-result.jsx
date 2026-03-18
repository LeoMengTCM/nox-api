import { cn } from '../../lib/cn';
import { renderQuota } from '../../lib/utils';
import { Card, Badge } from '../ui';
import { Swords, Shield, Zap, Wind } from 'lucide-react';

const ACTION_ICONS = {
  attack: Swords,
  crit: Zap,
  dodge: Wind,
};

const ACTION_COLORS = {
  attack: 'text-foreground',
  crit: 'text-amber-400',
  dodge: 'text-blue-400',
};

export default function BattleResult({ result }) {
  if (!result) return null;

  const rounds = result.rounds || [];
  const isAttackerWin = result.winner_is_attacker;

  return (
    <Card className={cn(
      'overflow-hidden',
      isAttackerWin ? 'border-red-500/30' : 'border-blue-500/30'
    )}>
      {/* Header */}
      <div className={cn(
        'p-4 text-center',
        isAttackerWin ? 'bg-red-500/5' : 'bg-blue-500/5'
      )}>
        <div className="text-2xl font-bold">
          {isAttackerWin ? (
            <span className="text-red-400">攻方胜利！</span>
          ) : (
            <span className="text-blue-400">守方胜利！</span>
          )}
        </div>
        {result.reward_quota > 0 && (
          <div className="mt-1 text-sm text-amber-400">
            奖励: {renderQuota(result.reward_quota, 2)}
          </div>
        )}
      </div>

      {/* Rating Changes */}
      <div className="flex border-b border-border/50">
        <div className="flex-1 border-r border-border/50 p-3 text-center">
          <div className="text-xs text-muted-foreground">攻方积分</div>
          <div className="mt-1 text-sm">
            {result.attacker_rating?.before} →{' '}
            <span className={result.attacker_rating?.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {result.attacker_rating?.after}
            </span>
            <span className={cn(
              'ml-1 text-xs',
              result.attacker_rating?.change >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              ({result.attacker_rating?.change >= 0 ? '+' : ''}{result.attacker_rating?.change})
            </span>
          </div>
        </div>
        <div className="flex-1 p-3 text-center">
          <div className="text-xs text-muted-foreground">守方积分</div>
          <div className="mt-1 text-sm">
            {result.defender_rating?.before} →{' '}
            <span className={result.defender_rating?.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {result.defender_rating?.after}
            </span>
            <span className={cn(
              'ml-1 text-xs',
              result.defender_rating?.change >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              ({result.defender_rating?.change >= 0 ? '+' : ''}{result.defender_rating?.change})
            </span>
          </div>
        </div>
      </div>

      {/* Battle Rounds */}
      <div className="p-4">
        <h4 className="mb-3 text-sm font-semibold text-muted-foreground">战斗回合</h4>
        <div className="space-y-2">
          {rounds.map((round, i) => {
            const Icon = ACTION_ICONS[round.action] || Swords;
            const isAttacker = round.attacker === 'attacker';

            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border/30 p-2 text-sm',
                  isAttacker ? 'border-l-red-500/50 border-l-2' : 'border-l-blue-500/50 border-l-2'
                )}
              >
                <span className="w-8 text-center text-xs text-muted-foreground">R{round.round}</span>
                <Icon className={cn('h-4 w-4 shrink-0', ACTION_COLORS[round.action])} />
                <span className={cn(
                  'w-12 text-xs font-medium',
                  isAttacker ? 'text-red-400' : 'text-blue-400'
                )}>
                  {isAttacker ? '攻方' : '守方'}
                </span>
                <span className="flex-1 text-xs">{round.description}</span>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-red-400/70">{round.attacker_hp_pct}%</span>
                  <span>/</span>
                  <span className="text-blue-400/70">{round.defender_hp_pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
