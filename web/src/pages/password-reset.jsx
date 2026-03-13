import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../lib/api';
import { showError, showInfo, showSuccess, getLogo, getSystemName } from '../lib/utils';
import Turnstile from 'react-turnstile';
import { Button, Input, Card } from '../components/ui';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const logo = getLogo();
  const systemName = getSystemName();

  useEffect(() => {
    let status = localStorage.getItem('status');
    if (status) {
      status = JSON.parse(status);
      if (status.turnstile_check) {
        setTurnstileEnabled(true);
        setTurnstileSiteKey(status.turnstile_site_key);
      }
    }
  }, []);

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
    if (!email) {
      showError('请输入邮箱地址');
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setDisableButton(true);
    setLoading(true);
    try {
      const res = await API.get(
        `/api/reset_password?email=${email}&turnstile=${turnstileToken}`,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess('重置邮件发送成功，请检查邮箱！');
        setEmail('');
      } else {
        showError(message);
      }
    } catch {
      showError('发送失败，请重试');
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
            密码重置
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">邮箱</label>
              <Input
                type="email"
                placeholder="请输入您的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              type="submit"
              loading={loading}
              disabled={disableButton}
            >
              {disableButton ? `重试 (${countdown})` : '提交'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            想起来了？{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover font-medium">
              登录
            </Link>
          </div>
        </Card>

        {turnstileEnabled && (
          <div className="flex justify-center mt-6">
            <Turnstile
              sitekey={turnstileSiteKey}
              onVerify={(token) => setTurnstileToken(token)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordReset;
