import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Spade, RotateCcw } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { PlayingCard, CardHand } from '../../components/casino/playing-card';
import { BetControls } from '../../components/casino/bet-controls';

const STATUS_MESSAGES = {
  betting: '下注开始游戏',
  playing: '你的回合',
  dealer_turn: '庄家回合',
  complete: '游戏结束',
};

const RESULT_MESSAGES = {
  win: '你赢了！',
  lose: '你输了',
  push: '平局',
  blackjack: '黑杰克！',
};

const RESULT_COLORS = {
  win: 'text-[#C5A55A]',
  lose: 'text-success',
  push: 'text-text-secondary',
  blackjack: 'text-[#C5A55A]',
};

export default function CasinoBlackjack() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);

  // Game state
  const [gameId, setGameId] = useState(null);
  const [playerHands, setPlayerHands] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerTotals, setPlayerTotals] = useState([]);
  const [dealerTotal, setDealerTotal] = useState(null);
  const [dealerShowing, setDealerShowing] = useState(null);
  const [currentHand, setCurrentHand] = useState(0);
  const [status, setStatus] = useState('betting');
  const [result, setResult] = useState(null);
  const [payout, setPayout] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [bets, setBets] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

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
        API.get('/api/casino/history?per_page=5&game_type=blackjack'),
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
    setActionLoading(true);
    try {
      const res = await API.post('/api/casino/blackjack/deal', { bet });
      if (res.data.success) {
        const d = res.data.data;
        setGameId(d.game_id);
        setPlayerHands(d.player_hands || []);
        setDealerHand(d.dealer_hand || []);
        setPlayerTotals(d.player_total != null ? [d.player_total] : []);
        setDealerShowing(d.dealer_showing);
        setDealerTotal(null);
        setCurrentHand(0);
        setBets(d.bets || [bet]);
        setResult(null);
        setPayout(null);
        setNetProfit(null);

        if (d.status === 'complete') {
          setStatus('complete');
          setResult(d.result);
          setPayout(d.payout);
          setNetProfit(d.net_profit);
          refreshBalance();
          loadHistory();
        } else {
          setStatus(d.status === 'active' ? 'playing' : (d.status || 'playing'));
        }

        refreshBalance();
      } else {
        showError(res.data.message || t('发牌失败'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('发牌失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const doAction = async (action) => {
    if (!gameId) return;
    setActionLoading(true);
    try {
      const res = await API.post('/api/casino/blackjack/action', { game_id: gameId, action });
      if (res.data.success) {
        const d = res.data.data;
        if (d.player_hands) setPlayerHands(d.player_hands);
        if (d.dealer_hand) setDealerHand(d.dealer_hand);
        if (d.player_totals) setPlayerTotals(d.player_totals);
        if (d.dealer_total != null) setDealerTotal(d.dealer_total);
        if (d.current_hand != null) setCurrentHand(d.current_hand);
        if (d.bets) setBets(d.bets);
        setStatus(d.status === 'active' ? 'playing' : (d.status || 'playing'));

        if (d.status === 'complete') {
          setResult(d.result);
          setPayout(d.payout);
          setNetProfit(d.net_profit);
          refreshBalance();
          loadHistory();
        }
      } else {
        showError(res.data.message || t('操作失败'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('操作失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await API.get('/api/casino/history?per_page=5&game_type=blackjack', { disableDuplicate: true });
      if (res.data.success) setHistory(res.data.data?.records || []);
    } catch {}
  };

  const resetGame = () => {
    setGameId(null);
    setPlayerHands([]);
    setDealerHand([]);
    setPlayerTotals([]);
    setDealerTotal(null);
    setDealerShowing(null);
    setCurrentHand(0);
    setStatus('betting');
    setResult(null);
    setPayout(null);
    setNetProfit(null);
    setBets([]);
    refreshBalance();
  };

  // Determine valid actions
  const canHit = status === 'playing';
  const canStand = status === 'playing';
  const canDouble = status === 'playing' && playerHands.length > 0 &&
    playerHands[currentHand]?.length === 2 && balance >= (bets[currentHand] || bet);
  const canSplit = status === 'playing' && playerHands.length === 1 &&
    playerHands[0]?.length === 2 &&
    playerHands[0][0]?.rank === playerHands[0][1]?.rank &&
    balance >= (bets[0] || bet);

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
              <Spade className="h-5 w-5 text-[#C5A55A]" />
              {t('魔法21点')}
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

          {/* Dealer Section */}
          <div className="text-center mb-6">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2">{t('魔法庄家')}</p>
            {dealerHand.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <CardHand
                  cards={dealerHand}
                  faceDownIndices={status !== 'complete' && dealerHand.length === 2 ? [1] : []}
                  animateIn
                  result={status === 'complete' ? (result === 'lose' ? 'win' : result === 'win' ? '' : '') : undefined}
                />
                <span className="text-xs text-white/70 font-medium">
                  {status === 'complete' && dealerTotal != null
                    ? `${t('点数')}: ${dealerTotal}`
                    : dealerShowing != null
                      ? `${t('明牌')}: ${dealerShowing}`
                      : ''
                  }
                </span>
              </div>
            ) : (
              <div className="h-[84px] flex items-center justify-center">
                <span className="text-white/30 text-sm">{t('等待发牌...')}</span>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center my-4">
            {status === 'complete' && result ? (
              <div className="space-y-1">
                <p className={cn('text-xl font-heading', RESULT_COLORS[result])}>
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
            ) : (
              <p className="text-sm text-white/60">
                {t(STATUS_MESSAGES[status] || '')}
              </p>
            )}
          </div>

          {/* Player Section */}
          <div className="text-center mt-auto">
            {playerHands.length > 0 ? (
              <div className="space-y-3">
                {playerHands.map((hand, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    {playerHands.length > 1 && (
                      <span className={cn(
                        'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full',
                        idx === currentHand && status === 'playing'
                          ? 'bg-[#C5A55A]/20 text-[#C5A55A]'
                          : 'text-white/40',
                      )}>
                        {t('手牌')} {idx + 1}
                      </span>
                    )}
                    <CardHand
                      cards={hand}
                      animateIn
                      result={status === 'complete' ? result : undefined}
                    />
                    <span className="text-xs text-white/70 font-medium">
                      {playerTotals[idx] != null ? `${t('点数')}: ${playerTotals[idx]}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[84px] flex items-center justify-center">
                <span className="text-white/30 text-sm">{t('下注后发牌')}</span>
              </div>
            )}
            <p className="text-xs text-white/50 uppercase tracking-wider mt-3">{t('你的手牌')}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border">
          {status === 'betting' ? (
            <div className="space-y-4">
              <BetControls
                value={bet}
                onChange={setBet}
                minBet={config?.min_bet}
                maxBet={config?.max_bet}
                balance={balance}
                disabled={actionLoading}
              />
              <Button
                className="w-full h-11 text-base bg-gradient-to-r from-[#2D1B4E] to-[#3D2B5E] hover:from-[#3D2B5E] hover:to-[#4D3B6E] text-[#C5A55A] border border-[#C5A55A]/30"
                onClick={deal}
                loading={actionLoading}
                disabled={!bet || bet <= 0}
              >
                <Spade className="h-4 w-4 mr-2" />
                {t('发牌')}
              </Button>
            </div>
          ) : status === 'complete' ? (
            <Button
              className="w-full h-11 text-base"
              onClick={resetGame}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('再来一局')}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm font-medium text-[#C5A55A] animate-pulse">
                {t('轮到你了 — 请选择要牌或停牌')}
              </p>
              <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1"
                onClick={() => doAction('hit')}
                disabled={!canHit || actionLoading}
                loading={actionLoading}
              >
                {t('要牌')}
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => doAction('stand')}
                disabled={!canStand || actionLoading}
              >
                {t('停牌')}
              </Button>
              {canDouble && (
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => doAction('double')}
                  disabled={actionLoading}
                >
                  {t('加倍')}
                </Button>
              )}
              {canSplit && (
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => doAction('split')}
                  disabled={actionLoading}
                >
                  {t('分牌')}
                </Button>
              )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Hands */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">{t('最近记录')}</h3>
          <div className="space-y-2">
            {history.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.result === 'win' || rec.result === 'blackjack' ? 'success' : rec.result === 'lose' ? 'danger' : 'outline'}
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
