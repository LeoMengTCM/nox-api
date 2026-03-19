import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown,
  Gamepad2, Trophy, Target, Coins,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Spinner, Badge, Button } from '../../components/ui';

const GAME_LABELS = {
  blackjack: '21\u70B9',
  dice: '\u9AB0\u5B50',
  roulette: '\u8F6E\u76D8',
  baccarat: '\u767E\u5BB6\u4E50',
  slots: '\u8001\u864E\u673A',
  poker: '\u5FB7\u5DDE\u624E\u514B',
};

const RESULT_MESSAGES = {
  win: '\u4F60\u8D62\u4E86\uFF01',
  lose: '\u4F60\u8F93\u4E86',
  push: '\u5E73\u5C40',
  blackjack: '\u9ED1\u6770\u514B\uFF01',
};

export default function CasinoStats() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, histRes] = await Promise.all([
        API.get('/api/casino/me'),
        API.get('/api/casino/history?per_page=20'),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (histRes.data.success) setHistory(histRes.data.data?.records || []);
    } catch {
      showError(t('\u52A0\u8F7D\u5931\u8D25'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const winRate = stats?.games_played > 0
    ? ((stats.win_count / stats.games_played) * 100).toFixed(1)
    : '0.0';

  const netProfit = stats?.net_profit || 0;

  // Aggregate per-game stats from history
  const perGame = {};
  history.forEach((rec) => {
    const gt = rec.game_type || 'unknown';
    if (!perGame[gt]) {
      perGame[gt] = { games: 0, wins: 0, net: 0 };
    }
    perGame[gt].games++;
    if (rec.result === 'win' || rec.result === 'blackjack') perGame[gt].wins++;
    perGame[gt].net += rec.net_profit || 0;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
            <BarChart3 className="h-5 w-5 text-[#C5A55A]" />
            {t('\u6211\u7684\u8D4C\u573A\u6570\u636E')}
          </h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={Gamepad2}
          label={t('\u603B\u573A\u6B21')}
          value={stats?.games_played || 0}
          t={t}
        />
        <SummaryCard
          icon={Target}
          label={t('\u80DC\u7387')}
          value={`${winRate}%`}
          color={parseFloat(winRate) >= 50 ? 'text-danger' : 'text-success'}
          t={t}
        />
        <SummaryCard
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          label={t('\u51C0\u76C8\u4E8F')}
          value={renderQuota(netProfit)}
          color={netProfit >= 0 ? 'text-danger' : 'text-success'}
          t={t}
        />
        <SummaryCard
          icon={Trophy}
          label={t('\u6700\u5927\u8D62\u989D')}
          value={renderQuota(stats?.biggest_win || 0)}
          color="text-[#C5A55A]"
          t={t}
        />
      </div>

      {/* Detailed Stats */}
      <Card className="p-5">
        <h3 className="text-base font-heading text-text-primary mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-[#C5A55A]" />
          {t('\u8BE6\u7EC6\u6570\u636E')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label={t('\u603B\u4E0B\u6CE8')} value={renderQuota(stats?.total_wagered || 0)} />
          <DetailRow label={t('\u603B\u8D62\u5F97')} value={renderQuota(stats?.total_won || 0)} valueClass="text-danger" />
          <DetailRow label={t('\u603B\u8F93\u6389')} value={renderQuota(stats?.total_lost || 0)} valueClass="text-success" />
          <DetailRow
            label={t('\u4ECA\u65E5\u76C8\u4E8F')}
            value={renderQuota(-(stats?.daily_loss_today || 0))}
            valueClass={(stats?.daily_loss_today || 0) <= 0 ? 'text-danger' : 'text-success'}
          />
        </div>
      </Card>

      {/* Per-Game Breakdown */}
      {Object.keys(perGame).length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-[#C5A55A]" />
              {t('\u6E38\u620F\u5206\u5E03')}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-text-tertiary uppercase tracking-wider bg-surface-hover">
              <span>{t('\u6E38\u620F')}</span>
              <span className="text-center">{t('\u573A\u6B21')}</span>
              <span className="text-center">{t('\u80DC\u7387')}</span>
              <span className="text-right">{t('\u76C8\u4E8F')}</span>
            </div>
            {Object.entries(perGame).map(([gameType, data]) => {
              const wr = data.games > 0 ? ((data.wins / data.games) * 100).toFixed(1) : '0.0';
              return (
                <div key={gameType} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center">
                  <span className="text-sm text-text-primary">
                    {t(GAME_LABELS[gameType] || gameType)}
                  </span>
                  <span className="text-sm text-text-secondary text-center">{data.games}</span>
                  <span className={cn('text-sm text-center', parseFloat(wr) >= 50 ? 'text-danger' : 'text-text-secondary')}>
                    {wr}%
                  </span>
                  <span className={cn(
                    'text-sm text-right font-medium',
                    data.net >= 0 ? 'text-danger' : 'text-success',
                  )}>
                    {data.net >= 0 ? '+' : ''}{renderQuota(data.net)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-heading text-text-primary">
              {t('\u6700\u8FD1\u6E38\u620F\u8BB0\u5F55')}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {history.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.result === 'win' || rec.result === 'blackjack' ? 'success' : rec.result === 'lose' ? 'danger' : 'outline'}
                    size="sm"
                  >
                    {t(RESULT_MESSAGES[rec.result] || rec.result)}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    {t(GAME_LABELS[rec.game_type] || rec.game_type)}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {t('\u4E0B\u6CE8')} {renderQuota(rec.bet_amount || 0)}
                  </span>
                </div>
                <span className={cn(
                  'text-sm font-medium',
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

function SummaryCard({ icon: Icon, label, value, color, t }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#C5A55A]" />
        </div>
      </div>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className={cn('text-lg font-heading mt-0.5', color || 'text-text-primary')}>
        {value}
      </p>
    </Card>
  );
}

function DetailRow({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={cn('text-sm font-medium', valueClass || 'text-text-primary')}>{value}</span>
    </div>
  );
}
