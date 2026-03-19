import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/cn';
import { UserContext } from '../../contexts/user-context';
import { StatusContext } from '../../contexts/status-context';
import { useMobile } from '../../hooks/use-mobile';
import { API } from '../../lib/api';
import { getLogo, getSystemName, showError, showInfo, setStatusData } from '../../lib/utils';
import { normalizeLanguage } from '../../i18n/language';
import TopBar from './top-bar';
import HogwartsSidebar from './hogwarts-sidebar';
import { Sheet, SheetContent } from '../ui/sheet';

const STORAGE_KEY = 'hogwarts-collapse-sidebar';

function useHogwartsSidebar() {
  const [collapsed, _setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    _setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const setCollapsed = (value) => {
    _setCollapsed(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch {}
  };

  return [collapsed, toggle, setCollapsed];
}

const HogwartsLayout = () => {
  const [userState, userDispatch] = useContext(UserContext);
  const [, statusDispatch] = useContext(StatusContext);
  const isMobile = useMobile();
  const [collapsed, toggleCollapsed, setCollapsed] = useHogwartsSidebar();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Expand sidebar on mobile when drawer opens
  useEffect(() => {
    if (isMobile && drawerOpen && collapsed) {
      setCollapsed(false);
    }
  }, [isMobile, drawerOpen, collapsed, setCollapsed]);

  // Inner padding for content
  const shouldInnerPadding =
    location.pathname.includes('/console') &&
    !location.pathname.startsWith('/console/chat') &&
    location.pathname !== '/console/playground';

  // Load user from localStorage
  const loadUser = () => {
    let user = localStorage.getItem('user');
    if (user) {
      let data = JSON.parse(user);
      userDispatch({ type: 'login', payload: data });
    }
  };

  // Load status from API
  const loadStatus = async () => {
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        statusDispatch({ type: 'set', payload: data });
        setStatusData(data);
      } else {
        showError('Unable to connect to server');
      }
    } catch (error) {
      showError('Failed to load status');
    }
  };

  useEffect(() => {
    loadUser();
    loadStatus().catch(console.error);
    let systemName = getSystemName();
    if (systemName) {
      document.title = systemName;
    }
    let logo = getLogo();
    if (logo) {
      document.querySelectorAll("link[rel~='icon']").forEach((el) => {
        el.href = logo;
      });
    }
  }, []);

  // Language sync from user settings
  useEffect(() => {
    let preferredLang;
    if (userState?.user?.setting) {
      try {
        const settings = JSON.parse(userState.user.setting);
        preferredLang = normalizeLanguage(settings.language);
      } catch (e) {}
    }
    if (!preferredLang) {
      const savedLang = localStorage.getItem('i18nextLng');
      if (savedLang) {
        preferredLang = normalizeLanguage(savedLang);
      }
    }
    if (preferredLang) {
      localStorage.setItem('i18nextLng', preferredLang);
      if (preferredLang !== i18n.language) {
        i18n.changeLanguage(preferredLang);
      }
    }
  }, [i18n, userState?.user?.setting]);

  const sidebarWidth = isMobile ? 0 : collapsed ? 64 : 240;

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        onMobileMenuToggle={() => setDrawerOpen((prev) => !prev)}
        drawerOpen={drawerOpen}
        showSidebar
      />

      {/* Desktop sidebar */}
      {!isMobile && (
        <HogwartsSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onNavigate={() => {}}
        />
      )}

      {/* Mobile sidebar drawer */}
      {isMobile && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="p-0 w-[240px] bg-[rgb(var(--hogwarts-sidebar-bg))]" showClose={false}>
            <HogwartsSidebar
              collapsed={false}
              onToggleCollapse={() => setDrawerOpen(false)}
              onNavigate={() => setDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main
        className={cn(
          'pt-14 min-h-screen flex flex-col transition-all duration-300'
        )}
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Back to console breadcrumb */}
        <div className={cn('px-6 pt-4 pb-0', isMobile && 'px-3 pt-2')}>
          <Link
            to="/console"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>{t('返回控制台')}</span>
          </Link>
        </div>

        <div
          className={cn(
            'flex-1',
            shouldInnerPadding ? (isMobile ? 'p-1.5' : 'p-6') : 'p-0'
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HogwartsLayout;
