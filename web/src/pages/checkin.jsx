import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { API } from '../lib/api';
import { showError, showSuccess, renderQuota } from '../lib/utils';
import { Card } from '../components/ui';
import {
  CalendarCheck,
  Gift,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Coins,
  PawPrint,
  Star,
  Zap,
  Package,
} from 'lucide-react';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function isToday(year, month, day) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

function isCurrentMonth(date) {
  const now = new Date();
  return now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth();
}

function isFutureMonth(date) {
  const now = new Date();
  const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const targetMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return targetMonth > nowMonth;
}

export default function CheckinPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [petRewards, setPetRewards] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = formatMonth(currentDate);

  // Build a map of checkin_date -> quota_awarded
  const checkinMap = useMemo(() => {
    if (!data?.stats?.records) return {};
    const map = {};
    for (const r of data.stats.records) {
      map[r.checkin_date] = r.quota_awarded;
    }
    return map;
  }, [data]);

  const fetchCheckinStatus = useCallback(async (monthStr) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/user/checkin?month=${monthStr}`);
      if (res.data.success) {
        setData(res.data.data);
        setCheckedInToday(res.data.data?.stats?.checked_in_today ?? false);
        setEnabled(res.data.data?.enabled ?? true);
      } else {
        if (res.data.message?.includes('未启用')) {
          setEnabled(false);
        } else {
          showError(res.data.message);
        }
      }
    } catch {
      showError('加载签到信息失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCheckinStatus(monthKey);
  }, [monthKey, fetchCheckinStatus]);

  const handleCheckin = async () => {
    if (checkedInToday || checkinLoading) return;
    setCheckinLoading(true);
    try {
      const res = await API.post('/api/user/checkin');
      if (res.data.success) {
        const awarded = res.data.data?.quota_awarded;
        showSuccess('签到成功' + (awarded ? `，获得 ${renderQuota(awarded)}` : ''));
        setCheckedInToday(true);
        // Capture pet rewards if present
        if (res.data.data?.pet_rewards) {
          setPetRewards(res.data.data.pet_rewards);
        }
        // Refresh data
        fetchCheckinStatus(monthKey);
      } else {
        showError(res.data.message || '签到失败');
      }
    } catch {
      showError('签到失败');
    } finally {
      setCheckinLoading(false);
    }
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (!isFutureMonth(next)) {
      setCurrentDate(next);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Calendar grid data
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const totalCheckins = data?.stats?.total_checkins ?? 0;
  const totalQuota = data?.stats?.total_quota ?? 0;
  const monthCheckins = data?.stats?.checkin_count ?? 0;

  if (!enabled && !loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-hover mb-4">
            <CalendarCheck className="h-8 w-8 text-text-tertiary" />
          </div>
          <h2 className="text-lg font-heading text-text-primary mb-2">{t('签到功能未开启')}</h2>
          <p className="text-sm text-text-tertiary">{t('管理员尚未启用每日签到功能')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-heading text-text-primary">{t('每日签到')}</h1>
        <p className="text-sm text-text-tertiary mt-1">{t('坚持签到，积累额度奖励')}</p>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
              <CalendarCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-tertiary">{t('累计签到')}</p>
              <p className="text-lg font-semibold text-text-primary tabular-nums">
                {loading ? '–' : totalCheckins}
                <span className="text-xs font-normal text-text-tertiary ml-1">{t('天')}</span>
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <Coins className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-tertiary">{t('累计获得')}</p>
              <p className="text-lg font-semibold text-text-primary tabular-nums truncate">
                {loading ? '–' : renderQuota(totalQuota)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
              <Gift className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-tertiary">{t('本月签到')}</p>
              <p className="text-lg font-semibold text-text-primary tabular-nums">
                {loading ? '–' : monthCheckins}
                <span className="text-xs font-normal text-text-tertiary ml-1">{t('天')}</span>
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Checkin button */}
      {isCurrentMonth(currentDate) && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <button
            type="button"
            onClick={handleCheckin}
            disabled={checkedInToday || checkinLoading}
            className={`
              relative flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-medium
              transition-all duration-200 select-none
              ${checkedInToday
                ? 'bg-surface-hover text-text-tertiary cursor-default'
                : checkinLoading
                  ? 'bg-accent/70 text-white cursor-wait'
                  : 'bg-accent text-white hover:bg-accent/90 active:scale-[0.97] shadow-sm hover:shadow-md cursor-pointer'
              }
            `}
          >
            {checkedInToday ? (
              <>
                <Check className="h-4 w-4" />
                <span>{t('今日已签到')}</span>
              </>
            ) : checkinLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>{t('签到中...')}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{t('立即签到')}</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Pet rewards after checkin */}
      {petRewards && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <Card className="p-5 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <PawPrint className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium text-text-primary">{t('魔法生物奖励')}</h3>
            </div>

            <div className="space-y-2">
              {/* Items received */}
              {petRewards.items?.length > 0 && (
                <div className="space-y-1">
                  {petRewards.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Package className="h-3.5 w-3.5 text-text-tertiary" />
                      <span>{item.item_name}</span>
                      <span className="text-text-tertiary">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* EXP awarded */}
              {petRewards.exp_awarded > 0 && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>+{petRewards.exp_awarded} EXP</span>
                  {petRewards.pet_name && (
                    <span className="text-text-tertiary">→ {petRewards.pet_name}</span>
                  )}
                </div>
              )}

              {/* Level up */}
              {petRewards.leveled_up && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex items-center gap-2 text-sm font-medium text-amber-500"
                >
                  <Star className="h-4 w-4 fill-amber-500" />
                  <span>{t('升级了！')}</span>
                </motion.div>
              )}

              {/* Evolution */}
              {petRewards.evolved && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex items-center gap-2 text-sm font-medium text-purple-500"
                >
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>{t('进化了！')}</span>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Checkin tip */}
      {isCurrentMonth(currentDate) && !checkedInToday && (
        <div className="text-center">
          <p className="text-xs text-text-tertiary">
            {t('连续签到可获得更多魔法生物奖励')}
          </p>
        </div>
      )}

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button
              onClick={goToPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToCurrentMonth}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
            >
              {year}{t('年')}{month + 1}{t('月')}
            </button>
            <button
              onClick={goToNextMonth}
              disabled={isFutureMonth(new Date(year, month + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-4 pt-3 pb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs text-text-tertiary font-medium py-1">
                {t(day)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-4 pb-4 gap-y-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasCheckedIn = dateStr in checkinMap;
              const quota = checkinMap[dateStr];
              const today = isToday(year, month, day);
              const isFuture = new Date(year, month, day) > new Date();

              return (
                <div
                  key={day}
                  className="aspect-square flex items-center justify-center relative group"
                >
                  <div
                    className={`
                      relative flex flex-col items-center justify-center w-9 h-9 rounded-full text-sm transition-colors
                      ${today && !hasCheckedIn ? 'ring-1.5 ring-accent/40 text-accent font-semibold' : ''}
                      ${hasCheckedIn ? 'bg-accent/10 text-accent font-medium' : ''}
                      ${isFuture && !hasCheckedIn ? 'text-text-tertiary/40' : ''}
                      ${!hasCheckedIn && !today && !isFuture ? 'text-text-secondary' : ''}
                    `}
                  >
                    {hasCheckedIn ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <span className="text-[13px]">{day}</span>
                    )}
                  </div>

                  {/* Tooltip showing awarded quota */}
                  {hasCheckedIn && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-popover text-popover-text text-[11px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-10 border border-border">
                      <Gift className="h-3 w-3 text-accent" />
                      +{renderQuota(quota)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
