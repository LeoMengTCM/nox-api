import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback, Button, EmptyState } from '../components/ui';
import { API } from '../lib/api';
import { showError, showSuccess, stringToColor } from '../lib/utils';

function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function getNotificationText(t, type) {
  switch (type) {
    case 'like': return t('赞了你的帖子');
    case 'comment': return t('评论了你的帖子');
    case 'follow': return t('关注了你');
    case 'repost': return t('转发了你的帖子');
    default: return '';
  }
}

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const loadNotifications = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const res = await API.get('/api/social/notifications', {
        params: { page: p, page_size: pageSize },
      });
      if (res.data.success) {
        const items = res.data.data.items || [];
        setNotifications(prev => append ? [...prev, ...items] : items);
        setTotal(res.data.data.total || 0);
        setPage(p);
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await API.put('/api/social/notifications/read-all');
      if (res.data.success) {
        showSuccess(t('已全部标记为已读'));
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch {
      showError(t('操作失败'));
    }
  };

  const handleClick = (notif) => {
    // Mark as read
    if (!notif.is_read) {
      API.put(`/api/social/notification/${notif.id}/read`).catch(() => {});
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
    }
    // Navigate based on type
    if (notif.type === 'follow') {
      navigate(`/console/user/${notif.actor_id}`);
    }
  };

  const hasMore = notifications.length < total;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold text-text-primary">{t('通知')}</h1>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            {t('标记全部已读')}
          </Button>
        )}
      </div>

      {!loading && notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} className="text-text-tertiary" />}
          title={t('暂无通知')}
        />
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => {
            const actor = notif.actor || {};
            const actorName = actor.display_name || actor.username || '?';
            const actorInitial = actorName[0]?.toUpperCase() || '?';
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover ${!notif.is_read ? 'bg-accent/5' : ''}`}
                onClick={() => handleClick(notif)}
              >
                <Avatar size="sm" className="mt-0.5 shrink-0">
                  {actor.avatar_url ? (
                    <AvatarImage src={actor.avatar_url} alt={actorName} />
                  ) : null}
                  <AvatarFallback
                    size="sm"
                    style={{ backgroundColor: stringToColor(actorName) }}
                    className="text-white"
                  >
                    {actorInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{actorName}</span>{' '}
                    <span className="text-text-secondary">{getNotificationText(t, notif.type)}</span>
                  </p>
                  {notif.post_content && (
                    <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{notif.post_content}</p>
                  )}
                  <span className="text-xs text-text-tertiary">{timeAgo(notif.created_at)}</span>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                )}
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadNotifications(page + 1, true)}
                disabled={loading}
              >
                {loading ? t('加载中...') : t('加载更多')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
