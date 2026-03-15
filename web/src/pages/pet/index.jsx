import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, Sparkles, ArrowRight, Egg, X } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { cn } from '../../lib/cn';
import {
  Card, Spinner, EmptyState, Button,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui';
import { PetCard } from '../../components/pet/pet-card';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { WizardTitleSetting } from '../../components/pet/wizard-title-setting';
import { useWizardTitle } from '../../hooks/use-wizard-title';

const RARITY_WEIGHT = { SSR: 0, SR: 1, R: 2, N: 3 };

function sortPetsByRarity(list) {
  return [...list].sort((a, b) => {
    const ra = RARITY_WEIGHT[a.rarity] ?? 4;
    const rb = RARITY_WEIGHT[b.rarity] ?? 4;
    if (ra !== rb) return ra - rb;
    if ((b.star || 0) !== (a.star || 0)) return (b.star || 0) - (a.star || 0);
    return (b.level || 1) - (a.level || 1);
  });
}

export default function PetIndex() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { titleKey } = useWizardTitle();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [hasStarter, setHasStarter] = useState(true);
  const [maxPets, setMaxPets] = useState(20);
  const [pets, setPets] = useState([]);

  // Batch hatch state
  const [batchHatchPlan, setBatchHatchPlan] = useState(null);
  const [batchHatchConfirmOpen, setBatchHatchConfirmOpen] = useState(false);
  const [batchHatchRunning, setBatchHatchRunning] = useState(false);
  const [batchHatchProgress, setBatchHatchProgress] = useState({ current: 0, total: 0, results: [] });

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, petsRes] = await Promise.all([
        API.get('/api/pet/status'),
        API.get('/api/pet/my'),
      ]);

      if (statusRes.data.success) {
        const s = statusRes.data.data;
        setEnabled(s.enabled !== false);
        setHasStarter(s.has_starter !== false);
        setMaxPets(s.max_pets_per_user || 20);
      } else {
        if (statusRes.data.message?.includes('未启用')) {
          setEnabled(false);
        }
      }

      if (petsRes.data.success) {
        setPets(petsRes.data.data || []);
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Find eggs that are ready to hatch: stage === 0 and hatch_countdown is 0 (or absent for legacy eggs)
  const hatchableEggs = useMemo(
    () => pets.filter((p) => p.stage === 0 && (p.hatch_countdown ?? 0) === 0),
    [pets],
  );

  const sortedPets = useMemo(() => sortPetsByRarity(pets), [pets]);

  const startBatchHatch = () => {
    const eggs = pets.filter((p) => p.stage === 0 && (p.hatch_countdown ?? 0) === 0);
    if (eggs.length === 0) {
      showError(t('没有可孵化的蛋'));
      return;
    }
    setBatchHatchPlan(eggs);
    setBatchHatchConfirmOpen(true);
  };

  const removeBatchHatchEgg = (index) => {
    setBatchHatchPlan((prev) => {
      if (!prev) return null;
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setBatchHatchConfirmOpen(false);
        return null;
      }
      return next;
    });
  };

  const executeBatchHatch = async () => {
    if (!batchHatchPlan || batchHatchRunning) return;
    setBatchHatchConfirmOpen(false);
    setBatchHatchRunning(true);
    const total = batchHatchPlan.length;
    setBatchHatchProgress({ current: 0, total, results: [] });

    const results = [];
    for (let i = 0; i < total; i++) {
      const egg = batchHatchPlan[i];
      setBatchHatchProgress((prev) => ({ ...prev, current: i + 1 }));

      try {
        const res = await API.post(`/api/pet/my/${egg.id}/hatch`);
        if (res.data.success) {
          results.push({ egg, success: true });
        } else {
          results.push({ egg, success: false, error: res.data.message });
        }
      } catch {
        results.push({ egg, success: false, error: t('孵化失败') });
      }

      setBatchHatchProgress((prev) => ({ ...prev, results: [...results] }));
      if (i < total - 1) await new Promise((r) => setTimeout(r, 300));
    }

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      showSuccess(t('批量孵化完成') + `: ${successCount}/${total}`);
    }
    if (successCount < total) {
      showError(t('部分孵化失败') + `: ${total - successCount}/${total}`);
    }

    setBatchHatchPlan(null);
    setBatchHatchRunning(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-hover mb-4">
            <PawPrint className="h-8 w-8 text-text-tertiary" />
          </div>
          <h2 className="text-lg font-heading text-text-primary mb-2">{t('神奇动物')}</h2>
          <p className="text-sm text-text-tertiary">{t('神奇动物系统未启用')}</p>
        </div>
      </div>
    );
  }

  // User hasn't adopted a starter yet
  if (!hasStarter) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-heading text-text-primary">{t('我的神奇动物')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('魔法生物园')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mt-8"
        >
          <Card className="p-8 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
              <Sparkles className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-lg font-heading text-text-primary mb-2">
              {t('选择你的第一只魔法生物')}
            </h2>
            <p className="text-sm text-text-tertiary mb-6 max-w-sm">
              {t('每位巫师可以免费领养一只初始魔法生物', { title: t(titleKey) })}
            </p>
            <Button onClick={() => navigate('/console/pet/adopt')}>
              {t('去领养')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </motion.div>
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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-heading text-text-primary">{t('我的神奇动物')}</h1>
          <p className="text-sm text-text-tertiary mt-1">
            {pets.length} / {maxPets}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hatchableEggs.length > 0 && (
            <Button
              size="default"
              className="bg-gradient-to-r from-accent to-amber-500 hover:from-accent/90 hover:to-amber-500/90 text-white shadow-md animate-pulse"
              onClick={startBatchHatch}
              disabled={batchHatchRunning}
            >
              <Egg className="mr-1.5 h-4 w-4" />{t('一键孵化')}
            </Button>
          )}
          <WizardTitleSetting />
        </div>
      </motion.div>

      {/* Pet grid */}
      {pets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <EmptyState
            title={t('暂无魔法生物')}
            description={t('你还没有任何魔法生物')}
          />
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {sortedPets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onClick={() => navigate(`/console/pet/${pet.id}`)}
            />
          ))}
        </motion.div>
      )}

      {/* Batch Hatch Confirm Dialog */}
      <Dialog open={batchHatchConfirmOpen} onOpenChange={(open) => { if (!batchHatchRunning) setBatchHatchConfirmOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('一键孵化')}</DialogTitle>
            <DialogDescription>{t('以下蛋已经可以孵化，点击确认后将逐个孵化')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {batchHatchPlan?.map((egg, idx) => (
              <div key={egg.id} className="flex items-center gap-3 rounded-lg bg-surface-hover px-3 py-2">
                <PetSprite visualKey={egg.visual_key} stage={0} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {egg.nickname || egg.species_name || '???'}
                  </p>
                  <RarityBadge rarity={egg.rarity || 'N'} />
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 whitespace-nowrap">{t('可以孵化了！')}</span>
                <button
                  type="button"
                  onClick={() => removeBatchHatchEgg(idx)}
                  className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-text-tertiary hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-hover border-t border-border">
            <span className="text-sm text-text-secondary">
              {t('共 {{count}} 个蛋可孵化', { count: batchHatchPlan?.length || 0 })}
            </span>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBatchHatchConfirmOpen(false)}>{t('取消')}</Button>
            <Button onClick={executeBatchHatch} disabled={!batchHatchPlan || batchHatchPlan.length === 0}>
              <Egg className="mr-2 h-4 w-4" />{t('开始孵化')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Hatch Progress Overlay */}
      <AnimatePresence>
        {batchHatchRunning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <Card className="p-6 w-full max-w-sm space-y-4">
              <h3 className="text-lg font-heading text-text-primary text-center">{t('批量孵化中...')}</h3>
              <div className="w-full bg-surface-hover rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(batchHatchProgress.current / batchHatchProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-text-secondary text-center">
                {batchHatchProgress.current} / {batchHatchProgress.total}
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {batchHatchProgress.results.map((r, i) => (
                  <div key={i} className={cn('text-xs px-2 py-1 rounded', r.success ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : 'text-red-500 bg-red-50 dark:bg-red-950/30')}>
                    {r.egg.nickname || r.egg.species_name} — {r.success ? t('孵化成功') : r.error}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
