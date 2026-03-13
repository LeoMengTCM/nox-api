import { useState, useEffect } from 'react';
import { Button, Input, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Switch, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, timestamp2string, getQuotaPerUnit, copy } from '../lib/utils';

const STATUS_MAP = {
  1: { label: '未使用', variant: 'success' },
  2: { label: '已禁用', variant: 'danger' },
  3: { label: '已使用', variant: 'warning' },
};

export default function RedemptionPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quota: 100000,
    count: 1,
  });
  const [creating, setCreating] = useState(false);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/redemption/?p=${page}&size=${pageSize}`);
      const { success, message, data } = res.data;
      if (success) {
        setCodes(data.data || []);
        setTotal(data.total || 0);
      } else {
        showError(message);
      }
    } catch (e) {
      showError('加载兑换码列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCodes();
  }, [page]);

  const openCreateDialog = () => {
    setFormData({ name: '', quota: 100000, count: 1 });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showError('请输入兑换码名称');
      return;
    }
    if (formData.quota <= 0) {
      showError('额度必须大于0');
      return;
    }
    if (formData.count <= 0 || formData.count > 100) {
      showError('生成数量必须在1-100之间');
      return;
    }
    setCreating(true);
    try {
      const res = await API.post('/api/redemption/', {
        name: formData.name.trim(),
        quota: formData.quota,
        count: formData.count,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(`成功创建 ${formData.count} 个兑换码`);
        setDialogOpen(false);
        loadCodes();
      } else {
        showError(message);
      }
    } catch (e) {
      showError('创建失败');
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除该兑换码吗?')) return;
    try {
      const res = await API.delete(`/api/redemption/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('兑换码已删除');
        loadCodes();
      } else {
        showError(message);
      }
    } catch (e) {
      showError('删除失败');
    }
  };

  const handleCopyKey = (key) => {
    copy(key);
    showSuccess('兑换码已复制到剪贴板');
  };

  const columns = [
    { header: 'ID', accessorKey: 'id', size: 60 },
    { header: '名称', accessorKey: 'name' },
    {
      header: '兑换码',
      accessorKey: 'key',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="text-sm bg-surface px-2 py-0.5 rounded border border-border truncate max-w-[200px]">
            {row.original.key}
          </code>
          <Button size="sm" variant="outline" onClick={() => handleCopyKey(row.original.key)}>
            复制
          </Button>
        </div>
      ),
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }) => {
        const s = STATUS_MAP[row.original.status];
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="outline">未知</Badge>;
      },
    },
    {
      header: '额度',
      accessorKey: 'quota',
      cell: ({ row }) => getQuotaPerUnit(row.original.quota),
    },
    {
      header: '创建时间',
      accessorKey: 'created_time',
      cell: ({ row }) => timestamp2string(row.original.created_time),
    },
    {
      header: '兑换时间',
      accessorKey: 'redeemed_time',
      cell: ({ row }) =>
        row.original.redeemed_time ? timestamp2string(row.original.redeemed_time) : '-',
    },
    {
      header: '使用者ID',
      accessorKey: 'used_user_id',
      cell: ({ row }) => row.original.used_user_id || '-',
    },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => (
        <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-heading text-text-primary">兑换码管理</h1>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div />
          <Button onClick={openCreateDialog}>创建兑换码</Button>
        </div>
        <DataTable columns={columns} data={codes} loading={loading} />
        <div className="mt-4 flex justify-end">
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
          />
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建兑换码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">名称</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入兑换码名称"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">额度</label>
              <Input
                type="number"
                value={formData.quota}
                onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                placeholder="输入额度"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">生成数量</label>
              <Input
                type="number"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
                placeholder="批量生成数量 (1-100)"
                min={1}
                max={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
