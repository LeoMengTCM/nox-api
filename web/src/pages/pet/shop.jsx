import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Coins,
  Minus,
  Plus,
  UtensilsCrossed,
  FlaskConical,
  Gem,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota } from '../../lib/utils';
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
} from '../../components/ui';
import { RarityBadge } from '../../components/pet/rarity-badge';

const CATEGORY_ICONS = {
  food: UtensilsCrossed,
  potion: FlaskConical,
  material: Gem,
};

function formatEffects(item, t) {
  if (!item.effect) return [];
  try {
    const parsed = typeof item.effect === 'string' ? JSON.parse(item.effect) : item.effect;
    const parts = [];
    if (parsed.hunger) parts.push(`${t('饱食度')} +${parsed.hunger}`);
    if (parsed.mood) parts.push(`${t('心情')} +${parsed.mood}`);
    if (parsed.cleanliness) parts.push(`${t('洁净度')} +${parsed.cleanliness}`);
    if (parsed.exp) parts.push(`EXP +${parsed.exp}`);
    return parts;
  } catch {
    return [];
  }
}

export default function PetShop() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [quota, setQuota] = useState(0);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [shopRes, userRes] = await Promise.all([
          API.get('/api/pet/shop'),
          API.get('/api/user/self'),
        ]);
        if (shopRes.data.success) {
          setItems(shopRes.data.data || []);
        } else {
          showError(shopRes.data.message);
        }
        if (userRes.data.success) {
          setQuota(userRes.data.data?.quota || 0);
        }
      } catch {
        showError(t('加载失败'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const itemsByCategory = useMemo(() => {
    const map = { food: [], potion: [], material: [] };
    for (const item of items) {
      const cat = item.type || 'material';
      if (map[cat]) {
        map[cat].push(item);
      } else {
        map.material.push(item);
      }
    }
    return map;
  }, [items]);

  const openBuyDialog = (item) => {
    setSelectedItem(item);
    setQuantity(1);
    setBuyDialogOpen(true);
  };

  const handleBuy = async () => {
    if (!selectedItem || buying) return;
    setBuying(true);
    try {
      const res = await API.post('/api/pet/shop/buy', {
        item_id: selectedItem.id,
        quantity,
      });
      if (res.data.success) {
        showSuccess(t('购买成功'));
        setBuyDialogOpen(false);
        // Refresh user quota
        const userRes = await API.get('/api/user/self');
        if (userRes.data.success) {
          setQuota(userRes.data.data?.quota || 0);
        }
      } else {
        showError(res.data.message || t('购买失败'));
      }
    } catch {
      showError(t('购买失败'));
    } finally {
      setBuying(false);
    }
  };

  const totalPrice = selectedItem ? selectedItem.price * quantity : 0;

  const adjustQuantity = (delta) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const renderItemGrid = (categoryItems) => {
    if (categoryItems.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-text-tertiary">
          {t('暂无物品')}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryItems.map((item) => {
          const effects = formatEffects(item, t);
          return (
            <Card
              key={item.id}
              className="p-4 flex flex-col gap-3 hover:border-border-strong transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {item.name}
                    </h3>
                    <RarityBadge rarity={item.rarity} />
                  </div>
                  {item.description && (
                    <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {effects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {effects.map((eff) => (
                    <span
                      key={eff}
                      className="inline-flex items-center rounded-md bg-accent/8 px-2 py-0.5 text-[11px] font-medium text-accent"
                    >
                      {eff}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  {renderQuota(item.price)}
                </div>
                <Button
                  size="sm"
                  onClick={() => openBuyDialog(item)}
                >
                  {t('购买')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

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
          <h1 className="text-2xl font-heading text-text-primary">{t('魔法商店')}</h1>
          <p className="text-sm text-text-tertiary mt-1">{t('购买物品来照顾你的魔法生物')}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-text-primary">{renderQuota(quota)}</span>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Tabs defaultValue="food">
          <TabsList>
            <TabsTrigger value="food" className="gap-1.5">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              {t('食物')}
            </TabsTrigger>
            <TabsTrigger value="potion" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              {t('药水')}
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-1.5">
              <Gem className="h-3.5 w-3.5" />
              {t('材料')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="food">
            {renderItemGrid(itemsByCategory.food)}
          </TabsContent>
          <TabsContent value="potion">
            {renderItemGrid(itemsByCategory.potion)}
          </TabsContent>
          <TabsContent value="material">
            {renderItemGrid(itemsByCategory.material)}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Buy confirmation dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('确认购买')}</DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2">
              {/* Item info */}
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {selectedItem.name}
                    </span>
                    <RarityBadge rarity={selectedItem.rarity} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-text-tertiary">
                    <Coins className="h-3 w-3 text-amber-500" />
                    {t('单价')}: {renderQuota(selectedItem.price)}
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">
                  {t('数量')}
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => adjustQuantity(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    inputSize="sm"
                    className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 99) {
                        setQuantity(val);
                      }
                    }}
                    min={1}
                    max={99}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => adjustQuantity(1)}
                    disabled={quantity >= 99}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-hover">
                <span className="text-sm text-text-secondary">{t('总价')}</span>
                <span className="text-sm font-semibold text-text-primary">
                  {renderQuota(totalPrice)}
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
            <Button
              onClick={handleBuy}
              loading={buying}
              disabled={buying}
            >
              {t('确认购买')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
