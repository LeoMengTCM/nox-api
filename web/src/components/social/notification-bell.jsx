import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { cn } from '../../lib/cn';
import { UserContext } from '../../contexts/user-context';
import { useNotificationCount } from '../../hooks/use-notification-count';
import { API } from '../../lib/api';
import { Avatar, AvatarImage, AvatarFallback, Button } from '../ui';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { stringToColor } from '../../lib/utils';

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

const NotificationBell = () => {
  const { t } = useTranslation();
  const [userState] = useContext(UserContext);
  const navigate = useNavigate();
  const isLoggedIn = !!userState.user;
  const { unreadCount, refresh } = useNotificationCount(isLoggedIn);
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (dropdownOpen && isLoggedIn) {
      // Mark all as read first, then load notifications so they appear as read
      if (unreadCount > 0) {
        API.put('/api/social/notifications/read-all')
          .then(() => {
            refresh();
            loadRecentNotifications();
          })
          .catch(() => {
            loadRecentNotifications();
          });
      } else {
        loadRecentNotifications();
      }
    }
  }, [dropdownOpen, isLoggedIn]);

  const loadRecentNotifications = async () => {
    try {
      const res = await API.get('/api/social/notifications', {
        params: { page: 1, page_size: 10 },
      });
      if (res.data.success) {
        setNotifications(res.data.data.items || []);
      }
    } catch {
      // silently ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put('/api/social/notifications/read-all');
      refresh();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // silently ignore
    }
  };

  if (!isLoggedIn) return null;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'relative p-2 rounded-md transition-colors',
            'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          )}
          aria-label={t('通知')}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-text-tertiary">
            {t('暂无通知')}
          </div>
        ) : (
          <>
            {notifications.map((notif) => {
              const actor = notif.actor || {};
              const actorName = actor.display_name || actor.username || '?';
              const actorInitial = actorName[0]?.toUpperCase() || '?';
              return (
                <DropdownMenuItem
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 cursor-pointer',
                    !notif.is_read && 'bg-accent/5'
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (notif.type === 'follow') {
                      navigate(`/console/user/${notif.actor_id}`);
                    } else if (notif.post_id) {
                      navigate(`/console/community?post=${notif.post_id}`);
                    }
                    setDropdownOpen(false);
                  }}
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
                      <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{notif.post_content}</p>
                    )}
                    <span className="text-xs text-text-tertiary">{timeAgo(notif.created_at)}</span>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-3 py-2">
          <button
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            onPointerDown={(e) => {
              e.stopPropagation();
              handleMarkAllRead();
            }}
          >
            {t('标记全部已读')}
          </button>
          <button
            className="text-xs text-accent hover:underline"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDropdownOpen(false);
              navigate('/console/notifications');
            }}
          >
            {t('查看全部通知')}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
