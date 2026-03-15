import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Layers, RotateCcw } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { CardHand } from '../../components/casino/playing-card';
import { BetControls } from '../../components/casino/bet-controls';

const BET_TYPES = [
  { key: 'player', label: '闲', fullLabel: '闲家', payout: '1:1', color: 'from-blue-600 to-blue-700' },
  { key: 'tie', label: '和', fullLabel: '和局', payout: '8:1', color: 'from-[#C5A55A] to-[#B8963F]' },
  { key: 'banker', label: '庄', fullLabel: '庄家', payout: '0.95:1', color: 'from-red-600 to-red-700' },
];

const RESULT_MESSAGES = {
  win: '你赢了！',
  lose: '你输了',
  push: '平局',
};

const WINNER_LABELS = {
  player: '闲家',
  banker: '庄家',
  tie: '和局',
};

export default function CasinoBaccarat() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);

  // Bet selection
  const [betType, setBetType] = useState('player');

  // Deal state
  const [dealing, setDealing] = useState(false);
  const [playerCards, setPlayerCards] = useState([]);
  const [bankerCards, setBankerCards] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(null);
  const [bankerTotal, setBankerTotal] = useState(null);
  const [winner, setWinner] = useState(null);
  const [result, setResult] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [hasDealt, setHasDealt] = useState(false);
  const [showResult, setShowResult] = useState(false);

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
        API.get('/api/casino/history?per_page=10&game_type=baccarat'),
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

  const deal = async () => {
    if (!bet || bet <= 0) {
      showError(t('请输入下注金额'));
      return;
    }

    setDealing(true);
    setResult(null);
    setNetProfit(null);
    setShowResult(false);
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerTotal(null);
    setBankerTotal(null);
    setWinner(null);

    try {
      const res = await API.post('/api/casino/baccarat/deal', { bet, bet_type: betType });

      if (res.data.success) {
        const d = res.data.data;
        const pCards = d.player_cards || [];
        const bCards = d.banker_cards || [];

        // Staggered card reveal animation
        // Show first 2 player cards
        await new Promise((r) => setTimeout(r, 400));
        setPlayerCards(pCards.slice(0, 2));

        // Show first 2 banker cards
        await new Promise((r) => setTimeout(r, 600));
        setBankerCards(bCards.slice(0, 2));

        // If there are third cards, show them with delay
        if (pCards.length > 2) {
          await new Promise((r) => setTimeout(r, 500));
          setPlayerCards(pCards);
        }
        if (bCards.length > 2) {
          await new Promise((r) => setTimeout(r, 500));
          setBankerCards(bCards);
        }

        // Show totals and result
        await new Promise((r) => setTimeout(r, 400));
        setPlayerTotal(d.player_total);
        setBankerTotal(d.banker_total);
        setWinner(d.winner);
        setResult(d.result);
        setNetProfit(d.net_profit);
        setHasDealt(true);
        setShowResult(true);

        refreshBalance();
        loadHistory();
      } else {
        showError(res.data.message || t('发牌失败'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('发牌失败'));
    } finally {
      setDealing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await API.get('/api/casino/history?per_page=10&game_type=baccarat', { disableDuplicate: true });
      if (res.data.success) setHistory(res.data.data?.records || []);
    } catch {}
  };

  const resetGame = () => {
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerTotal(null);
    setBankerTotal(null);
    setWinner(null);
    setResult(null);
    setNetProfit(null);
    setShowResult(false);
    setHasDealt(false);
    refreshBalance();
  };

  const isNatural = (total) => total === 8 || total === 9;

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
              <Layers className="h-5 w-5 text-[#C5A55A]" />
              {t('魔法百家乐')}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{t('余额')}</p>
          <p className="text-lg font-heading text-[#C5A55A]">{renderQuota(balance)}</p>
        </div>
      </div>

      {/* Game Table */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-b from-[#1B4332]/90 to-[#1B4332]/70 dark:from-[#1B4332]/60 dark:to-[#1B4332]/40 p-6 min-h-[360px] flex flex-col">
          {/* Card areas: Player and Banker side by side */}
          <div className="flex gap-4 sm:gap-8 justify-center flex-1">
            {/* Player side */}
            <div className={cn(
              'flex-1 flex flex-col items-center max-w-[200px] transition-all duration-500',
              showResult && winner === 'player' && 'scale-[1.02]',
            )}>
              <p className={cn(
                'text-xs uppercase tracking-wider mb-3 px-3 py-1 rounded-full transition-all',
                showResult && winner === 'player'
                  ? 'bg-blue-500/20 text-blue-300 font-medium'
                  : 'text-white/50',
              )}>
                {t('闲家')}
              </p>
              <div className="min-h-[96px] flex items-center justify-center">
                {playerCards.length > 0 ? (
                  <CardHand
                    cards={playerCards}
                    animateIn
                    result={showResult && winner === 'player' ? 'win' : undefined}
                  />
                ) : (
                  <div className="h-[84px] flex items-center justify-center">
                    <span className="text-white/20 text-xs">{t('等待发牌...')}</span>
                  </div>
                )}
              </div>
              {/* Total */}
              {playerTotal != null && (
                <div className={cn(
                  'mt-3 text-center animate-[fade-in_0.3s_ease-out]',
                )}>
                  <span className={cn(
                    'inline-block px-3 py-1 rounded-full text-sm font-heading',
                    showResult && winner === 'player'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-white/10 text-white/70',
                  )}>
                    {playerTotal}
                  </span>
                  {isNatural(playerTotal) && (
                    <p className="text-[10px] text-[#C5A55A] mt-1 font-heading animate-[fade-in_0.3s_ease-out]">
                      {t('天牌！')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* VS / Tie indicator */}
            <div className="flex flex-col items-center justify-center shrink-0">
              {showResult && winner === 'tie' ? (
                <div className="animate-[scale-in_0.4s_ease-out]">
                  <div className="w-12 h-12 rounded-full bg-[#C5A55A]/20 flex items-center justify-center ring-2 ring-[#C5A55A] shadow-[0_0_20px_rgba(197,165,90,0.3)]">
                    <span className="text-[#C5A55A] text-sm font-heading">{t('和')}</span>
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="text-white/30 text-xs font-heading">VS</span>
                </div>
              )}
            </div>

            {/* Banker side */}
            <div className={cn(
              'flex-1 flex flex-col items-center max-w-[200px] transition-all duration-500',
              showResult && winner === 'banker' && 'scale-[1.02]',
            )}>
              <p className={cn(
                'text-xs uppercase tracking-wider mb-3 px-3 py-1 rounded-full transition-all',
                showResult && winner === 'banker'
                  ? 'bg-red-500/20 text-red-300 font-medium'
                  : 'text-white/50',
              )}>
                {t('庄家')}
              </p>
              <div className="min-h-[96px] flex items-center justify-center">
                {bankerCards.length > 0 ? (
                  <CardHand
                    cards={bankerCards}
                    animateIn
                    result={showResult && winner === 'banker' ? 'win' : undefined}
                  />
                ) : (
                  <div className="h-[84px] flex items-center justify-center">
                    <span className="text-white/20 text-xs">{t('等待发牌...')}</span>
                  </div>
                )}
              </div>
              {/* Total */}
              {bankerTotal != null && (
                <div className={cn(
                  'mt-3 text-center animate-[fade-in_0.3s_ease-out]',
                )}>
                  <span className={cn(
                    'inline-block px-3 py-1 rounded-full text-sm font-heading',
                    showResult && winner === 'banker'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-white/10 text-white/70',
                  )}>
                    {bankerTotal}
                  </span>
                  {isNatural(bankerTotal) && (
                    <p className="text-[10px] text-[#C5A55A] mt-1 font-heading animate-[fade-in_0.3s_ease-out]">
                      {t('天牌！')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Result overlay */}
          {showResult && result && (
            <div className="text-center mt-4 animate-[scale-in_0.4s_ease-out]">
              <p className={cn(
                'text-xl font-heading',
                result === 'win' ? 'text-[#C5A55A]' : result === 'lose' ? 'text-red-400' : 'text-white/60',
              )}>
                {t(RESULT_MESSAGES[result])}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {t(WINNER_LABELS[winner])} {t('胜出')}
              </p>
              {netProfit != null && (
                <p className={cn(
                  'text-sm mt-1',
                  netProfit >= 0 ? 'text-green-400' : 'text-red-400',
                )}>
                  {netProfit >= 0 ? '+' : ''}{renderQuota(netProfit)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-4">
          {!showResult ? (
            <>
              {/* Bet Type Selection */}
              <div>
                <p className="text-xs text-text-tertiary mb-2 uppercase tracking-wider">{t('下注类型')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {BET_TYPES.map((bt) => (
                    <button
                      key={bt.key}
                      onClick={() => setBetType(bt.key)}
                      disabled={dealing}
                      className={cn(
                        'rounded-xl border-2 p-4 text-center transition-all duration-200 relative overflow-hidden',
                        betType === bt.key
                          ? 'border-[#C5A55A] ring-1 ring-[#C5A55A]/30 shadow-[0_0_12px_rgba(197,165,90,0.15)]'
                          : 'border-border hover:border-border-strong',
                        dealing && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {/* Colored accent bar */}
                      <div className={cn(
                        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
                        bt.color,
                        betType === bt.key ? 'opacity-100' : 'opacity-30',
                      )} />

                      <span className="block text-2xl font-heading text-text-primary mt-1">{t(bt.label)}</span>
                      <span className="block text-[10px] text-text-tertiary mt-1">{t(bt.fullLabel)}</span>
                      <Badge variant="outline" size="sm" className="mt-2">{bt.payout}</Badge>
                      {bt.key === 'banker' && (
                        <span className="block text-[9px] text-text-tertiary mt-1">{t('佣金5%')}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bet Amount */}
              <BetControls
                value={bet}
                onChange={setBet}
                minBet={config?.min_bet}
                maxBet={config?.max_bet}
                balance={balance}
                disabled={dealing}
              />

              {/* Deal Button */}
              <Button
                className="w-full h-11 text-base bg-gradient-to-r from-[#1B4332] to-[#2D5A47] hover:from-[#2D5A47] hover:to-[#3D6A57] text-[#C5A55A] border border-[#C5A55A]/30"
                onClick={deal}
                loading={dealing}
                disabled={!bet || bet <= 0}
              >
                <Layers className="h-4 w-4 mr-2" />
                {t('发牌')}
              </Button>
            </>
          ) : (
            <Button
              className="w-full h-11 text-base"
              onClick={resetGame}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('再来一局')}
            </Button>
          )}
        </div>
      </Card>

      {/* Recent Hands */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">{t('最近记录')}</h3>
          {/* Quick result strip */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {history.map((rec, i) => {
              const details = rec.game_details;
              const w = details?.winner;
              return (
                <div
                  key={rec.id || i}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold animate-[fade-in_0.3s_ease-out]',
                    w === 'player' && 'bg-blue-600 text-white',
                    w === 'banker' && 'bg-red-600 text-white',
                    w === 'tie' && 'bg-[#C5A55A] text-white',
                    !w && 'bg-gray-500 text-white',
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                  title={`${t(WINNER_LABELS[w] || '?')} - ${(rec.net_profit || 0) >= 0 ? '+' : ''}${renderQuota(rec.net_profit || 0)}`}
                >
                  {w === 'player' ? t('闲') : w === 'banker' ? t('庄') : w === 'tie' ? t('和') : '?'}
                </div>
              );
            })}
          </div>

          {/* Detailed history */}
          <div className="space-y-2">
            {history.slice(0, 5).map((rec) => (
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
                  (rec.net_profit || 0) >= 0 ? 'text-success' : 'text-danger',
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
