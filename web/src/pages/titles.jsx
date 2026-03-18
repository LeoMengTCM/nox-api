import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Check, Star } from 'lucide-react';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';
import { cn } from '../lib/cn';
import { Card, Spinner, Badge } from '../components/ui';

const RARITY_COLORS = {
  N: 'border-zinc-500/30 bg-zinc-500/5',
  R: 'border-blue-500/30 bg-blue-500/5',
  SR: 'border-purple-500/30 bg-purple-500/5',
  SSR: 'border-amber-500/30 bg-amber-500/5',
};

const RARITY_TEXT = {
  N: 'text-zinc-400',
  R: 'text-blue-400',
  SR: 'text-purple-400',
  SSR: 'text-amber-400',
};

const CATEGORY_NAMES = {
  casino: '赌场',
  pet: '宠物',
  heist: '打劫',
  arena: '擂台',
  social: '社交',
};

export default function Titles() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [allTitles, setAllTitles] = useState([]);
  const [myTitles, setMyTitles] = useState([]);
  const [operating, setOperating] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        API.get('/api/titles/'),
        API.get('/api/titles/my'),
      ]);
      if (allRes.data.success) setAllTitles(allRes.data.data || []);
      if (myRes.data.success) setMyTitles(myRes.data.data || []);
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const myTitleIds = new Set(myTitles.map((t) => t.id));
  const equippedId = myTitles.find((t) => t.equipped)?.id;

  const handleEquip = async (titleId) => {
    setOperating(titleId);
    try {
      const res = await API.post('/api/titles/equip', { title_id: titleId });
      if (res.data.success) {
        showSuccess('称号佩戴成功');
        loadData();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setOperating(null);
    }
  };

  const handleUnequip = async () => {
    setOperating(-1);
    try {
      const res = await API.post('/api/titles/unequip');
      if (res.data.success) {
        showSuccess('已取消佩戴');
        loadData();
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setOperating(null);
    }
  };

  const categories = ['all', ...new Set(allTitles.map((t) => t.category))];
  const filtered = filter === 'all' ? allTitles : allTitles.filter((t) => t.category === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          <Award className="mr-2 inline h-8 w-8 text-amber-400" />
          称号收集
        </h1>
        <p className="mt-2 text-muted-foreground">
          已获得 {myTitles.length} / {allTitles.length} 个称号
        </p>
      </div>

      {/* Equipped Title */}
      {equippedId && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4 text-center">
          <span className="text-sm text-muted-foreground">当前佩戴</span>
          <div className="mt-1 text-lg font-bold" style={{ color: myTitles.find((t) => t.id === equippedId)?.color }}>
            {myTitles.find((t) => t.id === equippedId)?.name}
          </div>
          <button
            className="mt-2 text-sm text-primary hover:underline"
            onClick={handleUnequip}
            disabled={operating === -1}
          >
            取消佩戴
          </button>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            className={cn(
              'rounded-full px-3 py-1 text-sm transition-colors',
              filter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            onClick={() => setFilter(cat)}
          >
            {cat === 'all' ? '全部' : CATEGORY_NAMES[cat] || cat}
          </button>
        ))}
      </div>

      {/* Titles Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((title) => {
          const owned = myTitleIds.has(title.id);
          const equipped = equippedId === title.id;

          return (
            <Card
              key={title.id}
              className={cn(
                'relative overflow-hidden p-4 transition-all',
                RARITY_COLORS[title.rarity] || 'border-border',
                !owned && 'opacity-50 grayscale'
              )}
            >
              {equipped && (
                <div className="absolute right-2 top-2">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  owned ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Star className={cn('h-5 w-5', RARITY_TEXT[title.rarity] || 'text-muted-foreground')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: title.color || undefined }}>
                      {title.name}
                    </span>
                    <Badge variant="outline" className={cn('text-xs', RARITY_TEXT[title.rarity])}>
                      {title.rarity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{title.description}</p>
                  <div className="mt-1 text-xs text-muted-foreground/60">
                    {CATEGORY_NAMES[title.category] || title.category}
                  </div>
                </div>
              </div>

              {owned && !equipped && (
                <button
                  className="mt-3 w-full rounded-md bg-primary/10 py-1.5 text-sm text-primary hover:bg-primary/20"
                  onClick={() => handleEquip(title.id)}
                  disabled={operating === title.id}
                >
                  {operating === title.id ? '佩戴中...' : '佩戴'}
                </button>
              )}
              {!owned && (
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  未获得
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
