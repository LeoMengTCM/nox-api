import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [enabled, setEnabled] = useState(true);

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
          showError(res.data.message || t('加载签到信息失败'));
        }
      }
    } catch {
      showError(t('加载签到信息失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        showSuccess(t('签到成功') + (awarded ? `，${t('获得')} ${renderQuota(awarded)}` : ''));
        setCheckedInToday(true);
        setJustCheckedIn(true);
        // Refresh data
        fetchCheckinStatus(monthKey);
      } else {
        showError(res.data.message || t('签到失败'));
      }
    } catch {
      showError(t('签到失败'));
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
            onClick={handleCheckin}
            disabled={checkedInToday || checkinLoading || loading}
            className={`
              relative flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-medium
              transition-all duration-300 select-none
              ${checkedInToday
                ? 'bg-surface-hover text-text-tertiary cursor-default'
                : 'bg-accent text-white hover:bg-accent/90 active:scale-[0.97] shadow-sm hover:shadow-md cursor-pointer'
              }
              disabled:pointer-events-none
            `}
          >
            <AnimatePresence mode="wait">
              {checkedInToday ? (
                <motion.span
                  key="checked"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Check className="h-4.5 w-4.5" />
                  {t('今日已签到')}
                </motion.span>
              ) : checkinLoading ? (
                <motion.span
                  key="loading"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('签到中...')}
                </motion.span>
              ) : (
                <motion.span
                  key="checkin"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  {t('立即签到')}
                </motion.span>
              )}
            </AnimatePresence>
            {/* Success sparkle effect */}
            {justCheckedIn && (
              <motion.span
                className="absolute inset-0 rounded-xl border-2 border-accent/40"
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </button>
        </motion.div>
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
