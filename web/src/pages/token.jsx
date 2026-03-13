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
} from '../components/ui';
import { Textarea } from '../components/ui/textarea';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import {
  showError,
  showSuccess,
  showInfo,
  copy,
  timestamp2string,
  getQuotaPerUnit,
} from '../lib/utils';
import { isAdmin } from '../lib/utils';
import { UserContext } from '../contexts/user-context';

const defaultTokenForm = {
  name: '',
  remain_quota: 0,
  expired_time: '',
  unlimited_quota: false,
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
    case '1h':
      now.setHours(now.getHours() + 1);
      break;
    case '1d':
      now.setDate(now.getDate() + 1);
      break;
    case '7d':
      now.setDate(now.getDate() + 7);
      break;
    case '30d':
      now.setDate(now.getDate() + 30);
      break;
    case '90d':
      now.setDate(now.getDate() + 90);
      break;
    default:
      return '';
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
  const [revealedKeys, setRevealedKeys] = useState({});
  const [revealingKeys, setRevealingKeys] = useState({});

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
        // Sort so 'auto' comes first if present
        groupList.sort((a, b) => (a.value === 'auto' ? -1 : b.value === 'auto' ? 1 : 0));
        setAvailableGroups(groupList);
      }
    } catch {
      // silently fail — fields are optional
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
    if (e.key === 'Enter') {
      handleSearch();
    }
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
        if (!editingToken && data) {
          setCreatedKey(data);
        }
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
      const { success, message } = res.data;
      if (success) {
        showSuccess('令牌已删除');
        loadTokens();
      } else {
        showError(message);
      }
    } catch (err) {
      showError('删除失败');
    }
  };

  const handleToggleStatus = async (token) => {
    const newStatus = token.status === 1 ? 2 : 1;
    try {
      const res = await API.put(`/api/token/?status=${token.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(newStatus === 1 ? '令牌已启用' : '令牌已禁用');
        loadTokens();
      } else {
        showError(message);
      }
    } catch (err) {
      showError('操作失败');
    }
  };

  const handleCopyKey = async (token) => {
    if (revealedKeys[token.id]) {
      await copy(revealedKeys[token.id]);
    } else {
      await copy('sk-' + token.key);
    }
    showSuccess('已复制到剪贴板');
  };

  const handleRevealKey = async (token) => {
    if (revealedKeys[token.id]) {
      setRevealedKeys((prev) => {
        const next = { ...prev };
        delete next[token.id];
        return next;
      });
      return;
    }
    setRevealingKeys((prev) => ({ ...prev, [token.id]: true }));
    try {
      const res = await API.post(`/api/token/${token.id}/key`);
      const { success, message, data } = res.data;
      if (success) {
        setRevealedKeys((prev) => ({ ...prev, [token.id]: data.key }));
      } else {
        showError(message || '获取密钥失败');
      }
    } catch (err) {
      showError('获取密钥失败');
    } finally {
      setRevealingKeys((prev) => {
        const next = { ...prev };
        delete next[token.id];
        return next;
      });
    }
  };

  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const formatQuota = (quota) => {
    return (quota / getQuotaPerUnit()).toFixed(2);
  };

  const renderQuotaHint = (rawQuota) => {
    const val = parseFloat(rawQuota) || 0;
    const dollars = (val / getQuotaPerUnit()).toFixed(2);
    return `$${dollars}`;
  };

  // Toggle a model in the comma-separated model_limits string
  const toggleModel = (model) => {
    const current = formData.model_limits
      ? formData.model_limits.split(',').filter(Boolean)
      : [];
    const idx = current.indexOf(model);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(model);
    }
    updateForm({ model_limits: current.join(',') });
  };

  const selectedModels = formData.model_limits
    ? formData.model_limits.split(',').filter(Boolean)
    : [];

  const columns = [
    {
      header: '名称',
      accessorKey: 'name',
      cell: ({ row }) => (
        <span className="text-text-primary font-medium">{row.original.name}</span>
      ),
    },
    {
      header: 'Key',
      accessorKey: 'key',
      cell: ({ row }) => {
        const token = row.original;
        const isRevealed = !!revealedKeys[token.id];
        const isRevealing = !!revealingKeys[token.id];
        return (
          <div className="flex items-center gap-2">
            <code className="text-text-secondary text-sm bg-surface px-2 py-0.5 rounded">
              {isRevealed ? revealedKeys[token.id] : `sk-${maskKey(token.key)}`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-7 w-7"
              onClick={() => handleRevealKey(token)}
              disabled={isRevealing}
              title={isRevealed ? '隐藏密钥' : '显示完整密钥'}
            >
              {isRevealing ? (
                <svg className="h-4 w-4 animate-spin text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isRevealed ? (
                <svg className="h-4 w-4 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyKey(token)}
            >
              复制
            </Button>
          </div>
        );
      },
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        return status === 1 ? (
          <Badge variant="success">已启用</Badge>
        ) : (
          <Badge variant="danger">已禁用</Badge>
        );
      },
    },
    {
      header: '已用额度',
      accessorKey: 'used_quota',
      cell: ({ row }) => (
        <span className="text-text-secondary">${formatQuota(row.original.used_quota)}</span>
      ),
    },
    {
      header: '剩余额度',
      accessorKey: 'remain_quota',
      cell: ({ row }) => (
        <span className="text-text-secondary">
          {row.original.unlimited_quota ? '无限' : '$' + formatQuota(row.original.remain_quota)}
        </span>
      ),
    },
    {
      header: '创建时间',
      accessorKey: 'created_time',
      cell: ({ row }) => (
        <span className="text-text-tertiary text-sm">
          {timestamp2string(row.original.created_time)}
        </span>
      ),
    },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => {
        const token = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleCopyKey(token)}>
              复制Key
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(token)}>
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(token)}
            >
              {token.status === 1 ? '禁用' : '启用'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => handleDelete(token)}
            >
              删除
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading text-text-primary">令牌管理</h1>
        <Button onClick={openCreateDialog}>创建令牌</Button>
      </div>

      <Card className="bg-surface border border-border">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Input
              placeholder="搜索令牌名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>

          <DataTable columns={columns} data={tokens} loading={loading} />

          <div className="mt-4 flex justify-end">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        </div>
      </Card>

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
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                  </svg>
                }
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
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                }
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
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                }
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
                    const isActive =
                      preset.value === 'never'
                        ? !formData.expired_time
                        : false; // presets are one-click, not tracked
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() =>
                          updateForm({ expired_time: getExpiryPresetTime(preset.value) })
                        }
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
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                }
                title="访问限制"
                description="限制令牌可访问的模型和来源 IP"
              >
                {/* Model limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 border border-border">
                    <Switch
                      checked={formData.model_limits_enabled}
                      onCheckedChange={(checked) =>
                        updateForm({
                          model_limits_enabled: checked,
                          model_limits: checked ? formData.model_limits : '',
                        })
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
                        <FormField
                          description="无法加载可用模型列表，请手动输入模型名称，用逗号分隔。"
                        >
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

                {/* IP whitelist */}
                <FormField
                  label="IP 白名单"
                  description="限制只有指定 IP 才能使用此令牌。支持 CIDR 表达式（如 192.168.0.0/24），每行一个。留空表示不限制。请勿过度信任此功能，IP 可能被伪造，建议配合 nginx 或 CDN 网关使用。"
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
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
            <DialogTitle>令牌创建成功</DialogTitle>
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
                variant="outline"
                size="sm"
                onClick={async () => {
                  await copy(createdKey);
                  showSuccess('已复制到剪贴板');
                }}
              >
                复制
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="primary" onClick={() => setCreatedKey('')}>
              我已保存，关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
