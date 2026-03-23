import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Button,
  Input,
  Card,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
  Switch,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
} from '../components/ui';
import { Textarea } from '../components/ui/textarea';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import {
  showError,
  showSuccess,
  showInfo,
  copy,
  copyAsync,
  timestamp2string,
  getQuotaPerUnit,
} from '../lib/utils';
import { isAdmin } from '../lib/utils';
import { UserContext } from '../contexts/user-context';
import {
  Key, Search, MoreVertical, Eye, EyeOff, Copy, Pencil, Power, Trash2,
  Plus, CheckCircle2, TrendingUp, Clock, Shield,
} from 'lucide-react';

const defaultTokenForm = {
  name: '',
  remain_quota: 0,
  expired_time: '',
  unlimited_quota: true,
  model_limits_enabled: false,
  model_limits: '',
  allow_ips: '',
  group: '',
  cross_group_retry: false,
};

// Expiry time preset helpers
function getExpiryPresetTime(preset) {
  if (preset === 'never') return '';
  const now = new Date();
  switch (preset) {
    case '1h': now.setHours(now.getHours() + 1); break;
    case '1d': now.setDate(now.getDate() + 1); break;
    case '7d': now.setDate(now.getDate() + 7); break;
    case '30d': now.setDate(now.getDate() + 30); break;
    case '90d': now.setDate(now.getDate() + 90); break;
    default: return '';
  }
  return formatDateForInput(now);
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatQuota(quota) {
  return (quota / getQuotaPerUnit()).toFixed(2);
}

// --- Section wrapper for form sections inside dialog ---
function FormSection({ icon, title, description, children }) {
  return (
    <div className="rounded-lg border border-border bg-surface-hover/30 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description && (
            <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 pl-11">
        {children}
      </div>
    </div>
  );
}

// --- Field wrapper with label + description ---
function FormField({ label, description, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      {children}
      {description && (
        <p className="text-xs text-text-tertiary leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// --- Token Card ---
function TokenCard({ token, copyingKeys, revealedKeys, onCopy, onReveal, onEdit, onToggle, onDelete }) {
  const isCopying = !!copyingKeys[token.id];
  const revealed = revealedKeys[token.id];
  const isEnabled = token.status === 1;

  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '····' + key.substring(key.length - 4);
  };

  const displayKey = revealed || `sk-${maskKey(token.key)}`;

  const expiry = token.expired_time <= 0 || token.expired_time === -1
    ? '永不过期'
    : timestamp2string(token.expired_time);

  return (
    <Card className="p-4 transition-all duration-150 hover:shadow-md">
      {/* Row 1: Name + Status + Menu */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Key className="h-4 w-4 text-accent shrink-0" strokeWidth={1.8} />
          <span className="text-sm font-semibold text-text-primary truncate">{token.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={isEnabled ? 'success' : 'danger'} className="text-[10px] px-1.5 py-0">
            {isEnabled ? '已启用' : '已禁用'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-4 w-4 text-text-tertiary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(token)}>
                <Pencil className="h-3.5 w-3.5" />
                <span>编辑</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggle(token)}>
                <Power className="h-3.5 w-3.5" />
                <span>{isEnabled ? '禁用' : '启用'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onClick={() => onDelete(token)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>删除</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2: Key + actions */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <code className="flex-1 min-w-0 text-xs bg-surface-hover px-2.5 py-1.5 rounded-md font-mono text-text-secondary truncate select-all cursor-default">
              {displayKey}
            </code>
          </TooltipTrigger>
          {revealed && (
            <TooltipContent side="bottom" className="max-w-[420px] break-all font-mono text-xs">
              {revealed}
            </TooltipContent>
          )}
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => onReveal(token)}
          disabled={isCopying}
          title={revealed ? '隐藏' : '查看'}
        >
          {revealed
            ? <EyeOff className="h-3.5 w-3.5 text-text-tertiary" />
            : <Eye className="h-3.5 w-3.5 text-text-tertiary" />
          }
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => onCopy(token)}
          disabled={isCopying}
          title="复制"
        >
          {isCopying
            ? <div className="h-3.5 w-3.5 animate-spin border-2 border-text-tertiary border-t-transparent rounded-full" />
            : <Copy className="h-3.5 w-3.5 text-text-tertiary" />
          }
        </Button>
      </div>

      {/* Row 3: Meta info */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-xs text-text-tertiary">
        <span>已用 <span className="text-text-secondary">${formatQuota(token.used_quota)}</span></span>
        <span className="text-border-strong">·</span>
        <span>剩余 <span className="text-text-secondary">{token.unlimited_quota ? '无限' : `$${formatQuota(token.remain_quota)}`}</span></span>
        <span className="text-border-strong">·</span>
        <span>{timestamp2string(token.created_time)}</span>
        <span className="text-border-strong">·</span>
        <span>{expiry}</span>
        {token.group && (
          <>
            <span className="text-border-strong">·</span>
            <span className="bg-surface-hover px-1.5 py-0.5 rounded text-[10px]">{token.group}</span>
          </>
        )}
      </div>
    </Card>
  );
}

export default function TokenPage() {
  const [userState] = useContext(UserContext);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ ...defaultTokenForm });
  const [createdKey, setCreatedKey] = useState('');
  const [copyingKeys, setCopyingKeys] = useState({});
  const [revealedKeys, setRevealedKeys] = useState({});

  // Models and groups loaded when dialog opens
  const [availableModels, setAvailableModels] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const updateForm = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      let res;
      if (searchKeyword.trim()) {
        res = await API.get(`/api/token/search?keyword=${encodeURIComponent(searchKeyword)}&p=${page}&size=${pageSize}`);
      } else {
        res = await API.get(`/api/token/?p=${page}&size=${pageSize}`);
      }
      const { success, message, data } = res.data;
      if (success) {
        setTokens(data?.items || []);
        setTotal(data?.total || 0);
      } else {
        showError(message);
      }
    } catch (err) {
      showError('获取令牌列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadModelsAndGroups = async () => {
    setModelsLoading(true);
    try {
      const [modelsRes, groupsRes] = await Promise.all([
        API.get('/api/user/models').catch(() => null),
        API.get('/api/user/self/groups').catch(() => null),
      ]);
      if (modelsRes?.data?.success) {
        setAvailableModels(modelsRes.data.data || []);
      }
      if (groupsRes?.data?.success) {
        const groupData = groupsRes.data.data || {};
        const groupList = Object.entries(groupData).map(([key, info]) => ({
          value: key,
          label: info?.desc || key,
          ratio: info?.ratio,
        }));
        groupList.sort((a, b) => (a.value === 'auto' ? -1 : b.value === 'auto' ? 1 : 0));
        setAvailableGroups(groupList);
      }
    } catch {
      // silently fail
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadTokens();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const openCreateDialog = () => {
    setEditingToken(null);
    setFormData({ ...defaultTokenForm });
    loadModelsAndGroups();
    setShowDialog(true);
  };

  const openEditDialog = async (token) => {
    try {
      const res = await API.get(`/api/token/${token.id}`);
      const { success, message, data } = res.data;
      if (success) {
        setEditingToken(data);
        setFormData({
          name: data.name || '',
          remain_quota: data.remain_quota || 0,
          expired_time: data.expired_time
            ? formatDateTimeLocal(data.expired_time)
            : '',
          unlimited_quota: data.unlimited_quota || false,
          model_limits_enabled: data.model_limits_enabled || false,
          model_limits: data.model_limits || '',
          allow_ips: data.allow_ips || '',
          group: data.group || '',
          cross_group_retry: data.cross_group_retry || false,
        });
        loadModelsAndGroups();
        setShowDialog(true);
      } else {
        showError(message);
      }
    } catch (err) {
      showError('获取令牌详情失败');
    }
  };

  const formatDateTimeLocal = (timestamp) => {
    if (!timestamp || timestamp <= 0) return '';
    return formatDateForInput(new Date(timestamp * 1000));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('请输入令牌名称');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...formData,
        remain_quota: parseInt(formData.remain_quota, 10) || 0,
        expired_time: formData.expired_time
          ? Math.floor(new Date(formData.expired_time).getTime() / 1000)
          : -1,
      };
      let res;
      if (editingToken) {
        body.id = editingToken.id;
        res = await API.put('/api/token/', body);
      } else {
        res = await API.post('/api/token/', body);
      }
      const { success, message, data } = res.data;
      if (success) {
        if (!editingToken && data) setCreatedKey(data);
        showSuccess(editingToken ? '令牌更新成功' : '令牌创建成功');
        setShowDialog(false);
        loadTokens();
      } else {
        showError(message);
      }
    } catch (err) {
      showError('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (token) => {
    if (!window.confirm(`确定要删除令牌「${token.name}」吗？`)) return;
    try {
      const res = await API.delete(`/api/token/${token.id}`);
      if (res.data.success) {
        showSuccess('令牌已删除');
        loadTokens();
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('删除失败');
    }
  };

  const handleToggleStatus = async (token) => {
    const newStatus = token.status === 1 ? 2 : 1;
    try {
      const res = await API.put('/api/token/?status_only=true', { id: token.id, status: newStatus });
      if (res.data.success) {
        showSuccess(newStatus === 1 ? '令牌已启用' : '令牌已禁用');
        loadTokens();
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('操作失败');
    }
  };

  const handleCopyKey = async (token) => {
    if (revealedKeys[token.id]) {
      const ok = await copy(revealedKeys[token.id]);
      ok ? showSuccess('已复制到剪贴板') : showError('复制失败，请手动复制');
      return;
    }
    setCopyingKeys((prev) => ({ ...prev, [token.id]: true }));
    const keyPromise = API.post(`/api/token/${token.id}/key`).then((res) => {
      if (res.data.success) return res.data.data.key;
      throw new Error(res.data.message || '获取密钥失败');
    });
    try {
      const ok = await copyAsync(keyPromise);
      ok ? showSuccess('已复制到剪贴板') : showInfo('复制失败，请点击眼睛图标查看后手动复制');
    } catch (err) {
      showError(err.message || '获取密钥失败');
    } finally {
      setCopyingKeys((prev) => {
        const next = { ...prev };
        delete next[token.id];
        return next;
      });
    }
  };

  const handleRevealKey = async (token) => {
    if (revealedKeys[token.id]) {
      setRevealedKeys((prev) => { const n = { ...prev }; delete n[token.id]; return n; });
      return;
    }
    setCopyingKeys((prev) => ({ ...prev, [token.id]: true }));
    try {
      const res = await API.post(`/api/token/${token.id}/key`);
      if (res.data.success) {
        setRevealedKeys((prev) => ({ ...prev, [token.id]: res.data.data.key }));
      } else {
        showError(res.data.message || '获取密钥失败');
      }
    } catch (err) {
      showError('获取密钥失败');
    } finally {
      setCopyingKeys((prev) => { const n = { ...prev }; delete n[token.id]; return n; });
    }
  };

  const renderQuotaHint = (rawQuota) => {
    const val = parseFloat(rawQuota) || 0;
    return `$${(val / getQuotaPerUnit()).toFixed(2)}`;
  };

  const toggleModel = (model) => {
    const current = formData.model_limits ? formData.model_limits.split(',').filter(Boolean) : [];
    const idx = current.indexOf(model);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(model);
    updateForm({ model_limits: current.join(',') });
  };

  const selectedModels = formData.model_limits ? formData.model_limits.split(',').filter(Boolean) : [];

  // Stats
  const enabledCount = tokens.filter((t) => t.status === 1).length;
  const totalUsed = tokens.reduce((acc, t) => acc + (t.used_quota || 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">令牌管理</h1>
          <p className="text-sm text-text-tertiary mt-0.5">管理你的 API 访问密钥</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          创建令牌
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Key className="h-4.5 w-4.5 text-accent" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">令牌总数</p>
            <p className="text-lg font-heading font-bold text-text-primary">{total}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-4.5 w-4.5 text-success" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">已启用</p>
            <p className="text-lg font-heading font-bold text-text-primary">{enabledCount}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
            <TrendingUp className="h-4.5 w-4.5 text-warning" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">本页已用额度</p>
            <p className="text-lg font-heading font-bold text-text-primary">${formatQuota(totalUsed)}</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          <Input
            placeholder="搜索令牌名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>搜索</Button>
      </div>

      {/* Token List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4 h-24 animate-pulse bg-surface-hover/50" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <EmptyState
          icon={Key}
          title="还没有令牌"
          description="创建一个 API 令牌来开始使用模型接口"
          action={
            <Button onClick={openCreateDialog} className="gap-1.5">
              <Plus className="h-4 w-4" /> 创建令牌
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              copyingKeys={copyingKeys}
              revealedKeys={revealedKeys}
              onCopy={handleCopyKey}
              onReveal={handleRevealKey}
              onEdit={openEditDialog}
              onToggle={handleToggleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex justify-end">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
          />
        </div>
      )}

      {/* Create / Edit Token Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingToken ? '编辑令牌' : '创建令牌'}</DialogTitle>
            <DialogDescription>
              {editingToken
                ? '修改令牌的配置信息，更改后立即生效。'
                : '创建一个新的 API 令牌，用于访问模型接口。'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 -mx-6 px-6 overflow-y-auto">
            <div className="space-y-4 py-4">
              {/* === Section 1: Basic Info === */}
              <FormSection
                icon={<Key className="h-4 w-4" />}
                title="基本信息"
                description="设置令牌名称和所属分组"
              >
                <FormField label="名称" htmlFor="token-name">
                  <Input
                    id="token-name"
                    placeholder="请输入令牌名称，例如：my-app-token"
                    value={formData.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                  />
                </FormField>

                {availableGroups.length > 0 && (
                  <FormField
                    label="分组"
                    description="指定令牌所属分组，不同分组可能对应不同的渠道和计费倍率。留空使用默认分组。"
                    htmlFor="token-group"
                  >
                    <Select
                      value={formData.group || '__default__'}
                      onValueChange={(val) => {
                        const group = val === '__default__' ? '' : val;
                        updateForm({ group, cross_group_retry: group !== 'auto' ? false : formData.cross_group_retry });
                      }}
                    >
                      <SelectTrigger id="token-group">
                        <SelectValue placeholder="默认分组" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">默认分组</SelectItem>
                        {availableGroups.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}{g.ratio != null ? ` (${g.ratio}x)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}

                {formData.group === 'auto' && (
                  <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 border border-border">
                    <Switch
                      checked={formData.cross_group_retry}
                      onCheckedChange={(checked) => updateForm({ cross_group_retry: checked })}
                      label="跨分组重试"
                      description="开启后，当前分组渠道失败时会按顺序尝试下一个分组的渠道。"
                    />
                  </div>
                )}
              </FormSection>

              {/* === Section 2: Quota === */}
              <FormSection
                icon={<TrendingUp className="h-4 w-4" />}
                title="额度设置"
                description="配置令牌的可用额度上限"
              >
                <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 border border-border">
                  <Switch
                    checked={formData.unlimited_quota}
                    onCheckedChange={(checked) => updateForm({ unlimited_quota: checked })}
                    label="无限额度"
                    description="开启后令牌不受额度限制，实际使用仍受账户余额约束。"
                  />
                </div>

                {!formData.unlimited_quota && (
                  <FormField
                    label="额度"
                    description={`当前设置额度：${renderQuotaHint(formData.remain_quota)}。令牌额度仅限制令牌本身的最大使用量。`}
                    htmlFor="token-quota"
                  >
                    <Input
                      id="token-quota"
                      type="number"
                      placeholder="请输入额度（原始值）"
                      value={formData.remain_quota}
                      onChange={(e) => updateForm({ remain_quota: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: '$1', value: 500000 },
                        { label: '$10', value: 5000000 },
                        { label: '$50', value: 25000000 },
                        { label: '$100', value: 50000000 },
                        { label: '$500', value: 250000000 },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => updateForm({ remain_quota: preset.value })}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                            Number(formData.remain_quota) === preset.value
                              ? 'bg-accent text-white border-accent'
                              : 'bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </FormField>
                )}
              </FormSection>

              {/* === Section 3: Expiry === */}
              <FormSection
                icon={<Clock className="h-4 w-4" />}
                title="过期时间"
                description="设置令牌的有效期限"
              >
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '永不过期', value: 'never' },
                    { label: '1 小时', value: '1h' },
                    { label: '1 天', value: '1d' },
                    { label: '7 天', value: '7d' },
                    { label: '30 天', value: '30d' },
                    { label: '90 天', value: '90d' },
                  ].map((preset) => {
                    const isActive = preset.value === 'never' ? !formData.expired_time : false;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => updateForm({ expired_time: getExpiryPresetTime(preset.value) })}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          isActive
                            ? 'bg-accent text-white border-accent'
                            : 'bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <FormField
                  label="自定义时间"
                  description="留空表示永不过期。选择快捷按钮后也可手动微调。"
                  htmlFor="token-expiry"
                >
                  <Input
                    id="token-expiry"
                    type="datetime-local"
                    value={formData.expired_time}
                    onChange={(e) => updateForm({ expired_time: e.target.value })}
                  />
                </FormField>
              </FormSection>

              {/* === Section 4: Access Control === */}
              <FormSection
                icon={<Shield className="h-4 w-4" />}
                title="访问限制"
                description="限制令牌可访问的模型和来源 IP"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 border border-border">
                    <Switch
                      checked={formData.model_limits_enabled}
                      onCheckedChange={(checked) =>
                        updateForm({ model_limits_enabled: checked, model_limits: checked ? formData.model_limits : '' })
                      }
                      label="启用模型限制"
                      description="开启后，令牌只能使用指定的模型。非必要不建议启用。"
                    />
                  </div>

                  {formData.model_limits_enabled && (
                    <div className="space-y-2">
                      {availableModels.length > 0 ? (
                        <div className="rounded-md border border-border bg-surface p-2">
                          <div className="mb-2 px-1">
                            <span className="text-xs text-text-tertiary">
                              已选 {selectedModels.length} 个模型 (共 {availableModels.length} 个可用)
                            </span>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            <div className="flex flex-wrap gap-1.5 p-1">
                              {availableModels.map((model) => {
                                const isSelected = selectedModels.includes(model);
                                return (
                                  <button
                                    key={model}
                                    type="button"
                                    onClick={() => toggleModel(model)}
                                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                      isSelected
                                        ? 'bg-accent/10 text-accent border-accent/30 font-medium'
                                        : 'bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                    }`}
                                  >
                                    {model}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <FormField description="无法加载可用模型列表，请手动输入模型名称，用逗号分隔。">
                          <Input
                            placeholder="gpt-4o,claude-3-5-sonnet,..."
                            value={formData.model_limits}
                            onChange={(e) => updateForm({ model_limits: e.target.value })}
                          />
                        </FormField>
                      )}
                    </div>
                  )}
                </div>

                <FormField
                  label="IP 白名单"
                  description="限制只有指定 IP 才能使用此令牌。支持 CIDR 表达式（如 192.168.0.0/24），每行一个。留空表示不限制。"
                  htmlFor="token-allowips"
                >
                  <Textarea
                    id="token-allowips"
                    placeholder={'192.168.1.0/24\n10.0.0.1\n...'}
                    value={formData.allow_ips}
                    onChange={(e) => updateForm({ allow_ips: e.target.value })}
                    textareaSize="sm"
                  />
                </FormField>
              </FormSection>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : editingToken ? '保存更改' : '创建令牌'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Key Dialog */}
      <Dialog open={!!createdKey} onOpenChange={(open) => { if (!open) setCreatedKey(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              令牌创建成功
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-text-secondary">
              请立即复制以下密钥，关闭后将无法再次查看完整密钥。
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-surface-hover px-3 py-2 text-sm font-mono break-all select-all">
                {createdKey}
              </code>
              <Button
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  const ok = await copy(createdKey);
                  ok ? showSuccess('已复制到剪贴板') : showError('复制失败');
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> 复制
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatedKey('')}>
              我已保存，关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
