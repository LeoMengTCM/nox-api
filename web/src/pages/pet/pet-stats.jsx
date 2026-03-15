import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
} from '../../components/ui';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PawPrint, Users, ArrowLeftRight, Coins } from 'lucide-react';

const RARITY_COLORS = {
  N: '#94a3b8',
  R: '#3b82f6',
  SR: '#a855f7',
  SSR: '#f59e0b',
};

export default function PetStatsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pet/admin/stats');
      const { success, data, message } = res.data;
      if (success) {
        setStats(data);
      } else {
        showError(message || t('加载失败'));
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!stats) return null;

  const rarityData = stats.rarity_distribution
    ? Object.entries(stats.rarity_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const statCards = [
    {
      title: t('总宠物数'),
      value: stats.total_pets ?? 0,
      icon: PawPrint,
      color: 'text-accent',
    },
    {
      title: t('活跃训练师'),
      value: stats.total_users ?? 0,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: t('总交易量'),
      value: stats.total_transactions ?? 0,
      icon: ArrowLeftRight,
      color: 'text-purple-500',
    },
    {
      title: t('总交易额'),
      value: renderQuota(stats.total_volume ?? 0),
      icon: Coins,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">
        {t('统计面板')}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">{card.title}</p>
                    <p className="text-2xl font-semibold text-text-primary mt-1">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-surface-hover ${card.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rarityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('稀有度分布')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rarityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {rarityData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RARITY_COLORS[entry.name] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              {rarityData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: RARITY_COLORS[entry.name] || '#94a3b8' }}
                  />
                  <span className="text-text-secondary">{entry.name}</span>
                  <span className="font-medium text-text-primary">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
