import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Swords, Shield, Zap, Clover, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import {
  Card, Spinner, Button,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { StarDisplay } from '../../components/pet/star-display';

function parseStats(raw) {
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
}

const petOf = (entry) => entry.pet ?? entry;

export default function PetFusion() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState([]);
  const [quota, setQuota] = useState(0);
  const [mainPet, setMainPet] = useState(null);
  const [materialPet, setMaterialPet] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fusing, setFusing] = useState(false);
  const [fusionAnim, setFusionAnim] = useState(false);
  const [fusionResult, setFusionResult] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [petsRes, userRes] = await Promise.all([
        API.get('/api/pet/my'),
        API.get('/api/user/self'),
      ]);
      if (petsRes.data.success) setPets(petsRes.data.data || []);
      else showError(petsRes.data.message);
      if (userRes.data.success) setQuota(userRes.data.data?.quota || 0);
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const mainCandidates = useMemo(
    () => pets.filter((p) => {
      const d = petOf(p);
      return d.star < 5 && ['normal', 'weak'].includes(d.state);
    }),
    [pets],
  );

  const materialCandidates = useMemo(() => {
    if (!mainPet) return [];
    const main = petOf(mainPet);
    return pets.filter((p) => {
      const d = petOf(p);
      return d.id !== main.id && d.species_id === main.species_id
        && !d.is_primary && !['dispatched', 'listed'].includes(d.state);
    });
  }, [pets, mainPet]);

  const mainData = mainPet ? petOf(mainPet) : null;
  const materialData = materialPet ? petOf(materialPet) : null;
  const fusionCost = mainData ? (mainData.star + 1) * 200000 : 0;
  const mainStats = mainData ? parseStats(mainData.stats) : {};
  const projectedStats = useMemo(() => {
    const s = { ...mainStats };
    for (const k of Object.keys(s)) if (typeof s[k] === 'number') s[k] = Math.round(s[k] * 1.1);
    return s;
  }, [mainStats]);

  const selectMain = (pet) => { setMainPet(pet); setMaterialPet(null); setFusionResult(null); };
  const selectMaterial = (pet) => { setMaterialPet(pet); setFusionResult(null); };

  const handleFusion = async () => {
    if (!mainData || !materialData || fusing) return;
    setFusing(true);
    setConfirmOpen(false);
    try {
      const res = await API.post('/api/pet/fusion', {
        pet_id: mainData.id, material_pet_id: materialData.id,
      });
      if (res.data.success) {
        setFusionResult(res.data.data);
        setFusionAnim(true);
        setTimeout(() => {
          setFusionAnim(false);
          setFusing(false);
          showSuccess(t('融合成功'));
          setMainPet(null);
          setMaterialPet(null);
          loadData();
        }, 2200);
      } else {
        setFusing(false);
        showError(res.data.message || t('融合失败'));
      }
    } catch {
      setFusing(false);
      showError(t('融合失败'));
    }
  };

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
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-heading text-text-primary">{t('融合升星')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('使用同种宠物进行融合，提升星级和属性')}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-text-primary">{renderQuota(quota)}</span>
        </div>
      </motion.div>

      {/* Fusion animation overlay */}
      <AnimatePresence>
        {fusionAnim && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <div className="fusion-container relative flex items-center gap-6">
              {mainData && (
                <div className="fusion-left">
                  <PetSprite visualKey={mainData.visual_key} stage={mainData.stage} size="lg" />
                </div>
              )}
              {materialData && (
                <div className="fusion-right">
                  <PetSprite visualKey={materialData.visual_key} stage={materialData.stage} size="lg" />
                </div>
              )}
              <div className="fusion-flash" />
              {fusionResult && (
                <div className="fusion-reveal">
                  <PetSprite visualKey={mainData?.visual_key} stage={mainData?.stage} size="lg" />
                  <div className="mt-3 flex justify-center">
                    <StarDisplay star={(mainData?.star ?? 0) + 1} size="md" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two-column selection */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Main Pet */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-primary">{t('选择主宠')}</h2>
          {mainCandidates.length === 0
            ? <EmptySlot text={t('没有可融合的宠物')} />
            : <PetGrid items={mainCandidates} selectedId={mainData?.id} onSelect={selectMain} />}
        </div>
        {/* Material Pet */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-primary">{t('选择素材')}</h2>
          {!mainPet
            ? <EmptySlot text={t('请先选择主宠')} />
            : materialCandidates.length === 0
              ? <Card className="p-8 text-center space-y-2">
                  <p className="text-sm text-text-tertiary">{t('没有同种宠物可作为材料')}</p>
                  <p className="text-sm text-text-tertiary py-4 text-center">{t('融合需要相同物种的宠物作为素材')}</p>
                </Card>
              : <PetGrid items={materialCandidates} selectedId={materialData?.id} onSelect={selectMaterial} />}
        </div>
      </motion.div>

      {/* Fusion Preview */}
      <AnimatePresence>
        {mainData && materialData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.3 }}
          >
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <PetPreviewCol pet={mainData} sub={<StarDisplay star={mainData.star} size="sm" />} />
                <Plus className="h-6 w-6 text-text-tertiary" />
                <PetPreviewCol pet={materialData} sub={<span className="text-[11px] text-text-tertiary">{t('素材')}</span>} />
                <ArrowRight className="h-6 w-6 text-accent" />
                <PetPreviewCol pet={mainData} accent sub={<StarDisplay star={mainData.star + 1} size="sm" />}>
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-500" />
                </PetPreviewCol>
              </div>

              {/* Stats comparison */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-primary">{t('属性变化')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCompare icon={Swords} label={t('攻击')} before={mainStats.attack} after={projectedStats.attack} />
                  <StatCompare icon={Shield} label={t('防御')} before={mainStats.defense} after={projectedStats.defense} />
                  <StatCompare icon={Zap} label={t('速度')} before={mainStats.speed} after={projectedStats.speed} />
                  <StatCompare icon={Clover} label={t('幸运')} before={mainStats.luck} after={projectedStats.luck} />
                </div>
              </div>

              {/* Cost + Confirm */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-border">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">{t('星级')}:</span>
                    <StarDisplay star={mainData.star} size="sm" />
                    <ArrowRight className="h-3.5 w-3.5 text-text-tertiary" />
                    <StarDisplay star={mainData.star + 1} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">{t('费用')}:</span>
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium text-text-primary">{renderQuota(fusionCost)}</span>
                  </div>
                </div>
                <Button onClick={() => setConfirmOpen(true)} disabled={fusing || quota < fusionCost}>
                  <Sparkles className="mr-2 h-4 w-4" />{t('融合')}
                </Button>
              </div>
              {quota < fusionCost && (
                <p className="text-xs text-red-500 text-center">{t('余额不足')}</p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('确认融合')}</DialogTitle>
            <DialogDescription>{t('此操作不可撤销')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
              <span className="text-sm text-amber-700 dark:text-amber-400">{t('材料宠物将被消耗')}</span>
            </div>
            {materialData && (
              <div className="flex items-center gap-3 rounded-lg bg-surface-hover px-4 py-3">
                <PetSprite visualKey={materialData.visual_key} stage={materialData.stage} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {materialData.nickname || materialData.species_name || '???'}
                  </p>
                  <p className="text-xs text-red-500">{t('将被消耗')}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-hover">
              <span className="text-sm text-text-secondary">{t('费用')}</span>
              <span className="text-sm font-semibold text-text-primary">{renderQuota(fusionCost)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>{t('取消')}</Button>
            <Button onClick={handleFusion} loading={fusing} disabled={fusing}>{t('确认融合')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fusion CSS animations */}
      <style>{`
        .fusion-container{display:flex;align-items:center;justify-content:center}
        .fusion-left{animation:f-slide-l .8s ease-in-out forwards}
        .fusion-right{animation:f-slide-r .8s ease-in-out forwards}
        .fusion-flash{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(255,215,0,.8),transparent 70%);opacity:0;animation:f-flash .6s ease-in-out .8s forwards;pointer-events:none}
        .fusion-reveal{position:absolute;display:flex;flex-direction:column;align-items:center;opacity:0;animation:f-reveal .6s ease-out 1.5s forwards}
        @keyframes f-slide-l{0%{transform:translateX(0);opacity:1}70%{transform:translateX(60px);opacity:1}100%{transform:translateX(60px);opacity:0}}
        @keyframes f-slide-r{0%{transform:translateX(0);opacity:1}70%{transform:translateX(-60px);opacity:1}100%{transform:translateX(-60px);opacity:0}}
        @keyframes f-flash{0%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.5)}100%{opacity:0;transform:scale(2)}}
        @keyframes f-reveal{0%{opacity:0;transform:scale(.5)}60%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
        @media(prefers-reduced-motion:reduce){.fusion-left,.fusion-right,.fusion-flash,.fusion-reveal{animation:none!important}.fusion-left,.fusion-right{opacity:0!important}.fusion-reveal{opacity:1!important}}
      `}</style>
    </div>
  );
}

/* ---------- sub-components ---------- */

function EmptySlot({ text }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-text-tertiary">{text}</p>
    </Card>
  );
}

function PetGrid({ items, selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((entry) => {
        const pet = petOf(entry);
        return (
          <Card
            key={pet.id}
            className={cn(
              'p-3 cursor-pointer transition-all hover:border-border-strong',
              selectedId === pet.id && 'border-accent ring-1 ring-accent/30 bg-accent/5',
            )}
            onClick={() => onSelect(entry)}
          >
            <div className="flex flex-col items-center gap-2">
              <PetSprite visualKey={pet.visual_key} stage={pet.stage} size="sm" />
              <div className="text-center min-w-0 w-full">
                <p className="text-xs font-medium text-text-primary truncate">
                  {pet.nickname || pet.species_name || '???'}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <RarityBadge rarity={pet.rarity || 'N'} />
                </div>
                {pet.star > 0 && <StarDisplay star={pet.star} size="sm" className="justify-center mt-1" />}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function PetPreviewCol({ pet, accent, sub, children }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <PetSprite visualKey={pet.visual_key} stage={pet.stage} size="md" />
        {children}
      </div>
      <p className={cn('text-xs font-medium', accent ? 'text-accent' : 'text-text-primary')}>
        {pet.nickname || pet.species_name || '???'}
      </p>
      {sub}
    </div>
  );
}

function StatCompare({ icon: Icon, label, before, after }) {
  const diff = (after ?? 0) - (before ?? 0);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-hover/50 px-3 py-2">
      <Icon size={14} className="text-text-tertiary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary tabular-nums">{before ?? 0}</span>
          <ArrowRight className="h-3 w-3 text-text-tertiary" />
          <span className="text-sm font-medium text-accent tabular-nums">{after ?? 0}</span>
          {diff > 0 && <span className="text-[11px] text-green-500 font-medium">+{diff}</span>}
        </div>
      </div>
    </div>
  );
}
