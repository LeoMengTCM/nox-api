import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Trash2, Heart, MessageCircle, Bookmark, Repeat2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback, Button, Card, CardContent } from '../ui';
import { getUserIdFromLocalStorage } from '../../lib/utils';
import CommentSection from './comment-section';

function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

const EmbeddedOriginalPost = ({ original, t }) => {
  if (!original) {
    return (
      <div className="border border-border rounded-lg p-3 bg-background-subtle mt-2 mb-1">
        <p className="text-sm text-text-tertiary italic">{t('原帖已被删除')}</p>
      </div>
    );
  }

  const author = original.author || {};
  const displayName = author.display_name || author.username || t('未知用户');
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Link
      to={`/console/user/${author.id}`}
      className="block border border-border rounded-lg p-3 bg-background-subtle mt-2 mb-1 hover:bg-surface-hover transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar size="xs">
          {author.avatar_url ? (
            <AvatarImage src={author.avatar_url} alt={displayName} />
          ) : null}
          <AvatarFallback size="xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-text-secondary font-medium">{displayName}</span>
        <span className="text-xs text-text-tertiary">· {timeAgo(original.created_at)}</span>
      </div>
      <p className="text-sm text-text-secondary whitespace-pre-wrap break-words line-clamp-3">
        {original.content}
      </p>
    </Link>
  );
};

const PostCard = ({ post, onDelete, onLike, onBookmark, onRepost }) => {
  const { t } = useTranslation();
  const currentUserId = parseInt(getUserIdFromLocalStorage(), 10);
  const isOwner = currentUserId === post.user_id;
  const author = post.author || {};

  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);

  const displayName = author.display_name || author.username || t('未知用户');
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLike = async () => {
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (onLike) {
        await onLike(post.id, !wasLiked);
      }
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  };

  const handleBookmark = async () => {
    // Optimistic update
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);

    try {
      if (onBookmark) {
        await onBookmark(post.id, !wasBookmarked);
      }
    } catch {
      // Revert on failure
      setBookmarked(wasBookmarked);
    }
  };

  const handleRepost = () => {
    if (onRepost) {
      onRepost(post);
    }
  };

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
  };

  const handleCommentDeleted = () => {
    setCommentCount(prev => Math.max(0, prev - 1));
  };

  const hasRepostOriginal = post.repost_id != null;

  return (
    <Card>
      <CardContent className="pt-5">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <Link to={`/console/user/${author.id}`}>
            <Avatar size="lg">
              {author.avatar_url ? (
                <AvatarImage src={author.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback size="lg">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/console/user/${author.id}`}
              className="text-sm font-medium text-text-primary hover:underline truncate block"
            >
              {displayName}
            </Link>
            <span className="text-xs text-text-tertiary">
              @{author.username} · {timeAgo(post.created_at)}
            </span>
          </div>
        </div>
        {/* Content */}
        {post.content && (
          <p className="text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>
        )}
        {/* Embedded original post (for reposts) */}
        {hasRepostOriginal && (
          <EmbeddedOriginalPost original={post.repost_original} t={t} />
        )}
        {/* Action bar */}
        <div className="flex items-center gap-1 mt-3 -ml-2">
          {/* Like */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 px-2 ${liked ? 'text-red-500 hover:text-red-600' : 'text-text-tertiary hover:text-red-500'}`}
            onClick={handleLike}
          >
            <Heart size={16} className={liked ? 'fill-current' : ''} />
            {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
          </Button>
          {/* Comment */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 px-2 ${showComments ? 'text-accent' : 'text-text-tertiary hover:text-accent'}`}
            onClick={() => setShowComments(prev => !prev)}
          >
            <MessageCircle size={16} />
            {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
          </Button>
          {/* Repost */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-text-tertiary hover:text-green-500"
            onClick={handleRepost}
          >
            <Repeat2 size={16} />
            {repostCount > 0 && <span className="text-xs">{repostCount}</span>}
          </Button>
          {/* Bookmark */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${bookmarked ? 'text-amber-500 hover:text-amber-600' : 'text-text-tertiary hover:text-amber-500'}`}
            onClick={handleBookmark}
          >
            <Bookmark size={16} className={bookmarked ? 'fill-current' : ''} />
          </Button>
          {/* Spacer + Delete */}
          <div className="flex-1" />
          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-tertiary hover:text-red-500"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
        {/* Comment section */}
        {showComments && (
          <CommentSection
            postId={post.id}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={handleCommentDeleted}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default PostCard;
