import { useState } from 'react';
import { Button, Input, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Switch, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, timestamp2string, getQuotaPerUnit, copy } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function SetupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim()) {
      showError('请输入用户名');
      return;
    }
    if (username.trim().length < 3 || username.trim().length > 12) {
      showError('用户名长度需在3-12位之间');
      return;
    }
    if (!password) {
      showError('请输入密码');
      return;
    }
    if (password.length < 8) {
      showError('密码长度不能少于8位');
      return;
    }
    if (password !== confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post('/api/setup', {
        username: username.trim(),
        password: password,
        confirmPassword: confirmPassword,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess('系统初始化成功,请登录');
        // Hard reload so /api/status returns setup: true
        window.location.href = '/login';
      } else {
        showError(message);
      }
    } catch (e) {
      showError('初始化失败');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading text-text-primary mb-2">系统初始化</h1>
          <p className="text-text-secondary">创建超级管理员账户以完成系统初始化</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">用户名</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入管理员用户名(至少3位)"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码(至少8位)"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">确认密码</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <Button
            className="w-full mt-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '初始化中...' : '完成初始化'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
