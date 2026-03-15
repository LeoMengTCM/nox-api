import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Compass,
  Coins,
  Package,
  Zap,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota, timestamp2string } from '../../lib/utils';
import { cn } from '../../lib/cn';
import {
  Card,
  Spinner,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';

// ── Helpers ──

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatCountdown(seconds) {
  if (seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function parseJson(str, fallback) {
  if (!str) return fallback;
  if (typeof str !== 'string') return str || fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function parsePetStats(pet) {
  return parseJson(pet?.stats, {});
}

function calculateSuccessRate(pet, mission) {
  const stats = parsePetStats(pet);
  const weights = parseJson(mission?.stat_weights, {});
  let totalWeight = 0;
  let weightedScore = 0;
  for (const [stat, weight] of Object.entries(weights)) {
    const val = stats[stat] || 0;
    totalWeight += weight;
    weightedScore += val * weight;
  }
  if (totalWeight === 0) return 50;
  // Normalize: assume max stat ~100 per weighted unit
  const maxPossible = totalWeight * 100;
  const raw = Math.min(100, Math.round((weightedScore / maxPossible) * 100));
  return Math.max(5, raw);
}

const REWARD_ICON = {
  quota: Coins,
  item: Package,
  exp: Zap,
};

const REWARD_COLOR = {
  quota: 'text-amber-500',
  item: 'text-purple-500',
  exp: 'text-blue-500',
};

// ── Main Component ──

export default function PetAdventure() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [pets, setPets] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [tab, setTab] = useState('missions');

  // Pet selection dialog
  const [selectPetOpen, setSelectPetOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  // Reward collection dialog
  const [collectResult, setCollectResult] = useState(null);
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [collecting, setCollecting] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const PAGE_SIZE = 20;

  // Countdown timer
  const timerRef = useRef(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Data loading ──

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [missionRes, petRes, dispatchRes] = await Promise.all([
        API.get('/api/pet/missions'),
        API.get('/api/pet/my'),
        API.get('/api/pet/dispatches'),
      ]);
      if (missionRes.data.success) {
        setMissions((missionRes.data.data || []).filter((m) => m.enabled));
      } else {
        showError(missionRes.data.message);
      }
      if (petRes.data.success) {
        setPets(petRes.data.data || []);
      }
      if (dispatchRes.data.success) {
        setDispatches(dispatchRes.data.data || []);
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [/* stable deps only */]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadHistory = useCallback(
    async (page = 1) => {
      setHistoryLoading(true);
      try {
        const res = await API.get(
          `/api/pet/dispatch/history?page=${page}&page_size=${PAGE_SIZE}`,
        );
        if (res.data.success) {
          setHistory(res.data.data?.list || []);
          setHistoryTotal(res.data.data?.total || 0);
          setHistoryPage(page);
        }
      } catch {
        showError(t('加载失败'));
      } finally {
        setHistoryLoading(false);
      }
    },
    [/* stable deps only */],
  );

  useEffect(() => {
    if (tab === 'history') {
      loadHistory(1);
    }
  }, [tab, loadHistory]);

  // ── Actions ──

  const openPetSelect = (mission) => {
    setSelectedMission(mission);
    setSelectPetOpen(true);
  };

  const handleDispatch = async (petId) => {
    if (!selectedMission || dispatching) return;
    setDispatching(true);
    try {
      const res = await API.post('/api/pet/dispatch', {
        pet_id: petId,
        mission_id: selectedMission.id,
      });
      if (res.data.success) {
        showSuccess(t('派遣成功'));
        setSelectPetOpen(false);
        setSelectedMission(null);
        // Refresh dispatches and pets
        const [petRes, dispatchRes] = await Promise.all([
          API.get('/api/pet/my'),
          API.get('/api/pet/dispatches'),
        ]);
        if (petRes.data.success) setPets(petRes.data.data || []);
        if (dispatchRes.data.success) setDispatches(dispatchRes.data.data || []);
        setTab('active');
      } else {
        showError(res.data.message || t('派遣失败'));
      }
    } catch {
      showError(t('派遣失败'));
    } finally {
      setDispatching(false);
    }
  };

  const handleCollect = async (dispatchId) => {
    if (collecting) return;
    setCollecting(dispatchId);
    try {
      const res = await API.post(`/api/pet/dispatch/${dispatchId}/collect`);
      if (res.data.success) {
        setCollectResult(res.data.data);
        setCollectDialogOpen(true);
        // Refresh dispatches and pets
        const [petRes, dispatchRes] = await Promise.all([
          API.get('/api/pet/my'),
          API.get('/api/pet/dispatches'),
        ]);
        if (petRes.data.success) setPets(petRes.data.data || []);
        if (dispatchRes.data.success) setDispatches(dispatchRes.data.data || []);
      } else {
        showError(res.data.message || t('领取失败'));
      }
    } catch {
      showError(t('领取失败'));
    } finally {
      setCollecting(null);
    }
  };

  // ── Computed ──

  // Map of pet_id to pet object for quick lookup
  const petMap = useMemo(() => {
    const map = {};
    for (const p of pets) map[p.id] = p;
    return map;
  }, [pets]);

  // Map of mission_id to mission
  const missionMap = useMemo(() => {
    const map = {};
    for (const m of missions) map[m.id] = m;
    return map;
  }, [missions]);

  // Pets currently on dispatch
  const dispatchedPetIds = new Set(
    dispatches
      .filter((d) => d.status === 'in_progress' || d.status === 'completed')
      .map((d) => d.pet_id),
  );

  // Eligible pets for a mission, sorted by success rate descending
  const getEligiblePets = (mission) => {
    return pets
      .filter(
        (p) =>
          p.state === 'normal' &&
          (p.level || 1) >= (mission.required_level || 1) &&
          !dispatchedPetIds.has(p.id),
      )
      .sort((a, b) => calculateSuccessRate(b, mission) - calculateSuccessRate(a, mission));
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-heading text-text-primary">
          {t('冒险')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1">
          {t('派遣魔法生物完成任务获取奖励')}
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="missions" className="gap-1.5">
              <Compass className="h-3.5 w-3.5" />
              {t('任务')}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('派遣中')}
              {dispatches.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-accent/15 text-accent text-[10px] font-medium">
                  {dispatches.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              {t('历史')}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Missions ── */}
          <TabsContent value="missions">
            {missions.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-tertiary">
                {t('暂无可用任务')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {missions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    t={t}
                    onDispatch={() => openPetSelect(mission)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Active Dispatches ── */}
          <TabsContent value="active">
            {dispatches.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-tertiary">
                {t('暂无派遣中的任务')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dispatches.map((dispatch) => (
                  <DispatchCard
                    key={dispatch.id}
                    dispatch={dispatch}
                    pet={petMap[dispatch.pet_id]}
                    mission={missionMap[dispatch.mission_id]}
                    now={now}
                    t={t}
                    collecting={collecting === dispatch.id}
                    onCollect={() => handleCollect(dispatch.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: History ── */}
          <TabsContent value="history">
            <HistoryList
              history={history}
              total={historyTotal}
              page={historyPage}
              pageSize={PAGE_SIZE}
              loading={historyLoading}
              petMap={petMap}
              missionMap={missionMap}
              t={t}
              onPageChange={loadHistory}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Pet Selection Dialog ── */}
      <Dialog open={selectPetOpen} onOpenChange={setSelectPetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('选择魔法生物')}</DialogTitle>
            <DialogDescription>
              {selectedMission?.name}
              {selectedMission?.required_level > 1 &&
                ` — ${t('等级要求')} Lv.${selectedMission.required_level}+`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-80 overflow-y-auto space-y-2">
            {selectedMission &&
            getEligiblePets(selectedMission).length === 0 ? (
              <div className="text-center py-8 text-sm text-text-tertiary">
                {t('没有可派遣的魔法生物')}
              </div>
            ) : (
              selectedMission &&
              getEligiblePets(selectedMission).map((pet) => {
                const rate = calculateSuccessRate(pet, selectedMission);
                const rateColor =
                  rate > 70
                    ? 'text-emerald-500'
                    : rate >= 40
                      ? 'text-amber-500'
                      : 'text-red-500';
                return (
                  <button
                    key={pet.id}
                    onClick={() => handleDispatch(pet.id)}
                    disabled={dispatching}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3',
                      'hover:bg-surface-hover transition-colors text-left',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <PetSprite
                      visualKey={pet.visual_key}
                      stage={pet.stage}
                      size="sm"
                      animated={false}
                      speciesName={pet.nickname || pet.species_name}
                      rarity={pet.rarity || 'N'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {pet.nickname || pet.species_name || '???'}
                        </span>
                        <RarityBadge rarity={pet.rarity || 'N'} />
                      </div>
                      <span className="text-xs text-text-tertiary">
                        Lv.{pet.level || 1}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-text-tertiary">
                        {t('成功率')}
                      </div>
                      <div className={cn('text-sm font-semibold tabular-nums', rateColor)}>
                        {rate}%
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setSelectPetOpen(false)}
            >
              {t('取消')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reward Collection Dialog ── */}
      <Dialog open={collectDialogOpen} onOpenChange={setCollectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {collectResult?.success ? t('任务成功') : t('任务失败')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Success/Failure indicator */}
            <div className="flex flex-col items-center gap-2">
              {collectResult?.success ? (
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <XCircle className="h-8 w-8 text-amber-500" />
                </div>
              )}
              <p className="text-sm text-text-secondary">
                {collectResult?.success
                  ? t('任务成功')
                  : t('任务失败')}
              </p>
            </div>

            {/* Rewards list */}
            {collectResult?.rewards && collectResult.rewards.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  {t('奖励')}
                </h4>
                <div className="space-y-1.5">
                  {collectResult.rewards.map((reward, idx) => {
                    const Icon = REWARD_ICON[reward.type] || Package;
                    const color = REWARD_COLOR[reward.type] || 'text-text-secondary';
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-lg bg-surface-hover/50 px-3 py-2"
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', color)} />
                        <span className="text-sm text-text-primary">
                          {reward.type === 'quota'
                            ? renderQuota(reward.amount)
                            : reward.type === 'exp'
                              ? `${reward.amount} EXP`
                              : `x${reward.amount}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Base EXP for failure */}
            {!collectResult?.success && collectResult?.base_exp > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg bg-surface-hover/50 px-3 py-2">
                <Zap className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="text-sm text-text-primary">
                  +{collectResult.base_exp} EXP
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCollectDialogOpen(false)}>
              {t('确认')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Mission Card ──

function MissionCard({ mission, t, onDispatch }) {
  const rewards = parseJson(mission.rewards, []);
  const difficulty = mission.difficulty || 1;

  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-border-strong transition-colors">
      {/* Name + Description */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">
          {mission.name}
        </h3>
        {mission.description && (
          <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
            {mission.description}
          </p>
        )}
      </div>

      {/* Meta: difficulty, duration, level */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Difficulty stars */}
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <Zap className="h-3 w-3" />
          {t('难度')}
          <span className="text-amber-500 tracking-tight">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < difficulty ? 'opacity-100' : 'opacity-20'}>
                ★
              </span>
            ))}
          </span>
        </span>

        {/* Duration */}
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <Clock className="h-3 w-3" />
          {formatDuration(mission.duration)}
        </span>

        {/* Required level */}
        {mission.required_level > 1 && (
          <span className="inline-flex items-center rounded-md bg-accent/8 px-1.5 py-0.5 text-[11px] font-medium text-accent">
            Lv.{mission.required_level}+
          </span>
        )}
      </div>

      {/* Reward preview */}
      {rewards.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-text-tertiary">{t('奖励预览')}</span>
          <div className="flex flex-wrap gap-1.5">
            {rewards.map((reward, idx) => {
              const Icon = REWARD_ICON[reward.type] || Package;
              const color = REWARD_COLOR[reward.type] || 'text-text-secondary';
              const prob =
                reward.probability != null && reward.probability < 1
                  ? ` (${Math.round(reward.probability * 100)}%)`
                  : '';
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-hover px-2 py-0.5 text-[11px] text-text-secondary"
                >
                  <Icon className={cn('h-3 w-3', color)} />
                  {reward.type === 'quota'
                    ? renderQuota(reward.amount)
                    : reward.type === 'exp'
                      ? `${reward.amount} EXP`
                      : `x${reward.amount}`}
                  {prob}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Dispatch button */}
      <div className="mt-auto pt-2 border-t border-border">
        <Button size="sm" className="w-full" onClick={onDispatch}>
          {t('派遣')}
        </Button>
      </div>
    </Card>
  );
}

// ── Active Dispatch Card ──

function DispatchCard({ dispatch, pet, mission, now, t, collecting, onCollect }) {
  const startedAt = dispatch.started_at || 0;
  const endsAt = dispatch.ends_at || 0;
  const totalDuration = endsAt - startedAt;
  const elapsed = now - startedAt;
  const remaining = Math.max(0, endsAt - now);
  const progress =
    totalDuration > 0
      ? Math.min(100, Math.round((elapsed / totalDuration) * 100))
      : 100;

  const isCompleted = dispatch.status === 'completed' || remaining <= 0;

  return (
    <Card className="p-4 flex flex-col gap-3">
      {/* Pet + Mission info */}
      <div className="flex items-center gap-3">
        {pet && (
          <PetSprite
            visualKey={pet.visual_key}
            stage={pet.stage}
            size="sm"
            animated
            speciesName={pet?.nickname || pet?.species_name}
            rarity={pet?.rarity || 'N'}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {pet?.nickname || pet?.species_name || '???'}
            </span>
            {pet && <RarityBadge rarity={pet.rarity || 'N'} />}
          </div>
          <span className="text-xs text-text-tertiary">
            {mission?.name || t('任务')}
          </span>
        </div>
        {/* Status badge */}
        {isCompleted ? (
          <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse">
            {t('待领取')}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {t('进行中')}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">
            {isCompleted ? t('已完成') : `${t('剩余时间')} ${formatCountdown(remaining)}`}
          </span>
          <span className="text-text-tertiary tabular-nums">{progress}%</span>
        </div>
        <div className="relative h-2 rounded-full bg-surface-active overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear',
              isCompleted
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                : 'bg-gradient-to-r from-blue-400 to-cyan-400',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Collect button */}
      {isCompleted && (
        <Button
          size="sm"
          className="w-full"
          onClick={onCollect}
          loading={collecting}
          disabled={collecting}
        >
          {t('领取奖励')}
        </Button>
      )}
    </Card>
  );
}

// ── History List ──

function HistoryList({
  history,
  total,
  page,
  pageSize,
  loading,
  petMap,
  missionMap,
  t,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-text-tertiary">
        {t('暂无历史记录')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => {
        const pet = petMap[item.pet_id];
        const mission = missionMap[item.mission_id];
        const rewards = parseJson(item.rewards_data, []);
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3"
          >
            {/* Mission name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary truncate">
                  {mission?.name || t('任务')}
                </span>
                {item.status === 'in_progress' ? (
                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {t('进行中')}
                  </span>
                ) : item.success ? (
                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {t('成功')}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {t('失败')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
                <span>{pet?.nickname || pet?.species_name || '???'}</span>
                <span className="text-border-strong">|</span>
                <span>{timestamp2string(item.started_at)}</span>
              </div>
            </div>

            {/* Rewards summary */}
            <div className="shrink-0 flex items-center gap-1.5">
              {rewards.slice(0, 3).map((reward, idx) => {
                const Icon = REWARD_ICON[reward.type] || Package;
                const color = REWARD_COLOR[reward.type] || 'text-text-secondary';
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-0.5 text-xs text-text-secondary"
                  >
                    <Icon className={cn('h-3 w-3', color)} />
                    {reward.type === 'quota'
                      ? renderQuota(reward.amount)
                      : reward.type === 'exp'
                        ? `${reward.amount}`
                        : `x${reward.amount}`}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-text-secondary tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
