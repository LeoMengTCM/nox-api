import { useState } from 'react';
import { API } from '../lib/api';
import { showError, showSuccess } from '../lib/utils';
import { Button, Input, Card, Separator } from '../components/ui';

const TwoFAVerification = ({ onSuccess, onBack, isModal = false }) => {
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleSubmit = async () => {
    if (!verificationCode) {
      showError('请输入验证码');
      return;
    }
    if (useBackupCode && verificationCode.length !== 8) {
      showError('备用码必须是8位');
      return;
    } else if (!useBackupCode && !/^\d{6}$/.test(verificationCode)) {
      showError('验证码必须是6位数字');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/api/user/login/2fa', {
        code: verificationCode,
      });

      if (res.data.success) {
        showSuccess('登录成功');
        localStorage.setItem('user', JSON.stringify(res.data.data));
        if (onSuccess) {
          onSuccess(res.data.data);
        }
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const content = (
    <div className="space-y-5">
      <p className="text-text-secondary text-sm">
        请输入认证器应用显示的验证码完成登录
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          {useBackupCode ? '备用码' : '验证码'}
        </label>
        <Input
          placeholder={useBackupCode ? '请输入8位备用码' : '请输入6位验证码'}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
        />
      </div>

      <Button
        variant="primary"
        className="w-full"
        onClick={handleSubmit}
        loading={loading}
      >
        验证并登录
      </Button>

      <Separator />

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          className="text-sm text-accent hover:text-accent-hover transition-colors"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setVerificationCode('');
          }}
        >
          {useBackupCode ? '使用认证器验证码' : '使用备用码'}
        </button>

        {onBack && (
          <button
            type="button"
            className="text-sm text-accent hover:text-accent-hover transition-colors"
            onClick={onBack}
          >
            返回登录
          </button>
        )}
      </div>

      <div className="bg-background-subtle rounded-lg p-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong>提示：</strong><br />
          · 验证码每30秒更新一次<br />
          · 如果无法获取验证码，请使用备用码<br />
          · 每个备用码只能使用一次
        </p>
      </div>
    </div>
  );

  if (isModal) return content;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <h2 className="font-heading text-xl font-semibold text-text-primary">
            两步验证
          </h2>
        </div>
        {content}
      </Card>
    </div>
  );
};

export default TwoFAVerification;
