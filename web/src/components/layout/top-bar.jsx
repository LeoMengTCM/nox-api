import React, { useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor, Menu, X, LogOut, Settings, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { UserContext } from '../../contexts/user-context';
import { StatusContext } from '../../contexts/status-context';
import { useTheme } from '../../contexts/theme-context';
import { useMobile } from '../../hooks/use-mobile';
import { useSidebar } from '../../hooks/use-sidebar';
import { API } from '../../lib/api';
import { getLogo, getSystemName, showError, showSuccess, stringToColor } from '../../lib/utils';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui/tooltip';

const TopBar = ({ onMobileMenuToggle, drawerOpen, showSidebar = false }) => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);
  const isMobile = useMobile();
  const [collapsed] = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const { theme, setTheme, resolvedTheme } = useTheme();

  const systemName = getSystemName();
  const logo = getLogo();
  const [logoLoaded, setLogoLoaded] = useState(false);

  const isSelfUseMode = statusState?.status?.self_use_mode_enabled || false;
  const isConsoleRoute = location.pathname.startsWith('/console');

  // Logo loading
  useEffect(() => {
    setLogoLoaded(false);
    if (!logo) return;
    const img = new Image();
    img.src = logo;
    img.onload = () => setLogoLoaded(true);
  }, [logo]);

  // Send theme to iframe
  useEffect(() => {
    try {
      const iframe = document.querySelector('iframe');
      const cw = iframe && iframe.contentWindow;
      if (cw) {
        cw.postMessage({ themeMode: resolvedTheme }, '*');
      }
    } catch (e) {
      // Silently ignore cross-origin errors
    }
  }, [resolvedTheme]);

  // Logout
  const logout = useCallback(async () => {
    await API.get('/api/user/logout');
    showSuccess(t('注销成功!'));
    userDispatch({ type: 'logout' });
    localStorage.removeItem('user');
    sessionStorage.removeItem('avatar_prompted');
    navigate('/login');
  }, [navigate, t, userDispatch]);

  // Theme cycling: light -> dark -> auto -> light
  const cycleTheme = useCallback(() => {
    const order = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  }, [theme, setTheme]);

  const themeIcon = useMemo(() => {
    if (theme === 'dark') return <Moon size={16} />;
    if (theme === 'system') return <Monitor size={16} />;
    return <Sun size={16} />;
  }, [theme]);

  const themeLabel = useMemo(() => {
    if (theme === 'dark') return t('深色模式');
    if (theme === 'system') return t('自动模式');
    return t('浅色模式');
  }, [theme, t]);

  // Compute sidebar width for logo area alignment
  const sidebarWidth = showSidebar && !isMobile
    ? collapsed ? '64px' : '240px'
    : 'auto';

  return (
    <header
      className={cn(
        'bg-surface border-b border-border h-14 fixed top-0 left-0 right-0 z-50',
        'flex items-center justify-between px-4'
      )}
    >
      {/* Left section */}
      <div className="flex items-center h-full" style={{ minWidth: sidebarWidth }}>
        {/* Mobile hamburger */}
        {isConsoleRoute && isMobile && (
          <button
            onClick={onMobileMenuToggle}
            className={cn(
              'mr-2 p-1.5 rounded-md transition-colors',
              'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            )}
            aria-label={drawerOpen ? t('关闭侧边栏') : t('打开侧边栏')}
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-7 h-7 shrink-0">
            {logoLoaded && (
              <img
                src={logo}
                alt="logo"
                className="w-full h-full rounded-full object-cover transition-transform duration-200 group-hover:scale-110"
              />
            )}
            {!logoLoaded && (
              <div className="w-full h-full rounded-full bg-surface-hover animate-pulse" />
            )}
          </div>
          {(!isMobile || !isConsoleRoute) && (
            <span className="hidden sm:inline text-sm font-semibold text-text-primary truncate max-w-[140px]">
              {systemName}
            </span>
          )}
        </Link>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cycleTheme}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )}
                aria-label={themeLabel}
              >
                {themeIcon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {themeLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User area */}
        {userState.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 py-1 px-1.5 rounded-full transition-colors',
                  'hover:bg-surface-hover'
                )}
              >
                <Avatar size="sm">
                  {userState.user.avatar_url && (
                    <AvatarImage src={userState.user.avatar_url} alt={userState.user.username} />
                  )}
                  <AvatarFallback
                    size="sm"
                    style={{ backgroundColor: stringToColor(userState.user.username) }}
                    className="text-white"
                  >
                    {userState.user.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-xs font-medium text-text-secondary max-w-[80px] truncate">
                  {userState.user.username}
                </span>
                <ChevronDown size={12} className="text-text-tertiary hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/console/personal')}>
                <Settings size={14} className="text-text-tertiary" />
                <span>{t('个人设置')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut size={14} className="text-text-tertiary" />
                <span>{t('退出')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-1">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                {t('登录')}
              </Button>
            </Link>
            {!isSelfUseMode && (
              <Link to="/register" className="hidden md:block">
                <Button variant="primary" size="sm" className="text-xs">
                  {t('注册')}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
