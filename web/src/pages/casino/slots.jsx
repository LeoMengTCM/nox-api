import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Joystick, ChevronDown, ChevronUp } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { BetControls } from '../../components/casino/bet-controls';
import { AchievementToast } from '../../components/casino/achievement-toast';

const SYMBOL_DISPLAY = {
  chocolate_frog: { emoji: '\uD83D\uDC38', name: '\u5DE7\u514B\u529B\u86D9' },
  butterbeer: { emoji: '\uD83C\uDF7A', name: '\u9EC4\u6CB9\u5564\u9152' },
  sorting_hat: { emoji: '\uD83C\uDFA9', name: '\u5206\u9662\u5E3D' },
  broomstick: { emoji: '\uD83E\uDDF9', name: '\u98DE\u5929\u626B\u5E1A' },
  owl: { emoji: '\uD83E\uDD89', name: '\u732B\u5934\u9E70' },
  phoenix: { emoji: '\uD83D\uDD25', name: '\u51E4\u51F0' },
  dragon: { emoji: '\uD83D\uDC09', name: '\u706B\u9F99' },
  golden_snitch: { emoji: '\u26A1', name: '\u91D1\u8272\u98DE\u8D3C' },
};

const ALL_SYMBOLS = Object.keys(SYMBOL_DISPLAY);

const PAYOUT_TABLE = [
  { symbol: 'golden_snitch', multiplier: '100x' },
  { symbol: 'dragon', multiplier: '50x' },
  { symbol: 'phoenix', multiplier: '25x' },
  { symbol: 'owl', multiplier: '15x' },
  { symbol: 'broomstick', multiplier: '10x' },
  { symbol: 'sorting_hat', multiplier: '8x' },
  { symbol: 'butterbeer', multiplier: '5x' },
  { symbol: 'chocolate_frog', multiplier: '3x' },
];

const RESULT_MESSAGES = {
  win: '\u4F60\u8D62\u4E86\uFF01',
  lose: '\u4F60\u8F93\u4E86',
};

// Payline coordinate sets: [row, col] for each of 3 positions
const PAYLINE_COORDS = [
  [[0, 0], [0, 1], [0, 2]], // top row
  [[1, 0], [1, 1], [1, 2]], // middle row
  [[2, 0], [2, 1], [2, 2]], // bottom row
  [[0, 0], [1, 1], [2, 2]], // diagonal TL-BR
  [[2, 0], [1, 1], [0, 2]], // diagonal BL-TR
];

export default function CasinoSlots() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);

  // Slot state
  const [grid, setGrid] = useState([
    ['chocolate_frog', 'butterbeer', 'sorting_hat'],
    ['broomstick', 'owl', 'phoenix'],
    ['dragon', 'golden_snitch', 'chocolate_frog'],
  ]);
  const [spinPhase, setSpinPhase] = useState('idle'); // idle | spinning | revealing | result
  const [revealedCols, setRevealedCols] = useState([false, false, false]);
  const [spinningSymbols, setSpinningSymbols] = useState([
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ]);
  const [winningCells, setWinningCells] = useState(new Set());
  const [winningPaylines, setWinningPaylines] = useState([]);
  const [result, setResult] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [totalPayout, setTotalPayout] = useState(null);
  const [freeSpins, setFreeSpins] = useState(0);
  const [showFreeSpin, setShowFreeSpin] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [showPayoutTable, setShowPayoutTable] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);

  // Spin animation interval refs
  const spinIntervals = useRef([null, null, null]);

  useEffect(() => {
    loadInitialData();
    return () => {
      spinIntervals.current.forEach((id) => id && clearInterval(id));
    };
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [configRes, userRes, histRes] = await Promise.all([
        API.get('/api/casino/config'),
        API.get('/api/user/self', { skipErrorHandler: true }),
        API.get('/api/casino/history?per_page=10&game_type=slots'),
      ]);

      if (configRes.data.success) setConfig(configRes.data.data);
      if (userRes.data.success) setBalance(userRes.data.data?.quota || 0);
      if (histRes.data.success) setHistory(histRes.data.data?.records || []);
    } catch {
      showError(t('\u52A0\u8F7D\u5931\u8D25'));
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

  const loadHistory = async () => {
    try {
      const res = await API.get('/api/casino/history?per_page=10&game_type=slots', { disableDuplicate: true });
      if (res.data.success) setHistory(res.data.data?.records || []);
    } catch {}
  };

  const randomSymbol = () => ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)];

  const startSpinAnimation = () => {
    // Rapidly cycle random symbols on each column
    for (let col = 0; col < 3; col++) {
      spinIntervals.current[col] = setInterval(() => {
        setSpinningSymbols((prev) => {
          const next = prev.map((row) => [...row]);
          for (let row = 0; row < 3; row++) {
            next[row][col] = randomSymbol();
          }
          return next;
        });
      }, 80);
    }
  };

  const stopColumn = (col, finalGrid) => {
    return new Promise((resolve) => {
      clearInterval(spinIntervals.current[col]);
      spinIntervals.current[col] = null;
      // Set the final symbols for this column
      setSpinningSymbols((prev) => {
        const next = prev.map((row) => [...row]);
        for (let row = 0; row < 3; row++) {
          next[row][col] = finalGrid[row][col];
        }
        return next;
      });
      setRevealedCols((prev) => {
        const next = [...prev];
        next[col] = true;
        return next;
      });
      resolve();
    });
  };

  const spin = async () => {
    if (!bet || bet <= 0) {
      showError(t('\u8BF7\u8F93\u5165\u4E0B\u6CE8\u91D1\u989D'));
      return;
    }

    // Reset state
    setResult(null);
    setNetProfit(null);
    setTotalPayout(null);
    setWinningCells(new Set());
    setWinningPaylines([]);
    setRevealedCols([false, false, false]);
    setShowFreeSpin(false);
    setSpinPhase('spinning');

    // Start cycling animation
    startSpinAnimation();

    try {
      const res = await API.post('/api/casino/slots/spin', { bet });

      if (res.data.success) {
        const d = res.data.data;
        const finalGrid = d.grid || grid;

        // Wait a moment for the spinning feel
        await new Promise((r) => setTimeout(r, 600));

        // Reveal columns one by one
        setSpinPhase('revealing');

        for (let col = 0; col < 3; col++) {
          await stopColumn(col, finalGrid);
          await new Promise((r) => setTimeout(r, 350));
        }

        // Set actual grid
        setGrid(finalGrid);

        // Calculate winning cells from paylines
        const winCells = new Set();
        if (d.winning_paylines?.length > 0) {
          d.winning_paylines.forEach((pl) => {
            const lineIdx = pl.line - 1;
            if (lineIdx >= 0 && lineIdx < PAYLINE_COORDS.length) {
              PAYLINE_COORDS[lineIdx].forEach(([r, c]) => {
                winCells.add(`${r}-${c}`);
              });
            }
          });
        }

        setSpinPhase('result');
        setWinningCells(winCells);
        setWinningPaylines(d.winning_paylines || []);
        setResult(d.result);
        setNetProfit(d.net_profit);
        setTotalPayout(d.total_payout);
        setHasSpun(true);

        // Handle free spins
        if (d.free_spins > 0) {
          setFreeSpins(d.free_spins);
          setShowFreeSpin(true);
          setTimeout(() => setShowFreeSpin(false), 3000);
        }

        refreshBalance();
        loadHistory();
        if (d.new_achievements?.length > 0) {
          setNewAchievements(d.new_achievements);
        }
      } else {
        setSpinPhase('idle');
        spinIntervals.current.forEach((id) => id && clearInterval(id));
        showError(res.data.message || t('\u65CB\u8F6C\u5931\u8D25'));
      }
    } catch (err) {
      setSpinPhase('idle');
      spinIntervals.current.forEach((id) => id && clearInterval(id));
      showError(err?.response?.data?.message || t('\u65CB\u8F6C\u5931\u8D25'));
    }
  };

  const displayGrid = spinPhase === 'spinning' || spinPhase === 'revealing' ? spinningSymbols : grid;

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
            onClick={() => navigate('/console/casino')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-heading text-text-primary flex items-center gap-2">
              <Joystick className="h-5 w-5 text-[#C5A55A]" />
              {t('\u9B54\u6CD5\u8001\u864E\u673A')}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{t('\u4F59\u989D')}</p>
          <p className="text-lg font-heading text-[#C5A55A]">{renderQuota(balance)}</p>
        </div>
      </div>

      {/* Free Spin Flash */}
      {showFreeSpin && (
        <div className="animate-[scale-in_0.3s_ease-out] bg-gradient-to-r from-[#C5A55A]/20 via-[#C5A55A]/30 to-[#C5A55A]/20 border border-[#C5A55A]/40 rounded-xl p-4 text-center">
          <p className="text-xl font-heading text-[#C5A55A] animate-[golden-glow_1.5s_ease-in-out_infinite]">
            {t('\u514D\u8D39\u65CB\u8F6C\uFF01')}
          </p>
          <p className="text-sm text-[#C5A55A]/70 mt-1">
            {t('\u83B7\u5F97\u514D\u8D39\u65CB\u8F6C')} x{freeSpins}
          </p>
        </div>
      )}

      {/* Slot Machine */}
      <Card className="overflow-hidden">
        {/* Machine Header */}
        <div className="bg-gradient-to-r from-[#2D1B4E] via-[#3D2B5E] to-[#2D1B4E] px-6 py-3 text-center border-b-2 border-[#C5A55A]/40">
          <h2 className="text-lg font-heading text-[#C5A55A] tracking-wide">
            {t('\u97E6\u65AF\u83B1\u9B54\u6CD5\u8D4C\u574A')}
          </h2>
        </div>

        {/* Reel Area */}
        <div className="bg-gradient-to-b from-[#2D1B4E]/90 to-[#2D1B4E]/70 dark:from-[#2D1B4E]/60 dark:to-[#2D1B4E]/40 p-6 sm:p-8">
          {/* 3x3 Grid */}
          <div className="flex justify-center">
            <div className="bg-[#1a0f2e] rounded-xl p-3 sm:p-4 border-2 border-[#C5A55A]/30 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
              <div className="grid grid-rows-3 gap-2">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex gap-2">
                    {[0, 1, 2].map((col) => {
                      const symbol = displayGrid[row]?.[col] || 'chocolate_frog';
                      const info = SYMBOL_DISPLAY[symbol] || SYMBOL_DISPLAY.chocolate_frog;
                      const isWinning = winningCells.has(`${row}-${col}`) && spinPhase === 'result';
                      const isSpinning = spinPhase === 'spinning' || (spinPhase === 'revealing' && !revealedCols[col]);

                      return (
                        <div
                          key={`${row}-${col}`}
                          className={cn(
                            'w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-lg flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 select-none',
                            'bg-[#2a1940] border border-[#C5A55A]/20',
                            isWinning && 'animate-[slot-bounce_0.6s_ease-in-out_infinite] ring-2 ring-[#C5A55A] shadow-[0_0_20px_rgba(197,165,90,0.5)] bg-[#C5A55A]/10',
                            isSpinning && 'animate-[thinking-pulse_0.15s_ease-in-out_infinite]',
                          )}
                        >
                          <span className={cn(
                            'transition-transform duration-150',
                            isWinning && 'scale-110',
                          )}>
                            {info.emoji}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payline Indicators */}
          {spinPhase === 'result' && winningPaylines.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {winningPaylines.map((pl, i) => (
                <Badge
                  key={i}
                  className="bg-[#C5A55A]/20 text-[#C5A55A] border-[#C5A55A]/40"
                >
                  {t('\u4E2D\u5956\u7EBF')} {pl.line} - {pl.multiplier}x
                </Badge>
              ))}
            </div>
          )}

          {/* Result */}
          {hasSpun && spinPhase === 'result' && result && (
            <div className="mt-4 text-center space-y-1">
              <p className={cn(
                'text-xl font-heading',
                result === 'win' ? 'text-[#C5A55A]' : 'text-red-400',
              )}>
                {t(RESULT_MESSAGES[result])}
              </p>
              {totalPayout > 0 && (
                <p className="text-sm text-[#C5A55A]/80">
                  {t('\u603B\u5956\u91D1')}: {renderQuota(totalPayout)}
                </p>
              )}
              {netProfit != null && (
                <p className={cn(
                  'text-sm',
                  netProfit >= 0 ? 'text-green-400' : 'text-red-400',
                )}>
                  {netProfit >= 0 ? '+' : ''}{renderQuota(netProfit)}
                </p>
              )}
            </div>
          )}

          {!hasSpun && spinPhase === 'idle' && (
            <p className="mt-4 text-sm text-white/30 text-center">{t('\u4E0B\u6CE8\u540E\u62C9\u52A8\u62C9\u6746')}</p>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-4">
          <BetControls
            value={bet}
            onChange={setBet}
            minBet={config?.min_bet}
            maxBet={config?.max_bet}
            balance={balance}
            disabled={spinPhase === 'spinning' || spinPhase === 'revealing'}
          />

          {/* Spin Button */}
          <Button
            className="w-full h-12 text-lg bg-gradient-to-r from-[#C5A55A] to-[#D4B46A] hover:from-[#D4B46A] hover:to-[#E3C37A] text-[#2D1B4E] font-heading border border-[#C5A55A]/60 shadow-[0_0_20px_rgba(197,165,90,0.2)] hover:shadow-[0_0_30px_rgba(197,165,90,0.4)] transition-all"
            onClick={spin}
            loading={spinPhase === 'spinning' || spinPhase === 'revealing'}
            disabled={!bet || bet <= 0}
          >
            <Joystick className="h-5 w-5 mr-2" />
            {t('\u62C9\u52A8\u9B54\u6CD5\u62C9\u6746')}
          </Button>
        </div>
      </Card>

      {/* Payout Table */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowPayoutTable((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
        >
          <span>{t('\u8D54\u4ED8\u8868')}</span>
          {showPayoutTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showPayoutTable && (
          <div className="px-4 pb-4">
            <div className="space-y-1.5">
              {PAYOUT_TABLE.map(({ symbol, multiplier }) => {
                const info = SYMBOL_DISPLAY[symbol];
                return (
                  <div key={symbol} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-hover">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.emoji}</span>
                      <span className="text-sm text-text-secondary">{t(info.name)}</span>
                    </div>
                    <span className="text-sm font-medium text-[#C5A55A]">{multiplier}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-text-tertiary space-y-0.5">
              <p>{t('\u4E2D\u5956\u7EBF')}: 5 ({t('\u4E0A\u8FDE\u7EBF')}, {t('\u4E2D\u8FDE\u7EBF')}, {t('\u4E0B\u8FDE\u7EBF')}, {t('\u5BF9\u89D2\u7EBF \u2196\u2198')}, {t('\u5BF9\u89D2\u7EBF \u2199\u2197')})</p>
              <p>{t('\u4E09\u4E2A\u76F8\u540C\u7B26\u53F7\u8FDE\u7EBF\u5373\u83B7\u5956')}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Recent Spins */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">{t('\u6700\u8FD1\u8BB0\u5F55')}</h3>
          <div className="space-y-2">
            {history.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.result === 'win' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {t(RESULT_MESSAGES[rec.result] || rec.result)}
                  </Badge>
                  <span className="text-text-tertiary">
                    {t('\u4E0B\u6CE8')} {renderQuota(rec.bet_amount || 0)}
                  </span>
                </div>
                <span className={cn(
                  'font-medium',
                  (rec.net_profit || 0) >= 0 ? 'text-success' : 'text-danger',
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
