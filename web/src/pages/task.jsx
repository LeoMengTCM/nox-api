import { useState, useEffect, useRef } from 'react';
import { Button, Card, Badge, Spinner } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';

const statusConfig = {
  pending: { label: '等待中', variant: 'outline' },
  running: { label: '运行中', variant: 'warning' },
  completed: { label: '已完成', variant: 'success' },
  failed: { label: '失败', variant: 'danger' },
  cancelled: { label: '已取消', variant: 'outline' },
};

export default function TaskPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchTasks();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [page]);

  useEffect(() => {
    const hasRunning = Array.isArray(tasks) && tasks.some(
      (t) => t.status === 'running' || t.status === 'pending'
    );

    if (hasRunning) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          fetchTasks(true);
        }, 5000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tasks]);

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get(`/api/task/?p=${page}&size=${pageSize}`);
      if (res.data?.success) {
        setTasks(res.data.data || []);
        setTotal(res.data.total || 0);
      } else if (!silent) {
        showError(res.data?.message || '获取任务列表失败');
      }
    } catch {
      if (!silent) showError('获取任务列表失败');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('确定要取消该任务吗？')) return;
    try {
      const res = await API.delete(`/api/task/${id}`);
      if (res.data?.success) {
        showSuccess('任务已取消');
        fetchTasks();
      } else {
        showError(res.data?.message || '取消失败');
      }
    } catch {
      showError('取消失败');
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    return d.toLocaleString('zh-CN');
  };

  const columns = [
    { header: 'ID', accessorKey: 'id', size: 80 },
    { header: '类型', accessorKey: 'type' },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }) => {
        const s = statusConfig[row.original.status] || { label: row.original.status, variant: 'outline' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      header: '进度',
      accessorKey: 'progress',
      cell: ({ row }) => {
        const progress = row.original.progress;
        if (progress === undefined || progress === null) return '-';
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">{progress}%</span>
          </div>
        );
      },
    },
    {
      header: '创建时间',
      accessorKey: 'created_at',
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary">{formatTime(row.original.created_at)}</span>
      ),
    },
    {
      header: '更新时间',
      accessorKey: 'updated_at',
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary">{formatTime(row.original.updated_at)}</span>
      ),
    },
    {
      header: '错误',
      accessorKey: 'error',
      cell: ({ row }) => {
        const error = row.original.error;
        if (!error) return '-';
        return (
          <span className="text-xs text-red-600 dark:text-red-400 truncate block max-w-[200px]" title={error}>
            {error}
          </span>
        );
      },
    },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => {
        const canCancel = row.original.status === 'pending' || row.original.status === 'running';
        return canCancel ? (
          <Button variant="danger" size="sm" onClick={() => handleCancel(row.original.id)}>
            取消
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading text-text-primary">异步任务</h1>
          {Array.isArray(tasks) && tasks.some((t) => t.status === 'running' || t.status === 'pending') && (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse" />
              自动刷新中
            </span>
          )}
        </div>
        <Button variant="outline" onClick={() => fetchTasks()}>
          刷新
        </Button>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={Array.isArray(tasks) ? tasks : []} />
            {total > pageSize && (
              <div className="mt-4">
                <Pagination
                  current={page + 1}
                  total={total}
                  pageSize={pageSize}
                  onChange={(p) => setPage(p - 1)}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
