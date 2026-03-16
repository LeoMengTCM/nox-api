import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, ArrowLeft } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Button, Spinner, Badge, Avatar, AvatarImage, AvatarFallback } from '../../components/ui';
import { UserContext } from '../../contexts/user-context';

const RANK_TYPES = [
  { key: 'profit', label: '\u603B\u76C8\u4E8F' },
  { key: 'games', label: '\u6E38\u620F\u573A\u6B21' },
  { key: 'biggest_win', label: '\u5355\u7B14\u6700\u5927\u5956' },
  { key: 'win_rate', label: '\u80DC\u7387' },
];

const MEDAL_COLORS = [
  { bg: 'bg-[#C5A55A]/20', text: 'text-[#C5A55A]', border: 'border-[#C5A55A]/40', ring: 'ring-[#C5A55A]/20' },
  { bg: 'bg-gray-300/20', text: 'text-gray-400', border: 'border-gray-400/40', ring: 'ring-gray-400/20' },
  { bg: 'bg-orange-400/20', text: 'text-orange-500', border: 'border-orange-500/40', ring: 'ring-orange-500/20' },
];

const MEDAL_EMOJI = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

function formatValue(value, type) {
  switch (type) {
    case 'profit':
    case 'biggest_win':
      return renderQuota(value || 0);
    case 'games':
      return `${value || 0}`;
    case 'win_rate':
      return `${Number(value || 0).toFixed(1)}%`;
    default:
      return `${value || 0}`;
  }
}

export default function CasinoLeaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userState] = useContext(UserContext);
  const currentUserId = userState?.user?.id;
  const [loading, setLoading] = useState(true);
  const [rankType, setRankType] = useState('profit');
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    loadLeaderboard();
  }, [rankType]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/casino/leaderboard?type=${rankType}&limit=20`);
      if (res.data.success) {
        setRankings(res.data.data?.rankings || []);
      }
    } catch {
      showError(t('\u52A0\u8F7D\u5931\u8D25'));
    } finally {
      setLoading(false);
    }
  };

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
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
            {t('\u9B54\u6CD5\u6392\u884C\u699C')}
          </h1>
        </div>
      </div>

      {/* Rank Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {RANK_TYPES.map((rt) => (
          <button
            key={rt.key}
            onClick={() => setRankType(rt.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-all',
              rankType === rt.key
                ? 'bg-[#C5A55A]/10 text-[#C5A55A] border border-[#C5A55A]/30 font-medium'
                : 'bg-surface text-text-secondary border border-border hover:bg-surface-hover',
            )}
          >
            {t(rt.label)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-tertiary">{t('\u6682\u65E0\u6570\u636E')}</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((podiumIdx) => {
                const entry = top3[podiumIdx];
                if (!entry) return <div key={podiumIdx} />;
                const medal = MEDAL_COLORS[podiumIdx];
                const isCurrentUser = entry.user_id === currentUserId;
                return (
                  <Card
                    key={entry.user_id || podiumIdx}
                    className={cn(
                      'p-4 text-center transition-all border-2',
                      medal.border,
                      podiumIdx === 0 && 'md:-mt-4 shadow-[0_0_30px_rgba(197,165,90,0.15)]',
                      isCurrentUser && 'bg-[#2D1B4E]/5 dark:bg-[#2D1B4E]/20',
                    )}
                  >
                    <div className="text-2xl mb-2">{MEDAL_EMOJI[podiumIdx]}</div>
                    <Avatar className={cn('h-12 w-12 mx-auto ring-2', medal.ring)}>
                      <AvatarImage src={entry.avatar_url} />
                      <AvatarFallback className={cn('text-sm font-bold', medal.bg, medal.text)}>
                        {(entry.username || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className={cn(
                      'text-sm font-heading mt-2 truncate',
                      isCurrentUser ? 'text-[#C5A55A]' : 'text-text-primary',
                    )}>
                      {entry.username || t('\u533F\u540D')}
                    </p>
                    <p className={cn(
                      'text-sm font-medium mt-1',
                      rankType === 'profit' && (entry.value || 0) < 0 ? 'text-success' : medal.text,
                    )}>
                      {formatValue(entry.value, rankType)}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Rest of Rankings */}
          {rest.length > 0 && (
            <Card className="overflow-hidden">
              <div className="divide-y divide-border">
                {rest.map((entry, i) => {
                  const rank = entry.rank || i + 4;
                  const isCurrentUser = entry.user_id === currentUserId;
                  return (
                    <div
                      key={entry.user_id || i}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        isCurrentUser && 'bg-[#2D1B4E]/5 dark:bg-[#2D1B4E]/20',
                        i % 2 === 1 && !isCurrentUser && 'bg-surface-hover/50',
                      )}
                    >
                      <span className="w-8 text-center text-sm font-medium text-text-tertiary">
                        #{rank}
                      </span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
                          {(entry.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        'text-sm flex-1 truncate',
                        isCurrentUser ? 'text-[#C5A55A] font-medium' : 'text-text-primary',
                      )}>
                        {entry.username || t('\u533F\u540D')}
                        {isCurrentUser && (
                          <span className="text-xs text-text-tertiary ml-1">({t('\u6211')})</span>
                        )}
                      </span>
                      <span className={cn(
                        'text-sm font-medium',
                        rankType === 'profit' && (entry.value || 0) < 0 ? 'text-success' : 'text-text-primary',
                      )}>
                        {formatValue(entry.value, rankType)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
