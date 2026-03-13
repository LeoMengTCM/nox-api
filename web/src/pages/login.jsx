import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from '../lib/utils';
import {
  onGitHubOAuthClicked,
  onDiscordOAuthClicked,
  onOIDCClicked,
  onLinuxDOOAuthClicked,
  onCustomOAuthClicked,
  prepareCredentialRequestOptions,
  buildAssertionResult,
  isPasskeySupported,
  getOAuthProviderIcon,
} from '../helpers';
import Turnstile from 'react-turnstile';
import TelegramLoginButton from 'react-telegram-login';
import TwoFAVerification from './two-fa-verify';
import {
  Button,
  Input,
  Card,
  Checkbox,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui';

const LoginForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    wechat_verification_code: '',
  });
  const { username, password } = inputs;

  const [, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);

  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showWeChatLoginModal, setShowWeChatLoginModal] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasUserAgreement, setHasUserAgreement] = useState(false);
  const [hasPrivacyPolicy, setHasPrivacyPolicy] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [linuxdoLoading, setLinuxdoLoading] = useState(false);
  const [customOAuthLoading, setCustomOAuthLoading] = useState({});
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

  useEffect(() => {
    if (status?.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }
    setHasUserAgreement(status?.user_agreement_enabled || false);
    setHasPrivacyPolicy(status?.privacy_policy_enabled || false);
  }, [status]);

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported).catch(() => setPasskeySupported(false));
    return () => { if (githubTimeoutRef.current) clearTimeout(githubTimeoutRef.current); };
  }, []);

  useEffect(() => {
    if (searchParams.get('expired')) showError('未登录或登录已过期，请重新登录');
  }, []);

  const requireTerms = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo('请先阅读并同意用户协议和隐私政策');
      return true;
    }
    return false;
  };

  function handleChange(name, value) {
    setInputs((prev) => ({ ...prev, [name]: value }));
  }

  // --- Login handlers ---
  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (requireTerms()) return;
    if (turnstileEnabled && !turnstileToken) {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    if (!username || !password) { showError('请输入用户名和密码！'); return; }

    setLoginLoading(true);
    try {
      const res = await API.post(`/api/user/login?turnstile=${turnstileToken}`, { username, password });
      const { success, message, data } = res.data;
      if (success) {
        if (data?.require_2fa) { setShowTwoFA(true); setLoginLoading(false); return; }
        userDispatch({ type: 'login', payload: data });
        setUserData(data);
        updateAPI();
        showSuccess('登录成功！');
        if (username === 'root' && password === '123456') {
          showError('您正在使用默认密码，请立刻修改！');
        }
        navigate('/console');
      } else {
        showError(message);
      }
    } catch { showError('登录失败，请重试'); }
    finally { setLoginLoading(false); }
  }

  const handlePasskeyLogin = async () => {
    if (requireTerms()) return;
    if (!passkeySupported || !window.PublicKeyCredential) {
      showInfo('当前环境不支持 Passkey');
      return;
    }
    setPasskeyLoading(true);
    try {
      const beginRes = await API.post('/api/user/passkey/login/begin');
      const { success, message, data } = beginRes.data;
      if (!success) { showError(message || '无法发起 Passkey 登录'); return; }
      const opts = prepareCredentialRequestOptions(data?.options || data?.publicKey || data);
      const assertion = await navigator.credentials.get({ publicKey: opts });
      const payload = buildAssertionResult(assertion);
      if (!payload) { showError('Passkey 验证失败，请重试'); return; }
      const finishRes = await API.post('/api/user/passkey/login/finish', payload);
      if (finishRes.data.success) {
        userDispatch({ type: 'login', payload: finishRes.data.data });
        setUserData(finishRes.data.data);
        updateAPI();
        showSuccess('登录成功！');
        navigate('/console');
      } else { showError(finishRes.data.message || 'Passkey 登录失败'); }
    } catch (err) {
      if (err?.name === 'AbortError') showInfo('已取消 Passkey 登录');
      else showError('Passkey 登录失败，请重试');
    } finally { setPasskeyLoading(false); }
  };

  // --- OAuth handlers ---
  const handleGitHubClick = () => {
    if (requireTerms()) return;
    setGithubLoading(true);
    githubTimeoutRef.current = setTimeout(() => setGithubLoading(false), 20000);
    try { onGitHubOAuthClicked(status.github_client_id, { shouldLogout: true }); }
    finally { setTimeout(() => setGithubLoading(false), 3000); }
  };
  const handleDiscordClick = () => {
    if (requireTerms()) return;
    setDiscordLoading(true);
    try { onDiscordOAuthClicked(status.discord_client_id, { shouldLogout: true }); }
    finally { setTimeout(() => setDiscordLoading(false), 3000); }
  };
  const handleOIDCClick = () => {
    if (requireTerms()) return;
    setOidcLoading(true);
    try { onOIDCClicked(status.oidc_authorization_endpoint, status.oidc_client_id, false, { shouldLogout: true }); }
    finally { setTimeout(() => setOidcLoading(false), 3000); }
  };
  const handleLinuxDOClick = () => {
    if (requireTerms()) return;
    setLinuxdoLoading(true);
    try { onLinuxDOOAuthClicked(status.linuxdo_client_id, { shouldLogout: true }); }
    finally { setTimeout(() => setLinuxdoLoading(false), 3000); }
  };
  const handleCustomOAuthClick = (provider) => {
    if (requireTerms()) return;
    setCustomOAuthLoading((p) => ({ ...p, [provider.slug]: true }));
    try { onCustomOAuthClicked(provider, { shouldLogout: true }); }
    finally { setTimeout(() => setCustomOAuthLoading((p) => ({ ...p, [provider.slug]: false })), 3000); }
  };
  const onWeChatLoginClicked = () => { if (requireTerms()) return; setShowWeChatLoginModal(true); };
  const onTelegramLoginClicked = async (response) => {
    if (requireTerms()) return;
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
    if (turnstileEnabled && !turnstileToken) { showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！'); return; }
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
        setShowWeChatLoginModal(false);
      } else { showError(message); }
    } catch { showError('登录失败，请重试'); }
    finally { setWechatCodeSubmitLoading(false); }
  };

  const handle2FASuccess = (data) => {
    userDispatch({ type: 'login', payload: data });
    setUserData(data);
    updateAPI();
    showSuccess('登录成功！');
    navigate('/console');
  };

  // --- Terms checkbox ---
  const renderTerms = () => {
    if (!hasUserAgreement && !hasPrivacyPolicy) return null;
    return (
      <div className="flex items-start gap-2 mt-4">
        <Checkbox checked={agreedToTerms} onCheckedChange={setAgreedToTerms} className="mt-0.5" />
        <span className="text-xs text-text-secondary leading-relaxed">
          我已阅读并同意
          {hasUserAgreement && (
            <a href="/user-agreement" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover mx-0.5">用户协议</a>
          )}
          {hasUserAgreement && hasPrivacyPolicy && '和'}
          {hasPrivacyPolicy && (
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover mx-0.5">隐私政策</a>
          )}
        </span>
      </div>
    );
  };

  // --- OAuth button ---
  const OAuthBtn = ({ children, onClick, loading: btnLoading, disabled }) => (
    <button
      type="button"
      className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-border hover:bg-surface-hover transition-colors text-sm text-text-primary disabled:opacity-50"
      onClick={onClick}
      disabled={btnLoading || disabled}
    >
      {btnLoading ? <span className="h-4 w-4 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );

  // --- OAuth options view ---
  const renderOAuthOptions = () => (
    <div className="space-y-3">
      {status.wechat_login && (
        <OAuthBtn onClick={onWeChatLoginClicked}>
          <svg className="w-5 h-5 text-[#07C160]" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.32.32 0 0 0 .186-.07l1.674-1.1a.795.795 0 0 1 .609-.12c1.006.224 2.066.345 3.155.345.279 0 .554-.012.828-.032a4.395 4.395 0 0 1-.182-1.224c0-3.39 3.236-6.142 7.227-6.142.225 0 .447.012.667.028C16.086 5.858 12.77 2.188 8.691 2.188zm-2.6 4.408a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1zm5.2 0a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1zM23.997 15.39c0-3.248-3.236-5.882-7.227-5.882-3.99 0-7.227 2.634-7.227 5.882 0 3.248 3.237 5.882 7.227 5.882.84 0 1.647-.105 2.398-.3a.63.63 0 0 1 .476.1l1.275.845a.249.249 0 0 0 .144.054c.123 0 .224-.1.224-.224 0-.055-.022-.11-.037-.163l-.297-1.128a.469.469 0 0 1 .165-.519C22.924 19.024 23.997 17.32 23.997 15.39zm-9.463-1.07a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zm4.469 0a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6z"/></svg>
          使用微信继续
        </OAuthBtn>
      )}
      {status.github_oauth && (
        <OAuthBtn onClick={handleGitHubClick} loading={githubLoading}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          使用 GitHub 继续
        </OAuthBtn>
      )}
      {status.discord_oauth && (
        <OAuthBtn onClick={handleDiscordClick} loading={discordLoading}>
          <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          使用 Discord 继续
        </OAuthBtn>
      )}
      {status.oidc_enabled && (
        <OAuthBtn onClick={handleOIDCClick} loading={oidcLoading}>
          <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          使用 OIDC 继续
        </OAuthBtn>
      )}
      {status.linuxdo_oauth && (
        <OAuthBtn onClick={handleLinuxDOClick} loading={linuxdoLoading}>
          <svg className="w-5 h-5 text-[#E95420]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          使用 LinuxDO 继续
        </OAuthBtn>
      )}
      {status.custom_oauth_providers?.map((provider) => (
        <OAuthBtn key={provider.slug} onClick={() => handleCustomOAuthClick(provider)} loading={customOAuthLoading[provider.slug]}>
          {getOAuthProviderIcon(provider.icon || '', 20)}
          <span>使用 {provider.name} 继续</span>
        </OAuthBtn>
      ))}
      {status.telegram_oauth && (
        <div className="flex justify-center py-1">
          <TelegramLoginButton dataOnauth={onTelegramLoginClicked} botName={status.telegram_bot_name} />
        </div>
      )}
      {status.passkey_login && passkeySupported && (
        <OAuthBtn onClick={handlePasskeyLogin} loading={passkeyLoading}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          使用 Passkey 登录
        </OAuthBtn>
      )}

      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-tertiary">或</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button variant="primary" className="w-full rounded-full h-11" onClick={() => setShowEmailLogin(true)}>
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        使用邮箱或用户名登录
      </Button>
    </div>
  );

  // --- Email login form ---
  const renderEmailForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status.passkey_login && passkeySupported && (
        <OAuthBtn onClick={handlePasskeyLogin} loading={passkeyLoading}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          使用 Passkey 登录
        </OAuthBtn>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">用户名或邮箱</label>
        <Input
          placeholder="请输入您的用户名或邮箱地址"
          value={username}
          onChange={(e) => handleChange('username', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">密码</label>
        <Input
          type="password"
          placeholder="请输入您的密码"
          value={password}
          onChange={(e) => handleChange('password', e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        className="w-full"
        type="submit"
        loading={loginLoading}
        disabled={(hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms}
      >
        继续
      </Button>

      <button
        type="button"
        className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
        onClick={() => navigate('/reset')}
      >
        忘记密码？
      </button>

      {hasOAuthOptions && (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-tertiary">或</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setShowEmailLogin(false)}>
            其他登录选项
          </Button>
        </>
      )}
    </form>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo + Name */}
        <div className="flex items-center justify-center mb-8 gap-2.5">
          <img src={logo} alt="Logo" className="h-9 rounded-full" />
          <span className="font-heading text-xl font-semibold text-text-primary">{systemName}</span>
        </div>

        <Card className="p-8">
          <h2 className="font-heading text-xl font-semibold text-center text-text-primary mb-6">登录</h2>

          {showEmailLogin || !hasOAuthOptions ? renderEmailForm() : renderOAuthOptions()}

          {renderTerms()}

          {!status.self_use_mode_enabled && (
            <div className="mt-6 text-center text-sm text-text-secondary">
              没有账户？{' '}
              <Link to="/register" className="text-accent hover:text-accent-hover font-medium">注册</Link>
            </div>
          )}
        </Card>

        {turnstileEnabled && (
          <div className="flex justify-center mt-6">
            <Turnstile sitekey={turnstileSiteKey} onVerify={(t) => setTurnstileToken(t)} />
          </div>
        )}
      </motion.div>

      {/* WeChat Modal */}
      <Dialog open={showWeChatLoginModal} onOpenChange={setShowWeChatLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>微信扫码登录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {status.wechat_qrcode && (
              <div className="flex justify-center">
                <img src={status.wechat_qrcode} alt="微信二维码" className="max-w-[200px]" />
              </div>
            )}
            <p className="text-sm text-text-secondary text-center">
              微信扫码关注公众号，输入「验证码」获取验证码（三分钟内有效）
            </p>
            <Input
              placeholder="验证码"
              value={inputs.wechat_verification_code}
              onChange={(e) => handleChange('wechat_verification_code', e.target.value)}
            />
            <Button variant="primary" className="w-full" onClick={onSubmitWeChatCode} loading={wechatCodeSubmitLoading}>
              登录
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Modal */}
      <Dialog open={showTwoFA} onOpenChange={(open) => { if (!open) { setShowTwoFA(false); setInputs({ username: '', password: '', wechat_verification_code: '' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>两步验证</DialogTitle>
          </DialogHeader>
          <TwoFAVerification
            onSuccess={handle2FASuccess}
            onBack={() => { setShowTwoFA(false); setInputs({ username: '', password: '', wechat_verification_code: '' }); }}
            isModal
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginForm;
