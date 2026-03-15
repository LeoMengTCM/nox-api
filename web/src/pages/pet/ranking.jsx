import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crown, PawPrint, Star } from 'lucide-react';
import { Card } from '../../components/ui';
import { API } from '../../lib/api';
import { showError } from '../../lib/utils';
import { UserContext } from '../../contexts/user-context';
import { useWizardTitle } from '../../hooks/use-wizard-title';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function RankBadge({ rank }) {
  if (rank <= 3) {
    return (
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: MEDAL_COLORS[rank - 1] }}
      >
        {rank}
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-text-secondary shrink-0">
      {rank}
    </div>
  );
}

function PetRankingBoard({ title, icon: Icon, iconColor, data, currentUserId, valueLabel, renderValue }) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-hover/30">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-heading font-semibold text-text-primary">{title}</h2>
          <p className="text-xs text-text-tertiary">{valueLabel}</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">{t('暂无数据')}</div>
        ) : (
          data.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.user_id === currentUserId;

            return (
              <div
                key={`${entry.user_id}-${index}`}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isCurrentUser ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                }`}
              >
                <RankBadge rank={rank} />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-medium shrink-0">
                  {(entry.username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/console/user/${entry.user_id}`}
                    className="text-sm font-medium text-text-primary truncate block hover:text-accent transition-colors"
                  >
                    {entry.username}
                  </Link>
                  {entry.pet_name && (
                    <div className="text-xs text-text-tertiary truncate">{entry.pet_name}</div>
                  )}
                </div>
                <div className="text-sm font-medium text-text-secondary shrink-0">
                  {renderValue(entry)}
                </div>
                {isCurrentUser && (
                  <span className="text-[10px] text-accent font-medium bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                    {t('你')}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

export default function PetRanking() {
  const { t } = useTranslation();
  const { titleKey } = useWizardTitle();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    level_ranking: [],
    count_ranking: [],
    star_ranking: [],
  });
  const [userState] = useContext(UserContext);
  const currentUserId = userState?.user?.id;

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const res = await API.get('/api/pet/ranking');
        const { success, data: rankData, message } = res.data;
        if (success) {
          setData(rankData || { level_ranking: [], count_ranking: [], star_ranking: [] });
        } else {
          showError(message || t('加载排名失败'));
        }
      } catch {
        showError(t('加载排名失败'));
      }
      setLoading(false);
    };
    loadRanking();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-heading text-text-primary">{t('生物排行')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('看看谁是最强巫师', { title: t(titleKey) })}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-surface-hover/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-heading text-text-primary">{t('生物排行')}</h1>
        <p className="text-sm text-text-tertiary mt-1">{t('看看谁是最强巫师', { title: t(titleKey) })}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <PetRankingBoard
          title={t('最高等级')}
          icon={Crown}
          iconColor="#F59E0B"
          data={data.level_ranking || []}
          currentUserId={currentUserId}
          valueLabel={t('单只魔法生物最高等级')}
          renderValue={(entry) => `Lv.${entry.value}`}
        />
        <PetRankingBoard
          title={t('生物收集')}
          icon={PawPrint}
          iconColor="#8B5CF6"
          data={data.count_ranking || []}
          currentUserId={currentUserId}
          valueLabel={t('拥有魔法生物最多的巫师', { title: t(titleKey) })}
          renderValue={(entry) => `${entry.value} ${t('只')}`}
        />
        <PetRankingBoard
          title={t('总星级')}
          icon={Star}
          iconColor="#EF4444"
          data={data.star_ranking || []}
          currentUserId={currentUserId}
          valueLabel={t('魔法生物总星级最高')}
          renderValue={(entry) => `${entry.value} \u2605`}
        />
      </div>
    </motion.div>
  );
}
