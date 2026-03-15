import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PawPrint, Sparkles, ArrowRight } from 'lucide-react';
import { API } from '../../lib/api';
import { showError } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Spinner, EmptyState, Button } from '../../components/ui';
import { PetCard } from '../../components/pet/pet-card';

export default function PetIndex() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [hasStarter, setHasStarter] = useState(true);
  const [maxPets, setMaxPets] = useState(20);
  const [pets, setPets] = useState([]);

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

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
          <h2 className="text-lg font-heading text-text-primary mb-2">{t('宠物系统')}</h2>
          <p className="text-sm text-text-tertiary">{t('宠物系统未启用')}</p>
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
          <h1 className="text-2xl font-heading text-text-primary">{t('我的宠物')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('宠物园')}</p>
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
              {t('选择你的第一只伙伴')}
            </h2>
            <p className="text-sm text-text-tertiary mb-6 max-w-sm">
              {t('每位训练师可以免费领养一只初始宠物')}
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
          <h1 className="text-2xl font-heading text-text-primary">{t('我的宠物')}</h1>
          <p className="text-sm text-text-tertiary mt-1">
            {pets.length} / {maxPets}
          </p>
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
            title={t('暂无宠物')}
            description={t('你的宠物园还是空的')}
          />
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onClick={() => navigate(`/console/pet/${pet.id}`)}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
