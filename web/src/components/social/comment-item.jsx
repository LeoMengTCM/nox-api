import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback, Button } from '../ui';
import { getUserIdFromLocalStorage } from '../../lib/utils';

function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

const CommentItem = ({ comment, onDelete }) => {
  const { t } = useTranslation();
  const currentUserId = parseInt(getUserIdFromLocalStorage(), 10);
  const isOwner = currentUserId === comment.user_id;
  const author = comment.author || {};

  const displayName = author.display_name || author.username || t('未知用户');
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex gap-2.5 py-2.5">
      <Link to={`/console/user/${author.id}`} className="flex-shrink-0">
        <Avatar size="sm">
          {author.avatar_url ? (
            <AvatarImage src={author.avatar_url} alt={displayName} />
          ) : null}
          <AvatarFallback size="sm">{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/console/user/${author.id}`}
            className="text-xs font-medium text-text-primary hover:underline"
          >
            {displayName}
          </Link>
          <span className="text-xs text-text-tertiary">{timeAgo(comment.created_at)}</span>
          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-auto text-text-tertiary hover:text-red-500"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
        <p className="text-sm text-text-primary whitespace-pre-wrap break-words mt-0.5">
          {comment.content}
        </p>
      </div>
    </div>
  );
};

export default CommentItem;
