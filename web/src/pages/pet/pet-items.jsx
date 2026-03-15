import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Switch,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Spinner,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Textarea,
} from '../../components/ui';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';

const RARITY_OPTIONS = ['N', 'R', 'SR', 'SSR'];
const TYPE_OPTIONS = ['food', 'potion', 'material'];

const TYPE_LABELS = {
  food: '食物',
  potion: '药水',
  material: '材料',
};

const TYPE_BADGE_VARIANT = {
  food: 'success',
  potion: 'info',
  material: 'warning',
};

const DEFAULT_FORM = {
  name: '',
  description: '',
  type: 'food',
  rarity: 'N',
  effect: { hunger: 0, mood: 0, cleanliness: 0 },
  price: 0,
  visual_key: '',
  enabled: true,
};

function parseJsonField(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export default function PetItemsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pet/admin/items');
      const { success, data, message } = res.data;
      if (success) {
        setItems(Array.isArray(data) ? data : []);
      } else {
        showError(message || t('加载失败'));
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      effect: { ...DEFAULT_FORM.effect },
    });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const effect = parseJsonField(item.effect, DEFAULT_FORM.effect);
    setForm({
      name: item.name || '',
      description: item.description || '',
      type: item.type || 'food',
      rarity: item.rarity || 'N',
      effect: { ...DEFAULT_FORM.effect, ...effect },
      price: item.price || 0,
      visual_key: item.visual_key || '',
      enabled: item.enabled !== false && item.enabled !== 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showError(t('请输入名称'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: parseInt(form.price) || 0,
        effect: JSON.stringify(form.effect),
      };
      if (editing) {
        payload.id = editing.id;
      }
      const res = editing
        ? await API.put('/api/pet/admin/items', payload)
        : await API.post('/api/pet/admin/items', payload);
      const { success, message } = res.data;
      if (success) {
        showSuccess(editing ? t('更新成功') : t('创建成功'));
        setDialogOpen(false);
        loadItems();
      } else {
        showError(message || t('操作失败'));
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await API.delete(`/api/pet/admin/items/${deleteTarget.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadItems();
      } else {
        showError(message || t('删除失败'));
      }
    } catch {
      showError(t('删除失败'));
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const updateEffect = (key, value) => {
    setForm((prev) => ({
      ...prev,
      effect: { ...prev.effect, [key]: parseInt(value) || 0 },
    }));
  };

  const formatEffectSummary = (item) => {
    const effect = parseJsonField(item.effect, {});
    const parts = [];
    if (effect.hunger) parts.push(`${t('饱食度')} +${effect.hunger}`);
    if (effect.mood) parts.push(`${t('心情')} +${effect.mood}`);
    if (effect.cleanliness) parts.push(`${t('洁净度')} +${effect.cleanliness}`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">
          {t('宠物物品管理')}
        </h1>
        <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t('创建物品')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t('暂无物品')}
              description={t('点击上方按钮创建第一个宠物物品')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t('名称')}</TableHead>
                  <TableHead className="w-20">{t('类型')}</TableHead>
                  <TableHead className="w-20">{t('稀有度')}</TableHead>
                  <TableHead>{t('效果')}</TableHead>
                  <TableHead className="w-24">{t('价格')}</TableHead>
                  <TableHead className="w-20">{t('状态')}</TableHead>
                  <TableHead className="w-32 text-right">{t('操作')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-text-tertiary">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={TYPE_BADGE_VARIANT[item.type] || 'outline'}
                        size="sm"
                      >
                        {t(TYPE_LABELS[item.type] || item.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RarityBadge rarity={item.rarity} />
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {formatEffectSummary(item)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {item.price ?? 0}
                    </TableCell>
                    <TableCell>
                      {item.enabled !== false && item.enabled !== 0 ? (
                        <Badge variant="success" size="sm">{t('启用')}</Badge>
                      ) : (
                        <Badge variant="outline" size="sm">{t('禁用')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-danger hover:text-danger"
                          onClick={() => confirmDelete(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('编辑物品') : t('创建物品')}</DialogTitle>
            <DialogDescription>
              {editing ? t('修改宠物物品的属性和配置') : t('配置新宠物物品的基本信息')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('名称')}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t('物品名称')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('描述')}</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t('物品描述')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('类型')}</label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((tp) => (
                      <SelectItem key={tp} value={tp}>{t(TYPE_LABELS[tp])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('稀有度')}</label>
                <Select
                  value={form.rarity}
                  onValueChange={(v) => setForm((p) => ({ ...p, rarity: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RARITY_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Effect */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">{t('效果')}</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'hunger', label: '饱食度恢复' },
                  { key: 'mood', label: '心情恢复' },
                  { key: 'cleanliness', label: '洁净度恢复' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs text-text-secondary">{t(label)}</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.effect[key]}
                      onChange={(e) => updateEffect(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('价格')} (Quota)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Visual Key</label>
                <Input
                  value={form.visual_key}
                  onChange={(e) => setForm((p) => ({ ...p, visual_key: e.target.value }))}
                  placeholder={t('可选')}
                />
              </div>
            </div>

            <div className="pt-2">
              <Switch
                label={t('启用')}
                checked={form.enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              {t('取消')}
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {editing ? t('保存') : t('创建')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('确认删除')}</DialogTitle>
            <DialogDescription>
              {t('确定要删除物品')} <strong>{deleteTarget?.name}</strong> {t('吗？此操作不可撤销。')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
              {t('取消')}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              {t('删除')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
