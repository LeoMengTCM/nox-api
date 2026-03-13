import React, { useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../contexts/user-context';
import { StatusContext } from '../../contexts/status-context';
import { API } from '../../lib/api';
import { getLogo, getSystemName, showError, setStatusData } from '../../lib/utils';
import { normalizeLanguage } from '../../i18n/language';
import TopBar from './top-bar';
import FooterBar from './footer';

const PublicLayout = () => {
  const [userState, userDispatch] = useContext(UserContext);
  const [, statusDispatch] = useContext(StatusContext);
  const { i18n } = useTranslation();

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        onMobileMenuToggle={() => {}}
        drawerOpen={false}
        showSidebar={false}
      />

      {/* Full-width content, no sidebar */}
      <main className="flex-1 pt-14">
        <Outlet />
      </main>

      <FooterBar />
    </div>
  );
};

export default PublicLayout;
