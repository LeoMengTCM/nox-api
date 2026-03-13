import { useState, useEffect } from 'react';
import { Button, Input, Card, Badge } from '../components/ui';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, timestamp2string, copy } from '../lib/utils';
import { User, Shield, Key, Fingerprint, Copy, Mail, Clock, Trash2 } from 'lucide-react';

// --- Section Card wrapper ---
function SettingSection({ icon: Icon, title, description, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-heading text-text-primary">{title}</h2>
            {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </Card>
  );
}

// --- Form field ---
function Field({ label, children, description }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
      {children}
      {description && <p className="text-xs text-text-tertiary">{description}</p>}
    </div>
  );
}

export default function PersonalSettingPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passkeys, setPasskeys] = useState([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);

  const loadUserInfo = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/self', { skipErrorHandler: true });
      const { success, message, data } = res.data;
      if (success) {
        setUserInfo(data);
        setDisplayName(data.display_name || '');
        setEmail(data.email || '');
      } else {
        showError(message);
      }
    } catch (e) {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (stored.username) {
          setUserInfo(stored);
          setDisplayName(stored.display_name || '');
          setEmail(stored.email || '');
        }
      } catch {}
    }
    setLoading(false);
  };

  const loadPasskeys = async () => {
    setPasskeysLoading(true);
    try {
      const res = await API.get('/api/user/passkey', { skipErrorHandler: true });
      const { success, message, data } = res.data;
      if (success) {
        setPasskeys(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      // Passkey endpoint may not exist — silently ignore
    }
    setPasskeysLoading(false);
  };

  useEffect(() => {
    loadUserInfo();
    loadPasskeys();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      const res = await API.put('/api/user/self', {
        display_name: displayName,
        email: email,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess('个人信息更新成功');
        loadUserInfo();
      } else {
        showError(message);
      }
    } catch (e) {
      showError('更新失败');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }
    if (!oldPassword || !newPassword) {
      showError('请填写完整密码信息');
      return;
    }
    try {
      const res = await API.put('/api/user/self', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess('密码修改成功');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(message);
      }
    } catch (e) {
      showError('密码修改失败');
    }
  };

  const handleCopyToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      copy(token);
      showSuccess('访问令牌已复制到剪贴板');
    } else {
      showInfo('未找到访问令牌');
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      const beginRes = await API.post('/api/user/passkey/register/begin');
      if (!beginRes.data?.success) {
        showError(beginRes.data?.message || '注册失败');
        return;
      }
      const options = beginRes.data.data;
      if (typeof window.PublicKeyCredential === 'undefined') {
        showError('当前浏览器不支持通行密钥');
        return;
      }
      options.publicKey.challenge = Uint8Array.from(atob(options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      options.publicKey.user.id = Uint8Array.from(atob(options.publicKey.user.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      if (options.publicKey.excludeCredentials) {
        options.publicKey.excludeCredentials = options.publicKey.excludeCredentials.map((c) => ({
          ...c,
          id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)),
        }));
      }
      const credential = await navigator.credentials.create(options);
      const attestationResponse = credential.response;
      const finishRes = await API.post('/api/user/passkey/register/finish', {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        type: credential.type,
        response: {
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.attestationObject))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.clientDataJSON))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        },
      });
      if (finishRes.data?.success) {
        showSuccess('通行密钥注册成功');
        loadPasskeys();
      } else {
        showError(finishRes.data?.message || '注册失败');
      }
    } catch (e) {
      showError('通行密钥注册失败: ' + (e.message || '未知错误'));
    }
  };

  const handleDeletePasskey = async (id) => {
    try {
      const res = await API.delete(`/api/user/passkey/${id}`);
      if (res.data?.success) {
        showSuccess('通行密钥已删除');
        loadPasskeys();
      } else {
        showError(res.data?.message || '删除失败');
      }
    } catch (e) {
      showError('删除失败');
    }
  };

  const ROLE_MAP = { 1: '普通用户', 10: '管理员', 100: '超级管理员' };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading text-text-primary">个人设置</h1>
        <p className="text-sm text-text-tertiary mt-1">管理您的账户信息和安全设置</p>
      </div>

      {/* === Profile Section === */}
      <SettingSection
        icon={User}
        title="个人信息"
        description="更新您的显示名称和邮箱"
        action={
          <Button size="sm" onClick={handleUpdateProfile}>保存更改</Button>
        }
      >
        {loading ? (
          <div className="text-text-secondary text-sm">加载中...</div>
        ) : (
          <div className="space-y-4">
            {/* Username (read-only) + role badge */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover/50 border border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-heading text-lg">
                {(userInfo?.username || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{userInfo?.username || '-'}</span>
                  {userInfo?.role !== undefined && (
                    <Badge variant={userInfo.role >= 100 ? 'danger' : userInfo.role >= 10 ? 'info' : 'outline'} className="text-xs">
                      {ROLE_MAP[userInfo.role] || '用户'}
                    </Badge>
                  )}
                </div>
                {userInfo?.created_at && (
                  <div className="flex items-center gap-1 text-xs text-text-tertiary mt-0.5">
                    <Clock className="h-3 w-3" />
                    注册于 {timestamp2string(userInfo.created_at)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="显示名称">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="请输入显示名称"
                />
              </Field>
              <Field label="邮箱地址">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                />
              </Field>
            </div>

            {/* GitHub / OIDC binding status */}
            {(userInfo?.github_id || userInfo?.oidc_id) && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                {userInfo?.github_id !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">GitHub</span>
                    <Badge variant={userInfo.github_id ? 'success' : 'outline'}>
                      {userInfo.github_id ? '已绑定' : '未绑定'}
                    </Badge>
                  </div>
                )}
                {userInfo?.oidc_id !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">OIDC</span>
                    <Badge variant={userInfo.oidc_id ? 'success' : 'outline'}>
                      {userInfo.oidc_id ? '已绑定' : '未绑定'}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SettingSection>

      {/* === Security Section === */}
      <SettingSection
        icon={Shield}
        title="安全设置"
        description="修改密码以保护您的账户"
        action={
          <Button size="sm" onClick={handleChangePassword}>修改密码</Button>
        }
      >
        <div className="space-y-4">
          <Field label="当前密码">
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="新密码">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
              />
            </Field>
            <Field label="确认新密码">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
              />
            </Field>
          </div>
        </div>
      </SettingSection>

      {/* === Access Token Section === */}
      <SettingSection
        icon={Key}
        title="访问令牌"
        description="用于 API 调用的会话令牌"
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-surface-hover/50 border border-border font-mono text-sm text-text-secondary truncate">
              {localStorage.getItem('token') ? `${localStorage.getItem('token').slice(0, 20)}...` : '未登录'}
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyToken} className="shrink-0">
              <Copy className="h-4 w-4 mr-1.5" />
              复制
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            此令牌为会话令牌，用于管理面板 API 调用。如需调用 AI 模型，请在令牌管理页面创建 API 密钥。
          </p>
        </div>
      </SettingSection>

      {/* === Passkey Section === */}
      <SettingSection
        icon={Fingerprint}
        title="通行密钥"
        description="使用生物识别或安全密钥登录"
        action={
          <Button size="sm" onClick={handleRegisterPasskey}>注册新密钥</Button>
        }
      >
        {passkeysLoading ? (
          <div className="text-text-secondary text-sm">加载中...</div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-6">
            <Fingerprint className="h-10 w-10 text-text-tertiary/50 mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">暂无通行密钥</p>
            <p className="text-xs text-text-tertiary mt-1">注册通行密钥后可使用生物识别快速登录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{pk.name || `通行密钥 #${pk.id}`}</div>
                    <div className="text-xs text-text-tertiary flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timestamp2string(pk.created_at)}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleDeletePasskey(pk.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingSection>
    </div>
  );
}
