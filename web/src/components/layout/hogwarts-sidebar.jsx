import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Castle,
  CalendarCheck,
  MessageCircle,
  Trophy,
  Crown,
  Gem,
  Landmark,
  PawPrint,
  ShoppingBag,
  Package,
  Dices,
  Merge,
  Compass,
  Swords,
  Store,
  BarChart3,
  Dna,
  Gift,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { isAdmin } from '../../lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui/tooltip';

const iconMap = {
  portal: Castle,
  checkin: CalendarCheck,
  community: MessageCircle,
  ranking: Trophy,
  titles: Crown,
  casino: Gem,
  bank: Landmark,
  pet: PawPrint,
  'pet-shop': ShoppingBag,
  'pet-inventory': Package,
  'pet-gacha': Dices,
  'pet-fusion': Merge,
  'pet-adventure': Compass,
  'pet-arena': Swords,
  'pet-market': Store,
  'casino-admin': Gem,
  'gacha-pools': Dices,
  'missions-admin': Compass,
  'pet-species-admin': Dna,
  'pet-items-admin': Package,
  'pet-users-admin': Users,
  'pet-grant-admin': Gift,
  'pet-market-admin': Store,
  'pet-stats-admin': BarChart3,
};

const getIcon = (itemKey, size = 18) => {
  const Icon = iconMap[itemKey] || Castle;
  return <Icon size={size} strokeWidth={1.8} />;
};

const routerMap = {
  portal: '/console/hogwarts',
  checkin: '/console/hogwarts/checkin',
  community: '/console/hogwarts/community',
  ranking: '/console/hogwarts/ranking',
  titles: '/console/hogwarts/titles',
  casino: '/console/hogwarts/casino',
  bank: '/console/hogwarts/casino/bank',
  pet: '/console/hogwarts/pet',
  'pet-shop': '/console/hogwarts/pet/shop',
  'pet-inventory': '/console/hogwarts/pet/inventory',
  'pet-gacha': '/console/hogwarts/pet/gacha',
  'pet-fusion': '/console/hogwarts/pet/fusion',
  'pet-adventure': '/console/hogwarts/pet/adventure',
  'pet-arena': '/console/hogwarts/pet/arena',
  'pet-market': '/console/hogwarts/pet/market',
  'casino-admin': '/console/hogwarts/admin/casino',
  'gacha-pools': '/console/hogwarts/admin/gacha-pools',
  'missions-admin': '/console/hogwarts/admin/missions',
  'pet-species-admin': '/console/hogwarts/admin/pet-species',
  'pet-items-admin': '/console/hogwarts/admin/pet-items',
  'pet-users-admin': '/console/hogwarts/admin/pet-users',
  'pet-grant-admin': '/console/hogwarts/admin/pet-grant',
  'pet-market-admin': '/console/hogwarts/admin/pet-market',
  'pet-stats-admin': '/console/hogwarts/admin/pet-stats',
};

const COLLAPSED_SECTIONS_KEY = 'hogwarts-sidebar-collapsed-sections';

function getInitialCollapsedSections() {
  try {
    const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { daily: true, economy: true, creatures: true, admin: true };
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
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] uppercase tracking-wider text-[rgb(var(--hogwarts-gold-dim))]/60 hover:text-[rgb(var(--hogwarts-gold-dim))]/80 transition-colors select-none group"
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

const HogwartsSidebar = ({ collapsed, onToggleCollapse, onNavigate = () => {} }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedKey, setSelectedKey] = useState('portal');
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

    if (!matchingKey && currentPath.startsWith('/console/hogwarts/pet')) {
      if (currentPath === '/console/hogwarts/pet/shop') matchingKey = 'pet-shop';
      else if (currentPath === '/console/hogwarts/pet/inventory') matchingKey = 'pet-inventory';
      else if (currentPath === '/console/hogwarts/pet/gacha') matchingKey = 'pet-gacha';
      else if (currentPath === '/console/hogwarts/pet/fusion') matchingKey = 'pet-fusion';
      else if (currentPath === '/console/hogwarts/pet/adventure') matchingKey = 'pet-adventure';
      else if (currentPath === '/console/hogwarts/pet/arena') matchingKey = 'pet-arena';
      else if (currentPath === '/console/hogwarts/pet/market') matchingKey = 'pet-market';
      else matchingKey = 'pet';
    }

    if (!matchingKey && currentPath.startsWith('/console/hogwarts/casino')) {
      matchingKey = 'casino';
    }
    if (!matchingKey && currentPath.startsWith('/console/hogwarts/admin/casino')) {
      matchingKey = 'casino-admin';
    }
    if (!matchingKey && currentPath.startsWith('/console/hogwarts')) {
      matchingKey = 'portal';
    }

    if (matchingKey) {
      setSelectedKey(matchingKey);
    }
  }, [location.pathname]);

  const handleItemClick = useCallback((itemKey) => {
    const to = routerMap[itemKey];
    if (to) {
      navigate(to);
      setSelectedKey(itemKey);
      onNavigate();
    }
  }, [navigate, onNavigate]);

  const dailyItems = useMemo(() => [
    { text: t('每日签到'), itemKey: 'checkin' },
    { text: t('社区'), itemKey: 'community' },
    { text: t('排行榜'), itemKey: 'ranking' },
    { text: t('称号'), itemKey: 'titles' },
  ], [t]);

  const economyItems = useMemo(() => [
    { text: t('韦斯莱赌坊'), itemKey: 'casino' },
    { text: t('古灵阁银行'), itemKey: 'bank' },
  ], [t]);

  const creatureItems = useMemo(() => [
    { text: t('我的生物'), itemKey: 'pet' },
    { text: t('商店'), itemKey: 'pet-shop' },
    { text: t('背包'), itemKey: 'pet-inventory' },
    { text: t('召唤'), itemKey: 'pet-gacha' },
    { text: t('融合'), itemKey: 'pet-fusion' },
    { text: t('冒险'), itemKey: 'pet-adventure' },
    { text: t('竞技场'), itemKey: 'pet-arena' },
    { text: t('猪头酒吧'), itemKey: 'pet-market' },
  ], [t]);

  const adminItems = useMemo(() => {
    if (!isAdmin()) return [];
    return [
      { text: t('赌场管理'), itemKey: 'casino-admin' },
      { text: t('卡池管理'), itemKey: 'gacha-pools' },
      { text: t('任务管理'), itemKey: 'missions-admin' },
      { text: t('物种管理'), itemKey: 'pet-species-admin' },
      { text: t('物品管理'), itemKey: 'pet-items-admin' },
      { text: t('生物数据'), itemKey: 'pet-users-admin' },
      { text: t('生物发放'), itemKey: 'pet-grant-admin' },
      { text: t('酒吧监控'), itemKey: 'pet-market-admin' },
      { text: t('统计面板'), itemKey: 'pet-stats-admin' },
    ];
  }, [t]);

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
            ? 'bg-[rgba(197,165,90,0.12)] text-[rgb(var(--hogwarts-gold))]'
            : 'text-sidebar-text hover:bg-[rgba(197,165,90,0.08)] hover:text-[rgb(var(--hogwarts-gold))]'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[rgb(var(--hogwarts-gold))] rounded-r" />
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
        'bg-[rgb(var(--hogwarts-sidebar-bg))] text-sidebar-text fixed left-0 top-14 bottom-0 z-40',
        'flex flex-col transition-all duration-300 overflow-hidden'
      )}
      style={{ width: collapsed ? 64 : 240 }}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {/* Portal — always visible, no section header */}
        <div className="px-2 py-0.5">
          <NavItem item={{ text: t('霍格沃茨大厅'), itemKey: 'portal' }} />
        </div>

        {/* Daily section */}
        <CollapsibleSection
          sectionKey="daily"
          label={t('日常')}
          collapsed={collapsed}
          isOpen={!collapsedSections.daily}
          onToggle={() => toggleSection('daily')}
        >
          {dailyItems.map((item) => (
            <NavItem key={item.itemKey} item={item} />
          ))}
        </CollapsibleSection>

        {/* Economy section */}
        <CollapsibleSection
          sectionKey="economy"
          label={t('经济')}
          collapsed={collapsed}
          isOpen={!collapsedSections.economy}
          onToggle={() => toggleSection('economy')}
        >
          {economyItems.map((item) => (
            <NavItem key={item.itemKey} item={item} />
          ))}
        </CollapsibleSection>

        {/* Creatures section */}
        <CollapsibleSection
          sectionKey="creatures"
          label={t('神奇动物')}
          collapsed={collapsed}
          isOpen={!collapsedSections.creatures}
          onToggle={() => toggleSection('creatures')}
        >
          {creatureItems.map((item) => (
            <NavItem key={item.itemKey} item={item} />
          ))}
        </CollapsibleSection>

        {/* Admin section */}
        {isAdmin() && adminItems.length > 0 && (
          <CollapsibleSection
            sectionKey="admin"
            label={t('管理')}
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
            'text-sidebar-text hover:bg-[rgba(197,165,90,0.08)] hover:text-[rgb(var(--hogwarts-gold))]',
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

export default HogwartsSidebar;
