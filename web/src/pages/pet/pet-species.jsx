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
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { Plus, Pencil, Trash2, PawPrint } from 'lucide-react';

const RARITY_OPTIONS = ['N', 'R', 'SR', 'SSR'];
const ELEMENT_OPTIONS = ['fire', 'ice', 'electric', 'dark', 'grass'];
const VISUAL_KEY_OPTIONS = ['flamefox', 'crystabbit', 'voltcat', 'stardrake', 'leafowl'];

const ELEMENT_LABELS = {
  fire: '火',
  ice: '冰',
  electric: '电',
  dark: '暗',
  grass: '草',
};

const ELEMENT_COLORS = {
  fire: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  ice: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  electric: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  dark: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  grass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const STAT_LABELS = { attack: '攻击', defense: '防御', speed: '速度', luck: '幸运' };

const DEFAULT_FORM = {
  name: '',
  description: '',
  rarity: 'N',
  element: 'fire',
  visual_key: 'flamefox',
  base_stats: { attack: 10, defense: 10, speed: 10, luck: 10 },
  evolution_stages: [
    { stage: 1, name: '', required_level: 1 },
    { stage: 2, name: '', required_level: 10 },
    { stage: 3, name: '', required_level: 30 },
  ],
  is_starter: false,
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

export default function PetSpeciesPage() {
  const { t } = useTranslation();
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSpecies = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pet/admin/species');
      const { success, data, message } = res.data;
      if (success) {
        setSpecies(Array.isArray(data) ? data : []);
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
    loadSpecies();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      base_stats: { ...DEFAULT_FORM.base_stats },
      evolution_stages: DEFAULT_FORM.evolution_stages.map((s) => ({ ...s })),
    });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const baseStats = parseJsonField(item.base_stats, DEFAULT_FORM.base_stats);
    const evoStages = parseJsonField(item.evolution_stages, DEFAULT_FORM.evolution_stages);
    setForm({
      name: item.name || '',
      description: item.description || '',
      rarity: item.rarity || 'N',
      element: item.element || 'fire',
      visual_key: item.visual_key || 'flamefox',
      base_stats: { ...DEFAULT_FORM.base_stats, ...baseStats },
      evolution_stages:
        Array.isArray(evoStages) && evoStages.length > 0
          ? evoStages.map((s) => ({ ...s }))
          : DEFAULT_FORM.evolution_stages.map((s) => ({ ...s })),
      is_starter: !!item.is_starter,
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
        base_stats: JSON.stringify(form.base_stats),
        evolution_stages: JSON.stringify(form.evolution_stages),
      };
      if (editing) {
        payload.id = editing.id;
      }
      const res = editing
        ? await API.put('/api/pet/admin/species', payload)
        : await API.post('/api/pet/admin/species', payload);
      const { success, message } = res.data;
      if (success) {
        showSuccess(editing ? t('更新成功') : t('创建成功'));
        setDialogOpen(false);
        loadSpecies();
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
      const res = await API.delete(`/api/pet/admin/species/${deleteTarget.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadSpecies();
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

  const updateStats = (key, value) => {
    setForm((prev) => ({
      ...prev,
      base_stats: { ...prev.base_stats, [key]: parseInt(value) || 0 },
    }));
  };

  const updateEvoStage = (index, key, value) => {
    setForm((prev) => {
      const stages = prev.evolution_stages.map((s) => ({ ...s }));
      stages[index] = { ...stages[index], [key]: key === 'name' ? value : parseInt(value) || 0 };
      return { ...prev, evolution_stages: stages };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">
          {t('魔法生物物种管理')}
        </h1>
        <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t('创建物种')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : species.length === 0 ? (
            <EmptyState
              icon={PawPrint}
              title={t('暂无物种')}
              description={t('点击上方按钮创建第一个魔法生物物种')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead className="w-16">{t('预览')}</TableHead>
                  <TableHead>{t('名称')}</TableHead>
                  <TableHead className="w-20">{t('稀有度')}</TableHead>
                  <TableHead className="w-20">{t('元素')}</TableHead>
                  <TableHead className="w-24">{t('初始生物')}</TableHead>
                  <TableHead className="w-20">{t('状态')}</TableHead>
                  <TableHead className="w-32 text-right">{t('操作')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {species.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-text-tertiary">{item.id}</TableCell>
                    <TableCell>
                      <PetSprite visualKey={item.visual_key} size="sm" />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <RarityBadge rarity={item.rarity} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${ELEMENT_COLORS[item.element] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {t(ELEMENT_LABELS[item.element] || item.element)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.is_starter ? (
                        <Badge variant="success" size="sm">{t('是')}</Badge>
                      ) : (
                        <span className="text-text-tertiary text-xs">-</span>
                      )}
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
            <DialogTitle>{editing ? t('编辑物种') : t('创建物种')}</DialogTitle>
            <DialogDescription>
              {editing ? t('修改魔法生物物种的属性和配置') : t('配置新魔法生物物种的基本信息')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex justify-center py-2">
              <PetSprite visualKey={form.visual_key} size="md" />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('名称')}</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('物种名称')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Visual Key</label>
                <Select
                  value={form.visual_key}
                  onValueChange={(v) => setForm((p) => ({ ...p, visual_key: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISUAL_KEY_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('描述')}</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t('物种描述')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('元素')}</label>
                <Select
                  value={form.element}
                  onValueChange={(v) => setForm((p) => ({ ...p, element: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENT_OPTIONS.map((e) => (
                      <SelectItem key={e} value={e}>{t(ELEMENT_LABELS[e])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Base Stats */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">{t('基础属性')}</label>
              <div className="grid grid-cols-4 gap-3">
                {['attack', 'defense', 'speed', 'luck'].map((stat) => (
                  <div key={stat} className="space-y-1">
                    <label className="text-xs text-text-secondary capitalize">{t(STAT_LABELS[stat])}</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.base_stats[stat]}
                      onChange={(e) => updateStats(stat, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Evolution Stages */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">{t('进化阶段')}</label>
              <div className="space-y-2">
                {form.evolution_stages.map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-surface-hover/50">
                    <span className="text-xs font-medium text-text-tertiary w-8 text-center">
                      {t('阶段')} {stage.stage}
                    </span>
                    <Input
                      className="flex-1"
                      value={stage.name}
                      onChange={(e) => updateEvoStage(idx, 'name', e.target.value)}
                      placeholder={t('阶段名称')}
                    />
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-text-secondary whitespace-nowrap">Lv.</label>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={stage.required_level}
                        onChange={(e) => updateEvoStage(idx, 'required_level', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Switches */}
            <div className="flex items-center gap-6 pt-2">
              <Switch
                label={t('初始生物')}
                description={t('新用户可选择的初始魔法生物')}
                checked={form.is_starter}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_starter: v }))}
              />
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
              {t('确定要删除物种')} <strong>{deleteTarget?.name}</strong> {t('吗？此操作不可撤销。')}
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
