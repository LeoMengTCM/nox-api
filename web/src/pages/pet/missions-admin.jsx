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
import { Plus, Pencil, Trash2, Compass } from 'lucide-react';

const DEFAULT_FORM = {
  name: '',
  description: '',
  duration: 3600,
  difficulty: 1,
  required_level: 1,
  stat_weights: '{"attack":0.3,"speed":0.5,"luck":0.2}',
  rewards: '[{"type":"quota","amount":100,"probability":1.0}]',
  max_daily: 3,
  enabled: true,
};

function tryParseJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function MissionsAdminPage() {
  const { t } = useTranslation();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadMissions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pet/admin/missions');
      const { success, data, message } = res.data;
      if (success) {
        setMissions(Array.isArray(data) ? data : []);
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
    loadMissions();
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
      duration: item.duration || 3600,
      difficulty: item.difficulty || 1,
      required_level: item.required_level || 1,
      stat_weights:
        typeof item.stat_weights === 'string' && item.stat_weights
          ? item.stat_weights
          : JSON.stringify(item.stat_weights || {}),
      rewards:
        typeof item.rewards === 'string' && item.rewards
          ? item.rewards
          : JSON.stringify(item.rewards || []),
      max_daily: item.max_daily || 3,
      enabled: item.enabled !== false && item.enabled !== 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showError(t('请输入名称'));
      return;
    }
    if (!tryParseJson(form.stat_weights)) {
      showError(t('属性权重') + ': ' + t('JSON 格式无效'));
      return;
    }
    if (!tryParseJson(form.rewards)) {
      showError(t('奖励配置') + ': ' + t('JSON 格式无效'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        duration: parseInt(form.duration) || 3600,
        difficulty: parseInt(form.difficulty) || 1,
        required_level: parseInt(form.required_level) || 1,
        max_daily: parseInt(form.max_daily) || 3,
      };
      if (editing) {
        payload.id = editing.id;
      }
      const res = editing
        ? await API.put('/api/pet/admin/missions', payload)
        : await API.post('/api/pet/admin/missions', payload);
      const { success, message } = res.data;
      if (success) {
        showSuccess(editing ? t('更新成功') : t('创建成功'));
        setDialogOpen(false);
        loadMissions();
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
      const res = await API.delete(`/api/pet/admin/missions/${deleteTarget.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadMissions();
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
          {t('任务管理')}
        </h1>
        <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t('创建任务')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : missions.length === 0 ? (
            <EmptyState
              icon={Compass}
              title={t('暂无任务')}
              description={t('点击上方按钮创建第一个任务')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t('名称')}</TableHead>
                  <TableHead className="w-20">{t('难度')}</TableHead>
                  <TableHead className="w-24">{t('持续时间')}</TableHead>
                  <TableHead className="w-20">{t('等级要求')}</TableHead>
                  <TableHead className="w-20">{t('每日上限')}</TableHead>
                  <TableHead className="w-20">{t('状态')}</TableHead>
                  <TableHead className="w-32 text-right">{t('操作')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-text-tertiary">{item.id}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-text-tertiary line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-amber-500 tracking-tight text-xs">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={i < (item.difficulty || 1) ? 'opacity-100' : 'opacity-20'}>
                            ★
                          </span>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {formatDuration(item.duration)}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      Lv.{item.required_level || 1}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {item.max_daily || 3}
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
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
            <DialogTitle>{editing ? t('编辑任务') : t('创建任务')}</DialogTitle>
            <DialogDescription>
              {editing ? t('修改任务的配置') : t('配置新任务的基本信息')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name + Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('名称')}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t('任务名称')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('描述')}</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t('任务描述')}
                rows={2}
              />
            </div>

            {/* Grid: duration, difficulty, level, daily limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('持续时间（秒）')}</label>
                <Input
                  type="number"
                  min={60}
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: parseInt(e.target.value) || 3600 }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('难度')} (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.difficulty}
                  onChange={(e) => setForm((p) => ({ ...p, difficulty: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('等级要求')}</label>
                <Input
                  type="number"
                  min={1}
                  value={form.required_level}
                  onChange={(e) => setForm((p) => ({ ...p, required_level: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">{t('每日上限')}</label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_daily}
                  onChange={(e) => setForm((p) => ({ ...p, max_daily: parseInt(e.target.value) || 3 }))}
                />
              </div>
            </div>

            {/* Stat Weights JSON */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('属性权重')}</label>
              <Textarea
                value={form.stat_weights}
                onChange={(e) => setForm((p) => ({ ...p, stat_weights: e.target.value }))}
                placeholder='{"attack":0.3,"speed":0.5,"luck":0.2}'
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-text-tertiary">
                JSON: {'{'}"attack":0.3, "defense":0.2, "speed":0.3, "luck":0.2{'}'}
              </p>
            </div>

            {/* Rewards JSON */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('奖励配置')}</label>
              <Textarea
                value={form.rewards}
                onChange={(e) => setForm((p) => ({ ...p, rewards: e.target.value }))}
                placeholder='[{"type":"quota","amount":100,"probability":1.0}]'
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-xs text-text-tertiary">
                JSON: type=quota|item|exp, amount, id (item), probability (0-1)
              </p>
            </div>

            {/* Enabled switch */}
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
              {t('确定要删除任务')} <strong>{deleteTarget?.name}</strong> {t('吗？此操作不可撤销。')}
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
