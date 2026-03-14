import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, EmptyState } from '../components/ui';
import PostComposer from '../components/social/post-composer';
import PostCard from '../components/social/post-card';
import RepostDialog from '../components/social/repost-dialog';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';

const Community = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('square');
  const [followingPosts, setFollowingPosts] = useState([]);
  const [squarePosts, setSquarePosts] = useState([]);
  const [bookmarkPosts, setBookmarkPosts] = useState([]);
  const [followingTotal, setFollowingTotal] = useState(0);
  const [squareTotal, setSquareTotal] = useState(0);
  const [bookmarkTotal, setBookmarkTotal] = useState(0);
  const [followingPage, setFollowingPage] = useState(1);
  const [squarePage, setSquarePage] = useState(1);
  const [bookmarkPage, setBookmarkPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [repostTarget, setRepostTarget] = useState(null);

  const pageSize = 20;

  const loadFollowing = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    try {
      const res = await API.get('/api/social/feed/following', {
        params: { page, page_size: pageSize },
      });
      if (res.data.success) {
        const items = res.data.data.items || [];
        setFollowingPosts(prev => append ? [...prev, ...items] : items);
        setFollowingTotal(res.data.data.total || 0);
        setFollowingPage(page);
      } else {
        if (res.data.message?.includes('未启用')) {
          setEnabled(false);
        }
        showError(res.data.message);
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSquare = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    try {
      const res = await API.get('/api/social/feed/square', {
        params: { page, page_size: pageSize },
      });
      if (res.data.success) {
        const items = res.data.data.items || [];
        setSquarePosts(prev => append ? [...prev, ...items] : items);
        setSquareTotal(res.data.data.total || 0);
        setSquarePage(page);
      } else {
        if (res.data.message?.includes('未启用')) {
          setEnabled(false);
        }
        showError(res.data.message);
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookmarks = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    try {
      const res = await API.get('/api/social/bookmarks', {
        params: { page, page_size: pageSize },
      });
      if (res.data.success) {
        const items = res.data.data.items || [];
        setBookmarkPosts(prev => append ? [...prev, ...items] : items);
        setBookmarkTotal(res.data.data.total || 0);
        setBookmarkPage(page);
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSquare(1);
  }, [loadSquare]);

  useEffect(() => {
    if (tab === 'following') {
      loadFollowing(1);
    } else if (tab === 'bookmarks') {
      loadBookmarks(1);
    }
  }, [tab, loadFollowing, loadBookmarks]);

  const handlePostCreated = (post) => {
    // Prepend new post to square
    setSquarePosts(prev => [{ ...post, author: null }, ...prev]);
    setSquareTotal(prev => prev + 1);
    // Reload to get author info
    loadSquare(1);
  };

  const handleDelete = async (postId) => {
    try {
      const res = await API.delete(`/api/social/post/${postId}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        setFollowingPosts(prev => prev.filter(p => p.id !== postId));
        setSquarePosts(prev => prev.filter(p => p.id !== postId));
        setBookmarkPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('删除失败'));
    }
  };

  const handleLike = async (postId, liked) => {
    if (liked) {
      await API.post(`/api/social/post/${postId}/like`);
    } else {
      await API.delete(`/api/social/post/${postId}/like`);
    }
  };

  const handleBookmark = async (postId, bookmarked) => {
    if (bookmarked) {
      await API.post(`/api/social/post/${postId}/bookmark`);
    } else {
      await API.delete(`/api/social/post/${postId}/bookmark`);
    }
  };

  const handleRepost = (post) => {
    setRepostTarget(post);
  };

  const handleReposted = () => {
    // Reload square to show the new repost
    loadSquare(1);
  };

  if (!enabled) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <EmptyState
          title={t('社区功能未启用')}
          description={t('管理员尚未开启社区功能')}
        />
      </div>
    );
  }

  const loadMore = () => {
    if (tab === 'following') {
      loadFollowing(followingPage + 1, true);
    } else if (tab === 'bookmarks') {
      loadBookmarks(bookmarkPage + 1, true);
    } else {
      loadSquare(squarePage + 1, true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
      <h1 className="text-2xl font-serif font-semibold text-text-primary">{t('社区')}</h1>

      <PostComposer onPostCreated={handlePostCreated} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="square">{t('广场')}</TabsTrigger>
          <TabsTrigger value="following">{t('关注')}</TabsTrigger>
          <TabsTrigger value="bookmarks">{t('收藏')}</TabsTrigger>
        </TabsList>

        <TabsContent value="square">
          <PostList
            posts={squarePosts}
            loading={loading}
            hasMore={squarePosts.length < squareTotal && tab === 'square'}
            onLoadMore={loadMore}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
            t={t}
          />
        </TabsContent>

        <TabsContent value="following">
          <PostList
            posts={followingPosts}
            loading={loading}
            hasMore={followingPosts.length < followingTotal && tab === 'following'}
            onLoadMore={loadMore}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
            t={t}
          />
        </TabsContent>

        <TabsContent value="bookmarks">
          <PostList
            posts={bookmarkPosts}
            loading={loading}
            hasMore={bookmarkPosts.length < bookmarkTotal && tab === 'bookmarks'}
            onLoadMore={loadMore}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
            t={t}
            emptyTitle={t('暂无收藏')}
            emptyDescription={t('你还没有收藏任何帖子')}
          />
        </TabsContent>
      </Tabs>

      <RepostDialog
        open={!!repostTarget}
        onOpenChange={(open) => { if (!open) setRepostTarget(null); }}
        originalPost={repostTarget}
        onReposted={handleReposted}
      />
    </div>
  );
};

const PostList = ({ posts, loading, hasMore, onLoadMore, onDelete, onLike, onBookmark, onRepost, t, emptyTitle, emptyDescription }) => {
  if (!loading && posts.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || t('暂无动态')}
        description={emptyDescription || t('还没有人发布动态')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={onDelete}
          onLike={onLike}
          onBookmark={onBookmark}
          onRepost={onRepost}
        />
      ))}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
            {loading ? t('加载中...') : t('加载更多')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Community;
