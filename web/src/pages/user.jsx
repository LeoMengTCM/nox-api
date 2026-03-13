import { useState, useEffect } from 'react';
import { Button, Input, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Switch, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';

import { API } from '../lib/api';
import { showError, showSuccess, showInfo, timestamp2string, renderQuota, copy } from '../lib/utils';

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

const ROLES = {
  1: '普通用户',
  10: '管理员',
  100: '超级管理员',
};

const ROLE_BADGE_VARIANT = {
  1: 'outline',
  10: 'info',
  100: 'danger',
};

const STATUS_MAP = {
  1: { label: '已启用', variant: 'success' },
  2: { label: '已禁用', variant: 'danger' },
};

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    email: '',
    password: '',
    role: 1,
    status: 1,
    quota: 0,
    group: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      let url = `/api/user/?p=${page}&size=${pageSize}`;
      if (searchKeyword) {
        url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      }
      const res = await API.get(url);
      const { success, message, data } = res.data;
      if (success) {
        setUsers(data?.items || data?.data || []);
        setTotal(data?.total || 0);
      } else {
        showError(message);
      }
    } catch (e) {
      showError('加载用户列表失败');
    }
    setLoading(false);
  };

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
    loadUsers();
  }, [page]);

  useEffect(() => {
    loadGroups();
  }, []);

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      display_name: '',
      email: '',
      password: '',
      role: 1,
      status: 1,
      quota: 0,
      group: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      display_name: user.display_name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      status: user.status,
      quota: user.quota,
      group: user.group || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const payload = { ...formData, id: editingUser.id };
        if (!payload.password) delete payload.password;
        const res = await API.put('/api/user/', payload);
        const { success, message } = res.data;
        if (success) {
          showSuccess('用户更新成功');
          setDialogOpen(false);
          loadUsers();
        } else {
          showError(message);
        }
      } else {
        if (!formData.username || !formData.password) {
          showError('用户名和密码不能为空');
          return;
        }
        const res = await API.post('/api/user/manage', formData);
        const { success, message } = res.data;
        if (success) {
          showSuccess('用户创建成功');
          setDialogOpen(false);
          loadUsers();
        } else {
          showError(message);
        }
      }
    } catch (e) {
      showError('操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除该用户吗?')) return;
    try {
      const res = await API.delete(`/api/user/manage/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('用户已删除');
        loadUsers();
      } else {
        showError(message);
      }
    } catch (e) {
      showError('删除失败');
    }
  };


  const columns = [
    { header: 'ID', accessorKey: 'id', size: 60 },
    {
      header: '用户名',
      accessorKey: 'username',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.avatar_url ? (
            <img src={row.original.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-medium shrink-0">
              {(row.original.username || '?')[0].toUpperCase()}
            </div>
          )}
          <span>{row.original.username}</span>
        </div>
      ),
    },
    { header: '显示名', accessorKey: 'display_name', cell: ({ row }) => row.original.display_name || '-' },
    { header: '邮箱', accessorKey: 'email', cell: ({ row }) => row.original.email || '-' },
    {
      header: '角色',
      accessorKey: 'role',
      cell: ({ row }) => (
        <Badge variant={ROLE_BADGE_VARIANT[row.original.role] || 'outline'}>
          {ROLES[row.original.role] || '未知'}
        </Badge>
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
      cell: ({ row }) => {
        const q = row.original.quota;
        return q !== undefined ? renderQuota(q) : '-';
      },
    },
    { header: '请求次数', accessorKey: 'request_count' },
    {
      header: '操作',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEditDialog(row.original)}>编辑</Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>删除</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-heading text-text-primary">用户管理</h1>
      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="搜索用户名"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-xs"
          />
          <Button onClick={handleSearch}>搜索</Button>
          <div className="flex-1" />
          <Button onClick={openCreateDialog}>创建用户</Button>
        </div>
        <DataTable columns={columns} data={users} loading={loading} />
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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingUser ? '编辑用户' : '创建用户'}</DialogTitle>
            <DialogDescription>
              {editingUser ? '修改用户信息和权限配置。' : '创建新用户并设置初始权限和额度。'}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <div className="space-y-4 py-4">
              {/* === Section 1: 基本信息 === */}
              <FormSection
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                }
                title="基本信息"
                description="设置用户账号和登录信息"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="用户名">
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!!editingUser}
                      placeholder="请输入用户名"
                    />
                  </FormField>
                  <FormField label="显示名">
                    <Input
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="请输入显示名"
                    />
                  </FormField>
                </div>
                <FormField label="邮箱">
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="请输入邮箱地址"
                  />
                </FormField>
                <FormField label={editingUser ? '密码（留空则不修改）' : '密码'}>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '留空则不修改密码' : '请输入密码'}
                  />
                </FormField>
              </FormSection>

              {/* === Section 2: 权限与分组 === */}
              <FormSection
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                }
                title="权限与分组"
                description="配置用户角色和访问权限"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="角色">
                    <Select value={String(formData.role)} onValueChange={(v) => setFormData({ ...formData, role: Number(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">普通用户</SelectItem>
                        <SelectItem value="10">管理员</SelectItem>
                        <SelectItem value="100">超级管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="状态">
                    <Select value={String(formData.status)} onValueChange={(v) => setFormData({ ...formData, status: Number(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">启用</SelectItem>
                        <SelectItem value="2">禁用</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
                <FormField label="分组">
                  <Select
                    value={formData.group || '__default__'}
                    onValueChange={(v) => setFormData({ ...formData, group: v === '__default__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="默认分组" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">默认分组</SelectItem>
                      {availableGroups.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormSection>

              {/* === Section 3: 额度设置 === */}
              <FormSection
                icon={
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                  </svg>
                }
                title="额度设置"
                description="设置用户初始额度"
              >
                <FormField label="额度" description={`当前额度等价于 ${renderQuota(formData.quota)}`}>
                  <Input
                    type="number"
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                    placeholder="请输入额度"
                  />
                </FormField>
              </FormSection>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingUser ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
