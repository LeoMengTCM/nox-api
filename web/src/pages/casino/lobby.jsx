import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Spade, Dices, CircleDot, Layers, Joystick, Users,
  Trophy, TrendingUp, TrendingDown, ArrowRight, Sparkles,
  Medal, BarChart3, Star,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Spinner, Badge, Avatar, AvatarFallback } from '../../components/ui';
import { BigWinMarquee } from '../../components/casino/big-win-marquee';

const GAME_ICONS = {
  blackjack: Spade,
  dice: Dices,
  roulette: CircleDot,
  baccarat: Layers,
  slots: Joystick,
  poker: Users,
};

const GAME_NAMES = {
  blackjack: '21点',
  dice: '骰子猜大小',
  roulette: '轮盘',
  baccarat: '百家乐',
  slots: '魔法老虎机',
  poker: '德州扑克',
};

const GAME_DESCS = {
  blackjack: '与魔法庄家对决，点数逼近21点！',
  dice: '猜大小、幸运7，投骰子赢大奖！',
  roulette: '经典轮盘，赌运气的时刻！',
  baccarat: '庄闲对决，简单刺激！',
  slots: '拉动魔法拉杆，赢取金加隆！',
  poker: '与其他巫师斗智斗勇！',
};

const GAME_ROUTES = {
  blackjack: '/console/casino/blackjack',
  dice: '/console/casino/dice',
  roulette: '/console/casino/roulette',
  baccarat: '/console/casino/baccarat',
  slots: '/console/casino/slots',
  poker: '/console/casino/poker',
};

const AVAILABLE_GAMES = ['blackjack', 'dice', 'roulette', 'baccarat', 'slots', 'poker'];

export default function CasinoLobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [balance, setBalance] = useState(0);
  const [achievementSummary, setAchievementSummary] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, statsRes, lbRes, userRes, achRes] = await Promise.all([
        API.get('/api/casino/config'),
        API.get('/api/casino/me'),
        API.get('/api/casino/leaderboard?type=profit&limit=5'),
        API.get('/api/user/self', { skipErrorHandler: true }),
        API.get('/api/casino/achievements', { skipErrorHandler: true }),
      ]);

      if (configRes.data.success) setConfig(configRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (lbRes.data.success) setLeaderboard(lbRes.data.data?.rankings || []);
      if (userRes.data.success) setBalance(userRes.data.data?.quota || 0);
      if (achRes.data.success) {
        const achs = achRes.data.data || [];
        setAchievementSummary({
          completed: achs.filter((a) => a.completed).length,
          total: achs.length,
        });
      }
    } catch {
      showError(t('加载失败'));
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

  if (!config?.enabled) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-hover mb-4">
            <Dices className="h-8 w-8 text-text-tertiary" />
          </div>
          <h2 className="text-lg font-heading text-text-primary mb-2">{t('韦斯莱魔法赌坊')}</h2>
          <p className="text-sm text-text-tertiary">{t('赌场系统未启用')}</p>
        </div>
      </div>
    );
  }

  const enabledGames = config?.games || [];
  const allGameTypes = ['blackjack', 'dice', 'roulette', 'baccarat', 'slots', 'poker'];
  const winRate = stats?.games_played > 0
    ? ((stats.win_count / stats.games_played) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1B4E] via-[#3D2B5E] to-[#1B4332] p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A55A]/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D97757]/10 rounded-full blur-3xl -ml-16 -mb-16" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading tracking-tight flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-[#C5A55A]" />
                {t('韦斯莱魔法赌坊')}
              </h1>
              <p className="mt-2 text-white/70 text-sm sm:text-base">
                {t('来试试你的运气吧，巫师！')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50 uppercase tracking-wider">{t('余额')}</p>
              <p className="text-2xl font-heading text-[#C5A55A] mt-0.5">{renderQuota(balance)}</p>
            </div>
          </div>

          {/* Today summary */}
          {stats && (
            <div className="mt-6 flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  {(stats.daily_loss_today || 0) <= 0
                    ? <TrendingUp className="h-4 w-4 text-red-400" />
                    : <TrendingDown className="h-4 w-4 text-green-400" />
                  }
                </div>
                <div>
                  <p className="text-[10px] text-white/50 uppercase">{t('今日盈亏')}</p>
                  <p className={cn(
                    'text-sm font-medium',
                    (stats.daily_loss_today || 0) <= 0 ? 'text-red-400' : 'text-green-400',
                  )}>
                    {renderQuota(-(stats.daily_loss_today || 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-[#C5A55A]" />
                </div>
                <div>
                  <p className="text-[10px] text-white/50 uppercase">{t('总盈亏')}</p>
                  <p className={cn(
                    'text-sm font-medium',
                    (stats.net_profit || 0) >= 0 ? 'text-red-400' : 'text-green-400',
                  )}>
                    {renderQuota(stats.net_profit || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Big Win Marquee */}
      <BigWinMarquee />

      {/* Game Grid */}
      <div>
        <h2 className="text-lg font-heading text-text-primary mb-4">{t('选择游戏')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allGameTypes.map((type) => {
            const Icon = GAME_ICONS[type] || Dices;
            const isAvailable = AVAILABLE_GAMES.includes(type);
            const gameConfig = enabledGames.find((g) => g.type === type);
            const isEnabled = isAvailable && gameConfig?.enabled !== false;
            const route = GAME_ROUTES[type];

            return (
              <Card
                key={type}
                hover={isEnabled}
                className={cn(
                  'relative overflow-hidden transition-all duration-200 group cursor-pointer',
                  isEnabled
                    ? 'hover:border-[#C5A55A]/40 hover:shadow-[0_0_20px_rgba(197,165,90,0.08)] hover:scale-[1.02]'
                    : 'opacity-60 cursor-not-allowed',
                )}
                onClick={() => isEnabled && route && navigate(route)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      isEnabled
                        ? 'bg-gradient-to-br from-[#2D1B4E] to-[#3D2B5E] text-[#C5A55A]'
                        : 'bg-surface-hover text-text-tertiary',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {!isAvailable && (
                      <Badge variant="outline" size="sm">{t('即将开放')}</Badge>
                    )}
                  </div>
                  <h3 className="text-base font-heading text-text-primary mb-1">
                    {t(GAME_NAMES[type])}
                  </h3>
                  <p className="text-xs text-text-tertiary leading-relaxed">
                    {t(GAME_DESCS[type])}
                  </p>
                  {isEnabled && (
                    <div className="mt-3 flex items-center text-xs text-accent gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t('开始游戏')} <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stats + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Stats */}
        {stats && (
          <Card className="p-5">
            <h3 className="text-base font-heading text-text-primary mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#C5A55A]" />
              {t('个人统计')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label={t('总场次')} value={stats.games_played || 0} />
              <StatItem label={t('胜率')} value={`${winRate}%`} />
              <StatItem label={t('总下注')} value={renderQuota(stats.total_wagered || 0)} />
              <StatItem label={t('最大赢额')} value={renderQuota(stats.biggest_win || 0)} />
            </div>
          </Card>
        )}

        {/* Leaderboard Preview */}
        <Card className="p-5">
          <h3 className="text-base font-heading text-text-primary mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#C5A55A]" />
            {t('盈利排行榜')}
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t('暂无数据')}</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id || i}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-[#C5A55A]/20 text-[#C5A55A]' :
                    i === 1 ? 'bg-gray-300/20 text-gray-500' :
                    i === 2 ? 'bg-orange-300/20 text-orange-600' :
                    'bg-surface-hover text-text-tertiary',
                  )}>
                    {entry.rank || i + 1}
                  </span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
                      {(entry.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-text-primary flex-1 truncate">
                    {entry.username || t('匿名')}
                  </span>
                  <span className={cn(
                    'text-sm font-medium',
                    (entry.value || 0) >= 0 ? 'text-danger' : 'text-success',
                  )}>
                    {renderQuota(entry.value || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          hover
          className="p-4 cursor-pointer group hover:border-[#C5A55A]/40 transition-all"
          onClick={() => navigate('/console/casino/achievements')}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-[#C5A55A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading text-text-primary">{t('查看成就')}</p>
              <p className="text-xs text-text-tertiary">
                {t('已完成')} {achievementSummary.completed}/{achievementSummary.total} {t('个成就')}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Card>
        <Card
          hover
          className="p-4 cursor-pointer group hover:border-[#C5A55A]/40 transition-all"
          onClick={() => navigate('/console/casino/leaderboard')}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
              <Medal className="h-4 w-4 text-[#C5A55A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading text-text-primary">{t('排行榜')}</p>
              <p className="text-xs text-text-tertiary">{t('查看巫师排名')}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Card>
        <Card
          hover
          className="p-4 cursor-pointer group hover:border-[#C5A55A]/40 transition-all"
          onClick={() => navigate('/console/casino/stats')}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-[#C5A55A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading text-text-primary">{t('我的数据')}</p>
              <p className="text-xs text-text-tertiary">{t('查看个人赌场统计')}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
