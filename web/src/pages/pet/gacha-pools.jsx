import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Switch,
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
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react';

const DEFAULT_FORM = {
  name: '',
  description: '',
  cost_per_pull: 500,
  ten_pull_discount: 0.9,
  rates: '{"N":0.60,"R":0.25,"SR":0.12,"SSR":0.03}',
  pity_config: '{"sr_pity":10,"ssr_pity":80}',
  species_pool: '[{"species_id":1,"rarity":"R","weight":100}]',
  enabled: true,
  start_time: 0,
  end_time: 0,
};

function formatJsonField(val) {
  if (!val) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return '';
    }
  }
  // Try to pretty-print if it's a JSON string
  try {
    return JSON.stringify(JSON.parse(val), null, 2);
  } catch {
    return String(val);
  }
}

function isValidJson(str) {
  if (!str || !str.trim()) return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export default function GachaPoolsAdmin() {
  const { t } = useTranslation();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPools = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pet/admin/gacha/pools');
      const { success, data, message } = res.data;
      if (success) {
        setPools(Array.isArray(data) ? data : []);
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
    loadPools();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      cost_per_pull: item.cost_per_pull ?? 500,
      ten_pull_discount: item.ten_pull_discount ?? 0.9,
      rates: formatJsonField(item.rates),
      pity_config: formatJsonField(item.pity_config),
      species_pool: formatJsonField(item.species_pool),
      enabled: item.enabled !== false && item.enabled !== 0,
      start_time: item.start_time ?? 0,
      end_time: item.end_time ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showError(t('请输入名称'));
      return;
    }
    if (!isValidJson(form.rates)) {
      showError(t('概率配置JSON格式错误'));
      return;
    }
    if (!isValidJson(form.pity_config)) {
      showError(t('保底配置JSON格式错误'));
      return;
    }
    if (!isValidJson(form.species_pool)) {
      showError(t('物种池JSON格式错误'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        cost_per_pull: parseInt(form.cost_per_pull) || 0,
        ten_pull_discount: parseFloat(form.ten_pull_discount) || 0,
        rates: form.rates.trim() || '{}',
        pity_config: form.pity_config.trim() || '{}',
        species_pool: form.species_pool.trim() || '[]',
        enabled: form.enabled,
        start_time: parseInt(form.start_time) || 0,
        end_time: parseInt(form.end_time) || 0,
      };
      if (editing) {
        payload.id = editing.id;
      }
      const res = editing
        ? await API.put('/api/pet/admin/gacha/pools', payload)
        : await API.post('/api/pet/admin/gacha/pools', payload);
      const { success, message } = res.data;
      if (success) {
        showSuccess(editing ? t('更新成功') : t('创建成功'));
        setDialogOpen(false);
        loadPools();
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
      const res = await API.delete(`/api/pet/admin/gacha/pools/${deleteTarget.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadPools();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">
          {t('卡池管理')}
        </h1>
        <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t('创建卡池')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : pools.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t('暂无卡池')}
              description={t('点击上方按钮创建第一个扭蛋卡池')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t('名称')}</TableHead>
                  <TableHead className="w-28">{t('单抽费用')}</TableHead>
                  <TableHead className="w-28">{t('十连折扣')}</TableHead>
                  <TableHead className="w-20">{t('状态')}</TableHead>
                  <TableHead className="w-32 text-right">{t('操作')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-text-tertiary">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-text-secondary">
                      {item.cost_per_pull ?? 500}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {((item.ten_pull_discount ?? 0.9) * 100).toFixed(0)}%
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('编辑卡池') : t('创建卡池')}</DialogTitle>
            <DialogDescription>
              {editing ? t('修改扭蛋卡池的属性和配置') : t('配置新扭蛋卡池的基本信息')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('名称')}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t('卡池名称')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('描述')}</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t('卡池描述')}
                rows={2}
              />
            </div>

            {/* Cost & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('单抽费用')} (Quota)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.cost_per_pull}
                  onChange={(e) => setForm((p) => ({ ...p, cost_per_pull: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('十连折扣')}</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.ten_pull_discount}
                  onChange={(e) => setForm((p) => ({ ...p, ten_pull_discount: e.target.value }))}
                  placeholder="0.9"
                />
              </div>
            </div>

            {/* JSON Fields */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('概率配置')} (rates)</label>
              <Textarea
                value={form.rates}
                onChange={(e) => setForm((p) => ({ ...p, rates: e.target.value }))}
                placeholder='{"N":0.60,"R":0.25,"SR":0.12,"SSR":0.03}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('保底配置')} (pity_config)</label>
              <Textarea
                value={form.pity_config}
                onChange={(e) => setForm((p) => ({ ...p, pity_config: e.target.value }))}
                placeholder='{"sr_pity":10,"ssr_pity":80}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('物种池')} (species_pool)</label>
              <Textarea
                value={form.species_pool}
                onChange={(e) => setForm((p) => ({ ...p, species_pool: e.target.value }))}
                placeholder='[{"species_id":1,"rarity":"R","weight":100}]'
                rows={4}
                className="font-mono text-xs"
              />
            </div>

            {/* Time Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('开始时间')} (Unix)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  placeholder={t('0 = 无限制')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('结束时间')} (Unix)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  placeholder={t('0 = 无限制')}
                />
              </div>
            </div>

            {/* Enable Switch */}
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
              {t('确定要删除卡池')} <strong>{deleteTarget?.name}</strong> {t('吗？此操作不可撤销。')}
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
