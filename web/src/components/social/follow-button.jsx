import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { API } from '../../lib/api';
import { showError } from '../../lib/utils';

const FollowButton = ({ userId, initialFollowing = false, onFollowChange }) => {
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  const handleClick = async () => {
    setLoading(true);
    const prev = isFollowing;
    // Optimistic update
    setIsFollowing(!prev);

    try {
      if (prev) {
        const res = await API.delete(`/api/social/follow/${userId}`);
        if (!res.data.success) {
          setIsFollowing(prev);
          showError(res.data.message);
          return;
        }
      } else {
        const res = await API.post(`/api/social/follow/${userId}`);
        if (!res.data.success) {
          setIsFollowing(prev);
          showError(res.data.message);
          return;
        }
      }
      onFollowChange?.(!prev);
    } catch {
      setIsFollowing(prev);
      showError(t('操作失败'));
    } finally {
      setLoading(false);
    }
  };

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={hovering ? 'border-red-300 text-red-500 hover:bg-red-50' : ''}
      >
        {hovering ? t('取消关注') : t('已关注')}
      </Button>
    );
  }

  return (
    <Button size="sm" disabled={loading} onClick={handleClick}>
      {t('关注')}
    </Button>
  );
};

export default FollowButton;
