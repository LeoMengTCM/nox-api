import { useState, useEffect, useContext } from 'react';
import { Card } from '../components/ui';
import { API } from '../lib/api';
import { showError, renderQuota } from '../lib/utils';
import { UserContext } from '../contexts/user-context';
import { Crown, Wallet, Trophy } from 'lucide-react';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function RankBadge({ rank }) {
  if (rank <= 3) {
    return (
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: MEDAL_COLORS[rank - 1] }}
      >
        {rank}
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-text-secondary shrink-0">
      {rank}
    </div>
  );
}

function UserAvatar({ user }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-medium shrink-0">
      {(user.display_name || user.username || '?')[0].toUpperCase()}
    </div>
  );
}

function RankingBoard({ title, icon: Icon, iconColor, data, currentUserId, valueLabel, formatValue }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-hover/30">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${iconColor}15`, color: iconColor }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-heading font-semibold text-text-primary">{title}</h2>
          <p className="text-xs text-text-tertiary">{valueLabel}</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">暂无数据</div>
        ) : (
          data.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                user.id === currentUserId ? 'bg-accent/5 border-l-2 border-l-accent' : ''
              }`}
            >
              <RankBadge rank={user.rank} />
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {user.display_name || user.username}
                </div>
                {user.display_name && user.display_name !== user.username && (
                  <div className="text-xs text-text-tertiary truncate">@{user.username}</div>
                )}
              </div>
              <div className="text-sm font-medium text-text-secondary shrink-0">
                {formatValue(user.value)}
              </div>
              {user.id === currentUserId && (
                <span className="text-[10px] text-accent font-medium bg-accent/10 px-1.5 py-0.5 rounded shrink-0">你</span>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ hoarder: [], ai_king: [] });
  const [userState] = useContext(UserContext);
  const currentUserId = userState?.user?.id;

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const res = await API.get('/api/user/ranking?limit=20');
        const { success, data: rankData, message } = res.data;
        if (success) {
          setData(rankData || { hoarder: [], ai_king: [] });
        } else {
          showError(message || '加载排名失败');
        }
      } catch {
        showError('加载排名失败');
      }
      setLoading(false);
    };
    loadRanking();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-heading text-text-primary">排行榜</h1>
          <p className="text-sm text-text-tertiary mt-1">看看谁是 Nox API 的风云人物</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-surface-hover/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading text-text-primary">排行榜</h1>
        <p className="text-sm text-text-tertiary mt-1">看看谁是 Nox API 的风云人物</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingBoard
          title="屯屯鼠排名"
          icon={Wallet}
          iconColor="#F59E0B"
          data={data.hoarder}
          currentUserId={currentUserId}
          valueLabel="可用余额最高的用户"
          formatValue={renderQuota}
        />
        <RankingBoard
          title="AI大王排名"
          icon={Crown}
          iconColor="#8B5CF6"
          data={data.ai_king}
          currentUserId={currentUserId}
          valueLabel="已用额度最高的用户"
          formatValue={renderQuota}
        />
      </div>
    </div>
  );
}
