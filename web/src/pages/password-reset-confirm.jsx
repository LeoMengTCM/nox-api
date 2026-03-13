import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API } from '../lib/api';
import { showError, showNotice, copy, getLogo, getSystemName } from '../lib/utils';
import { Button, Input, Card } from '../components/ui';

const PasswordResetConfirm = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const logo = getLogo();
  const systemName = getSystemName();
  const isValidResetLink = email && token;

  useEffect(() => {
    setToken(searchParams.get('token') || '');
    setEmail(searchParams.get('email') || '');
  }, [searchParams]);

  useEffect(() => {
    let interval = null;
    if (disableButton && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setDisableButton(false);
      setCountdown(30);
    }
    return () => clearInterval(interval);
  }, [disableButton, countdown]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!email || !token) {
      showError('无效的重置链接，请重新发起密码重置请求');
      return;
    }
    setDisableButton(true);
    setLoading(true);
    try {
      const res = await API.post('/api/user/reset', { email, token });
      const { success, message } = res.data;
      if (success) {
        const password = res.data.data;
        setNewPassword(password);
        await copy(password);
        showNotice(`密码已重置并已复制到剪贴板： ${password}`);
      } else {
        showError(message);
      }
    } catch {
      showError('重置失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo + Name */}
        <div className="flex items-center justify-center mb-8 gap-2.5">
          <img src={logo} alt="Logo" className="h-9 rounded-full" />
          <span className="font-heading text-xl font-semibold text-text-primary">
            {systemName}
          </span>
        </div>

        <Card className="p-8">
          <h2 className="font-heading text-xl font-semibold text-center text-text-primary mb-6">
            密码重置确认
          </h2>

          {!isValidResetLink && (
            <div className="mb-4 p-3 rounded-lg bg-danger-subtle text-danger text-sm">
              无效的重置链接，请重新发起密码重置请求
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">邮箱</label>
              <Input
                value={email}
                disabled
                placeholder={email ? '' : '等待获取邮箱信息...'}
              />
            </div>

            {newPassword && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">新密码</label>
                <div className="flex gap-2">
                  <Input value={newPassword} disabled className="flex-1" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await copy(newPassword);
                      showNotice(`密码已复制到剪贴板： ${newPassword}`);
                    }}
                  >
                    复制
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              className="w-full"
              type="submit"
              loading={loading}
              disabled={disableButton || !!newPassword || !isValidResetLink}
            >
              {newPassword ? '密码重置完成' : '确认重置密码'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-accent hover:text-accent-hover font-medium">
              返回登录
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;
