import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button, Textarea } from '../ui';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';

const MAX_LENGTH = 500;

function timeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

const RepostDialog = ({ open, onOpenChange, originalPost, onReposted }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const charCount = [...content].length;
  const author = originalPost?.author || {};
  const displayName = author.display_name || author.username || t('未知用户');
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSubmit = async () => {
    if (charCount > MAX_LENGTH) return;
    setLoading(true);
    try {
      const res = await API.post('/api/social/post/repost', {
        original_post_id: originalPost.id,
        content: content.trim(),
      });
      if (res.data.success) {
        showSuccess(t('转发成功'));
        setContent('');
        onOpenChange(false);
        onReposted?.(res.data.data);
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('转发失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      setContent('');
    }
    onOpenChange(open);
  };

  if (!originalPost) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('引用转发')}</DialogTitle>
          <DialogDescription className="sr-only">{t('引用转发')}</DialogDescription>
        </DialogHeader>

        {/* Original post preview */}
        <div className="border border-border rounded-lg p-3 bg-background-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Avatar size="sm">
              {author.avatar_url ? (
                <AvatarImage src={author.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback size="sm">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-text-secondary font-medium">{displayName}</span>
            <span className="text-xs text-text-tertiary">· {timeAgo(originalPost.created_at)}</span>
          </div>
          <p className="text-sm text-text-secondary line-clamp-3 whitespace-pre-wrap break-words">
            {originalPost.content}
          </p>
        </div>

        {/* Repost comment textarea */}
        <Textarea
          placeholder={t('添加评论（可选）...')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none"
        />

        <div className="flex items-center justify-between">
          <span className={`text-xs ${charCount > MAX_LENGTH ? 'text-red-500' : 'text-text-tertiary'}`}>
            {charCount}/{MAX_LENGTH}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('取消')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || charCount > MAX_LENGTH}
          >
            {loading ? t('转发中...') : t('转发')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepostDialog;
