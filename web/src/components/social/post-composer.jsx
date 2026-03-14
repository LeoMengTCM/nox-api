import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Textarea, Card, CardContent } from '../ui';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';

const MAX_LENGTH = 500;

const PostComposer = ({ onPostCreated }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const charCount = [...content].length; // rune-aware count

  const handleSubmit = async () => {
    if (!content.trim() || charCount > MAX_LENGTH) return;
    setLoading(true);
    try {
      const res = await API.post('/api/social/post', { content: content.trim() });
      if (res.data.success) {
        showSuccess(t('发布成功'));
        setContent('');
        onPostCreated?.(res.data.data);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError(t('发布失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <Textarea
          placeholder={t('分享你的想法...')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs ${charCount > MAX_LENGTH ? 'text-red-500' : 'text-text-tertiary'}`}>
            {charCount}/{MAX_LENGTH}
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !content.trim() || charCount > MAX_LENGTH}
          >
            {loading ? t('发布中...') : t('发布')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostComposer;
