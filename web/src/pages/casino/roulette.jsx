import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CircleDot } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { BetControls } from '../../components/casino/bet-controls';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const getNumberColor = (n) => {
  if (n === 0) return 'green';
  return RED_NUMBERS.includes(n) ? 'red' : 'black';
};

const COLOR_CLASSES = {
  red: 'bg-red-600 text-white',
  black: 'bg-gray-800 text-white',
  green: 'bg-emerald-600 text-white',
};

const BET_CATEGORIES = {
  inside: [
    { key: 'number', label: '单号', payout: '35:1' },
  ],
  outside: [
    { key: 'red', label: '红色', payout: '1:1' },
    { key: 'black', label: '黑色', payout: '1:1' },
    { key: 'odd', label: '奇数', payout: '1:1' },
    { key: 'even', label: '偶数', payout: '1:1' },
    { key: 'high', label: '大(19-36)', payout: '1:1' },
    { key: 'low', label: '小(1-18)', payout: '1:1' },
  ],
  dozens: [
    { key: 'dozen1', label: '第一打', desc: '1-12', payout: '2:1' },
    { key: 'dozen2', label: '第二打', desc: '13-24', payout: '2:1' },
    { key: 'dozen3', label: '第三打', desc: '25-36', payout: '2:1' },
  ],
  columns: [
    { key: 'column1', label: '第一列', desc: '1,4,7...34', payout: '2:1' },
    { key: 'column2', label: '第二列', desc: '2,5,8...35', payout: '2:1' },
    { key: 'column3', label: '第三列', desc: '3,6,9...36', payout: '2:1' },
  ],
};

const RESULT_MESSAGES = {
  win: '你赢了！',
  lose: '你输了',
};

export default function CasinoRoulette() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);

  // Bet selection
  const [betType, setBetType] = useState('red');
  const [betNumber, setBetNumber] = useState(null);

  // Spin state
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [winningNumber, setWinningNumber] = useState(null);
  const [winningColor, setWinningColor] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [hasSpun, setHasSpun] = useState(false);

  // History
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [configRes, userRes, histRes] = await Promise.all([
        API.get('/api/casino/config'),
        API.get('/api/user/self', { skipErrorHandler: true }),
        API.get('/api/casino/history?per_page=15&game_type=roulette'),
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

  const spin = async () => {
    if (!bet || bet <= 0) {
      showError(t('请输入下注金额'));
      return;
    }
    if (betType === 'number' && betNumber == null) {
      showError(t('选择下注位置'));
      return;
    }

    setSpinning(true);
    setResult(null);
    setNetProfit(null);

    const body = { bet, bet_type: betType };
    if (betType === 'number') body.bet_number = betNumber;

    try {
      const res = await API.post('/api/casino/roulette/spin', body);
      await new Promise((r) => setTimeout(r, 1200));

      if (res.data.success) {
        const d = res.data.data;
        setWinningNumber(d.winning_number);
        setWinningColor(d.color);
        setResult(d.result);
        setNetProfit(d.net_profit);
        setHasSpun(true);
        refreshBalance();
        loadHistory();
      } else {
        showError(res.data.message || t('旋转失败'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('旋转失败'));
    } finally {
      setSpinning(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await API.get('/api/casino/history?per_page=15&game_type=roulette', { disableDuplicate: true });
      if (res.data.success) setHistory(res.data.data?.records || []);
    } catch {}
  };

  const selectNumber = (num) => {
    setBetType('number');
    setBetNumber(num);
  };

  const selectOutsideBet = (key) => {
    setBetType(key);
    setBetNumber(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  // Build a 3-column grid for the number board (standard roulette table layout)
  // Row 1: 3,6,9,...,36  Row 2: 2,5,8,...,35  Row 3: 1,4,7,...,34
  const rows = [
    Array.from({ length: 12 }, (_, i) => (i + 1) * 3),       // 3,6,9...36
    Array.from({ length: 12 }, (_, i) => (i + 1) * 3 - 1),   // 2,5,8...35
    Array.from({ length: 12 }, (_, i) => (i + 1) * 3 - 2),   // 1,4,7...34
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/console/casino')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading text-text-primary flex items-center gap-2">
              <CircleDot className="h-5 w-5 text-[#C5A55A]" />
              {t('魔法轮盘')}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{t('余额')}</p>
          <p className="text-lg font-heading text-[#C5A55A]">{renderQuota(balance)}</p>
        </div>
      </div>

      {/* Wheel Display Area */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-b from-[#2D1B4E]/90 to-[#2D1B4E]/70 dark:from-[#2D1B4E]/60 dark:to-[#2D1B4E]/40 p-8 flex flex-col items-center min-h-[260px] justify-center relative">
          {/* Spinning indicator */}
          {spinning && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32">
                {/* Spinning wheel ring */}
                <div className="absolute inset-0 rounded-full border-4 border-[#C5A55A]/30 animate-[spin_0.6s_linear_infinite]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-[#C5A55A]" />
                </div>
                {/* Inner decorative ring of numbers */}
                <div className="absolute inset-3 rounded-full border-2 border-white/10 animate-[spin_0.8s_linear_infinite_reverse]" />
                <div className="absolute inset-6 rounded-full bg-[#1B4332]/60 flex items-center justify-center">
                  <span className="text-white/40 text-sm font-heading">?</span>
                </div>
              </div>
              <p className="text-sm text-white/50">{t('旋转轮盘')}...</p>
            </div>
          )}

          {/* Winning number display */}
          {!spinning && hasSpun && winningNumber != null && (
            <div className="flex flex-col items-center gap-3 animate-[scale-in_0.4s_ease-out]">
              <p className="text-xs text-white/40 uppercase tracking-wider">{t('开奖号码')}</p>
              <div
                className={cn(
                  'w-24 h-24 rounded-full flex items-center justify-center text-4xl font-heading shadow-lg transition-all',
                  winningColor === 'red' && 'bg-red-600 text-white shadow-red-600/30',
                  winningColor === 'black' && 'bg-gray-800 text-white shadow-gray-800/30',
                  winningColor === 'green' && 'bg-emerald-600 text-white shadow-emerald-600/30',
                  result === 'win' && 'ring-4 ring-[#C5A55A] shadow-[0_0_30px_rgba(197,165,90,0.4)]',
                )}
              >
                {winningNumber}
              </div>

              {/* Result */}
              <div className="text-center space-y-1 mt-2">
                <p className={cn(
                  'text-lg font-heading',
                  result === 'win' ? 'text-[#C5A55A]' : 'text-green-400',
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
            </div>
          )}

          {/* Initial state */}
          {!spinning && !hasSpun && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/5">
                <CircleDot className="h-10 w-10 text-white/20" />
              </div>
              <p className="text-sm text-white/30">{t('选择下注位置')}</p>
            </div>
          )}
        </div>

        {/* Betting Grid */}
        <div className="p-4 border-t border-border space-y-4">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">{t('选择下注位置')}</p>

          {/* Number grid with zero */}
          <div className="space-y-1">
            {/* Zero button */}
            <div className="flex gap-1">
              <button
                onClick={() => selectNumber(0)}
                disabled={spinning}
                className={cn(
                  'h-9 w-12 rounded text-xs font-bold transition-all',
                  COLOR_CLASSES.green,
                  betType === 'number' && betNumber === 0
                    ? 'ring-2 ring-[#C5A55A] shadow-[0_0_8px_rgba(197,165,90,0.4)]'
                    : 'opacity-80 hover:opacity-100',
                  spinning && 'opacity-50 cursor-not-allowed',
                )}
              >
                0
              </button>
            </div>
            {/* Main number grid: 3 rows x 12 cols */}
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map((num) => {
                  const color = getNumberColor(num);
                  const isSelected = betType === 'number' && betNumber === num;
                  return (
                    <button
                      key={num}
                      onClick={() => selectNumber(num)}
                      disabled={spinning}
                      className={cn(
                        'h-9 flex-1 min-w-0 rounded text-xs font-bold transition-all',
                        COLOR_CLASSES[color],
                        isSelected
                          ? 'ring-2 ring-[#C5A55A] shadow-[0_0_8px_rgba(197,165,90,0.4)]'
                          : 'opacity-80 hover:opacity-100',
                        spinning && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Outside bets */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {BET_CATEGORIES.outside.map((bt) => (
              <button
                key={bt.key}
                onClick={() => selectOutsideBet(bt.key)}
                disabled={spinning}
                className={cn(
                  'rounded-lg border p-2.5 text-center transition-all duration-150',
                  betType === bt.key
                    ? 'border-[#C5A55A] bg-[#C5A55A]/10 text-text-primary ring-1 ring-[#C5A55A]/30'
                    : 'border-border bg-surface hover:bg-surface-hover text-text-secondary',
                  spinning && 'opacity-50 cursor-not-allowed',
                  (bt.key === 'red') && betType !== bt.key && 'border-red-600/30',
                  (bt.key === 'black') && betType !== bt.key && 'border-gray-600/30',
                )}
              >
                <span className="block text-xs font-heading">{t(bt.label)}</span>
                <span className="block text-[10px] text-text-tertiary mt-0.5">{bt.payout}</span>
              </button>
            ))}
          </div>

          {/* Dozens */}
          <div className="grid grid-cols-3 gap-1.5">
            {BET_CATEGORIES.dozens.map((bt) => (
              <button
                key={bt.key}
                onClick={() => selectOutsideBet(bt.key)}
                disabled={spinning}
                className={cn(
                  'rounded-lg border p-2.5 text-center transition-all duration-150',
                  betType === bt.key
                    ? 'border-[#C5A55A] bg-[#C5A55A]/10 text-text-primary ring-1 ring-[#C5A55A]/30'
                    : 'border-border bg-surface hover:bg-surface-hover text-text-secondary',
                  spinning && 'opacity-50 cursor-not-allowed',
                )}
              >
                <span className="block text-xs font-heading">{t(bt.label)}</span>
                <span className="block text-[10px] text-text-tertiary mt-0.5">{bt.desc} ({bt.payout})</span>
              </button>
            ))}
          </div>

          {/* Columns */}
          <div className="grid grid-cols-3 gap-1.5">
            {BET_CATEGORIES.columns.map((bt) => (
              <button
                key={bt.key}
                onClick={() => selectOutsideBet(bt.key)}
                disabled={spinning}
                className={cn(
                  'rounded-lg border p-2.5 text-center transition-all duration-150',
                  betType === bt.key
                    ? 'border-[#C5A55A] bg-[#C5A55A]/10 text-text-primary ring-1 ring-[#C5A55A]/30'
                    : 'border-border bg-surface hover:bg-surface-hover text-text-secondary',
                  spinning && 'opacity-50 cursor-not-allowed',
                )}
              >
                <span className="block text-xs font-heading">{t(bt.label)}</span>
                <span className="block text-[10px] text-text-tertiary mt-0.5">{bt.desc} ({bt.payout})</span>
              </button>
            ))}
          </div>

          {/* Current bet display */}
          {betType && (
            <div className="text-xs text-text-secondary text-center py-1">
              {betType === 'number'
                ? betNumber != null
                  ? `${t('单号')} ${betNumber} (35:1)`
                  : t('选择下注位置')
                : `${t(BET_CATEGORIES.outside.find(b => b.key === betType)?.label
                    || BET_CATEGORIES.dozens.find(b => b.key === betType)?.label
                    || BET_CATEGORIES.columns.find(b => b.key === betType)?.label
                    || betType
                  )}`
              }
            </div>
          )}

          {/* Bet Amount */}
          <BetControls
            value={bet}
            onChange={setBet}
            minBet={config?.min_bet}
            maxBet={config?.max_bet}
            balance={balance}
            disabled={spinning}
          />

          {/* Spin Button */}
          <Button
            className="w-full h-11 text-base bg-gradient-to-r from-[#2D1B4E] to-[#3D2B5E] hover:from-[#3D2B5E] hover:to-[#4D3B6E] text-[#C5A55A] border border-[#C5A55A]/30"
            onClick={spin}
            loading={spinning}
            disabled={!bet || bet <= 0 || (betType === 'number' && betNumber == null)}
          >
            <CircleDot className="h-4 w-4 mr-2" />
            {t('旋转轮盘')}
          </Button>
        </div>
      </Card>

      {/* Recent Results */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">{t('最近开奖')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {history.map((rec, i) => {
              const details = rec.game_details;
              const num = details?.winning_number;
              const color = num != null ? getNumberColor(num) : 'black';
              return (
                <div
                  key={rec.id || i}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold animate-[fade-in_0.3s_ease-out]',
                    COLOR_CLASSES[color],
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                  title={`#${num} - ${(rec.net_profit || 0) >= 0 ? '+' : ''}${renderQuota(rec.net_profit || 0)}`}
                >
                  {num != null ? num : '?'}
                </div>
              );
            })}
          </div>

          {/* Detailed history */}
          <div className="mt-3 space-y-2">
            {history.slice(0, 5).map((rec) => (
              <div key={rec.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.result === 'win' ? 'success' : 'danger'}
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
    </div>
  );
}
