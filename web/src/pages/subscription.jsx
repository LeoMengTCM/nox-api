import { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Card,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  Switch,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { API } from '../lib/api';
import { showError, showSuccess, getQuotaPerUnit } from '../lib/utils';

// --- Quota helpers (mirrors helpers/quota.js for the new frontend) ---

function getCurrencyConfig() {
  const type = localStorage.getItem('quota_display_type') || 'USD';
  const rate = parseFloat(localStorage.getItem('display_in_currency') || '1');
  return { type, rate: Number.isFinite(rate) && rate > 0 ? rate : 1 };
}

function quotaToDisplayAmount(quota) {
  const q = Number(quota || 0);
  if (!Number.isFinite(q) || q <= 0) return 0;
  const { type, rate } = getCurrencyConfig();
  if (type === 'TOKENS') return q;
  const usd = q / (getQuotaPerUnit() || 500000);
  if (type === 'USD') return usd;
  return usd * rate;
}

function displayAmountToQuota(amount) {
  const val = Number(amount || 0);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const { type, rate } = getCurrencyConfig();
  if (type === 'TOKENS') return Math.round(val);
  const usd = type === 'USD' ? val : val / (rate || 1);
  return Math.round(usd * (getQuotaPerUnit() || 500000));
}

// --- Constants ---

const DURATION_UNITS = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' },
  { value: 'hour', label: '小时' },
  { value: 'custom', label: '自定义(秒)' },
];

const RESET_PERIODS = [
  { value: 'never', label: '不重置' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom', label: '自定义(秒)' },
];

function durationUnitLabel(unit) {
  return DURATION_UNITS.find((d) => d.value === unit)?.label || unit;
}

function resetPeriodLabel(period) {
  return RESET_PERIODS.find((r) => r.value === period)?.label || period;
}

// --- Default form state ---

const defaultPlan = {
  title: '',
  subtitle: '',
  price_amount: 0,
  total_amount_display: 0,
  duration_unit: 'month',
  duration_value: 1,
  custom_seconds: 0,
  enabled: true,
  sort_order: 0,
  max_purchase_per_user: 0,
  upgrade_group: '',
  quota_reset_period: 'never',
  quota_reset_custom_seconds: 0,
  stripe_price_id: '',
  creem_product_id: '',
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notEnabled, setNotEnabled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ ...defaultPlan });
  const [submitting, setSubmitting] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setNotEnabled(false);
    try {
      const res = await API.get('/api/subscription/admin/plans', { skipErrorHandler: true });
      if (res.data?.success) {
        setPlans(res.data.data || []);
      } else {
        showError(res.data?.message || '获取订阅计划失败');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotEnabled(true);
      } else {
        showError('获取订阅计划失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await API.get('/api/group');
      if (res.data?.success) {
        setGroupOptions(res.data.data || []);
      }
    } catch {
      // ignore
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...defaultPlan });
    setDialogOpen(true);
    fetchGroups();
  };

  const openEdit = (planDTO) => {
    const p = planDTO.plan || planDTO;
    setEditing(p);
    setFormData({
      title: p.title || '',
      subtitle: p.subtitle || '',
      price_amount: Number(p.price_amount || 0),
      total_amount_display: Number(quotaToDisplayAmount(p.total_amount || 0).toFixed(2)),
      duration_unit: p.duration_unit || 'month',
      duration_value: Number(p.duration_value || 1),
      custom_seconds: Number(p.custom_seconds || 0),
      enabled: p.enabled !== false,
      sort_order: Number(p.sort_order || 0),
      max_purchase_per_user: Number(p.max_purchase_per_user || 0),
      upgrade_group: p.upgrade_group || '',
      quota_reset_period: p.quota_reset_period || 'never',
      quota_reset_custom_seconds: Number(p.quota_reset_custom_seconds || 0),
      stripe_price_id: p.stripe_price_id || '',
      creem_product_id: p.creem_product_id || '',
    });
    setDialogOpen(true);
    fetchGroups();
  };

  const handleSubmit = async () => {
    if (!formData.title?.trim()) {
      showError('请填写套餐标题');
      return;
    }
    setSubmitting(true);
    const payload = {
      plan: {
        title: formData.title.trim(),
        subtitle: formData.subtitle?.trim() || '',
        price_amount: Number(formData.price_amount || 0),
        currency: 'USD',
        duration_unit: formData.duration_unit || 'month',
        duration_value: Number(formData.duration_value || 1),
        custom_seconds: Number(formData.custom_seconds || 0),
        enabled: formData.enabled,
        sort_order: Number(formData.sort_order || 0),
        max_purchase_per_user: Number(formData.max_purchase_per_user || 0),
        total_amount: displayAmountToQuota(formData.total_amount_display),
        upgrade_group: formData.upgrade_group || '',
        quota_reset_period: formData.quota_reset_period || 'never',
        quota_reset_custom_seconds:
          formData.quota_reset_period === 'custom'
            ? Number(formData.quota_reset_custom_seconds || 0)
            : 0,
        stripe_price_id: formData.stripe_price_id || '',
        creem_product_id: formData.creem_product_id || '',
      },
    };
    try {
      if (editing) {
        const res = await API.put(`/api/subscription/admin/plans/${editing.id}`, payload);
        if (res.data?.success) {
          showSuccess('计划更新成功');
        } else {
          showError(res.data?.message || '更新失败');
          return;
        }
      } else {
        const res = await API.post('/api/subscription/admin/plans', payload);
        if (res.data?.success) {
          showSuccess('计划创建成功');
        } else {
          showError(res.data?.message || '创建失败');
          return;
        }
      }
      setDialogOpen(false);
      fetchPlans();
    } catch {
      showError('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEnabled = async (planDTO, enabled) => {
    const p = planDTO.plan || planDTO;
    if (!p.id) return;
    try {
      const res = await API.patch(`/api/subscription/admin/plans/${p.id}`, {
        enabled: !!enabled,
      });
      if (res.data?.success) {
        showSuccess(enabled ? '已启用' : '已禁用');
        fetchPlans();
      } else {
        showError(res.data?.message || '操作失败');
      }
    } catch {
      showError('操作失败');
    }
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price || 0).toFixed(2)}`;
  };

  const formatDuration = (plan) => {
    const p = plan.plan || plan;
    if (p.duration_unit === 'custom') {
      return `${p.custom_seconds || 0} 秒`;
    }
    return `${p.duration_value || 1} ${durationUnitLabel(p.duration_unit)}`;
  };

  const formatQuotaDisplay = (plan) => {
    const p = plan.plan || plan;
    const val = Number(p.total_amount || 0);
    if (val <= 0) return '不限';
    const display = quotaToDisplayAmount(val);
    if (display >= 10000) {
      return `${(display / 10000).toFixed(1)}万`;
    }
    return display.toFixed(2);
  };

  const columns = [
    { header: 'ID', accessorKey: 'plan.id', cell: ({ row }) => (row.original.plan || row.original).id, size: 60 },
    {
      header: '标题',
      accessorKey: 'plan.title',
      cell: ({ row }) => {
        const p = row.original.plan || row.original;
        return (
          <div>
            <div className="text-text-primary font-medium">{p.title}</div>
            {p.subtitle && <div className="text-xs text-text-tertiary">{p.subtitle}</div>}
          </div>
        );
      },
    },
    {
      header: '价格',
      accessorKey: 'plan.price_amount',
      cell: ({ row }) => (
        <span className="text-text-primary font-medium">
          {formatPrice((row.original.plan || row.original).price_amount)}
        </span>
      ),
    },
    {
      header: '额度',
      id: 'quota',
      cell: ({ row }) => formatQuotaDisplay(row.original),
    },
    {
      header: '有效期',
      id: 'duration',
      cell: ({ row }) => formatDuration(row.original),
    },
    {
      header: '额度重置',
      id: 'reset',
      cell: ({ row }) => {
        const p = row.original.plan || row.original;
        if (p.quota_reset_period === 'custom') {
          return `每 ${p.quota_reset_custom_seconds || 0} 秒`;
        }
        return resetPeriodLabel(p.quota_reset_period || 'never');
      },
    },
    {
      header: '排序',
      accessorKey: 'plan.sort_order',
      cell: ({ row }) => (row.original.plan || row.original).sort_order || 0,
      size: 60,
    },
    {
      header: '状态',
      id: 'enabled',
      cell: ({ row }) => {
        const p = row.original.plan || row.original;
        return (
          <Badge variant={p.enabled ? 'success' : 'danger'}>
            {p.enabled ? '启用' : '禁用'}
          </Badge>
        );
      },
    },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => {
        const p = row.original.plan || row.original;
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
              编辑
            </Button>
            <Button
              variant={p.enabled ? 'danger' : 'default'}
              size="sm"
              onClick={() => handleToggleEnabled(row.original, !p.enabled)}
            >
              {p.enabled ? '禁用' : '启用'}
            </Button>
          </div>
        );
      },
    },
  ];

  // --- Not-enabled state ---
  if (notEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-heading text-text-primary mb-6">订阅管理</h1>
        <Card className="p-8 text-center">
          <p className="text-text-secondary text-lg mb-2">功能未启用</p>
          <p className="text-text-tertiary text-sm">
            订阅管理功能当前不可用。请检查后端是否已配置订阅相关路由。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading text-text-primary">订阅管理</h1>
        <Button onClick={openCreate}>创建套餐</Button>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <DataTable columns={columns} data={plans} />
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑订阅套餐' : '创建订阅套餐'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">套餐标题 *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：基础套餐"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">副标题</label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="例如：适合轻度使用"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">实付金额 (USD)</label>
                <Input
                  type="number"
                  value={formData.price_amount}
                  onChange={(e) => setFormData({ ...formData, price_amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">总额度</label>
                <Input
                  type="number"
                  value={formData.total_amount_display}
                  onChange={(e) => setFormData({ ...formData, total_amount_display: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-text-tertiary mt-0.5">0 表示不限</p>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">有效期单位</label>
                <Select
                  value={formData.duration_unit}
                  onValueChange={(val) => setFormData({ ...formData, duration_unit: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_UNITS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                {formData.duration_unit === 'custom' ? (
                  <>
                    <label className="block text-sm text-text-secondary mb-1">自定义秒数</label>
                    <Input
                      type="number"
                      value={formData.custom_seconds}
                      onChange={(e) => setFormData({ ...formData, custom_seconds: e.target.value })}
                      placeholder="秒"
                      min="1"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm text-text-secondary mb-1">有效期数值</label>
                    <Input
                      type="number"
                      value={formData.duration_value}
                      onChange={(e) => setFormData({ ...formData, duration_value: e.target.value })}
                      placeholder="1"
                      min="1"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Quota Reset */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">额度重置周期</label>
                <Select
                  value={formData.quota_reset_period}
                  onValueChange={(val) => setFormData({ ...formData, quota_reset_period: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESET_PERIODS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  重置自定义秒数
                </label>
                <Input
                  type="number"
                  value={formData.quota_reset_custom_seconds}
                  onChange={(e) =>
                    setFormData({ ...formData, quota_reset_custom_seconds: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                  disabled={formData.quota_reset_period !== 'custom'}
                />
              </div>
            </div>

            {/* Upgrade Group */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">升级分组</label>
                <Select
                  value={formData.upgrade_group || '__none__'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, upgrade_group: val === '__none__' ? '' : val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不升级</SelectItem>
                    {groupOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">排序</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Purchase Limit */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">每用户购买上限</label>
              <Input
                type="number"
                value={formData.max_purchase_per_user}
                onChange={(e) => setFormData({ ...formData, max_purchase_per_user: e.target.value })}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-text-tertiary mt-0.5">0 表示不限</p>
            </div>

            {/* Third-Party Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Stripe Price ID</label>
                <Input
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                  placeholder="price_..."
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Creem Product ID</label>
                <Input
                  value={formData.creem_product_id}
                  onChange={(e) => setFormData({ ...formData, creem_product_id: e.target.value })}
                  placeholder="prod_..."
                />
              </div>
            </div>

            {/* Enabled Switch */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                label="启用"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? '提交中...' : '确定'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
