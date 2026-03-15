import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Coins,
  History,
  Info,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota, timestamp2string } from '../../lib/utils';
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
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Pagination,
} from '../../components/ui';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { GachaAnimation } from '../../components/pet/gacha-animation';

function PityBar({ label, current, total, color }) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className="text-text-tertiary tabular-nums">
          {current} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-active overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function RatesDialog({ open, onOpenChange, pool }) {
  const { t } = useTranslation();

  const rates = useMemo(() => {
    if (!pool?.rates) return [];
    try {
      const parsed = typeof pool.rates === 'string' ? JSON.parse(pool.rates) : pool.rates;
      return Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([rarity, rate]) => ({ rarity, rate }));
    } catch { return []; }
  }, [pool?.rates]);

  const speciesPool = useMemo(() => {
    if (!pool?.species_pool) return [];
    try {
      const parsed = typeof pool.species_pool === 'string' ? JSON.parse(pool.species_pool) : pool.species_pool;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [pool?.species_pool]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('概率公示')}</DialogTitle>
          <DialogDescription>{pool?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Rates */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-primary">{t('各稀有度概率')}</h4>
            <div className="grid grid-cols-2 gap-2">
              {rates.map((r) => (
                <div key={r.rarity} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover">
                  <RarityBadge rarity={r.rarity} />
                  <span className="text-sm font-medium text-text-primary tabular-nums">
                    {typeof r.rate === 'number' ? (r.rate * 100).toFixed(1) + '%' : r.rate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Species list */}
          {speciesPool.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-primary">{t('可获得物种')}</h4>
              <div className="space-y-1.5">
                {speciesPool.map((sp) => (
                  <div key={sp.species_id || sp.id || sp.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-hover">
                    <PetSprite visualKey={sp.visual_key} stage={0} size="sm" />
                    <span className="text-sm text-text-primary flex-1 truncate">{sp.name || sp.species_name}</span>
                    <RarityBadge rarity={sp.rarity} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PetGacha() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState([]);
  const [activePoolId, setActivePoolId] = useState(null);
  const [quota, setQuota] = useState(0);
  const [petCount, setPetCount] = useState(0);
  const [petLimit, setPetLimit] = useState(20);
  const [pity, setPity] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [animResults, setAnimResults] = useState(null);
  const [animMode, setAnimMode] = useState('single');
  const [ratesOpen, setRatesOpen] = useState(false);

  // History
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const PAGE_SIZE = 20;

  const activePool = useMemo(() => pools.find((p) => String(p.id) === String(activePoolId)), [pools, activePoolId]);

  // Load pools + user info
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [poolsRes, userRes, petsRes, statusRes] = await Promise.all([
          API.get('/api/pet/gacha/pools'),
          API.get('/api/user/self'),
          API.get('/api/pet/my'),
          API.get('/api/pet/status'),
        ]);
        if (poolsRes.data.success) {
          const poolList = poolsRes.data.data || [];
          setPools(poolList);
          if (poolList.length > 0) {
            setActivePoolId(String(poolList[0].id));
          }
        } else {
          showError(poolsRes.data.message);
        }
        if (userRes.data.success) {
          setQuota(userRes.data.data?.quota || 0);
        }
        if (petsRes.data.success) {
          const pets = petsRes.data.data;
          setPetCount(Array.isArray(pets) ? pets.length : 0);
        }
        if (statusRes.data.success) {
          setPetLimit(statusRes.data.data?.max_pets_per_user || 20);
        }
      } catch {
        showError(t('加载失败'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load pity when active pool changes
  useEffect(() => {
    if (!activePoolId) return;
    const loadPity = async () => {
      try {
        const res = await API.get('/api/pet/gacha/pity', { params: { pool_id: activePoolId } });
        if (res.data.success) {
          setPity(res.data.data);
        }
      } catch { /* silently fail */ }
    };
    loadPity();
  }, [activePoolId]);

  // Load history
  const loadHistory = useCallback(async (page) => {
    if (!activePoolId) return;
    try {
      const res = await API.get('/api/pet/gacha/history', {
        params: { pool_id: activePoolId, page, page_size: PAGE_SIZE },
      });
      if (res.data.success) {
        setHistory(res.data.data?.list || []);
        setHistoryTotal(res.data.data?.total || 0);
      }
    } catch { /* silently fail */ }
  }, [activePoolId]);

  useEffect(() => {
    if (historyOpen && activePoolId) {
      loadHistory(historyPage);
    }
  }, [historyOpen, historyPage, activePoolId, loadHistory]);

  // Pull
  const handlePull = async (count) => {
    if (!activePool || pulling) return;
    if (petCount >= petLimit) {
      showError(t('魔法生物栏位已满'));
      return;
    }
    setPulling(true);
    try {
      const res = await API.post('/api/pet/gacha/pull', {
        pool_id: Number(activePool.id),
        count,
      });
      if (res.data.success) {
        const results = res.data.data || [];
        setAnimResults(results);
        setAnimMode(count === 1 ? 'single' : 'multi');
        // Refresh data in background
        const [userRes, petsRes, pityRes] = await Promise.all([
          API.get('/api/user/self'),
          API.get('/api/pet/my'),
          API.get('/api/pet/gacha/pity', { params: { pool_id: activePoolId } }),
        ]);
        if (userRes.data.success) setQuota(userRes.data.data?.quota || 0);
        if (petsRes.data.success) {
          const pets = petsRes.data.data;
          setPetCount(Array.isArray(pets) ? pets.length : 0);
        }
        if (pityRes.data.success) setPity(pityRes.data.data);
      } else {
        showError(res.data.message || t('召唤失败'));
      }
    } catch {
      showError(t('召唤失败'));
    } finally {
      setPulling(false);
    }
  };

  // Cost computation moved into PoolContent for per-pool accuracy

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Sparkles className="h-12 w-12 text-text-quaternary mb-4" />
          <h2 className="text-lg font-heading text-text-primary">{t('暂无活跃卡池')}</h2>
          <p className="text-sm text-text-tertiary mt-1">{t('请稍后再来')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Animation overlay */}
      {animResults && (
        <GachaAnimation
          results={animResults}
          mode={animMode}
          onComplete={() => {
            setAnimResults(null);
            if (historyOpen) loadHistory(1);
          }}
        />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-heading text-text-primary">{t('魔法召唤')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('消耗额度召唤新的魔法生物')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-text-primary">{renderQuota(quota)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface-hover text-sm text-text-secondary">
            {petCount}/{petLimit} {t('只')}
          </div>
        </div>
      </motion.div>

      {/* Pool tabs if multiple */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        {pools.length > 1 ? (
          <Tabs value={String(activePoolId)} onValueChange={setActivePoolId}>
            <TabsList>
              {pools.map((pool) => (
                <TabsTrigger key={pool.id} value={String(pool.id)} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {pool.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {pools.map((pool) => (
              <TabsContent key={pool.id} value={String(pool.id)}>
                <PoolContent
                  pool={pool}
                  pity={pity}
                  pulling={pulling}
                  petCount={petCount}
                  petLimit={petLimit}
                  onPull={handlePull}
                  onShowRates={() => setRatesOpen(true)}
                  t={t}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <PoolContent
            pool={activePool}
            pity={pity}
            pulling={pulling}
            petCount={petCount}
            petLimit={petLimit}
            onPull={handlePull}
            onShowRates={() => setRatesOpen(true)}
            t={t}
          />
        )}
      </motion.div>

      {/* History collapsible */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-text-tertiary" />
                <span>{t('抽取历史')}</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3">
                {history.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-tertiary">
                    {t('暂无记录')}
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {history.map((h, i) => (
                        <div
                          key={h.id || i}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
                        >
                          <PetSprite visualKey={h.visual_key} stage={0} size="sm" />
                          <span className="text-sm text-text-primary flex-1 truncate">
                            {h.species_name}
                          </span>
                          <RarityBadge rarity={h.rarity} />
                          {h.is_pity && (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {t('保底')}
                            </span>
                          )}
                          <span className="text-xs text-text-quaternary tabular-nums">
                            {h.created_at ? timestamp2string(h.created_at) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                    {historyTotal > PAGE_SIZE && (
                      <Pagination
                        page={historyPage}
                        pageSize={PAGE_SIZE}
                        total={historyTotal}
                        onPageChange={setHistoryPage}
                      />
                    )}
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>

      {/* Rates dialog */}
      <RatesDialog open={ratesOpen} onOpenChange={setRatesOpen} pool={activePool} />
    </div>
  );
}

function PoolContent({ pool, pity, pulling, petCount, petLimit, onPull, onShowRates, t }) {
  if (!pool) return null;
  const isFull = petCount >= petLimit;

  // Compute costs per-pool from the pool's own data
  const costSingle = pool.cost_per_pull || 0;
  const discount = pool.ten_pull_discount ?? 1;
  const costTenOriginal = costSingle * 10;
  const costTen = Math.round(costTenOriginal * discount);
  const hasDiscount = discount < 1;

  return (
    <div className="space-y-4 mt-4">
      {/* Pool info */}
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-heading text-text-primary">{pool.name}</h2>
            {pool.description && (
              <p className="text-sm text-text-tertiary mt-1">{pool.description}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onShowRates} className="shrink-0 gap-1.5">
            <Info className="h-3.5 w-3.5" />
            {t('概率公示')}
          </Button>
        </div>

        {/* Pull buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className={cn(
              'flex-1 relative overflow-hidden rounded-xl p-4 text-white font-medium transition-all',
              'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600',
              'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2'
            )}
            disabled={pulling || isFull}
            onClick={() => onPull(1)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="text-base">{t('召唤')} x1</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm opacity-90">
                <Coins className="h-4 w-4" />
                {renderQuota(costSingle)}
              </div>
            </div>
            {pulling && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-600/80">
                <Spinner size="sm" />
              </div>
            )}
          </button>

          <button
            className={cn(
              'flex-1 relative overflow-hidden rounded-xl p-4 text-white font-medium transition-all',
              'bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600',
              'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2'
            )}
            disabled={pulling || isFull}
            onClick={() => onPull(10)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="text-base">{t('召唤')} x10</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                {hasDiscount && (
                  <span className="line-through opacity-50 mr-1">{renderQuota(costTenOriginal)}</span>
                )}
                <Coins className="h-4 w-4 opacity-90" />
                <span className="opacity-90">{renderQuota(costTen)}</span>
              </div>
            </div>
            {pulling && (
              <div className="absolute inset-0 flex items-center justify-center bg-amber-600/80">
                <Spinner size="sm" />
              </div>
            )}
          </button>
        </div>

        {isFull && (
          <p className="text-xs text-danger text-center">{t('魔法生物栏位已满，无法召唤')}</p>
        )}
      </Card>

      {/* Pity counters */}
      {pity && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-text-primary">{t('保底计数')}</h3>
          <PityBar
            label={t('SR 保底')}
            current={pity.sr_counter || 0}
            total={pity.pity_config?.sr_pity || 10}
            color="rgb(168, 85, 247)"
          />
          <PityBar
            label={t('SSR 保底')}
            current={pity.ssr_counter || 0}
            total={pity.pity_config?.ssr_pity || 90}
            color="rgb(251, 191, 36)"
          />
        </Card>
      )}
    </div>
  );
}
