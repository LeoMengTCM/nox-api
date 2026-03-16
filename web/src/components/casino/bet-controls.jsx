import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { cn } from '../../lib/cn';

const QUICK_DOLLARS = [0.01, 0.05, 0.1, 0.5, 1, 5];

function getQuotaPerUnit() {
  try {
    const v = parseInt(localStorage.getItem('quota_per_unit'));
    return v > 0 ? v : 500000;
  } catch {
    return 500000;
  }
}

function tokensToUsd(tokens) {
  return tokens / getQuotaPerUnit();
}

function usdToTokens(usd) {
  return Math.round(usd * getQuotaPerUnit());
}

function formatUsd(v) {
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

export function BetControls({ value, onChange, minBet, maxBet, balance, disabled = false, className }) {
  const { t } = useTranslation();

  // value/minBet/maxBet/balance are all in tokens; display in USD
  const tokenVal = typeof value === 'number' ? value : parseInt(value) || 0;
  const usdVal = tokensToUsd(tokenVal);

  const clampTokens = (tokens) => Math.max(minBet || 0, Math.min(maxBet || Infinity, Math.min(balance || Infinity, tokens)));

  const setUsd = (dollars) => {
    const tokens = usdToTokens(dollars);
    onChange(clampTokens(tokens));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Balance reference */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>{t('余额')}: {formatUsd(tokensToUsd(balance || 0))}</span>
        <span>{t('下注范围')}: {formatUsd(tokensToUsd(minBet || 0))} - {formatUsd(tokensToUsd(maxBet || 0))}</span>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={usdVal > 0 ? parseFloat(usdVal.toFixed(4)) : ''}
            onChange={(e) => {
              const dollars = parseFloat(e.target.value) || 0;
              onChange(Math.max(0, usdToTokens(dollars)));
            }}
            placeholder={t('下注金额')}
            disabled={disabled}
            className="pl-7"
          />
        </div>
      </div>

      {/* Quick buttons */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_DOLLARS.map((d) => (
          <Button
            key={d}
            variant="secondary"
            size="sm"
            onClick={() => setUsd(d)}
            disabled={disabled}
            className="text-xs px-2"
          >
            ${d < 1 ? d.toFixed(2) : d}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setUsd(tokensToUsd(Math.floor((balance || 0) / 2)))}
          disabled={disabled}
          className="text-xs px-2"
        >
          {t('一半')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setUsd(tokensToUsd(Math.min(maxBet || balance || 0, balance || 0)))}
          disabled={disabled}
          className="text-xs px-2"
        >
          {t('最大')}
        </Button>
      </div>
    </div>
  );
}
