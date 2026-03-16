import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, RotateCcw } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge, Input } from '../../components/ui';
import { PlayingCard, CardHand } from '../../components/casino/playing-card';
import { BetControls } from '../../components/casino/bet-controls';

const PHASE_NAMES = {
  preflop: '\u7FFB\u724C\u524D',
  flop: '\u7FFB\u724C',
  turn: '\u8F6C\u724C',
  river: '\u6CB3\u724C',
  showdown: '\u644A\u724C',
  complete: '\u6E38\u620F\u7ED3\u675F',
};

const HAND_RANKS = {
  royal_flush: '\u7687\u5BB6\u540C\u82B1\u987A',
  straight_flush: '\u540C\u82B1\u987A',
  four_of_a_kind: '\u56DB\u6761',
  full_house: '\u846B\u82A6',
  flush: '\u540C\u82B1',
  straight: '\u987A\u5B50',
  three_of_a_kind: '\u4E09\u6761',
  two_pair: '\u4E24\u5BF9',
  one_pair: '\u4E00\u5BF9',
  high_card: '\u9AD8\u724C',
};

const AI_PLAYERS = {
  1: { name: '\u5F17\u96F7\u5FB7', style: '\u6FC0\u8FDB\u578B', styleColor: 'bg-red-500/20 text-red-400' },
  2: { name: '\u4E54\u6CBB', style: '\u4FDD\u5B88\u578B', styleColor: 'bg-blue-500/20 text-blue-400' },
  3: { name: '\u5362\u5A1C', style: '\u5E73\u8861\u578B', styleColor: 'bg-purple-500/20 text-purple-400' },
};

const RESULT_MESSAGES = {
  win: '\u4F60\u8D62\u4E86\uFF01',
  lose: '\u4F60\u8F93\u4E86',
};

export default function CasinoPoker() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);

  // Game state
  const [gameId, setGameId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [phase, setPhase] = useState(null);
  const [activePlayer, setActivePlayer] = useState(-1);
  const [status, setStatus] = useState('betting'); // betting | playing | complete
  const [winner, setWinner] = useState(null);
  const [payout, setPayout] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [result, setResult] = useState(null);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [aiActionText, setAiActionText] = useState(null);

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
        API.get('/api/casino/history?per_page=5&game_type=poker'),
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
      const res = await API.get('/api/casino/history?per_page=5&game_type=poker', { disableDuplicate: true });
      if (res.data.success) setHistory(res.data.data?.records || []);
    } catch {}
  };

  const applyGameState = (d) => {
    if (d.players) setPlayers(d.players);
    if (d.community_cards !== undefined) setCommunityCards(d.community_cards || []);
    if (d.pot != null) setPot(d.pot);
    if (d.current_bet != null) setCurrentBet(d.current_bet);
    if (d.phase) setPhase(d.phase);
    if (d.active_player != null) setActivePlayer(d.active_player);

    if (d.status === 'complete' || d.phase === 'complete') {
      setStatus('complete');
      setWinner(d.winner || null);
      setPayout(d.payout || null);
      setNetProfit(d.net_profit || null);
      setResult(d.result || null);
      refreshBalance();
      loadHistory();
    } else {
      setStatus('playing');
    }
  };

  const deal = async () => {
    if (!bet || bet <= 0) {
      showError(t('\u8BF7\u8F93\u5165\u4E0B\u6CE8\u91D1\u989D'));
      return;
    }
    setActionLoading(true);
    setAiActionText(null);
    try {
      const res = await API.post('/api/casino/poker/deal', { bet });
      if (res.data.success) {
        const d = res.data.data;
        setGameId(d.game_id);
        applyGameState(d);
        refreshBalance();
      } else {
        showError(res.data.message || t('\u53D1\u724C\u5931\u8D25'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('\u53D1\u724C\u5931\u8D25'));
    } finally {
      setActionLoading(false);
    }
  };

  const doAction = async (action, extraRaise) => {
    if (!gameId) return;
    setActionLoading(true);
    setAiActionText(null);
    try {
      const body = { game_id: gameId, action };
      if (action === 'raise' && extraRaise) {
        body.raise_amount = extraRaise;
      }

      const res = await API.post('/api/casino/poker/action', body);
      if (res.data.success) {
        applyGameState(res.data.data);
      } else {
        showError(res.data.message || t('\u64CD\u4F5C\u5931\u8D25'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('\u64CD\u4F5C\u5931\u8D25'));
    } finally {
      setActionLoading(false);
    }
  };

  const resetGame = () => {
    setGameId(null);
    setPlayers([]);
    setCommunityCards([]);
    setPot(0);
    setCurrentBet(0);
    setPhase(null);
    setActivePlayer(-1);
    setStatus('betting');
    setWinner(null);
    setPayout(null);
    setNetProfit(null);
    setResult(null);
    setRaiseAmount(0);
    setAiActionText(null);
    refreshBalance();
  };

  // Calculate user's required call amount
  const userPlayer = players[0];
  const callAmount = userPlayer ? Math.max(0, currentBet - (userPlayer.bet || 0)) : 0;
  const canAct = status === 'playing' && activePlayer === 0 && !actionLoading;
  const canRaise = canAct && (userPlayer?.stack || 0) > callAmount;
  const isShowdown = phase === 'showdown' || phase === 'complete' || status === 'complete';

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
              <Users className="h-5 w-5 text-[#C5A55A]" />
              {t('魔法德州扑克')}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{t('\u4F59\u989D')}</p>
          <p className="text-lg font-heading text-[#C5A55A]">{renderQuota(balance)}</p>
        </div>
      </div>

      {/* Poker Table */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-b from-[#1B4332]/90 to-[#1B4332]/70 dark:from-[#1B4332]/60 dark:to-[#1B4332]/40 p-4 sm:p-6 min-h-[480px] flex flex-col relative">

          {/* Phase Indicator */}
          {phase && (
            <div className="text-center mb-2">
              <Badge className="bg-white/10 text-white/80 border-white/20">
                {t(PHASE_NAMES[phase] || phase)}
              </Badge>
            </div>
          )}

          {/* Top Player - Fred (index 1) */}
          {players[1] && (
            <div className="flex justify-center mb-4">
              <PlayerSeat
                player={players[1]}
                index={1}
                isActive={activePlayer === 1}
                isShowdown={isShowdown}
                t={t}
              />
            </div>
          )}

          {/* Middle Row: George (left) - Community Cards + Pot - Luna (right) */}
          <div className="flex items-center justify-between gap-2 my-4 flex-1">
            {/* George - left */}
            {players[2] && (
              <div className="hidden sm:flex flex-col items-center">
                <PlayerSeat
                  player={players[2]}
                  index={2}
                  isActive={activePlayer === 2}
                  isShowdown={isShowdown}
                  t={t}
                  compact
                />
              </div>
            )}

            {/* Center: Pot + Community Cards */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Pot */}
              {pot > 0 && (
                <div className="text-center mb-3">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">{t('\u5E95\u6C60')}</p>
                  <p className="text-lg font-heading text-[#C5A55A]">{renderQuota(pot)}</p>
                </div>
              )}

              {/* Community Cards */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 min-h-[84px]">
                {communityCards.length > 0 ? (
                  communityCards.map((card, i) => (
                    <div key={i} style={{ animationDelay: `${i * 0.12}s` }}>
                      <PlayingCard
                        rank={card.rank}
                        suit={card.suit}
                        animateIn
                      />
                    </div>
                  ))
                ) : status === 'playing' ? (
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-[52px] h-[74px] sm:w-[60px] sm:h-[84px] rounded-lg border border-white/10 bg-white/5"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-[84px] flex items-center justify-center">
                    <span className="text-white/30 text-sm">{t('\u4E0B\u6CE8\u540E\u53D1\u724C')}</span>
                  </div>
                )}
              </div>

              {/* Current Bet */}
              {status === 'playing' && currentBet > 0 && (
                <p className="text-xs text-white/40 mt-2">
                  {t('\u5F53\u524D\u4E0B\u6CE8')}: {renderQuota(currentBet)}
                </p>
              )}
            </div>

            {/* Luna - right */}
            {players[3] && (
              <div className="hidden sm:flex flex-col items-center">
                <PlayerSeat
                  player={players[3]}
                  index={3}
                  isActive={activePlayer === 3}
                  isShowdown={isShowdown}
                  t={t}
                  compact
                />
              </div>
            )}
          </div>

          {/* Mobile: George + Luna below community cards */}
          {(players[2] || players[3]) && (
            <div className="flex sm:hidden justify-center gap-4 mb-3">
              {players[2] && (
                <PlayerSeat
                  player={players[2]}
                  index={2}
                  isActive={activePlayer === 2}
                  isShowdown={isShowdown}
                  t={t}
                  compact
                />
              )}
              {players[3] && (
                <PlayerSeat
                  player={players[3]}
                  index={3}
                  isActive={activePlayer === 3}
                  isShowdown={isShowdown}
                  t={t}
                  compact
                />
              )}
            </div>
          )}

          {/* Result Overlay */}
          {status === 'complete' && result && (
            <div className="text-center my-3 space-y-1">
              <p className={cn(
                'text-xl font-heading',
                result === 'win' ? 'text-[#C5A55A]' : 'text-green-400',
              )}>
                {t(RESULT_MESSAGES[result])}
              </p>
              {winner && (
                <p className="text-sm text-white/70">
                  {t(winner)} {t('\u8D62\u5F97\u5E95\u6C60')}
                </p>
              )}
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

          {/* Bottom: User (index 0) */}
          {players[0] && (
            <div className="flex justify-center mt-auto pt-3">
              <PlayerSeat
                player={players[0]}
                index={0}
                isActive={activePlayer === 0}
                isShowdown={isShowdown}
                isUser
                t={t}
              />
            </div>
          )}

          {/* AI action notification */}
          {aiActionText && (
            <div className="absolute top-3 right-3 bg-black/60 text-white/90 text-xs px-3 py-1.5 rounded-lg animate-[fade-in_0.2s_ease-out]">
              {aiActionText}
            </div>
          )}

          {/* Turn indicator */}
          {status === 'playing' && (
            <div className={cn(
              'absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-4 py-2 rounded-lg flex items-center gap-2',
              activePlayer === 0
                ? 'bg-[#C5A55A]/20 text-[#C5A55A] ring-1 ring-[#C5A55A]/40'
                : 'bg-black/50 text-white/70',
            )}>
              {activePlayer === 0 ? (
                <span className="font-medium animate-pulse">{t('轮到你了')}</span>
              ) : activePlayer > 0 && activePlayer <= 3 ? (
                <span className="animate-[thinking-pulse_1s_ease-in-out_infinite]">
                  {t(AI_PLAYERS[activePlayer]?.name || '')} {t('思考中...')}
                </span>
              ) : null}
            </div>
          )}
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
                className="w-full h-11 text-base bg-gradient-to-r from-[#1B4332] to-[#2B5342] hover:from-[#2B5342] hover:to-[#3B6352] text-[#C5A55A] border border-[#C5A55A]/30"
                onClick={deal}
                loading={actionLoading}
                disabled={!bet || bet <= 0}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('\u53D1\u724C')}
              </Button>
            </div>
          ) : status === 'complete' ? (
            <Button
              className="w-full h-11 text-base"
              onClick={resetGame}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('\u518D\u6765\u4E00\u5C40')}
            </Button>
          ) : canAct ? (
            <div className="space-y-3">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  className="flex-1 bg-red-600/80 hover:bg-red-600 text-white"
                  onClick={() => doAction('fold')}
                  disabled={actionLoading}
                >
                  {t('\u5F03\u724C')}
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => doAction('call')}
                  disabled={actionLoading}
                  loading={actionLoading}
                >
                  {t('\u8DDF\u6CE8')} {callAmount > 0 ? renderQuota(callAmount) : ''}
                </Button>
                {canRaise && (
                  <Button
                    className="flex-1 bg-[#C5A55A]/80 hover:bg-[#C5A55A] text-[#2D1B4E]"
                    onClick={() => doAction('raise', raiseAmount || currentBet * 2)}
                    disabled={actionLoading || !raiseAmount}
                  >
                    {t('\u52A0\u6CE8')}
                  </Button>
                )}
                <Button
                  className="flex-1 bg-gradient-to-r from-[#C5A55A] to-[#D4B46A] text-[#2D1B4E] font-medium"
                  onClick={() => doAction('allin')}
                  disabled={actionLoading}
                >
                  {t('\u5168\u4E0B')}
                </Button>
              </div>

              {/* Raise amount input */}
              {canRaise && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary whitespace-nowrap">{t('\u52A0\u6CE8\u91D1\u989D')}:</span>
                  <Input
                    type="number"
                    value={raiseAmount || ''}
                    onChange={(e) => setRaiseAmount(parseInt(e.target.value) || 0)}
                    placeholder={renderQuota(currentBet * 2)}
                    className="flex-1"
                    disabled={actionLoading}
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setRaiseAmount(currentBet * 2)}
                      disabled={actionLoading}
                    >
                      2x
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setRaiseAmount(currentBet * 3)}
                      disabled={actionLoading}
                    >
                      3x
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setRaiseAmount(pot)}
                      disabled={actionLoading}
                    >
                      {t('\u5E95\u6C60')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Turn indicator */}
              <p className="text-xs text-center text-[#C5A55A] font-medium animate-pulse">{t('轮到你了 — 请选择操作')}</p>
            </div>
          ) : status === 'playing' ? (
            <div className="text-center py-3">
              <p className="text-sm text-text-tertiary animate-[thinking-pulse_1s_ease-in-out_infinite]">
                {activePlayer > 0 && activePlayer <= 3
                  ? `${t(AI_PLAYERS[activePlayer]?.name || '')} ${t('思考中...')}`
                  : t('思考中...')}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Recent Hands */}
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

/* ========================================
   Player Seat Component
   ======================================== */
function PlayerSeat({ player, index, isActive, isShowdown, isUser = false, t, compact = false }) {
  const ai = AI_PLAYERS[index];
  const isFolded = player.folded;
  const showCards = isUser || isShowdown;
  const cards = player.cards || [];
  const hasGame = isActive || isShowdown || player.bet > 0 || cards.length > 0;

  return (
    <div className={cn(
      'flex flex-col items-center gap-1.5 rounded-xl p-2 sm:p-3 transition-all duration-300 min-w-[80px] sm:min-w-[100px]',
      isActive && !isFolded && 'bg-white/10 ring-1 ring-[#C5A55A]/50',
      isFolded && 'opacity-40',
      isShowdown && player.hand_rank && !isFolded && 'ring-1 ring-[#C5A55A]/30',
    )}>
      {/* Name + Style Badge */}
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'text-xs font-medium',
          isUser ? 'text-[#C5A55A]' : 'text-white/80',
        )}>
          {isUser ? t('\u4F60') : t(ai?.name || player.name)}
        </span>
        {ai && !compact && (
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', ai.styleColor)}>
            {t(ai.style)}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex items-center">
        {cards.length > 0 && showCards ? (
          <CardHand
            cards={cards}
            animateIn
            result={isShowdown && !isFolded ? (player.hand_rank ? 'win' : undefined) : undefined}
          />
        ) : hasGame && !isFolded ? (
          <div className="flex">
            <PlayingCard faceDown animateIn />
            <div className="-ml-4 sm:-ml-5">
              <PlayingCard faceDown animateIn />
            </div>
          </div>
        ) : null}
      </div>

      {/* Hand Rank (at showdown) */}
      {isShowdown && player.hand_rank && !isFolded && (
        <Badge size="sm" className="bg-[#C5A55A]/20 text-[#C5A55A] border-[#C5A55A]/30 text-[10px]">
          {t(HAND_RANKS[player.hand_rank] || player.hand_rank)}
        </Badge>
      )}

      {/* Folded indicator */}
      {isFolded && (
        <span className="text-[10px] text-white/40 uppercase">{t('\u5F03\u724C')}</span>
      )}

      {/* Stack + Bet */}
      <div className="text-center">
        {!compact && (
          <p className="text-[10px] text-white/50">{renderQuota(player.stack || 0)}</p>
        )}
        {player.bet > 0 && (
          <p className="text-[10px] text-[#C5A55A]/70">
            {t('\u4E0B\u6CE8')}: {renderQuota(player.bet)}
          </p>
        )}
      </div>
    </div>
  );
}
