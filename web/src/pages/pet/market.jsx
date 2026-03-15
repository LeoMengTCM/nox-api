import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Store,
  Tag,
  Gavel,
  Clock,
  Plus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Coins,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Pagination,
} from '../../components/ui';
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';

// ── Helpers ──

const RARITIES = ['N', 'R', 'SR', 'SSR'];

function getSortOptions(t) {
  return [
    { value: 'price_asc', label: t('价格从低到高') },
    { value: 'price_desc', label: t('价格从高到低') },
    { value: 'time_desc', label: t('最新上架') },
  ];
}

function formatCountdown(seconds) {
  if (seconds <= 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function starString(star) {
  if (!star || star <= 0) return '';
  return Array.from({ length: star }, () => '\u2605').join('');
}

// ── Main Component ──

export default function PetMarket() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('browse');
  const [loading, setLoading] = useState(true);

  // Browse state
  const [listings, setListings] = useState([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(1);
  const [filterRarity, setFilterRarity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('time_desc');
  const PAGE_SIZE = 20;

  // My listings state
  const [myListings, setMyListings] = useState([]);
  const [myTotal, setMyTotal] = useState(0);
  const [myPage, setMyPage] = useState(1);
  const [myLoading, setMyLoading] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Dialogs
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [buyListing, setBuyListing] = useState(null);
  const [buying, setBuying] = useState(false);

  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [bidListing, setBidListing] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [myPets, setMyPets] = useState([]);
  const [myPetsLoading, setMyPetsLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    pet_id: '',
    listing_type: 'fixed_price',
    price: '',
    min_bid: '',
    duration: '3',
  });
  const [creating, setCreating] = useState(false);

  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceData, setPriceData] = useState([]);
  const [priceSpecies, setPriceSpecies] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [cancelling, setCancelling] = useState(null);

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

  // ── Data Loading ──

  const loadBrowse = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
          sort_by: sortBy,
        });
        if (filterRarity) params.set('rarity', filterRarity);
        if (filterType) params.set('listing_type', filterType);
        const res = await API.get(`/api/pet/market?${params.toString()}`);
        if (res.data.success) {
          setListings(res.data.data?.list || []);
          setListingsTotal(res.data.data?.total || 0);
          setBrowsePage(page);
        } else {
          showError(res.data.message);
        }
      } catch {
        showError(t('加载失败'));
      } finally {
        setLoading(false);
      }
    },
    [filterRarity, filterType, sortBy],
  );

  useEffect(() => {
    if (tab === 'browse') {
      loadBrowse(1);
    }
  }, [tab, filterRarity, filterType, sortBy, loadBrowse]);

  const loadMyListings = useCallback(
    async (page = 1) => {
      setMyLoading(true);
      try {
        const res = await API.get(
          `/api/pet/market/my?page=${page}&page_size=${PAGE_SIZE}`,
        );
        if (res.data.success) {
          setMyListings(res.data.data?.list || []);
          setMyTotal(res.data.data?.total || 0);
          setMyPage(page);
        }
      } catch {
        showError(t('加载失败'));
      } finally {
        setMyLoading(false);
      }
    },
    [/* stable deps only */],
  );

  useEffect(() => {
    if (tab === 'my') {
      loadMyListings(1);
    }
  }, [tab, loadMyListings]);

  const loadHistory = useCallback(
    async (page = 1) => {
      setHistoryLoading(true);
      try {
        const res = await API.get(
          `/api/pet/market/history?page=${page}&page_size=${PAGE_SIZE}`,
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

  const handleBuy = async () => {
    if (!buyListing || buying) return;
    setBuying(true);
    try {
      const res = await API.post(`/api/pet/market/${buyListing.id}/buy`);
      if (res.data.success) {
        showSuccess(t('购买成功'));
        setBuyDialogOpen(false);
        setBuyListing(null);
        loadBrowse(browsePage);
      } else {
        showError(res.data.message || t('购买失败'));
      }
    } catch {
      showError(t('购买失败'));
    } finally {
      setBuying(false);
    }
  };

  const handleBid = async () => {
    if (!bidListing || bidding) return;
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) {
      showError(t('请输入有效的出价金额'));
      return;
    }
    const minRequired = bidListing?.current_bid || bidListing?.min_bid || bidListing?.price || 0;
    if (amount <= minRequired) {
      showError(t('出价需高于当前最高出价'));
      return;
    }
    setBidding(true);
    try {
      const res = await API.post(`/api/pet/market/${bidListing.id}/bid`, {
        amount,
      });
      if (res.data.success) {
        showSuccess(t('出价成功'));
        setBidDialogOpen(false);
        setBidListing(null);
        setBidAmount('');
        loadBrowse(browsePage);
      } else {
        showError(res.data.message || t('出价失败'));
      }
    } catch {
      showError(t('出价失败'));
    } finally {
      setBidding(false);
    }
  };

  const handleCancel = async (listingId) => {
    if (cancelling) return;
    setCancelling(listingId);
    try {
      const res = await API.delete(`/api/pet/market/${listingId}`);
      if (res.data.success) {
        showSuccess(t('已取消挂单'));
        loadMyListings(myPage);
      } else {
        showError(res.data.message || t('取消失败'));
      }
    } catch {
      showError(t('取消失败'));
    } finally {
      setCancelling(null);
    }
  };

  const openCreateDialog = async () => {
    setCreateDialogOpen(true);
    setMyPetsLoading(true);
    try {
      const res = await API.get('/api/pet/my');
      if (res.data.success) {
        const normalPets = (res.data.data || []).filter(
          (p) => p.state === 'normal' && !p.is_primary,
        );
        setMyPets(normalPets);
      }
    } catch {
      showError(t('加载宠物失败'));
    } finally {
      setMyPetsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    if (!createForm.pet_id) {
      showError(t('请选择宠物'));
      return;
    }
    const isAuction = createForm.listing_type === 'auction';
    const price = Number(isAuction ? createForm.min_bid : createForm.price);
    if (!price || price <= 0) {
      showError(t('请输入有效的价格'));
      return;
    }
    setCreating(true);
    try {
      const durationDays = Number(createForm.duration) || 3;
      const expiresAt = Math.floor(Date.now() / 1000) + durationDays * 86400;
      const body = {
        pet_id: Number(createForm.pet_id),
        listing_type: createForm.listing_type,
        expires_at: expiresAt,
      };
      if (isAuction) {
        body.min_bid = price;
      } else {
        body.price = price;
      }
      const res = await API.post('/api/pet/market', body);
      if (res.data.success) {
        showSuccess(t('挂单成功'));
        setCreateDialogOpen(false);
        setCreateForm({
          pet_id: '',
          listing_type: 'fixed_price',
          price: '',
          min_bid: '',
          duration: '3',
        });
        loadMyListings(1);
        setTab('my');
      } else {
        showError(res.data.message || t('挂单失败'));
      }
    } catch {
      showError(t('挂单失败'));
    } finally {
      setCreating(false);
    }
  };

  const openPriceTrend = async (listing) => {
    if (!listing?.pet) return;
    setPriceSpecies(listing.pet.species_name || listing.pet.visual_key);
    setPriceDialogOpen(true);
    setPriceLoading(true);
    try {
      const speciesId = listing.pet?.species_id;
      if (!speciesId) {
        setPriceLoading(false);
        return;
      }
      const res = await API.get(`/api/pet/market/price/${speciesId}`);
      if (res.data.success) {
        setPriceData(res.data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setPriceLoading(false);
    }
  };

  // ── Render ──

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-heading text-text-primary">
          {t('交易市场')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1">
          {t('买卖宠物，发现稀有伙伴')}
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
            <TabsTrigger value="browse" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              {t('市场')}
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {t('我的挂单')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('交易记录')}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Browse Market ── */}
          <TabsContent value="browse">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Rarity filter */}
              <div className="flex items-center gap-1">
                {RARITIES.map((r) => (
                  <button
                    key={r}
                    onClick={() =>
                      setFilterRarity((prev) => (prev === r ? '' : r))
                    }
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      filterRarity === r
                        ? 'bg-accent text-text-inverse'
                        : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-border-subtle" />

              {/* Type filter */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterType('')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    !filterType
                      ? 'bg-accent text-text-inverse'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                  )}
                >
                  {t('全部')}
                </button>
                <button
                  onClick={() => setFilterType('fixed_price')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1',
                    filterType === 'fixed_price'
                      ? 'bg-accent text-text-inverse'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Coins className="h-3 w-3" />
                  {t('一口价')}
                </button>
                <button
                  onClick={() => setFilterType('auction')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1',
                    filterType === 'auction'
                      ? 'bg-accent text-text-inverse'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Gavel className="h-3 w-3" />
                  {t('竞拍')}
                </button>
              </div>

              <div className="h-4 w-px bg-border-subtle" />

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-auto h-7 text-xs gap-1 border-0 bg-surface-hover px-2.5">
                  <ArrowUpDown className="h-3 w-3 text-text-tertiary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSortOptions(t).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Listing Grid */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : listings.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-tertiary">
                {t('暂无挂单')}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      now={now}
                      t={t}
                      onBuy={() => {
                        setBuyListing(listing);
                        setBuyDialogOpen(true);
                      }}
                      onBid={() => {
                        setBidListing(listing);
                        setBidAmount('');
                        setBidDialogOpen(true);
                      }}
                      onPriceTrend={() => openPriceTrend(listing)}
                    />
                  ))}
                </div>
                {listingsTotal > PAGE_SIZE && (
                  <Pagination
                    page={browsePage}
                    pageSize={PAGE_SIZE}
                    total={listingsTotal}
                    onPageChange={(p) => loadBrowse(p)}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab: My Listings ── */}
          <TabsContent value="my">
            <div className="mb-4">
              <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t('挂单出售')}
              </Button>
            </div>

            {myLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="md" />
              </div>
            ) : myListings.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-tertiary">
                {t('暂无挂单')}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {myListings.map((listing) => (
                    <MyListingRow
                      key={listing.id}
                      listing={listing}
                      now={now}
                      t={t}
                      cancelling={cancelling === listing.id}
                      onCancel={() => handleCancel(listing.id)}
                    />
                  ))}
                </div>
                {myTotal > PAGE_SIZE && (
                  <Pagination
                    page={myPage}
                    pageSize={PAGE_SIZE}
                    total={myTotal}
                    onPageChange={(p) => loadMyListings(p)}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab: History ── */}
          <TabsContent value="history">
            {historyLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="md" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-tertiary">
                {t('暂无交易记录')}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {history.map((item) => (
                    <HistoryRow key={item.id} item={item} t={t} />
                  ))}
                </div>
                {historyTotal > PAGE_SIZE && (
                  <Pagination
                    page={historyPage}
                    pageSize={PAGE_SIZE}
                    total={historyTotal}
                    onPageChange={(p) => loadHistory(p)}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Buy Confirmation Dialog ── */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('确认购买')}</DialogTitle>
            <DialogDescription>
              {t('确认以该价格购买此宠物？')}
            </DialogDescription>
          </DialogHeader>
          {buyListing && (
            <div className="py-3 space-y-3">
              <div className="flex items-center gap-3">
                {buyListing.pet && (
                  <PetSprite
                    visualKey={buyListing.pet.visual_key}
                    stage={buyListing.pet.stage}
                    size="sm"
                    animated={false}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {buyListing.pet?.nickname ||
                        buyListing.pet?.species_name ||
                        '???'}
                    </span>
                    <RarityBadge rarity={buyListing.pet?.rarity || 'N'} />
                  </div>
                  <span className="text-xs text-text-tertiary">
                    Lv.{buyListing.pet?.level || 1}
                    {buyListing.pet?.star > 0 &&
                      ` ${starString(buyListing.pet.star)}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-hover">
                <span className="text-sm text-text-secondary">{t('价格')}</span>
                <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {renderQuota(buyListing.price)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setBuyDialogOpen(false)}
            >
              {t('取消')}
            </Button>
            <Button onClick={handleBuy} loading={buying} disabled={buying}>
              {t('确认购买')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bid Dialog ── */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('竞拍出价')}</DialogTitle>
            <DialogDescription>
              {t('出价需高于当前最高出价')}
            </DialogDescription>
          </DialogHeader>
          {bidListing && (
            <div className="py-3 space-y-3">
              <div className="flex items-center gap-3">
                {bidListing.pet && (
                  <PetSprite
                    visualKey={bidListing.pet.visual_key}
                    stage={bidListing.pet.stage}
                    size="sm"
                    animated={false}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {bidListing.pet?.nickname ||
                        bidListing.pet?.species_name ||
                        '???'}
                    </span>
                    <RarityBadge rarity={bidListing.pet?.rarity || 'N'} />
                  </div>
                  <span className="text-xs text-text-tertiary">
                    Lv.{bidListing.pet?.level || 1}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>{t('起拍价')}</span>
                  <span>{renderQuota(bidListing.min_bid || bidListing.price || 0)}</span>
                </div>
                {bidListing.current_bid > 0 && (
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>{t('当前最高出价')}</span>
                    <span className="text-amber-500 font-medium">
                      {renderQuota(bidListing.current_bid)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>{t('出价次数')}</span>
                  <span>{bidListing.bid_count || 0}</span>
                </div>
              </div>
              <Input
                type="number"
                placeholder={t('输入出价金额')}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setBidDialogOpen(false)}
            >
              {t('取消')}
            </Button>
            <Button onClick={handleBid} loading={bidding} disabled={bidding}>
              {t('确认出价')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Listing Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('挂单出售')}</DialogTitle>
            <DialogDescription>
              {t('选择要出售的宠物并设置价格')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4">
            {/* Pet selection */}
            {myPetsLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : myPets.length === 0 ? (
              <div className="text-center py-4 text-sm text-text-tertiary">
                {t('没有可出售的宠物')}
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    {t('选择宠物')}
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2">
                    {myPets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() =>
                          setCreateForm((f) => ({
                            ...f,
                            pet_id: String(pet.id),
                          }))
                        }
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                          String(pet.id) === createForm.pet_id
                            ? 'bg-accent/10 border border-accent/30'
                            : 'hover:bg-surface-hover border border-transparent',
                        )}
                      >
                        <PetSprite
                          visualKey={pet.visual_key}
                          stage={pet.stage}
                          size="sm"
                          animated={false}
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
                            {pet.star > 0 && ` ${starString(pet.star)}`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Listing type */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    {t('出售类型')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCreateForm((f) => ({
                          ...f,
                          listing_type: 'fixed_price',
                        }))
                      }
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        createForm.listing_type === 'fixed_price'
                          ? 'bg-accent text-text-inverse'
                          : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                      )}
                    >
                      <Coins className="h-3.5 w-3.5" />
                      {t('一口价')}
                    </button>
                    <button
                      onClick={() =>
                        setCreateForm((f) => ({
                          ...f,
                          listing_type: 'auction',
                        }))
                      }
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        createForm.listing_type === 'auction'
                          ? 'bg-accent text-text-inverse'
                          : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                      )}
                    >
                      <Gavel className="h-3.5 w-3.5" />
                      {t('竞拍')}
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    {createForm.listing_type === 'auction'
                      ? t('起拍价')
                      : t('价格')}
                  </label>
                  <Input
                    type="number"
                    placeholder={t('输入金额')}
                    value={
                      createForm.listing_type === 'auction'
                        ? createForm.min_bid
                        : createForm.price
                    }
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        [createForm.listing_type === 'auction'
                          ? 'min_bid'
                          : 'price']: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    {t('挂单时长')}
                  </label>
                  <div className="flex items-center gap-2">
                    {['1', '3', '7'].map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          setCreateForm((f) => ({ ...f, duration: d }))
                        }
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          createForm.duration === d
                            ? 'bg-accent text-text-inverse'
                            : 'bg-surface-hover text-text-secondary hover:text-text-primary',
                        )}
                      >
                        {d} {t('天')}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setCreateDialogOpen(false)}
            >
              {t('取消')}
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={creating || myPets.length === 0}
            >
              {t('确认挂单')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Price Trend Dialog ── */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('价格走势')} — {priceSpecies}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            {priceLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : priceData.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">
                {t('暂无价格数据')}
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border-subtle"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="text-text-tertiary"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-text-tertiary"
                      tickFormatter={(v) => renderQuota(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [renderQuota(value), t('价格')]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#D97757"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#D97757' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Listing Card (Browse) ──

function ListingCard({ listing, now, t, onBuy, onBid, onPriceTrend }) {
  const pet = listing.pet;
  const isAuction = listing.listing_type === 'auction';
  const remaining = listing.expires_at ? listing.expires_at - now : 0;
  const isExpired = remaining <= 0;

  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-border-strong transition-colors">
      {/* Pet info */}
      <div className="flex items-center gap-3">
        {pet && (
          <PetSprite
            visualKey={pet.visual_key}
            stage={pet.stage}
            size="sm"
            animated
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {pet?.nickname || pet?.species_name || '???'}
            </span>
            <RarityBadge rarity={pet?.rarity || 'N'} />
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>Lv.{pet?.level || 1}</span>
            {pet?.star > 0 && (
              <span className="text-amber-500">{starString(pet.star)}</span>
            )}
          </div>
        </div>
        {/* Type badge */}
        {isAuction ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Gavel className="h-3 w-3" />
            {t('竞拍')}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Coins className="h-3 w-3" />
            {t('一口价')}
          </span>
        )}
      </div>

      {/* Price info */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            {isAuction ? t('当前出价') : t('价格')}
          </span>
          <span className="text-sm font-semibold text-text-primary flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            {renderQuota(
              isAuction
                ? listing.current_bid || listing.min_bid || 0
                : listing.price,
            )}
          </span>
        </div>
        {isAuction && (
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>{t('出价次数')}</span>
            <span className="tabular-nums">{listing.bid_count || 0}</span>
          </div>
        )}
        {isAuction && remaining > 0 && (
          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>{t('剩余时间')}</span>
            <span
              className={cn(
                'tabular-nums',
                remaining < 3600 && 'text-red-500',
              )}
            >
              {formatCountdown(remaining)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-2 border-t border-border flex gap-2">
        {isAuction ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={onBid}
            disabled={isExpired}
          >
            {isExpired ? t('已结束') : t('出价')}
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={onBuy}
            disabled={isExpired}
          >
            {isExpired ? t('已结束') : t('购买')}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 px-2"
          onClick={onPriceTrend}
        >
          <TrendingUp className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ── My Listing Row ──

function MyListingRow({ listing, now, t, cancelling, onCancel }) {
  const pet = listing.pet;
  const isAuction = listing.listing_type === 'auction';
  const remaining = listing.expires_at ? listing.expires_at - now : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3">
      {pet && (
        <PetSprite
          visualKey={pet.visual_key}
          stage={pet.stage}
          size="sm"
          animated={false}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {pet?.nickname || pet?.species_name || '???'}
          </span>
          <RarityBadge rarity={pet?.rarity || 'N'} />
          {isAuction ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
              <Gavel className="h-3 w-3" />
              {t('竞拍')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <Coins className="h-3 w-3" />
              {t('一口价')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
          <span>
            {isAuction ? t('当前出价') : t('价格')}:{' '}
            {renderQuota(
              isAuction
                ? listing.current_bid || listing.min_bid || 0
                : listing.price,
            )}
          </span>
          {isAuction && listing.bid_count > 0 && (
            <>
              <span className="text-border-strong">|</span>
              <span>
                {listing.bid_count} {t('次出价')}
              </span>
            </>
          )}
          {remaining > 0 && (
            <>
              <span className="text-border-strong">|</span>
              <span>{formatCountdown(remaining)}</span>
            </>
          )}
        </div>
      </div>
      {listing.status === 'active' && (
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          loading={cancelling}
          disabled={cancelling}
          className="shrink-0"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          {t('取消')}
        </Button>
      )}
      {listing.status === 'cancelled' && (
        <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {t('已取消')}
        </span>
      )}
      {listing.status === 'sold' && (
        <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {t('已售出')}
        </span>
      )}
    </div>
  );
}

// ── History Row ──

function HistoryRow({ item, t }) {
  const pet = item.pet;
  const isAuction = item.listing_type === 'auction';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3">
      {pet && (
        <PetSprite
          visualKey={pet.visual_key}
          stage={pet.stage}
          size="sm"
          animated={false}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {pet?.nickname || pet?.species_name || '???'}
          </span>
          <RarityBadge rarity={pet?.rarity || 'N'} />
          {isAuction && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              {t('竞拍')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
          <span>
            {renderQuota(item.price || item.current_bid || 0)}
          </span>
          <span className="text-border-strong">|</span>
          <span>
            {item.created_at ? timestamp2string(item.created_at) : ''}
          </span>
        </div>
      </div>
      <div className="shrink-0">
        {item.buyer_id && item.seller_id && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              item.is_buyer
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            )}
          >
            {item.is_buyer ? t('买入') : t('卖出')}
          </span>
        )}
      </div>
    </div>
  );
}
