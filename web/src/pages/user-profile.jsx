import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Avatar, AvatarImage, AvatarFallback,
  Card, CardContent, Button, EmptyState,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '../components/ui';
import PostCard from '../components/social/post-card';
import FollowButton from '../components/social/follow-button';
import RepostDialog from '../components/social/repost-dialog';
import { PetSprite } from '../components/pet/pet-sprite';
import { PetCard } from '../components/pet/pet-card';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';
import { renderQuota } from '../lib/utils';

const RARITY_WEIGHT = { SSR: 0, SR: 1, R: 2, N: 3 };

const UserProfile = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [repostTarget, setRepostTarget] = useState(null);
  const [petData, setPetData] = useState({ pets: [], stats: { pet_count: 0, max_level: 0, total_stars: 0 } });

  const pageSize = 20;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/social/profile/${id}`);
      if (res.data.success) {
        setProfile(res.data.data);
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('加载用户信息失败'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPosts = useCallback(async (p = 1, append = false) => {
    setPostsLoading(true);
    try {
      const res = await API.get(`/api/social/profile/${id}/posts`, {
        params: { page: p, page_size: pageSize },
      });
      if (res.data.success) {
        const items = res.data.data.items || [];
        setPosts(prev => append ? [...prev, ...items] : items);
        setPostsTotal(res.data.data.total || 0);
        setPage(p);
      }
    } catch {
      showError(t('加载动态失败'));
    } finally {
      setPostsLoading(false);
    }
  }, [id]);

  const loadPetData = useCallback(async () => {
    try {
      const res = await API.get(`/api/pet/user/${id}`);
      if (res.data.success) {
        setPetData(res.data.data || { pets: [], stats: { pet_count: 0, max_level: 0, total_stars: 0 } });
      }
    } catch {
      // Pet data is optional, silently ignore
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
    loadPosts(1);
    loadPetData();
  }, [loadProfile, loadPosts, loadPetData]);

  const handleDelete = async (postId) => {
    try {
      const res = await API.delete(`/api/social/post/${postId}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        setPosts(prev => prev.filter(p => p.id !== postId));
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
    loadPosts(1);
  };

  const handleFollowChange = (newState) => {
    setProfile(prev => ({
      ...prev,
      is_following: newState,
      followers: prev.followers + (newState ? 1 : -1),
    }));
  };

  // useMemo MUST be called before any early returns (Rules of Hooks)
  const sortedPets = useMemo(() => {
    if (!petData.pets) return [];
    return [...petData.pets].sort((a, b) => {
      const pa = (a.pet || a);
      const pb = (b.pet || b);
      const ra = RARITY_WEIGHT[pa.rarity] ?? 4;
      const rb = RARITY_WEIGHT[pb.rarity] ?? 4;
      if (ra !== rb) return ra - rb;
      if ((pb.star || 0) !== (pa.star || 0)) return (pb.star || 0) - (pa.star || 0);
      return (pb.level || 1) - (pa.level || 1);
    });
  }, [petData.pets]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-background-subtle rounded-lg" />
          <div className="h-40 bg-background-subtle rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <EmptyState title={t('用户不存在')} />
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const hasMore = posts.length < postsTotal;
  const primaryPet = petData.pets?.find(p => p.pet?.is_primary || p.is_primary);
  const petStats = petData.stats || { pet_count: 0, max_level: 0, total_stars: 0 };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar size="xl" className="h-16 w-16">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={displayName} />
                ) : null}
                <AvatarFallback size="xl" className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              {/* Primary pet mini-sprite next to avatar */}
              {primaryPet && (
                <div className="absolute -bottom-1 -right-1">
                  <PetSprite
                    visualKey={(primaryPet.pet || primaryPet).visual_key}
                    stage={(primaryPet.pet || primaryPet).stage}
                    size="sm"
                    animated
                    state="idle"
                    className="!w-7 !h-7"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-serif font-semibold text-text-primary truncate">
                  {displayName}
                </h1>
                {!profile.is_self && (
                  <FollowButton
                    userId={profile.id}
                    initialFollowing={profile.is_following}
                    onFollowChange={handleFollowChange}
                  />
                )}
              </div>
              <p className="text-sm text-text-tertiary mb-2">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-text-secondary mb-3">{profile.bio}</p>
              )}
              {/* Stats */}
              <div className="flex gap-5 text-sm">
                <span>
                  <strong className="text-text-primary">{profile.post_count}</strong>{' '}
                  <span className="text-text-tertiary">{t('帖子')}</span>
                </span>
                <span>
                  <strong className="text-text-primary">{profile.followers}</strong>{' '}
                  <span className="text-text-tertiary">{t('粉丝')}</span>
                </span>
                <span>
                  <strong className="text-text-primary">{profile.following}</strong>{' '}
                  <span className="text-text-tertiary">{t('关注')}</span>
                </span>
                <span>
                  <strong className="text-text-primary">{petStats.pet_count}</strong>{' '}
                  <span className="text-text-tertiary">{t('魔法生物')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* API usage stats (only visible to self) */}
          {profile.is_self && (
            <div className="mt-4 pt-4 border-t border-border flex gap-5 text-sm">
              <span>
                <span className="text-text-tertiary">{t('已用额度')}: </span>
                <strong className="text-text-primary">{renderQuota(profile.used_quota)}</strong>
              </span>
              <span>
                <span className="text-text-tertiary">{t('请求次数')}: </span>
                <strong className="text-text-primary">{profile.request_count?.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for posts and pets */}
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">{t('帖子')}</TabsTrigger>
          <TabsTrigger value="pets">{t('魔法生物')}</TabsTrigger>
        </TabsList>

        {/* Posts tab */}
        <TabsContent value="posts">
          {posts.length === 0 && !postsLoading ? (
            <EmptyState title={t('暂无动态')} description={t('该用户还没有发布任何动态')} />
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onRepost={handleRepost}
                />
              ))}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPosts(page + 1, true)}
                    disabled={postsLoading}
                  >
                    {postsLoading ? t('加载中...') : t('加载更多')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Pets tab */}
        <TabsContent value="pets">
          {sortedPets.length === 0 ? (
            <EmptyState title={t('该用户还没有魔法生物')} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sortedPets.map((item) => {
                const pet = item.pet || item;
                return (
                  <PetCard
                    key={pet.id}
                    pet={{
                      id: pet.id,
                      nickname: pet.nickname || pet.species_name,
                      species_name: pet.species_name,
                      visual_key: pet.visual_key,
                      level: pet.level || 1,
                      rarity: pet.rarity || 'N',
                      star: pet.star || 0,
                      is_primary: !!pet.is_primary,
                      is_fainted: !!pet.is_fainted,
                      state: pet.state,
                      stage: pet.stage,
                    }}
                    onClick={null}
                  />
                );
              })}
            </div>
          )}
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

export default UserProfile;
