import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/user-context';
import { StatusContext } from '../contexts/status-context';
import { API, updateAPI } from '../lib/api';
import {
  showError,
  showInfo,
  showSuccess,
  getLogo,
  getSystemName,
  setUserData,
  setStatusData,
} from '../lib/utils';
import {
  onGitHubOAuthClicked,
  onDiscordOAuthClicked,
  onOIDCClicked,
  onLinuxDOOAuthClicked,
  onCustomOAuthClicked,
  getOAuthProviderIcon,
} from '../helpers';
import Turnstile from 'react-turnstile';
import TelegramLoginButton from 'react-telegram-login';
import { Button, Input, Card, Checkbox } from '../components/ui';
import { Camera } from 'lucide-react';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    verification_code: '',
    wechat_verification_code: '',
  });
  const { username, password, password2 } = inputs;

  const [, userDispatch] = useContext(UserContext);
  const [statusState, statusDispatch] = useContext(StatusContext);

  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showEmailRegister, setShowEmailRegister] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [verificationCodeLoading, setVerificationCodeLoading] = useState(false);
  const [showWeChatModal, setShowWeChatModal] = useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [linuxdoLoading, setLinuxdoLoading] = useState(false);
  const [customOAuthLoading, setCustomOAuthLoading] = useState({});
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasUserAgreement, setHasUserAgreement] = useState(false);
  const [hasPrivacyPolicy, setHasPrivacyPolicy] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const githubTimeoutRef = useRef(null);

  const logo = getLogo();
  const systemName = getSystemName();

  let affCode = new URLSearchParams(window.location.search).get('aff');
  if (affCode) localStorage.setItem('aff', affCode);

  const status = useMemo(() => {
    if (statusState?.status) return statusState.status;
    const saved = localStorage.getItem('status');
    if (!saved) return {};
    try { return JSON.parse(saved) || {}; } catch { return {}; }
  }, [statusState?.status]);

  const hasCustomOAuth = (status.custom_oauth_providers || []).length > 0;
  const hasOAuthOptions = Boolean(
    status.github_oauth || status.discord_oauth || status.oidc_enabled ||
    status.wechat_login || status.linuxdo_oauth || status.telegram_oauth || hasCustomOAuth,
  );

  // Load fresh status from API on mount (register page is outside layouts)
  useEffect(() => {
    if (!statusState?.status) {
      API.get('/api/status').then((res) => {
        const { success, data } = res.data;
        if (success) {
          statusDispatch({ type: 'set', payload: data });
          setStatusData(data);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setShowEmailVerification(!!status?.email_verification);
    if (status?.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }
    setHasUserAgreement(status?.user_agreement_enabled || false);
    setHasPrivacyPolicy(status?.privacy_policy_enabled || false);
  }, [status]);

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

  useEffect(() => {
    return () => { if (githubTimeoutRef.current) clearTimeout(githubTimeoutRef.current); };
  }, []);

  function handleChange(name, value) {
    setInputs((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (password.length < 8) { showInfo('密码长度不得小于 8 位！'); return; }
    if (password !== password2) { showInfo('两次输入的密码不一致'); return; }
    if (!username || !password) return;
    if (turnstileEnabled && !turnstileToken) {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setRegisterLoading(true);
    try {
      if (!affCode) affCode = localStorage.getItem('aff');
      const payload = { ...inputs, aff_code: affCode };
      const res = await API.post(`/api/user/register?turnstile=${turnstileToken}`, payload);
      const { success, message } = res.data;
      if (success) {
        // Auto-login after registration
        try {
          const loginRes = await API.post('/api/user/login', { username, password });
          const { success: loginSuccess, data: loginData } = loginRes.data;
          if (loginSuccess && loginData && !loginData.require_2fa) {
            userDispatch({ type: 'login', payload: loginData });
            setUserData(loginData);
            updateAPI();

            // Upload avatar if selected
            if (avatarFile) {
              try {
                const form = new FormData();
                form.append('avatar', avatarFile);
                await API.post('/api/user/avatar', form);
              } catch {
                // Avatar upload failure is non-critical
              }
            }

            showSuccess('注册成功！');
            navigate('/console');
            return;
          }
        } catch {
          // Auto-login failed, fall through to redirect to login page
        }
        navigate('/login');
        showSuccess('注册成功！');
      } else { showError(message); }
    } catch { showError('注册失败，请重试'); }
    finally { setRegisterLoading(false); }
  }

  const sendVerificationCode = async () => {
    if (!inputs.email) return;
    if (turnstileEnabled && !turnstileToken) {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setVerificationCodeLoading(true);
    try {
      const res = await API.get(`/api/verification?email=${encodeURIComponent(inputs.email)}&turnstile=${turnstileToken}`);
      const { success, message } = res.data;
      if (success) { showSuccess('验证码发送成功，请检查你的邮箱！'); setDisableButton(true); }
      else showError(message);
    } catch { showError('发送验证码失败，请重试'); }
    finally { setVerificationCodeLoading(false); }
  };

  // OAuth handlers (same pattern as login)
  const handleGitHubClick = () => {
    setGithubLoading(true);
    githubTimeoutRef.current = setTimeout(() => setGithubLoading(false), 20000);
    try { onGitHubOAuthClicked(status.github_client_id, { shouldLogout: true }); }
    finally { setTimeout(() => setGithubLoading(false), 3000); }
  };
  const handleDiscordClick = () => {
    setDiscordLoading(true);
    try { onDiscordOAuthClicked(status.discord_client_id, { shouldLogout: true }); }
    finally { setTimeout(() => setDiscordLoading(false), 3000); }
  };
  const handleOIDCClick = () => {
    setOidcLoading(true);
    try { onOIDCClicked(status.oidc_authorization_endpoint, status.oidc_client_id, false, { shouldLogout: true }); }
    finally { setTimeout(() => setOidcLoading(false), 3000); }
  };
  const handleLinuxDOClick = () => {
    setLinuxdoLoading(true);
    try { onLinuxDOOAuthClicked(status.linuxdo_client_id, { shouldLogout: true }); }
    finally { setTimeout(() => setLinuxdoLoading(false), 3000); }
  };
  const handleCustomOAuthClick = (provider) => {
    setCustomOAuthLoading((p) => ({ ...p, [provider.slug]: true }));
    try { onCustomOAuthClicked(provider, { shouldLogout: true }); }
    finally { setTimeout(() => setCustomOAuthLoading((p) => ({ ...p, [provider.slug]: false })), 3000); }
  };

  const onTelegramLoginClicked = async (response) => {
    const fields = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash', 'lang'];
    const params = {};
    fields.forEach((f) => { if (response[f]) params[f] = response[f]; });
    try {
      const res = await API.get('/api/oauth/telegram/login', { params });
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        setUserData(data);
        updateAPI();
        showSuccess('登录成功！');
        navigate('/');
      } else { showError(message); }
    } catch { showError('登录失败，请重试'); }
  };

  const onSubmitWeChatCode = async () => {
    if (turnstileEnabled && !turnstileToken) { showInfo('请稍后几秒重试'); return; }
    setWechatCodeSubmitLoading(true);
    try {
      const res = await API.get(`/api/oauth/wechat?code=${inputs.wechat_verification_code}`);
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        setUserData(data);
        updateAPI();
        showSuccess('登录成功！');
        navigate('/');
        setShowWeChatModal(false);
      } else { showError(message); }
    } catch { showError('登录失败，请重试'); }
    finally { setWechatCodeSubmitLoading(false); }
  };

  // OAuth button component
  const OAuthBtn = ({ children, onClick, loading: btnLoading }) => (
    <button
      type="button"
      className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-border hover:bg-surface-hover transition-colors text-sm text-text-primary disabled:opacity-50"
      onClick={onClick}
      disabled={btnLoading}
    >
      {btnLoading ? <span className="h-4 w-4 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );

  const renderTerms = () => {
    if (!hasUserAgreement && !hasPrivacyPolicy) return null;
    return (
      <div className="flex items-start gap-2 mt-4">
        <Checkbox checked={agreedToTerms} onCheckedChange={setAgreedToTerms} className="mt-0.5" />
        <span className="text-xs text-text-secondary leading-relaxed">
          我已阅读并同意
          {hasUserAgreement && <a href="/user-agreement" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover mx-0.5">用户协议</a>}
          {hasUserAgreement && hasPrivacyPolicy && '和'}
          {hasPrivacyPolicy && <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover mx-0.5">隐私政策</a>}
        </span>
      </div>
    );
  };

  const renderOAuthOptions = () => (
    <div className="space-y-3">
      {status.wechat_login && <OAuthBtn onClick={() => setShowWeChatModal(true)}>使用微信继续</OAuthBtn>}
      {status.github_oauth && <OAuthBtn onClick={handleGitHubClick} loading={githubLoading}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>使用 GitHub 继续</OAuthBtn>}
      {status.discord_oauth && <OAuthBtn onClick={handleDiscordClick} loading={discordLoading}>使用 Discord 继续</OAuthBtn>}
      {status.oidc_enabled && <OAuthBtn onClick={handleOIDCClick} loading={oidcLoading}>使用 OIDC 继续</OAuthBtn>}
      {status.linuxdo_oauth && <OAuthBtn onClick={handleLinuxDOClick} loading={linuxdoLoading}>使用 LinuxDO 继续</OAuthBtn>}
      {status.custom_oauth_providers?.map((p) => (
        <OAuthBtn key={p.slug} onClick={() => handleCustomOAuthClick(p)} loading={customOAuthLoading[p.slug]}>
          {getOAuthProviderIcon(p.icon || '', 20)} 使用 {p.name} 继续
        </OAuthBtn>
      ))}
      {status.telegram_oauth && (
        <div className="flex justify-center py-1">
          <TelegramLoginButton dataOnauth={onTelegramLoginClicked} botName={status.telegram_bot_name} />
        </div>
      )}

      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-tertiary">或</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button variant="primary" className="w-full rounded-full h-11" onClick={() => setShowEmailRegister(true)}>
        使用用户名注册
      </Button>
    </div>
  );

  const renderEmailForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar picker */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <button
          type="button"
          className="relative group"
          onClick={() => document.getElementById('register-avatar-upload')?.click()}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent border-2 border-dashed border-accent/30">
              <Camera className="h-6 w-6" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <input
            id="register-avatar-upload"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                showError('头像文件不能超过 5MB');
                return;
              }
              setAvatarFile(file);
              setAvatarPreview(URL.createObjectURL(file));
              e.target.value = '';
            }}
          />
        </button>
        <span className="text-xs text-text-tertiary">点击上传头像</span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">用户名</label>
        <Input placeholder="请输入用户名" value={username} onChange={(e) => handleChange('username', e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">密码</label>
        <Input type="password" placeholder="输入密码，最短 8 位" value={password} onChange={(e) => handleChange('password', e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">确认密码</label>
        <Input type="password" placeholder="确认密码" value={password2} onChange={(e) => handleChange('password2', e.target.value)} />
      </div>

      {showEmailVerification && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">邮箱</label>
            <div className="flex gap-2">
              <Input type="email" placeholder="输入邮箱地址" value={inputs.email} onChange={(e) => handleChange('email', e.target.value)} className="flex-1" />
              <Button variant="secondary" size="sm" onClick={sendVerificationCode} loading={verificationCodeLoading} disabled={disableButton}>
                {disableButton ? `重新发送 (${countdown})` : '获取验证码'}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">验证码</label>
            <Input placeholder="输入验证码" value={inputs.verification_code} onChange={(e) => handleChange('verification_code', e.target.value)} />
          </div>
        </>
      )}

      <Button
        variant="primary" className="w-full" type="submit"
        loading={registerLoading}
        disabled={(hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms}
      >
        注册
      </Button>

      {hasOAuthOptions && (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-tertiary">或</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setShowEmailRegister(false)}>
            其他注册选项
          </Button>
        </>
      )}
    </form>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8 gap-2.5">
          <img src={logo} alt="Logo" className="h-9 rounded-full" />
          <span className="font-heading text-xl font-semibold text-text-primary">{systemName}</span>
        </div>

        <Card className="p-8">
          <h2 className="font-heading text-xl font-semibold text-center text-text-primary mb-6">注册</h2>
          {showEmailRegister || !hasOAuthOptions ? renderEmailForm() : renderOAuthOptions()}
          {renderTerms()}
          <div className="mt-6 text-center text-sm text-text-secondary">
            已有账户？{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover font-medium">登录</Link>
          </div>
        </Card>

        {turnstileEnabled && (
          <div className="flex justify-center mt-6">
            <Turnstile sitekey={turnstileSiteKey} onVerify={(t) => setTurnstileToken(t)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterForm;
