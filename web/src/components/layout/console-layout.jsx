import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { UserContext } from '../../contexts/user-context';
import { StatusContext } from '../../contexts/status-context';
import { useMobile } from '../../hooks/use-mobile';
import { useSidebar } from '../../hooks/use-sidebar';
import { API } from '../../lib/api';
import { getLogo, getSystemName, showError, showInfo, setStatusData } from '../../lib/utils';
import { normalizeLanguage } from '../../i18n/language';
import TopBar from './top-bar';
import Sidebar from './sidebar';
import FooterBar from './footer';
import { Sheet, SheetContent } from '../ui/sheet';

const ConsoleLayout = () => {
  const [userState, userDispatch] = useContext(UserContext);
  const [, statusDispatch] = useContext(StatusContext);
  const isMobile = useMobile();
  const [collapsed, toggleCollapsed, setCollapsed] = useSidebar();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Expand sidebar on mobile when drawer opens
  useEffect(() => {
    if (isMobile && drawerOpen && collapsed) {
      setCollapsed(false);
    }
  }, [isMobile, drawerOpen, collapsed, setCollapsed]);

  // Decide which pages should hide the footer
  const cardProPages = [
    '/console/channel',
    '/console/log',
    '/console/redemption',
    '/console/user',
    '/console/token',
    '/console/midjourney',
    '/console/task',
    '/console/models',
    '/console/playground',
    '/console/ranking',
  ];
  const shouldHideFooter = cardProPages.includes(location.pathname);

  // Decide inner padding
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
      let linkElement = document.querySelector("link[rel~='icon']");
      if (linkElement) {
        linkElement.href = logo;
      }
    }
  }, []);

  // Prompt user to upload avatar if missing
  useEffect(() => {
    if (
      userState?.user &&
      !userState.user.avatar_url &&
      !sessionStorage.getItem('avatar_prompted')
    ) {
      sessionStorage.setItem('avatar_prompted', '1');
      showInfo('您还未设置头像，建议前往个人设置上传头像');
      setTimeout(() => navigate('/console/personal'), 2000);
    }
  }, [userState?.user, navigate]);

  // Language sync from user settings
  useEffect(() => {
    let preferredLang;
    if (userState?.user?.setting) {
      try {
        const settings = JSON.parse(userState.user.setting);
        preferredLang = normalizeLanguage(settings.language);
      } catch (e) {
        // Ignore parse errors
      }
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

  // Sidebar width for content margin
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
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onNavigate={() => {}}
        />
      )}

      {/* Mobile sidebar drawer */}
      {isMobile && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="p-0 w-[240px] bg-sidebar-bg" showClose={false}>
            <Sidebar
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
        <div
          className={cn(
            'flex-1',
            shouldInnerPadding ? (isMobile ? 'p-1.5' : 'p-6') : 'p-0'
          )}
        >
          <Outlet />
        </div>
        {!shouldHideFooter && <FooterBar />}
      </main>
    </div>
  );
};

export default ConsoleLayout;
