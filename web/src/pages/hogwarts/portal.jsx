import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarCheck,
  MessageCircle,
  Trophy,
  Award,
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
  Castle,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { UserContext } from '../../contexts/user-context';
import { isAdmin } from '../../lib/utils';

const sections = [
  {
    title: '日常',
    items: [
      { key: 'checkin', icon: CalendarCheck, label: '每日签到', desc: '每日签到领取额度奖励', path: '/console/hogwarts/checkin' },
      { key: 'community', icon: MessageCircle, label: '社区', desc: '与其他巫师交流互动', path: '/console/hogwarts/community' },
      { key: 'ranking', icon: Trophy, label: '排行榜', desc: '查看各维度排行', path: '/console/hogwarts/ranking' },
      { key: 'titles', icon: Award, label: '称号', desc: '收集并装备魔法称号', path: '/console/hogwarts/titles' },
    ],
  },
  {
    title: '经济',
    items: [
      { key: 'casino', icon: Gem, label: '韦斯莱赌坊', desc: '21点、骰子、轮盘、德州扑克', path: '/console/hogwarts/casino' },
      { key: 'bank', icon: Landmark, label: '古灵阁银行', desc: '活期定期存款，每小时结息', path: '/console/hogwarts/casino/bank' },
    ],
  },
  {
    title: '神奇动物',
    items: [
      { key: 'pet', icon: PawPrint, label: '我的生物', desc: '查看和照料你的神奇生物', path: '/console/hogwarts/pet' },
      { key: 'shop', icon: ShoppingBag, label: '商店', desc: '购买食物和护理用品', path: '/console/hogwarts/pet/shop' },
      { key: 'inventory', icon: Package, label: '背包', desc: '管理你的物品库存', path: '/console/hogwarts/pet/inventory' },
      { key: 'gacha', icon: Dices, label: '召唤', desc: '抽取稀有神奇生物', path: '/console/hogwarts/pet/gacha' },
      { key: 'fusion', icon: Merge, label: '融合', desc: '融合生物提升星级', path: '/console/hogwarts/pet/fusion' },
      { key: 'adventure', icon: Compass, label: '冒险', desc: '派遣生物外出探险', path: '/console/hogwarts/pet/adventure' },
      { key: 'arena', icon: Swords, label: '竞技场', desc: '与其他巫师的生物对战', path: '/console/hogwarts/pet/arena' },
      { key: 'market', icon: Store, label: '猪头酒吧', desc: '交易和拍卖神奇生物', path: '/console/hogwarts/pet/market' },
    ],
  },
];

const HogwartsPortal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Castle size={28} className="text-[rgb(197,165,90)]" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {t('霍格沃茨')}
          </h1>
        </div>
        <p className="text-sm text-text-secondary">
          {t('欢迎来到霍格沃茨魔法世界')}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-3 px-1">
              {t(section.title)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'group text-left p-4 rounded-lg border transition-all duration-150',
                      'bg-surface hover:bg-surface-hover border-border hover:border-border-strong',
                      'hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-2 rounded-md bg-[rgba(197,165,90,0.08)] text-[rgb(197,165,90)] group-hover:bg-[rgba(197,165,90,0.14)] transition-colors">
                        <Icon size={18} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {t(item.label)}
                        </div>
                        <div className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                          {t(item.desc)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin section */}
        {isAdmin() && (
          <div>
            <h2 className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-3 px-1">
              {t('管理')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: '赌场管理', path: '/console/hogwarts/admin/casino' },
                { label: '卡池管理', path: '/console/hogwarts/admin/gacha-pools' },
                { label: '任务管理', path: '/console/hogwarts/admin/missions' },
                { label: '物种管理', path: '/console/hogwarts/admin/pet-species' },
                { label: '物品管理', path: '/console/hogwarts/admin/pet-items' },
                { label: '生物数据', path: '/console/hogwarts/admin/pet-users' },
                { label: '生物发放', path: '/console/hogwarts/admin/pet-grant' },
                { label: '酒吧监控', path: '/console/hogwarts/admin/pet-market' },
                { label: '统计面板', path: '/console/hogwarts/admin/pet-stats' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'text-left px-4 py-3 rounded-lg border transition-all duration-150',
                    'bg-surface hover:bg-surface-hover border-border hover:border-border-strong',
                    'text-sm text-text-secondary hover:text-text-primary'
                  )}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HogwartsPortal;
