import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';

export function BetControls({ value, onChange, minBet, maxBet, balance, disabled = false, className }) {
  const { t } = useTranslation();

  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;

  const clamp = (v) => Math.max(minBet || 0, Math.min(maxBet || Infinity, Math.min(balance || Infinity, v)));

  const setVal = (v) => {
    onChange(clamp(Math.floor(v)));
  };

  const quickButtons = [
    { label: t('最小'), fn: () => setVal(minBet || 0) },
    { label: '-1K', fn: () => setVal(numVal - 1000) },
    { label: '+1K', fn: () => setVal(numVal + 1000) },
    { label: '+10K', fn: () => setVal(numVal + 10000) },
    { label: t('一半'), fn: () => setVal(Math.floor((balance || 0) / 2)) },
    { label: t('最大'), fn: () => setVal(Math.min(maxBet || balance || 0, balance || 0)) },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Balance reference */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>{t('余额')}: {renderQuota(balance || 0)}</span>
        <span>{t('下注范围')}: {renderQuota(minBet || 0)} - {renderQuota(maxBet || 0)}</span>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={numVal || ''}
          onChange={(e) => {
            const v = parseInt(e.target.value) || 0;
            onChange(Math.max(0, v));
          }}
          placeholder={t('下注金额')}
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-xs text-text-secondary whitespace-nowrap">
          ≈ {renderQuota(numVal)}
        </span>
      </div>

      {/* Quick buttons */}
      <div className="flex flex-wrap gap-1.5">
        {quickButtons.map((btn) => (
          <Button
            key={btn.label}
            variant="secondary"
            size="sm"
            onClick={btn.fn}
            disabled={disabled}
            className="text-xs px-2"
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
