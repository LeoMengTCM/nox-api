import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Spinner, Button } from '../../components/ui';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { useWizardTitle } from '../../hooks/use-wizard-title';

export default function PetAdopt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { titleKey } = useWizardTitle();
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);
  const [starters, setStarters] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await API.get('/api/pet/status');
        if (res.data.success) {
          const data = res.data.data;
          // Already adopted, redirect
          if (data.has_starter) {
            navigate('/console/pet', { replace: true });
            return;
          }
          setStarters(data.starters || []);
        } else {
          showError(res.data.message);
        }
      } catch {
        showError(t('加载失败'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdopt = async () => {
    if (!selected || adopting) return;
    setAdopting(true);
    try {
      const res = await API.post('/api/pet/adopt', {
        species_id: selected.id,
      });
      if (res.data.success) {
        showSuccess(t('领养成功'));
        navigate('/console/pet', { replace: true });
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setAdopting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedName = selected?.name || '';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <Sparkles className="h-7 w-7 text-accent" />
          </div>
        </div>
        <h1 className="text-2xl font-heading text-text-primary">
          {t('选择你的第一只魔法生物')}
        </h1>
        <p className="text-sm text-text-tertiary mt-2">
          {t('每位巫师可以免费领养一只初始魔法生物', { title: t(titleKey) })}
        </p>
      </motion.div>

      {/* Starter cards */}
      {starters.length === 0 ? (
        <motion.div
          className="py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <p className="text-sm text-text-tertiary">
            {t('暂无可领养的初始魔法生物')}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {t('请联系管理员配置初始魔法生物')}
          </p>
        </motion.div>
      ) : (
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {starters.map((species, index) => {
          const isSelected = selected?.id === species.id;
          // Parse base_stats if string
          let baseStats = {};
          try {
            baseStats = typeof species.base_stats === 'string'
              ? JSON.parse(species.base_stats)
              : (species.base_stats || {});
          } catch { baseStats = {}; }

          return (
            <motion.div
              key={species.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              <Card
                className={cn(
                  'relative cursor-pointer p-6 flex flex-col items-center gap-4 transition-all duration-200',
                  'hover:scale-[1.02] hover:shadow-md',
                  isSelected
                    ? 'ring-2 ring-accent border-accent shadow-md'
                    : 'hover:border-border-strong'
                )}
                onClick={() => setSelected(species)}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                    <Check size={14} />
                  </div>
                )}

                {/* Rarity */}
                <div className="absolute top-3 left-3">
                  <RarityBadge rarity={species.rarity || 'N'} />
                </div>

                {/* Sprite */}
                <div className="pt-2">
                  <PetSprite
                    visualKey={species.visual_key}
                    stage="juvenile"
                    size="lg"
                    animated
                    state="idle"
                  />
                </div>

                {/* Name */}
                <h3 className="text-base font-heading text-text-primary">
                  {t(species.name)}
                </h3>

                {/* Description */}
                {species.description && (
                  <p className="text-xs text-text-tertiary text-center line-clamp-2">
                    {species.description}
                  </p>
                )}

                {/* Element */}
                {species.element && (
                  <span className="text-xs text-text-secondary">
                    {t('元素')}: {t(species.element)}
                  </span>
                )}

                {/* Base stats preview */}
                <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {baseStats.attack != null && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">{t('攻击')}</span>
                      <span className="text-text-secondary tabular-nums">{baseStats.attack}</span>
                    </div>
                  )}
                  {baseStats.defense != null && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">{t('防御')}</span>
                      <span className="text-text-secondary tabular-nums">{baseStats.defense}</span>
                    </div>
                  )}
                  {baseStats.speed != null && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">{t('速度')}</span>
                      <span className="text-text-secondary tabular-nums">{baseStats.speed}</span>
                    </div>
                  )}
                  {baseStats.luck != null && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">{t('幸运')}</span>
                      <span className="text-text-secondary tabular-nums">{baseStats.luck}</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
      )}

      {/* Adopt button */}
      {starters.length > 0 && (
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Button
          size="lg"
          onClick={handleAdopt}
          disabled={!selected || adopting}
          className="min-w-48"
        >
          {adopting ? (
            <>
              <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
              {t('加载中')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {selected ? `${t('领养')} ${t(selectedName)}` : t('请先选择魔法生物')}
            </>
          )}
        </Button>
      </motion.div>
      )}
    </div>
  );
}
