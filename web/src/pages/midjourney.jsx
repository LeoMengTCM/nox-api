import { useState, useEffect } from 'react';
import { Button, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Spinner } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError } from '../lib/utils';

const statusConfig = {
  NOT_START: { label: '未开始', variant: 'outline' },
  SUBMITTED: { label: '已提交', variant: 'info' },
  IN_PROGRESS: { label: '进行中', variant: 'warning' },
  SUCCESS: { label: '成功', variant: 'success' },
  FAILURE: { label: '失败', variant: 'danger' },
};

export default function MidjourneyPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [page]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/mj/?p=${page}&page_size=${pageSize}`);
      if (res.data?.success) {
        const pageData = res.data.data || {};
        setTasks(pageData.items || []);
        setTotal(pageData.total || 0);
      } else {
        showError(res.data?.message || '获取任务列表失败');
      }
    } catch {
      showError('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    return d.toLocaleString('zh-CN');
  };

  const columns = [
    { header: 'ID', accessorKey: 'id', size: 100 },
    { header: '用户', accessorKey: 'user_id', size: 80 },
    { header: '操作', accessorKey: 'action' },
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
      header: '提交时间',
      accessorKey: 'created_at',
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary">{formatTime(row.original.created_at)}</span>
      ),
    },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => openDetail(row.original)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading text-text-primary">Midjourney</h1>
        <Button variant="outline" onClick={fetchTasks}>
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
            <DataTable columns={columns} data={tasks} />
            {total > pageSize && (
              <div className="mt-4">
                <Pagination
                  current={page}
                  total={total}
                  pageSize={pageSize}
                  onChange={(p) => setPage(p)}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>任务详情</DialogTitle>
          </DialogHeader>
          {selectedTask ? (
            <div className="mt-4 space-y-4">
              {selectedTask.image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={selectedTask.image_url}
                    alt="Midjourney 生成图片"
                    className="w-full h-auto max-h-[400px] object-contain bg-background"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-text-secondary">任务ID:</span>
                  <span className="ml-2 text-text-primary">{selectedTask.id}</span>
                </div>
                <div>
                  <span className="text-text-secondary">用户ID:</span>
                  <span className="ml-2 text-text-primary">{selectedTask.user_id}</span>
                </div>
                <div>
                  <span className="text-text-secondary">操作:</span>
                  <span className="ml-2 text-text-primary">{selectedTask.action}</span>
                </div>
                <div>
                  <span className="text-text-secondary">状态:</span>
                  <span className="ml-2">
                    <Badge variant={statusConfig[selectedTask.status]?.variant || 'outline'}>
                      {statusConfig[selectedTask.status]?.label || selectedTask.status}
                    </Badge>
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">进度:</span>
                  <span className="ml-2 text-text-primary">{selectedTask.progress ?? '-'}%</span>
                </div>
                <div>
                  <span className="text-text-secondary">创建时间:</span>
                  <span className="ml-2 text-text-primary">{formatTime(selectedTask.created_at)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">开始时间:</span>
                  <span className="ml-2 text-text-primary">{formatTime(selectedTask.started_at)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">完成时间:</span>
                  <span className="ml-2 text-text-primary">{formatTime(selectedTask.finished_at)}</span>
                </div>
              </div>

              {selectedTask.prompt && (
                <div>
                  <span className="text-sm text-text-secondary">提示词:</span>
                  <p className="mt-1 text-sm text-text-primary bg-background p-3 rounded border border-border break-words">
                    {selectedTask.prompt}
                  </p>
                </div>
              )}

              {selectedTask.fail_reason && (
                <div>
                  <span className="text-sm text-text-secondary">失败原因:</span>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800/30">
                    {selectedTask.fail_reason}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
