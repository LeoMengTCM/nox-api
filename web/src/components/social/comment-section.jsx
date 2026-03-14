import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { Button, Input } from '../ui';
import CommentItem from './comment-item';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';

const CommentSection = ({ postId, onCommentAdded, onCommentDeleted }) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 10;

  const loadComments = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/social/post/${postId}/comments`, {
        params: { page: p, page_size: pageSize },
      });
      if (res.data.success) {
        const items = res.data.data.items || [];
        setComments(prev => append ? [...prev, ...items] : items);
        setTotal(res.data.data.total || 0);
        setPage(p);
      }
    } catch {
      showError(t('加载评论失败'));
    } finally {
      setLoading(false);
    }
  }, [postId, t]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await API.post(`/api/social/post/${postId}/comment`, { content: trimmed });
      if (res.data.success) {
        showSuccess(t('评论成功'));
        setContent('');
        // Reload to get author info
        loadComments(1);
        onCommentAdded?.();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('评论失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const res = await API.delete(`/api/social/comment/${commentId}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        setComments(prev => prev.filter(c => c.id !== commentId));
        setTotal(prev => Math.max(0, prev - 1));
        onCommentDeleted?.();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('删除失败'));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMore = comments.length < total;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Comment list */}
      {comments.length === 0 && !loading ? (
        <p className="text-xs text-text-tertiary text-center py-3">{t('暂无评论')}</p>
      ) : (
        <div className="divide-y divide-border">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" onClick={() => loadComments(page + 1, true)} disabled={loading}>
            {loading ? t('加载中...') : t('加载更多')}
          </Button>
        </div>
      )}

      {/* Comment input */}
      <div className="flex gap-2 mt-2">
        <Input
          className="flex-1 text-sm"
          placeholder={t('写下你的评论...')}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
        />
        <Button
          size="sm"
          className="h-9 px-3"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
};

export default CommentSection;
