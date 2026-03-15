import { useState, useEffect } from 'react';
import { Button, Input, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Switch, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { ModelSelector } from '../components/model-selector';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, timestamp2string } from '../lib/utils';
import { CHANNEL_OPTIONS, CHANNEL_TYPE_MAP, CHANNEL_TYPE_COLORS, MODEL_FETCHABLE_CHANNEL_TYPES } from '../constants/channel.constants';

const DEFAULT_CHANNEL = {
  name: '',
  type: 1,
  key: '',
  base_url: '',
  models: '',
  group: 'default',
  priority: 0,
  weight: 1,
  system_prompt: '',
  system_prompt_override: false,
};

export default function ChannelPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_CHANNEL });
  const [submitting, setSubmitting] = useState(false);
  const [testingIds, setTestingIds] = useState({});
  const [testResults, setTestResults] = useState({});
  const [testModelDialogOpen, setTestModelDialogOpen] = useState(false);
  const [testTargetChannel, setTestTargetChannel] = useState(null);
  const [testSelectedModel, setTestSelectedModel] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);

  const loadGroups = async () => {
    try {
      const res = await API.get('/api/group/');
      const { success, data } = res.data;
      if (success && Array.isArray(data)) {
        setAvailableGroups(data);
      }
    } catch {
      // silently fail — group list is optional
    }
  };

  useEffect(() => {
    loadChannels();
  }, [page]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      if (searchKeyword || statusFilter !== 'all') {
        await searchChannels();
      } else {
        const res = await API.get(`/api/channel/?p=${page}&size=${pageSize}`);
        const { success, data, message } = res.data;
        if (success) {
          setChannels(data?.items || []);
          setTotal(data?.total || 0);
        } else {
          showError(message || '加载渠道失败');
        }
      }
    } catch (err) {
      showError(err?.message || '加载渠道失败');
    } finally {
      setLoading(false);
    }
  };

  const searchChannels = async () => {
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set('keyword', searchKeyword);
      if (statusFilter !== 'all') params.set('status', statusFilter === 'enabled' ? '1' : '2');
      const res = await API.get(`/api/channel/search?${params.toString()}`);
      const { success, data, message } = res.data;
      if (success) {
        setChannels(data?.items || data || []);
        setTotal(data?.total || (Array.isArray(data) ? data.length : 0));
      } else {
        showError(message || '搜索失败');
      }
    } catch (err) {
      showError(err?.message || '搜索失败');
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadChannels();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTestChannel = async (id, model) => {
    setTestingIds((prev) => ({ ...prev, [id]: true }));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const params = model ? `?model=${encodeURIComponent(model)}` : '';
      const res = await API.get(`/api/channel/test/${id}${params}`);
      const { success, data, message } = res.data;
      if (success) {
        const latency = data?.response_time || 0;
        setTestResults((prev) => ({ ...prev, [id]: latency }));
        showSuccess(`测试成功${model ? ` (${model})` : ''}，响应时间: ${latency}ms`);
      } else {
        showError(message || '测试失败');
      }
    } catch (err) {
      showError(err?.message || '测试失败');
    } finally {
      setTestingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openTestModelDialog = (channel) => {
    setTestTargetChannel(channel);
    const models = (channel.models || '').split(',').map((m) => m.trim()).filter(Boolean);
    setTestSelectedModel(models[0] || '');
    setTestModelDialogOpen(true);
  };

  const confirmTestWithModel = () => {
    if (testTargetChannel) {
      handleTestChannel(testTargetChannel.id, testSelectedModel || undefined);
    }
    setTestModelDialogOpen(false);
  };

  const handleTestAll = async () => {
    showInfo('开始测试所有渠道...');
    for (const channel of channels) {
      handleTestChannel(channel.id);
    }
  };

  const handleToggleStatus = async (channel) => {
    try {
      const newStatus = channel.status === 1 ? 2 : 1;
      const res = await API.put('/api/channel/', {
        id: channel.id,
        status: newStatus,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(channel.status === 1 ? '已禁用' : '已启用');
        loadChannels();
      } else {
        showError(message || '操作失败');
      }
    } catch (err) {
      showError(err?.message || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除该渠道吗？')) return;
    try {
      const res = await API.delete(`/api/channel/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('删除成功');
        loadChannels();
      } else {
        showError(message || '删除失败');
      }
    } catch (err) {
      showError(err?.message || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      showInfo('请先选择渠道');
      return;
    }
    if (!window.confirm(`确定要删除选中的 ${selectedRows.length} 个渠道吗？`)) return;
    try {
      const res = await API.delete('/api/channel/batch', { data: { ids: selectedRows } });
      const { success, message } = res.data;
      if (success) {
        showSuccess('批量删除成功');
        setSelectedRows([]);
        loadChannels();
      } else {
        showError(message || '批量删除失败');
      }
    } catch (err) {
      showError(err?.message || '批量删除失败');
    }
  };

  const handleBatchToggle = async (enable) => {
    if (selectedRows.length === 0) {
      showInfo('请先选择渠道');
      return;
    }
    try {
      const res = await API.put('/api/channel/batch', {
        ids: selectedRows,
        status: enable ? 1 : 2,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(enable ? '批量启用成功' : '批量禁用成功');
        setSelectedRows([]);
        loadChannels();
      } else {
        showError(message || '操作失败');
      }
    } catch (err) {
      showError(err?.message || '操作失败');
    }
  };

  const openCreateDialog = () => {
    setEditingChannel(null);
    setFormData({ ...DEFAULT_CHANNEL });
    setDialogOpen(true);
  };

  const openEditDialog = async (channel) => {
    setEditingChannel(channel);
    let setting = {};
    try {
      if (channel.setting) setting = JSON.parse(channel.setting);
    } catch { /* ignore */ }

    // Fetch channel detail to get masked_key for display
    let maskedKey = '';
    try {
      const res = await API.get(`/api/channel/${channel.id}`);
      if (res.data?.success) {
        maskedKey = res.data.masked_key || '';
        // Use fresh data from API if available
        const detail = res.data.data;
        if (detail) {
          try {
            if (detail.setting) setting = JSON.parse(detail.setting);
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore, use list data */ }

    setFormData({
      name: channel.name || '',
      type: channel.type || 1,
      key: '',
      base_url: channel.base_url || '',
      models: channel.models || '',
      group: channel.group || 'default',
      priority: channel.priority || 0,
      weight: channel.weight || 1,
      system_prompt: setting.system_prompt || '',
      system_prompt_override: setting.system_prompt_override || false,
      _rawSetting: setting,
      _maskedKey: maskedKey,
    });
    setDialogOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchUpstreamModels = async () => {
    if (!MODEL_FETCHABLE_CHANNEL_TYPES.has(formData.type)) {
      showError('该渠道类型不支持获取模型列表');
      return null;
    }
    if (!editingChannel && !formData.key) {
      showError('请先填写密钥');
      return null;
    }
    try {
      let res;
      if (editingChannel) {
        res = await API.get(`/api/channel/fetch_models/${editingChannel.id}`);
      } else {
        res = await API.post('/api/channel/fetch_models', {
          base_url: formData.base_url,
          type: formData.type,
          key: formData.key,
        });
      }
      const { success, data, message } = res.data || {};
      if (success && Array.isArray(data) && data.length > 0) {
        const uniqueModels = Array.from(new Set(data));
        showSuccess(`成功获取 ${uniqueModels.length} 个模型`);
        return uniqueModels;
      }
      showError(message || '获取模型列表失败');
      return null;
    } catch (err) {
      showError(err?.message || '获取模型列表失败');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showError('请输入渠道名称');
      return;
    }
    if (!editingChannel && !formData.key) {
      showError('请输入密钥');
      return;
    }
    setSubmitting(true);
    try {
      let res;
      // Build the channel data object matching backend model.Channel field names
      const settingObj = {
        ...(formData._rawSetting || {}),
        system_prompt: formData.system_prompt || '',
        system_prompt_override: formData.system_prompt_override || false,
      };
      // Clean empty fields to keep setting compact
      if (!settingObj.system_prompt) delete settingObj.system_prompt;
      if (!settingObj.system_prompt_override) delete settingObj.system_prompt_override;

      const channelData = {
        name: formData.name,
        type: formData.type,
        key: formData.key,
        base_url: formData.base_url || '',
        models: formData.models,
        group: formData.group || 'default',
        priority: formData.priority ?? 0,
        weight: formData.weight ?? 1,
        setting: JSON.stringify(settingObj),
      };
      if (editingChannel) {
        // PUT /api/channel/ expects PatchChannel (flat model.Channel fields + id)
        res = await API.put('/api/channel/', {
          ...channelData,
          id: editingChannel.id,
        });
      } else {
        // POST /api/channel/ expects AddChannelRequest:
        //   { mode: "single"|"batch"|"multi_to_single", channel: { ...model.Channel } }
        res = await API.post('/api/channel/', {
          mode: 'single',
          channel: channelData,
        });
      }
      const { success, message } = res.data || {};
      if (success) {
        showSuccess(editingChannel ? '更新成功' : '创建成功');
        setDialogOpen(false);
        loadChannels();
      } else {
        showError(message || '操作失败');
      }
    } catch (err) {
      showError(err?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === channels.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(channels.map((c) => c.id));
    }
  };

  const getResponseTimeColor = (ms) => {
    if (ms < 1000) return 'text-green-600 dark:text-green-400';
    if (ms < 3000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const renderResponseTime = (channel) => {
    const testResult = testResults[channel.id];
    const isTesting = testingIds[channel.id];

    if (isTesting) {
      return <span className="text-text-secondary text-sm">测试中...</span>;
    }

    const displayTime = testResult !== undefined ? testResult : channel.response_time;
    if (displayTime === undefined || displayTime === null || displayTime === 0) {
      return <span className="text-text-secondary text-sm">未测试</span>;
    }

    return (
      <span className={`text-sm font-medium ${getResponseTimeColor(displayTime)}`}>
        {displayTime}ms
      </span>
    );
  };

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={channels.length > 0 && selectedRows.length === channels.length}
          onChange={handleSelectAll}
          className="rounded border-border"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedRows.includes(row.id)}
          onChange={() => handleRowSelect(row.id)}
          className="rounded border-border"
        />
      ),
    },
    {
      key: 'id',
      header: 'ID',
      render: (row) => <span className="text-text-secondary text-sm">{row.id}</span>,
    },
    {
      key: 'name',
      header: '名称',
      render: (row) => <span className="text-text-primary font-medium">{row.name}</span>,
    },
    {
      key: 'type',
      header: '类型',
      render: (row) => {
        const typeName = CHANNEL_TYPE_MAP[row.type] || `类型 ${row.type}`;
        const colorClass = CHANNEL_TYPE_COLORS[row.type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
            {typeName}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (row) =>
        row.status === 1 ? (
          <Badge variant="success">已启用</Badge>
        ) : (
          <Badge variant="danger">已禁用</Badge>
        ),
    },
    {
      key: 'group',
      header: '分组',
      render: (row) => <span className="text-text-secondary text-sm">{row.group || '-'}</span>,
    },
    {
      key: 'priority',
      header: '优先级',
      render: (row) => <span className="text-text-secondary text-sm">{row.priority ?? 0}</span>,
    },
    {
      key: 'weight',
      header: '权重',
      render: (row) => <span className="text-text-secondary text-sm">{row.weight ?? 1}</span>,
    },
    {
      key: 'response_time',
      header: '响应时间',
      render: (row) => renderResponseTime(row),
    },
    {
      key: 'balance',
      header: '余额',
      render: (row) => (
        <span className="text-text-secondary text-sm">
          {row.balance !== undefined && row.balance !== null ? `$${Number(row.balance).toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openTestModelDialog(row)}
            disabled={testingIds[row.id]}
          >
            {testingIds[row.id] ? '测试中...' : '测试'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openEditDialog(row)}>
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleStatus(row)}
          >
            {row.status === 1 ? '禁用' : '启用'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            onClick={() => handleDelete(row.id)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-background min-h-screen p-6">
      <h1 className="font-heading text-text-primary text-2xl font-bold mb-6">渠道管理</h1>

      <Card className="bg-surface p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="搜索渠道名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-64"
          />

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>

          <div className="flex-1" />

          <Button variant="primary" onClick={openCreateDialog}>
            添加渠道
          </Button>
          <Button variant="outline" onClick={handleTestAll}>
            测试所有
          </Button>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
            <span className="text-text-secondary text-sm">
              已选择 {selectedRows.length} 项
            </span>
            <Button variant="outline" size="sm" onClick={() => handleBatchToggle(true)}>
              批量启用
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBatchToggle(false)}>
              批量禁用
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          </div>
        )}
      </Card>

      <Card className="bg-surface">
        <DataTable columns={columns} data={channels} loading={loading} />

        {totalPages > 1 && (
          <div className="p-4 border-t border-border">
            <Pagination
              current={page}
              total={totalPages}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChannel ? '编辑渠道' : '添加渠道'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                基本信息
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-primary text-sm font-medium mb-1">
                      渠道名称
                    </label>
                    <Input
                      placeholder="请输入渠道名称"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-text-primary text-sm font-medium mb-1">
                      渠道类型
                    </label>
                    <Select
                      value={String(formData.type)}
                      onValueChange={(val) => handleFormChange('type', Number(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1">
                    密钥
                    {editingChannel && formData._maskedKey && (
                      <span className="ml-2 text-text-tertiary font-normal text-xs">
                        当前: {formData._maskedKey}（留空保持不变）
                      </span>
                    )}
                  </label>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={editingChannel && formData._maskedKey ? `${formData._maskedKey}（留空保持不变，输入新值则替换）` : '请输入密钥'}
                    rows={3}
                    value={formData.key}
                    onChange={(e) => handleFormChange('key', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1">
                    Base URL
                    <span className="ml-1 text-text-tertiary font-normal">（可选）</span>
                  </label>
                  <Input
                    placeholder="留空则使用默认地址"
                    value={formData.base_url}
                    onChange={(e) => handleFormChange('base_url', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Model Selection */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                模型配置
              </h3>
              <ModelSelector
                value={formData.models}
                onChange={(val) => handleFormChange('models', val)}
                onFetch={fetchUpstreamModels}
                canFetch={MODEL_FETCHABLE_CHANNEL_TYPES.has(formData.type)}
              />
            </section>

            {/* Advanced Settings */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                高级设置
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1">
                    分组
                  </label>
                  <Select
                    value={formData.group}
                    onValueChange={(val) => handleFormChange('group', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="default" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups.length > 0 ? (
                        availableGroups.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default">default</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1">
                    优先级
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.priority}
                    onChange={(e) => handleFormChange('priority', Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-text-primary text-sm font-medium mb-1">
                    权重
                  </label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={formData.weight}
                    onChange={(e) => handleFormChange('weight', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-text-primary text-sm font-medium">
                    系统提示词
                    <span className="ml-1 text-text-tertiary font-normal">（可选）</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                    <Switch
                      checked={formData.system_prompt_override}
                      onCheckedChange={(val) => handleFormChange('system_prompt_override', val)}
                    />
                    覆盖模式
                  </label>
                </div>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="为该渠道的所有请求注入系统提示词。关闭覆盖模式时追加到已有提示词之前，开启时替换原有提示词。"
                  rows={3}
                  value={formData.system_prompt}
                  onChange={(e) => handleFormChange('system_prompt', e.target.value)}
                />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : editingChannel ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Model Dialog */}
      <Dialog open={testModelDialogOpen} onOpenChange={setTestModelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>测试渠道: {testTargetChannel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-text-primary">选择测试模型</label>
            {(() => {
              const models = (testTargetChannel?.models || '').split(',').map((m) => m.trim()).filter(Boolean);
              if (models.length === 0) {
                return <p className="text-sm text-text-tertiary">该渠道未配置模型</p>;
              }
              return (
                <Select value={testSelectedModel} onValueChange={setTestSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModelDialogOpen(false)}>取消</Button>
            <Button variant="primary" onClick={confirmTestWithModel} disabled={!testSelectedModel}>
              开始测试
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
