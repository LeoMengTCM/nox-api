import { useState, useEffect, useCallback } from 'react';
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
  EmptyState,
} from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';
import { Cloud, ServerOff, RefreshCw, Trash2, Pencil, ExternalLink } from 'lucide-react';

const statusMap = {
  running: { label: '运行中', variant: 'success' },
  completed: { label: '已完成', variant: 'info' },
  failed: { label: '失败', variant: 'danger' },
  'deployment requested': { label: '部署中', variant: 'warning' },
  'termination requested': { label: '终止中', variant: 'warning' },
  destroyed: { label: '已销毁', variant: 'outline' },
};

export default function ModelDeploymentPage() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [featureEnabled, setFeatureEnabled] = useState(null); // null = checking, true/false = known
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if deployment feature is enabled
  const checkSettings = useCallback(async () => {
    try {
      const res = await API.get('/api/deployments/settings');
      if (res.data?.success) {
        const settings = res.data.data;
        setFeatureEnabled(settings?.enabled && settings?.configured);
      } else {
        setFeatureEnabled(false);
      }
    } catch {
      setFeatureEnabled(false);
    }
  }, []);

  const fetchDeployments = useCallback(async () => {
    if (featureEnabled !== true) return;
    setLoading(true);
    try {
      let url = `/api/deployments/?p=${page}&page_size=${pageSize}`;
      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      const res = await API.get(url);
      if (res.data?.success) {
        const data = res.data.data || {};
        setDeployments(data.items || []);
        setTotal(data.total || 0);
        if (data.status_counts) {
          setStatusCounts(data.status_counts);
        }
      } else {
        showError(res.data?.message || '获取部署列表失败');
        setDeployments([]);
      }
    } catch {
      showError('获取部署列表失败');
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, featureEnabled]);

  useEffect(() => {
    checkSettings();
  }, [checkSettings]);

  useEffect(() => {
    if (featureEnabled === true) {
      fetchDeployments();
    } else if (featureEnabled === false) {
      setLoading(false);
    }
  }, [featureEnabled, fetchDeployments]);

  const handleDelete = async (id) => {
    if (!window.confirm('确定要终止该部署吗？此操作不可撤销。')) return;
    try {
      const res = await API.delete(`/api/deployments/${id}`);
      if (res.data?.success) {
        showSuccess('部署终止请求已提交');
        fetchDeployments();
      } else {
        showError(res.data?.message || '终止失败');
      }
    } catch {
      showError('终止失败');
    }
  };

  const openRename = (item) => {
    setRenameTarget(item);
    setNewName(item.deployment_name || item.container_name || '');
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      showError('名称不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.put(`/api/deployments/${renameTarget.id}/name`, {
        name: newName.trim(),
      });
      if (res.data?.success) {
        showSuccess('重命名成功');
        setRenameDialogOpen(false);
        fetchDeployments();
      } else {
        showError(res.data?.message || '重命名失败');
      }
    } catch {
      showError('重命名失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: '名称',
      accessorKey: 'deployment_name',
      cell: ({ row }) => (
        <span className="font-medium text-text-primary">
          {row.original.deployment_name || row.original.container_name || row.original.id}
        </span>
      ),
    },
    {
      header: '状态',
      accessorKey: 'status',
      size: 120,
      cell: ({ row }) => {
        const s = statusMap[row.original.status] || { label: row.original.status || '未知', variant: 'outline' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      header: '硬件',
      accessorKey: 'hardware_info',
      cell: ({ row }) => (
        <span className="text-sm text-text-secondary">
          {row.original.hardware_info || '-'}
        </span>
      ),
    },
    {
      header: '剩余时间',
      accessorKey: 'time_remaining',
      size: 140,
      cell: ({ row }) => (
        <span className="text-sm text-text-secondary">
          {row.original.time_remaining || '-'}
        </span>
      ),
    },
    {
      header: '进度',
      accessorKey: 'completed_percent',
      size: 100,
      cell: ({ row }) => {
        const pct = row.original.completed_percent;
        if (pct == null) return <span className="text-text-tertiary">-</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-surface-active overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      header: '提供商',
      accessorKey: 'provider',
      size: 100,
      cell: ({ row }) => (
        <span className="text-xs text-text-tertiary">{row.original.provider || '-'}</span>
      ),
    },
    {
      header: '操作',
      id: 'actions',
      size: 140,
      cell: ({ row }) => (
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openRename(row.original)}
            title="重命名"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
            title="终止部署"
            className="text-danger hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  // Feature not enabled state
  if (featureEnabled === false) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-heading text-text-primary mb-6">模型部署</h1>
        <Card className="p-0">
          <EmptyState
            icon={ServerOff}
            title="模型部署功能未启用"
            description="请在系统设置中启用 io.net 模型部署并配置 API Key 后使用此功能。"
            action={
              <Button
                variant="outline"
                onClick={() => window.location.href = '/console/setting'}
              >
                前往系统设置
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Still checking settings
  if (featureEnabled === null) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-heading text-text-primary mb-6">模型部署</h1>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  const statusFilterOptions = [
    { value: '', label: '全部' },
    { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'deployment requested', label: '部署中' },
    { value: 'termination requested', label: '终止中' },
    { value: 'destroyed', label: '已销毁' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading text-text-primary">模型部署</h1>
          <Badge variant="outline" size="sm">
            <Cloud className="h-3 w-3 mr-1" />
            io.net
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDeployments}
            disabled={loading}
            title="刷新"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://cloud.io.net', '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            io.net 控制台
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusFilterOptions.map((opt) => {
          const count = opt.value === '' ? (statusCounts.all || total) : (statusCounts[opt.value] || 0);
          const isActive = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-text-inverse font-medium'
                  : 'bg-surface-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={deployments}
        loading={loading}
        emptyMessage="暂无部署"
        rowKey="id"
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名部署</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">部署名称</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入新名称"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting) handleRename();
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleRename} disabled={submitting}>
                {submitting ? '提交中...' : '确定'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
