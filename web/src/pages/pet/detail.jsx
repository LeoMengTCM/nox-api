import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Crown,
  Pencil,
  Swords,
  Shield,
  Zap,
  Clover,
  Utensils,
  Smile,
  Droplets,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { cn } from '../../lib/cn';
import {
  Card,
  Spinner,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
} from '../../components/ui';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { StarDisplay } from '../../components/pet/star-display';
import { StatusBar } from '../../components/pet/status-bar';
import { InteractionEffects } from '../../components/pet/interaction-effects';
import { EvolutionAnimation } from '../../components/pet/evolution-animation';

const PLAY_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_CLEAN_PER_DAY = 3;

export default function PetDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState(null);
  const [species, setSpecies] = useState(null);
  const [nextLevelExp, setNextLevelExp] = useState(0);
  const [expProgress, setExpProgress] = useState(0);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [saving, setSaving] = useState(false);

  // Release dialog
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Feed dialog
  const [feedOpen, setFeedOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [feedingItemId, setFeedingItemId] = useState(null);
  const [feedingAll, setFeedingAll] = useState(false);

  // Interaction states
  const [interacting, setInteracting] = useState(false);
  const [activeEffect, setActiveEffect] = useState(null);
  const [expFloat, setExpFloat] = useState(null);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [evolveStageName, setEvolveStageName] = useState('');

  // Play cooldown
  const [playCooldown, setPlayCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Clean count (from pet data)
  const [cleanCountToday, setCleanCountToday] = useState(0);

  const [hatchCountdown, setHatchCountdown] = useState(null);
  const [hatchReadyAt, setHatchReadyAt] = useState(null);
  const hatchTimerRef = useRef(null);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/pet/my/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setPet(data.pet);
        setSpecies(data.species);
        setNextLevelExp(data.next_level_exp || 0);
        setExpProgress(data.exp_progress || 0);
        setCleanCountToday(data.clean_count_today || 0);
        setHatchReadyAt(data.hatch_ready_at || null);
        setHatchCountdown(data.hatch_countdown ?? null);
        updatePlayCooldown(data.pet.last_played_at);
      } else {
        showError(res.data.message);
        navigate('/console/pet');
      }
    } catch {
      showError(t('加载失败'));
      navigate('/console/pet');
    } finally {
      setLoading(false);
    }
  };

  const updatePlayCooldown = useCallback((lastPlayedAt) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (!lastPlayedAt) {
      setPlayCooldown(0);
      return;
    }
    const lastPlayed = new Date(lastPlayedAt).getTime();
    const tick = () => {
      const remaining = PLAY_COOLDOWN_MS - (Date.now() - lastPlayed);
      if (remaining <= 0) {
        setPlayCooldown(0);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
      } else {
        setPlayCooldown(remaining);
      }
    };
    tick();
    cooldownRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => {
    loadDetail();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (hatchTimerRef.current) clearInterval(hatchTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (hatchTimerRef.current) clearInterval(hatchTimerRef.current);
    if (hatchCountdown === null || hatchCountdown <= 0) return;
    const tick = () => {
      setHatchCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (hatchTimerRef.current) clearInterval(hatchTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    };
    hatchTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (hatchTimerRef.current) clearInterval(hatchTimerRef.current);
    };
  }, [hatchCountdown > 0]);

  // Load inventory when feed dialog opens
  const openFeedDialog = async () => {
    setFeedOpen(true);
    setLoadingInventory(true);
    try {
      const res = await API.get('/api/pet/inventory');
      if (res.data.success) {
        const items = (res.data.data || []).filter(
          (item) => item.type === 'food'
        );
        setInventory(items);
      }
    } catch {
      // silently fail, empty state shown
    } finally {
      setLoadingInventory(false);
    }
  };

  // Handle interaction result (shared by feed/play/clean)
  const handleInteractionResult = (data, effectType) => {
    setActiveEffect(effectType);

    if (data.exp_gained > 0) {
      setExpFloat({ amount: data.exp_gained, key: Date.now() });
      setTimeout(() => setExpFloat(null), 1500);
    }

    if (data.leveled_up) {
      setLevelUpAnim(true);
      setTimeout(() => setLevelUpAnim(false), 2000);
    }

    if (data.evolved) {
      setTimeout(() => {
        setEvolving(true);
        setEvolveStageName(data.new_stage_name || '');
      }, 800);
    }

    // Reload data after a short delay
    setTimeout(() => loadDetail(), data.evolved ? 3200 : 500);
  };

  // Feed
  const handleFeed = async (itemId) => {
    setFeedingItemId(itemId);
    try {
      const res = await API.post(`/api/pet/my/${id}/feed`, { item_id: itemId });
      if (res.data.success) {
        setFeedOpen(false);
        handleInteractionResult(res.data.data, 'feed');
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setFeedingItemId(null);
    }
  };

  // Feed All
  const handleFeedAll = async () => {
    setFeedingAll(true);
    try {
      const res = await API.post(`/api/pet/my/${id}/feed-all`);
      if (res.data.success) {
        const data = res.data.data;
        const usedDesc = (data.items_used || [])
          .map((u) => `${u.name} x${u.count}`)
          .join(', ');
        showSuccess(
          `${t('喂食完成')}：${usedDesc}，+${data.total_exp} EXP`
        );
        setFeedOpen(false);
        handleInteractionResult(data, 'feed');
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setFeedingAll(false);
    }
  };

  // Play
  const handlePlay = async () => {
    if (playCooldown > 0 || interacting) return;
    setInteracting(true);
    try {
      const res = await API.post(`/api/pet/my/${id}/play`);
      if (res.data.success) {
        setPlayCooldown(PLAY_COOLDOWN_MS); // immediate feedback, will be corrected by loadDetail
        handleInteractionResult(res.data.data, 'play');
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setInteracting(false);
    }
  };

  // Clean
  const handleClean = async () => {
    if (cleanCountToday >= MAX_CLEAN_PER_DAY || interacting) return;
    setInteracting(true);
    try {
      const res = await API.post(`/api/pet/my/${id}/clean`);
      if (res.data.success) {
        setCleanCountToday((c) => c + 1);
        handleInteractionResult(res.data.data, 'clean');
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setInteracting(false);
    }
  };

  const handleSetPrimary = async () => {
    try {
      const res = await API.put(`/api/pet/my/${id}/primary`);
      if (res.data.success) {
        showSuccess(t('操作成功'));
        loadDetail();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    }
  };

  // Hatch
  const handleHatch = async () => {
    if (interacting) return;
    setInteracting(true);
    try {
      const res = await API.post(`/api/pet/my/${id}/hatch`);
      if (res.data.success) {
        showSuccess(t('孵化成功'));
        loadDetail();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setInteracting(false);
    }
  };

  const handleRename = async () => {
    if (!newNickname.trim()) return;
    setSaving(true);
    try {
      const res = await API.put(`/api/pet/my/${id}/rename`, {
        nickname: newNickname.trim(),
      });
      if (res.data.success) {
        showSuccess(t('操作成功'));
        setRenameOpen(false);
        loadDetail();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setSaving(false);
    }
  };

  const openRenameDialog = () => {
    setNewNickname(pet?.nickname || '');
    setRenameOpen(true);
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const res = await API.delete(`/api/pet/my/${id}`);
      if (res.data.success) {
        showSuccess(t('魔法生物已放归'));
        navigate('/console/pet');
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pet) return null;

  // Parse stats and computed_status
  let stats = {};
  let computedStatus = {};
  try {
    stats = typeof pet.stats === 'string' ? JSON.parse(pet.stats) : (pet.stats || {});
  } catch { stats = {}; }
  try {
    const src = pet.computed_status || pet.status;
    computedStatus = typeof src === 'string' ? JSON.parse(src) : (src || {});
  } catch { computedStatus = {}; }

  const displayName = pet.nickname || pet.species_name || species?.name || '???';
  const expToNext = nextLevelExp || pet.exp_to_next || 0;
  const currentExp = expToNext > 0 ? Math.round(expProgress * expToNext) : 0;
  const expPercent = expToNext > 0 ? Math.min(100, Math.round(expProgress * 100)) : 0;
  const level = pet.level || 1;
  const isWeak = pet.state === 'weak';

  const formatCooldown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // EXP bar gradient: blue at low level, gold at high level
  const expBarGradient = level >= 20
    ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
    : level >= 10
      ? 'bg-gradient-to-r from-blue-400 to-purple-400'
      : 'bg-gradient-to-r from-blue-400 to-cyan-400';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          onClick={() => navigate('/console/pet')}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('我的神奇动物')}
        </button>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Left: Sprite + Effects */}
        <Card className="relative flex items-center justify-center p-8 overflow-hidden">
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'relative transition-all duration-300',
              isWeak && 'grayscale opacity-60'
            )}>
              <PetSprite
                visualKey={species?.visual_key}
                stage={pet.stage}
                size="lg"
                animated
                state={isWeak ? 'idle' : 'idle'}
                speciesName={species?.name}
                rarity={pet.rarity || species?.rarity}
              />
              {/* Weak state sleep bubble */}
              {isWeak && (
                <div
                  className="absolute -top-2 -right-2 text-sm text-text-tertiary motion-reduce:animate-none"
                  style={{
                    animationName: 'pet-zzz-float',
                    animationDuration: '2s',
                    animationIterationCount: 'infinite',
                    animationTimingFunction: 'ease-in-out',
                  }}
                  aria-hidden="true"
                >
                  zzZ
                </div>
              )}
            </div>
            {pet.is_primary && (
              <div className="flex items-center gap-1.5 text-amber-500">
                <Crown size={16} />
                <span className="text-sm font-medium">{t('主宠')}</span>
              </div>
            )}
          </div>
          {/* Interaction particle effects */}
          <InteractionEffects
            effect={activeEffect}
            onComplete={() => setActiveEffect(null)}
          />
          {/* EXP float text */}
          {expFloat && (
            <div
              key={expFloat.key}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none text-amber-500 font-bold text-lg motion-reduce:hidden"
              style={{
                animationName: 'pet-exp-float',
                animationDuration: '1.2s',
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards',
              }}
            >
              +{expFloat.amount} EXP
            </div>
          )}
        </Card>

        {/* Right: Info */}
        <div className="space-y-4">
          {/* Name + Rarity + Stars */}
          <Card className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-heading text-text-primary">{displayName}</h2>
                  <button
                    onClick={openRenameDialog}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                    title={t('修改昵称')}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                {species && (
                  <p className="text-sm text-text-tertiary">{species.name}</p>
                )}
              </div>
              <RarityBadge rarity={pet.rarity || species?.rarity || 'N'} />
            </div>

            {pet.star > 0 && <StarDisplay star={pet.star} size="md" />}

            {/* Level + EXP bar (enhanced) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className={cn(
                  'font-medium text-text-secondary transition-all duration-300',
                  levelUpAnim && 'pet-level-up-bounce text-amber-500 scale-125'
                )}>
                  Lv.{level}
                </span>
                <span className="text-xs text-text-tertiary tabular-nums">
                  {currentExp} / {expToNext}
                </span>
              </div>
              <div className={cn(
                'relative h-2.5 rounded-full bg-surface-active overflow-hidden',
                levelUpAnim && 'pet-exp-bar-glow'
              )}>
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
                    expBarGradient
                  )}
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-medium text-text-primary">{t('属性')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatItem icon={Swords} label={t('攻击')} value={stats.attack} />
              <StatItem icon={Shield} label={t('防御')} value={stats.defense} />
              <StatItem icon={Zap} label={t('速度')} value={stats.speed} />
              <StatItem icon={Clover} label={t('幸运')} value={stats.luck} />
            </div>
          </Card>

          {/* Status bars */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-medium text-text-primary">{t('状态')}</h3>
            <div className="space-y-2.5">
              <StatusBar
                label={t('饱食度')}
                icon={Utensils}
                value={computedStatus.hunger ?? 100}
                max={100}
                color="#58D68D"
              />
              <StatusBar
                label={t('心情')}
                icon={Smile}
                value={computedStatus.mood ?? 100}
                max={100}
                color="#F4D35E"
              />
              <StatusBar
                label={t('洁净度')}
                icon={Droplets}
                value={computedStatus.cleanliness ?? 100}
                max={100}
                color="#5DADE2"
              />
            </div>
          </Card>

          {/* Weak state warning */}
          {isWeak && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {t('魔法生物虚弱中，请恢复以下状态')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {(computedStatus.hunger ?? 100) < 30 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                    <Utensils size={12} />{t('需要喂食')}
                  </span>
                )}
                {(computedStatus.mood ?? 100) < 30 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                    <Smile size={12} />{t('需要玩耍')}
                  </span>
                )}
                {(computedStatus.cleanliness ?? 100) < 30 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                    <Droplets size={12} />{t('需要清洁')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Hatch prompt for eggs */}
          {pet.stage === 0 && (
            <Card className="p-5 space-y-3 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              {hatchCountdown !== null && hatchCountdown > 0 ? (
                <>
                  <p className="text-sm font-medium text-text-primary">{t('孵化中')}</p>
                  <div className="flex items-center justify-center py-2">
                    <span className="text-2xl font-heading text-amber-500 tabular-nums">
                      {formatCooldown(hatchCountdown * 1000)}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary text-center">{t('剩余时间')}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary">
                    {hatchCountdown === 0 ? t('可以孵化了！') : t('你的魔法生物还在蛋中，点击孵化让它破壳而出！')}
                  </p>
                  <Button onClick={handleHatch} disabled={interacting}>
                    {interacting ? t('加载中') : t('孵化')}
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* Interaction buttons */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-medium text-text-primary">{t('互动')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Feed */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={openFeedDialog}
              >
                <Utensils size={18} />
                <span className="text-xs">{t('喂养')}</span>
              </Button>

              {/* Play */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={handlePlay}
                disabled={isWeak || playCooldown > 0 || interacting}
              >
                <Heart size={18} />
                <span className="text-xs">
                  {playCooldown > 0
                    ? `${t('冷却中')} ${formatCooldown(playCooldown)}`
                    : t('玩耍')
                  }
                </span>
              </Button>

              {/* Clean */}
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-3"
                onClick={handleClean}
                disabled={isWeak || cleanCountToday >= MAX_CLEAN_PER_DAY || interacting}
              >
                <Droplets size={18} />
                <span className="text-xs">
                  {t('清洁')} ({MAX_CLEAN_PER_DAY - cleanCountToday}/{MAX_CLEAN_PER_DAY})
                </span>
              </Button>
            </div>
          </Card>

          {/* Management actions */}
          <div className="flex gap-3">
            {!pet.is_primary && (
              <Button variant="outline" onClick={handleSetPrimary}>
                <Crown className="mr-2 h-4 w-4" />
                {t('设为主宠')}
              </Button>
            )}
            <Button variant="outline" onClick={openRenameDialog}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('修改昵称')}
            </Button>
            {!pet.is_primary && pet.state !== 'dispatched' && pet.state !== 'listed' && (
              <Button variant="outline" className="text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => setReleaseOpen(true)}>
                {t('放养')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Feed dialog */}
      <Dialog open={feedOpen} onOpenChange={setFeedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('选择食物')}</DialogTitle>
            <DialogDescription>{t('选择背包中的食物喂养魔法生物')}</DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-64 overflow-y-auto space-y-2">
            {loadingInventory ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-text-tertiary">{t('暂无食物')}</p>
                <Link
                  to="/console/pet/shop"
                  className="text-sm text-accent hover:underline"
                  onClick={() => setFeedOpen(false)}
                >
                  {t('去商店购买')}
                </Link>
              </div>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={handleFeedAll}
                  disabled={feedingAll || feedingItemId !== null}
                >
                  {feedingAll ? (
                    <><Spinner size="sm" className="mr-2" />{t('喂食中...')}</>
                  ) : (
                    <><Utensils className="mr-2 h-4 w-4" />{t('一键喂食')}</>
                  )}
                </Button>
                {inventory.map((item) => {
                const effectDesc = parseEffectDescription(item.effect, t);
                return (
                  <button
                    key={item.item_id}
                    onClick={() => handleFeed(item.item_id)}
                    disabled={feedingItemId !== null || feedingAll}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3',
                      'hover:bg-surface-hover transition-colors text-left',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {item.name}
                      </p>
                      {effectDesc && (
                        <p className="text-xs text-text-tertiary mt-0.5">{effectDesc}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-text-secondary tabular-nums">
                      x{item.quantity}
                    </span>
                    {feedingItemId === item.item_id && (
                      <Spinner size="sm" />
                    )}
                  </button>
                );
              })}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('修改昵称')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder={t('昵称')}
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t('取消')}
            </Button>
            <Button onClick={handleRename} disabled={saving || !newNickname.trim()}>
              {saving ? t('加载中') : t('确认')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release confirmation dialog */}
      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('确认放养')}</DialogTitle>
            <DialogDescription>
              {t('放归后魔法生物将永久消失，此操作不可撤销。确定要放归')} {displayName} {t('吗？')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseOpen(false)}>
              {t('取消')}
            </Button>
            <Button variant="danger" onClick={handleRelease} disabled={releasing}>
              {releasing ? t('加载中') : t('确认放养')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evolution animation overlay */}
      <EvolutionAnimation
        active={evolving}
        newStageName={evolveStageName}
        onComplete={() => setEvolving(false)}
      />

      {/* Keyframe styles */}
      <style>{`
        @keyframes pet-exp-float {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -60px); }
        }
        @keyframes pet-zzz-float {
          0%, 100% { opacity: 0.6; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-6px); }
        }
        .pet-level-up-bounce {
          animation: pet-level-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pet-level-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .pet-exp-bar-glow {
          box-shadow: 0 0 12px rgba(217, 119, 87, 0.5);
          animation: pet-bar-flash 0.4s ease-in-out 3;
        }
        @keyframes pet-bar-flash {
          0%, 100% { box-shadow: 0 0 4px rgba(217, 119, 87, 0.2); }
          50% { box-shadow: 0 0 16px rgba(255, 193, 7, 0.6); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pet-level-up-bounce,
          .pet-exp-bar-glow {
            animation: none !important;
          }
          [style*="pet-exp-float"],
          [style*="pet-zzz-float"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface-hover/50 px-3 py-2">
      <Icon size={14} className="text-text-tertiary shrink-0" />
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="ml-auto text-sm font-medium text-text-primary tabular-nums">
        {value ?? 0}
      </span>
    </div>
  );
}

function parseEffectDescription(effect, t) {
  if (!effect) return '';
  try {
    const parsed = typeof effect === 'string' ? JSON.parse(effect) : effect;
    const parts = [];
    if (parsed.hunger) parts.push(`+${parsed.hunger} ${t('饱食度')}`);
    if (parsed.mood) parts.push(`+${parsed.mood} ${t('心情')}`);
    if (parsed.cleanliness) parts.push(`+${parsed.cleanliness} ${t('洁净度')}`);
    if (parsed.exp) parts.push(`+${parsed.exp} EXP`);
    return parts.join('  ');
  } catch {
    return '';
  }
}
