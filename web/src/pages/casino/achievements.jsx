import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, ArrowLeft, Gift, CheckCircle, Lock, Star } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge } from '../../components/ui';

const CATEGORY_INFO = {
  milestone: { label: '\u91CC\u7A0B\u7891', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  streak: { label: '\u8FDE\u80DC', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  game: { label: '\u6E38\u620F', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  special: { label: '\u7279\u6B8A', color: 'bg-[#C5A55A]/10 text-[#C5A55A] border-[#C5A55A]/20' },
};

const FILTER_TABS = [
  { key: 'all', label: '\u5168\u90E8' },
  { key: 'completed', label: '\u5DF2\u5B8C\u6210' },
  { key: 'in_progress', label: '\u8FDB\u884C\u4E2D' },
];

export default function CasinoAchievements() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [filter, setFilter] = useState('all');
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/casino/achievements');
      if (res.data.success) {
        setAchievements(res.data.data || []);
      }
    } catch {
      showError(t('\u52A0\u8F7D\u5931\u8D25'));
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (achievementId) => {
    setClaimingId(achievementId);
    try {
      const res = await API.post('/api/casino/achievements/claim', { achievement_id: achievementId });
      if (res.data.success) {
        showSuccess(t('\u9886\u53D6\u6210\u529F'));
        loadAchievements();
      } else {
        showError(res.data.message || t('\u9886\u53D6\u5931\u8D25'));
      }
    } catch (err) {
      showError(err?.response?.data?.message || t('\u9886\u53D6\u5931\u8D25'));
    } finally {
      setClaimingId(null);
    }
  };

  const completedCount = achievements.filter((a) => a.completed).length;
  const totalCount = achievements.length;

  const filteredAchievements = useMemo(() => {
    let list = achievements;
    if (filter === 'completed') {
      list = list.filter((a) => a.completed);
    } else if (filter === 'in_progress') {
      list = list.filter((a) => !a.completed);
    }
    return list;
  }, [achievements, filter]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    filteredAchievements.forEach((a) => {
      const cat = a.category || 'special';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });
    return groups;
  }, [filteredAchievements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
              <Trophy className="h-5 w-5 text-[#C5A55A]" />
              {t('\u9B54\u6CD5\u6210\u5C31')}
            </h1>
            <p className="text-xs text-text-tertiary mt-0.5">
              {t('\u5DF2\u5B8C\u6210')} {completedCount}/{totalCount} {t('\u4E2A\u6210\u5C31')}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-text-primary">
                {t('\u6210\u5C31\u8FDB\u5EA6')}
              </span>
              <span className="text-sm text-[#C5A55A] font-medium">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-[#C5A55A] transition-all duration-500"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-all',
              filter === tab.key
                ? 'bg-[#C5A55A]/10 text-[#C5A55A] border border-[#C5A55A]/30 font-medium'
                : 'bg-surface text-text-secondary border border-border hover:bg-surface-hover',
            )}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Achievement Groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-tertiary">{t('\u6CA1\u6709\u627E\u5230\u6210\u5C31')}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const catInfo = CATEGORY_INFO[category] || CATEGORY_INFO.special;
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={cn('text-xs', catInfo.color)}>
                  {t(catInfo.label)}
                </Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((ach) => (
                  <AchievementCard
                    key={ach.id}
                    achievement={ach}
                    onClaim={claimReward}
                    claiming={claimingId === ach.id}
                    t={t}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AchievementCard({ achievement, onClaim, claiming, t }) {
  const isCompleted = achievement.completed;
  const isClaimed = !!achievement.claimed;
  const isUnclaimed = isCompleted && !isClaimed;
  const progress = achievement.progress || 0;
  const target = achievement.target || 1;
  const progressPct = Math.min(100, (progress / target) * 100);

  const rewardLabel = achievement.reward_type === 'quota'
    ? renderQuota(achievement.reward_value || 0)
    : `${achievement.reward_value || 0}`;

  const catInfo = CATEGORY_INFO[achievement.category] || CATEGORY_INFO.special;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isUnclaimed && 'ring-2 ring-[#C5A55A]/40 shadow-[0_0_20px_rgba(197,165,90,0.15)]',
        !isCompleted && 'opacity-75',
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0',
            isCompleted
              ? 'bg-[#C5A55A]/10'
              : 'bg-surface-hover',
          )}>
            {achievement.icon || '\uD83C\uDFC6'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-heading text-text-primary truncate">
                {t(achievement.name)}
              </h4>
              {isClaimed && (
                <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
              )}
              {!isCompleted && (
                <Lock className="h-3 w-3 text-text-tertiary shrink-0" />
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
              {t(achievement.description)}
            </p>

            {/* Progress bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-tertiary">
                  {progress}/{target}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {progressPct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isCompleted ? 'bg-[#C5A55A]' : 'bg-accent',
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Reward + Action */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <Gift className="h-3 w-3" />
                <span>{t('\u5956\u52B1')}: {rewardLabel}</span>
              </div>

              {isUnclaimed && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-gradient-to-r from-[#C5A55A] to-[#D4B46A] text-[#2D1B4E] hover:from-[#D4B46A] hover:to-[#E3C37A] border-0"
                  onClick={() => onClaim(achievement.id)}
                  loading={claiming}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {t('\u9886\u53D6')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect for unclaimed */}
      {isUnclaimed && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#C5A55A]/10 rounded-full blur-2xl animate-pulse" />
        </div>
      )}
    </Card>
  );
}
