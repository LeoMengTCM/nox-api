import { useState, useEffect } from 'react';
import { Button, Input, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Spinner } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';

const defaultModel = { model_id: '', model_name: '', model_owner: '', enabled: true };

export default function ModelPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({ ...defaultModel });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [page]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/api/models/?p=${page}&size=${pageSize}`);
      if (res.data?.success) {
        const payload = res.data.data;
        setModels(payload?.items || []);
        setTotal(payload?.total || 0);
      } else {
        showError(res.data?.message || '获取模型列表失败');
      }
    } catch {
      showError('获取模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingModel(null);
    setFormData({ ...defaultModel });
    setDialogOpen(true);
  };

  const openEdit = (model) => {
    setEditingModel(model);
    setFormData({
      model_id: model.model_id || '',
      model_name: model.model_name || '',
      model_owner: model.model_owner || '',
      enabled: model.enabled ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.model_id || !formData.model_name) {
      showError('请填写模型ID和名称');
      return;
    }
    setSubmitting(true);
    try {
      if (editingModel) {
        const res = await API.put('/api/models/', { ...formData, id: editingModel.id });
        if (res.data?.success) {
          showSuccess('模型更新成功');
        } else {
          showError(res.data?.message || '更新失败');
          return;
        }
      } else {
        const res = await API.post('/api/models/', formData);
        if (res.data?.success) {
          showSuccess('模型创建成功');
        } else {
          showError(res.data?.message || '创建失败');
          return;
        }
      }
      setDialogOpen(false);
      fetchModels();
    } catch {
      showError('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除该模型吗？')) return;
    try {
      const res = await API.delete(`/api/models/${id}`);
      if (res.data?.success) {
        showSuccess('删除成功');
        fetchModels();
      } else {
        showError(res.data?.message || '删除失败');
      }
    } catch {
      showError('删除失败');
    }
  };

  const columns = [
    { header: 'ID', accessorKey: 'id', size: 80 },
    { header: '模型ID', accessorKey: 'model_id' },
    { header: '名称', accessorKey: 'model_name' },
    { header: '提供商', accessorKey: 'model_owner' },
    {
      header: '状态',
      accessorKey: 'enabled',
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? 'success' : 'danger'}>
          {row.original.enabled ? '启用' : '禁用'}
        </Badge>
      ),
    },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            编辑
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(row.original.id)}>
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading text-text-primary">模型管理</h1>
        <Button onClick={openCreate}>创建模型</Button>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={models} />
            {total > pageSize && (
              <div className="mt-4">
                <Pagination
                  current={page}
                  total={total}
                  pageSize={pageSize}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? '编辑模型' : '创建模型'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">模型ID</label>
              <Input
                value={formData.model_id}
                onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                placeholder="例如: gpt-4o"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">名称</label>
              <Input
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="例如: GPT-4o"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">提供商</label>
              <Input
                value={formData.model_owner}
                onChange={(e) => setFormData({ ...formData, model_owner: e.target.value })}
                placeholder="例如: openai"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded"
                id="model-enabled"
              />
              <label htmlFor="model-enabled" className="text-sm text-text-primary">启用</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
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
