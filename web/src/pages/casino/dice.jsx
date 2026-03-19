import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Dices, ChevronDown, ChevronUp } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { DicePair } from '../../components/casino/dice-display';
import { BetControls } from '../../components/casino/bet-controls';
import { AchievementToast } from '../../components/casino/achievement-toast';

const BET_TYPES = [
  { key: 'big', label: '大', desc: '总数 >= 8', payout: '1:1' },
  { key: 'small', label: '小', desc: '总数 <= 6', payout: '1:1' },
  { key: 'lucky7', label: '幸运7', desc: '总数 = 7', payout: '4:1' },
  { key: 'exact', label: '猜数字', desc: '猜中具体总数', payout: '' },
];

const EXACT_PAYOUTS = {
  2: '35:1', 3: '17:1', 4: '11:1', 5: '8:1', 6: '6:1',
  7: '5:1', 8: '6:1', 9: '8:1', 10: '11:1', 11: '17:1', 12: '35:1',
};

const RESULT_MESSAGES = {
  win: '你赢了！',
  lose: '你输了',
  push: '平局',
};

export default function CasinoDice() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);

  // Bet type
  const [betType, setBetType] = useState('big');
  const [betValue, setBetValue] = useState(7);

  // Roll state
  const [dice, setDice] = useState([1, 1]);
  const [diceTotal, setDiceTotal] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [payout, setPayout] = useState(null);
  const [hasRolled, setHasRolled] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [showPayoutTable, setShowPayoutTable] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [configRes, userRes, histRes] = await Promise.all([
        API.get('/api/casino/config'),
        API.get('/api/user/self', { skipErrorHandler: true }),
        API.get('/api/casino/history?per_page=10&game_type=dice'),
      ]);

      if (configRes.data.success) setConfig(configRes.data.data);
      if (userRes.data.success) setBalance(userRes.data.data?.quota || 0);
      if (histRes.data.success) setHistory(histRes.data.data?.records || []);
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = useCallback(async () => {
    try {
      const res = await API.get('/api/user/self', { skipErrorHandler: true, disableDuplicate: true });
      if (res.data.success) setBalance(res.data.data?.quota || 0);
    } catch {}
  }, []);

  const rollDice = async () => {
    if (!bet || bet <= 0) {
      showError(t('请输入下注金额'));
      return;
    }

    setRolling(true);
    setResult(null);
    setNetProfit(null);
    setPayout(null);

    const body = { bet, bet_type: betType };
    if (betType === 'exact') body.bet_value = betValue;

    try {
      const res = await API.post('/api/casino/dice/roll', body);
      // Let the rolling animation play for a moment
      await new Promise((r) => setTimeout(r, 800));

      if (res.data.success) {
        const d = res.data.data;
        setDice(d.dice || [1, 1]);
        setDiceTotal(d.total);
        setResult(d.result);
        setNetProfit(d.net_profit);
        setPayout(d.payout);
        setHasRolled(true);
        refreshBalance();
        loadHistory();
        if (d.new_achievements?.length > 0) {
          setNewAchievements(d.new_achievements);
        }
      } else {
        showError(res.data.message || t('投骰子失败'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('投骰子失败'));
    } finally {
      setRolling(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await API.get('/api/casino/history?per_page=10&game_type=dice', { disableDuplicate: true });
      if (res.data.success) setHistory(res.data.data?.records || []);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/console/hogwarts/casino')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading text-text-primary flex items-center gap-2">
              <Dices className="h-5 w-5 text-[#C5A55A]" />
              {t('魔法骰子')}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{t('余额')}</p>
          <p className="text-lg font-heading text-[#C5A55A]">{renderQuota(balance)}</p>
        </div>
      </div>

      {/* Dice Display Area */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-b from-[#2D1B4E]/90 to-[#2D1B4E]/70 dark:from-[#2D1B4E]/60 dark:to-[#2D1B4E]/40 p-8 flex flex-col items-center min-h-[240px] justify-center">
          <DicePair
            dice={dice}
            rolling={rolling}
            size="lg"
            result={hasRolled && !rolling ? result : undefined}
          />

          {/* Total */}
          {hasRolled && !rolling && diceTotal != null && (
            <div className="mt-4 text-center">
              <p className="text-2xl font-heading text-white">{diceTotal}</p>
              <p className="text-xs text-white/40 uppercase">{t('总点数')}</p>
            </div>
          )}

          {!hasRolled && !rolling && (
            <p className="mt-4 text-sm text-white/30">{t('选择下注类型后投骰子')}</p>
          )}

          {/* Result */}
          {hasRolled && !rolling && result && (
            <div className="mt-3 text-center space-y-1">
              <p className={cn(
                'text-lg font-heading',
                result === 'win' ? 'text-[#C5A55A]' : result === 'lose' ? 'text-green-400' : 'text-white/60',
              )}>
                {t(RESULT_MESSAGES[result])}
              </p>
              {netProfit != null && (
                <p className={cn(
                  'text-sm',
                  netProfit >= 0 ? 'text-red-400' : 'text-green-400',
                )}>
                  {netProfit >= 0 ? '+' : ''}{renderQuota(netProfit)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-4">
          {/* Bet Type Selector */}
          <div>
            <p className="text-xs text-text-tertiary mb-2 uppercase tracking-wider">{t('下注类型')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BET_TYPES.map((bt) => (
                <button
                  key={bt.key}
                  onClick={() => setBetType(bt.key)}
                  disabled={rolling}
                  className={cn(
                    'rounded-lg border p-3 text-center transition-all duration-150',
                    betType === bt.key
                      ? 'border-[#C5A55A] bg-[#C5A55A]/10 text-text-primary ring-1 ring-[#C5A55A]/30'
                      : 'border-border bg-surface hover:bg-surface-hover text-text-secondary',
                    rolling && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="block text-base font-heading">{t(bt.label)}</span>
                  <span className="block text-[10px] text-text-tertiary mt-0.5">{t(bt.desc)}</span>
                  {bt.payout && (
                    <Badge variant="outline" size="sm" className="mt-1.5">{bt.payout}</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Exact Number Picker */}
          {betType === 'exact' && (
            <div>
              <p className="text-xs text-text-tertiary mb-2">{t('选择数字')} (2-12)</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }, (_, i) => i + 2).map((num) => (
                  <button
                    key={num}
                    onClick={() => setBetValue(num)}
                    disabled={rolling}
                    className={cn(
                      'w-9 h-9 rounded-lg border text-sm font-medium transition-all',
                      betValue === num
                        ? 'border-[#C5A55A] bg-[#C5A55A]/10 text-[#C5A55A]'
                        : 'border-border bg-surface hover:bg-surface-hover text-text-secondary',
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">
                {t('赔率')}: {EXACT_PAYOUTS[betValue] || '?'}
              </p>
            </div>
          )}

          {/* Bet Amount */}
          <BetControls
            value={bet}
            onChange={setBet}
            minBet={config?.min_bet}
            maxBet={config?.max_bet}
            balance={balance}
            disabled={rolling}
          />

          {/* Roll Button */}
          <Button
            className="w-full h-11 text-base bg-gradient-to-r from-[#2D1B4E] to-[#3D2B5E] hover:from-[#3D2B5E] hover:to-[#4D3B6E] text-[#C5A55A] border border-[#C5A55A]/30"
            onClick={rollDice}
            loading={rolling}
            disabled={!bet || bet <= 0}
          >
            <Dices className="h-4 w-4 mr-2" />
            {t('投骰子')}
          </Button>
        </div>
      </Card>

      {/* Payout Table */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowPayoutTable((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
        >
          <span>{t('赔率表')}</span>
          {showPayoutTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showPayoutTable && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">{t('大')} ({'>'}= 8)</span>
                <span className="text-text-primary font-medium">1:1</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">{t('小')} ({'<'}= 6)</span>
                <span className="text-text-primary font-medium">1:1</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-secondary">{t('幸运7')} (= 7)</span>
                <span className="text-text-primary font-medium">4:1</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1.5">{t('猜数字赔率')}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
                {Object.entries(EXACT_PAYOUTS).map(([num, pay]) => (
                  <div key={num} className="flex justify-between py-1 px-2 rounded bg-surface-hover">
                    <span className="text-text-secondary">{num}</span>
                    <span className="text-text-primary font-medium">{pay}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Recent Rolls */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">{t('最近记录')}</h3>
          <div className="space-y-2">
            {history.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.result === 'win' ? 'success' : rec.result === 'lose' ? 'danger' : 'outline'}
                    size="sm"
                  >
                    {t(RESULT_MESSAGES[rec.result] || rec.result)}
                  </Badge>
                  <span className="text-text-tertiary">
                    {t('下注')} {renderQuota(rec.bet_amount || 0)}
                  </span>
                </div>
                <span className={cn(
                  'font-medium',
                  (rec.net_profit || 0) >= 0 ? 'text-danger' : 'text-success',
                )}>
                  {(rec.net_profit || 0) >= 0 ? '+' : ''}{renderQuota(rec.net_profit || 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {/* Achievement Toasts */}
      {newAchievements.map((ach, i) => (
        <AchievementToast
          key={`${ach.key || ach.id}-${i}`}
          achievement={ach}
          onClose={() => setNewAchievements((prev) => prev.filter((_, j) => j !== i))}
        />
      ))}
    </div>
  );
}
