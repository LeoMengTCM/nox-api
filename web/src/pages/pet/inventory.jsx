import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Package,
  UtensilsCrossed,
  FlaskConical,
  Gem,
} from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
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
} from '../../components/ui';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { PetSprite } from '../../components/pet/pet-sprite';

export default function PetInventory() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [pets, setPets] = useState([]);

  // Use item dialog
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [using, setUsing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, shopRes, petRes] = await Promise.all([
        API.get('/api/pet/inventory'),
        API.get('/api/pet/shop'),
        API.get('/api/pet/my'),
      ]);
      if (invRes.data.success) setInventory(invRes.data.data || []);
      if (shopRes.data.success) setShopItems(shopRes.data.data || []);
      if (petRes.data.success) setPets(petRes.data.data || []);
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build item metadata map from shop data
  const itemMeta = useMemo(() => {
    const map = {};
    for (const item of shopItems) {
      map[item.id] = item;
    }
    return map;
  }, [shopItems]);

  // Enrich inventory with metadata
  const enrichedInventory = useMemo(() => {
    return inventory.map((inv) => {
      const meta = itemMeta[inv.item_id] || {};
      return {
        ...inv,
        name: inv.name || meta.name || t('未知物品'),
        type: inv.type || meta.type || 'material',
        description: inv.description || meta.description || '',
        effect: inv.effect || meta.effect || '',
        rarity: inv.rarity || meta.rarity || 'N',
      };
    });
  }, [inventory, itemMeta, t]);

  const itemsByCategory = useMemo(() => {
    const map = { food: [], potion: [], material: [] };
    for (const item of enrichedInventory) {
      const cat = item.type || 'material';
      if (map[cat]) {
        map[cat].push(item);
      } else {
        map.material.push(item);
      }
    }
    return map;
  }, [enrichedInventory]);

  const formatEffects = (effect) => {
    if (!effect) return [];
    try {
      const parsed = typeof effect === 'string' ? JSON.parse(effect) : effect;
      const parts = [];
      if (parsed.hunger) parts.push(`${t('饱食度')} +${parsed.hunger}`);
      if (parsed.mood) parts.push(`${t('心情')} +${parsed.mood}`);
      if (parsed.cleanliness) parts.push(`${t('洁净度')} +${parsed.cleanliness}`);
      if (parsed.exp) parts.push(`EXP +${parsed.exp}`);
      return parts;
    } catch {
      return [];
    }
  };

  const openUseDialog = (item) => {
    setSelectedItem(item);
    setUseDialogOpen(true);
  };

  const handleUseItem = async (petId) => {
    if (!selectedItem || using) return;
    setUsing(true);
    try {
      const res = await API.post(`/api/pet/my/${petId}/use-item`, {
        item_id: selectedItem.item_id,
      });
      if (res.data.success) {
        showSuccess(t('使用成功'));
        setUseDialogOpen(false);
        loadData();
      } else {
        showError(res.data.message || t('使用失败'));
      }
    } catch {
      showError(t('使用失败'));
    } finally {
      setUsing(false);
    }
  };

  // Filter pets that can use items (normal or weak state, not eggs)
  const usablePets = pets.filter(
    (p) => (p.state === 'normal' || p.state === 'weak') && (p.stage || 0) > 0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const renderItemGrid = (categoryItems, isUsable = false) => {
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
          const effects = formatEffects(item.effect);
          return (
            <Card
              key={`${item.item_id}-${item.id}`}
              className="p-4 flex flex-col gap-3"
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
                <span className="shrink-0 inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-primary tabular-nums">
                  x{item.quantity}
                </span>
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

              {isUsable && (
                <div className="mt-auto pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openUseDialog(item)}
                  >
                    {t('使用')}
                  </Button>
                </div>
              )}
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
      >
        <h1 className="text-2xl font-heading text-text-primary">
          <Package className="inline-block mr-2 h-6 w-6" />
          {t('我的背包')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1">
          {t('查看和管理你拥有的物品')}
        </p>
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
              {itemsByCategory.food.length > 0 && (
                <span className="ml-1 text-[10px] text-text-tertiary">
                  ({itemsByCategory.food.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="potion" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              {t('药水')}
              {itemsByCategory.potion.length > 0 && (
                <span className="ml-1 text-[10px] text-text-tertiary">
                  ({itemsByCategory.potion.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="material" className="gap-1.5">
              <Gem className="h-3.5 w-3.5" />
              {t('材料')}
              {itemsByCategory.material.length > 0 && (
                <span className="ml-1 text-[10px] text-text-tertiary">
                  ({itemsByCategory.material.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="food">
            {renderItemGrid(itemsByCategory.food, true)}
          </TabsContent>
          <TabsContent value="potion">
            {renderItemGrid(itemsByCategory.potion, true)}
          </TabsContent>
          <TabsContent value="material">
            {renderItemGrid(itemsByCategory.material)}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Use Item Dialog - select pet */}
      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('选择宠物使用')}</DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-80 overflow-y-auto space-y-2">
            {usablePets.length === 0 ? (
              <div className="text-center py-8 text-sm text-text-tertiary">
                {t('没有可使用的宠物')}
              </div>
            ) : (
              usablePets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => handleUseItem(pet.id)}
                  disabled={using}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3',
                    'hover:bg-surface-hover transition-colors text-left',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <PetSprite
                    visualKey={pet.visual_key}
                    stage={pet.stage}
                    size="sm"
                    animated={false}
                    speciesName={pet.nickname || pet.species_name}
                    rarity={pet.rarity || 'N'}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate block">
                      {pet.nickname || pet.species_name || '???'}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      Lv.{pet.level || 1}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setUseDialogOpen(false)}>
              {t('取消')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
