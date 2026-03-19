import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Radio,
  Bot,
  Server,
  CreditCard,
  Key,
  FileText,
  Code2,
  Wallet,
  Gift,
  DollarSign,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { isAdmin, isRoot } from '../../lib/utils';
import { useSidebarModules } from '../../hooks/use-sidebar-modules';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui/tooltip';

// Icon map for each route key
const iconMap = {
  detail: LayoutDashboard,
  channel: Radio,
  models: Bot,
  deployment: Server,
  subscription: CreditCard,
  token: Key,
  log: FileText,
  playground: Code2,
  topup: Wallet,
  redemption: Gift,
  pricing: DollarSign,
  user: Users,
  setting: Settings,
  personal: Settings,
  midjourney: FileText,
  task: FileText,
};

const getIcon = (itemKey, size = 18) => {
  const Icon = iconMap[itemKey] || LayoutDashboard;
  return <Icon size={size} strokeWidth={1.8} />;
};

// Route mapping
const routerMap = {
  home: '/',
  channel: '/console/channel',
  token: '/console/token',
  redemption: '/console/redemption',
  topup: '/console/topup',
  user: '/console/user',
  subscription: '/console/subscription',
  log: '/console/log',
  midjourney: '/console/midjourney',
  setting: '/console/setting',
  about: '/about',
  detail: '/console',
  pricing: '/pricing',
  task: '/console/task',
  models: '/console/models',
  deployment: '/console/deployment',
  playground: '/console/playground',
  personal: '/console/personal',
};

const COLLAPSED_SECTIONS_KEY = 'sidebar-collapsed-sections';

function getInitialCollapsedSections() {
  try {
    const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { console: true, personal: true, admin: true };
}

const CollapsibleSection = ({ sectionKey, label, collapsed: sidebarCollapsed, isOpen, onToggle, children }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(isOpen ? 'auto' : '0px');
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      setHeight(isOpen ? 'auto' : '0px');
      return;
    }
    if (!contentRef.current) return;
    if (isOpen) {
      const scrollH = contentRef.current.scrollHeight;
      setHeight(`${scrollH}px`);
      const timer = setTimeout(() => setHeight('auto'), 200);
      return () => clearTimeout(timer);
    } else {
      setHeight(`${contentRef.current.scrollHeight}px`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight('0px'));
      });
    }
  }, [isOpen]);

  if (sidebarCollapsed) {
    return (
      <div>
        <div className="my-2 mx-3 h-px bg-white/10" />
        {children}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] uppercase tracking-wider text-sidebar-text/60 hover:text-sidebar-text/80 transition-colors select-none group"
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className={cn(
            'transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height }}
      >
        {children}
      </div>
    </div>
  );
};

const Sidebar = ({ collapsed, onToggleCollapse, onNavigate = () => {} }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isModuleVisible,
    hasSectionVisibleModules,
    loading: sidebarLoading,
  } = useSidebarModules();

  const [selectedKey, setSelectedKey] = useState('detail');

  const [collapsedSections, setCollapsedSections] = useState(getInitialCollapsedSections);

  const toggleSection = useCallback((sectionKey) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Sync selected key with current route
  useEffect(() => {
    const currentPath = location.pathname;
    let matchingKey = Object.keys(routerMap).find(
      (key) => routerMap[key] === currentPath,
    );

    if (matchingKey) {
      setSelectedKey(matchingKey);
    }
  }, [location.pathname]);

  // Sync body class for sidebar state
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  const handleItemClick = useCallback((itemKey) => {
    const to = routerMap[itemKey];
    if (to) {
      navigate(to);
      setSelectedKey(itemKey);
      onNavigate();
    }
  }, [navigate, onNavigate]);

  // Build navigation groups
  const workspaceItems = useMemo(() => {
    const items = [
      { text: t('数据看板'), itemKey: 'detail' },
      { text: t('令牌管理'), itemKey: 'token' },
      { text: t('使用日志'), itemKey: 'log' },
      { text: t('操练场'), itemKey: 'playground' },
      {
        text: t('绘图日志'),
        itemKey: 'midjourney',
        hidden: localStorage.getItem('enable_drawing') !== 'true',
      },
      {
        text: t('任务日志'),
        itemKey: 'task',
        hidden: localStorage.getItem('enable_task') !== 'true',
      },
    ];
    return items.filter((item) => !item.hidden && isModuleVisible('console', item.itemKey));
  }, [t, isModuleVisible]);

  const accountItems = useMemo(() => {
    const items = [
      { text: t('钱包管理'), itemKey: 'topup' },
      { text: t('个人设置'), itemKey: 'personal' },
    ];
    return items.filter((item) => isModuleVisible('personal', item.itemKey));
  }, [t, isModuleVisible]);

  const adminItems = useMemo(() => {
    const items = [
      { text: t('渠道管理'), itemKey: 'channel', needsAdmin: true },
      { text: t('订阅管理'), itemKey: 'subscription', needsAdmin: true },
      { text: t('模型管理'), itemKey: 'models', needsAdmin: true },
      { text: t('模型部署'), itemKey: 'deployment', needsAdmin: true },
      { text: t('兑换码管理'), itemKey: 'redemption', needsAdmin: true },
      { text: t('用户管理'), itemKey: 'user', needsAdmin: true },
      { text: t('系统设置'), itemKey: 'setting', needsRoot: true },
    ];
    return items.filter((item) => {
      if (item.needsRoot && !isRoot()) return false;
      if (item.needsAdmin && !isAdmin()) return false;
      return isModuleVisible('admin', item.itemKey);
    });
  }, [t, isModuleVisible]);

  // NavItem renderer
  const NavItem = ({ item }) => {
    const isActive = selectedKey === item.itemKey;
    const content = (
      <button
        onClick={() => handleItemClick(item.itemKey)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 relative group',
          'outline-none',
          collapsed ? 'justify-center px-0' : '',
          isActive
            ? 'bg-[rgba(255,255,255,0.12)] text-sidebar-text-active'
            : 'text-sidebar-text hover:bg-[rgba(255,255,255,0.06)] hover:text-sidebar-text-active'
        )}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-accent rounded-r" />
        )}
        <span className="shrink-0">{getIcon(item.itemKey)}</span>
        {!collapsed && (
          <span className="truncate">{item.text}</span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {item.text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  return (
    <nav
      className={cn(
        'bg-sidebar-bg text-sidebar-text fixed left-0 top-14 bottom-0 z-40',
        'flex flex-col transition-all duration-300 overflow-hidden'
      )}
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {/* Workspace */}
        {hasSectionVisibleModules('console') && workspaceItems.length > 0 && (
          <CollapsibleSection
            sectionKey="console"
            label={t('工作台')}
            collapsed={collapsed}
            isOpen={!collapsedSections.console}
            onToggle={() => toggleSection('console')}
          >
            {workspaceItems.map((item) => (
              <NavItem key={item.itemKey} item={item} />
            ))}
          </CollapsibleSection>
        )}

        {/* Account */}
        {hasSectionVisibleModules('personal') && accountItems.length > 0 && (
          <CollapsibleSection
            sectionKey="personal"
            label={t('账户')}
            collapsed={collapsed}
            isOpen={!collapsedSections.personal}
            onToggle={() => toggleSection('personal')}
          >
            {accountItems.map((item) => (
              <NavItem key={item.itemKey} item={item} />
            ))}
          </CollapsibleSection>
        )}

        {/* Admin section */}
        {isAdmin() && hasSectionVisibleModules('admin') && adminItems.length > 0 && (
          <CollapsibleSection
            sectionKey="admin"
            label={t('管理员')}
            collapsed={collapsed}
            isOpen={!collapsedSections.admin}
            onToggle={() => toggleSection('admin')}
          >
            {adminItems.map((item) => (
              <NavItem key={item.itemKey} item={item} />
            ))}
          </CollapsibleSection>
        )}
      </div>

      {/* Bottom collapse toggle */}
      <div className="shrink-0 border-t border-white/10 p-2">
        <button
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            'text-sidebar-text hover:bg-[rgba(255,255,255,0.06)] hover:text-sidebar-text-active',
            collapsed ? 'justify-center px-0' : ''
          )}
          aria-label={collapsed ? t('展开侧边栏') : t('收起侧边栏')}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="truncate">{t('收起侧边栏')}</span>}
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
