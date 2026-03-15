import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { renderQuota } from '../../lib/utils';

export function AchievementToast({ achievement, onClose }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      dismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  if (!achievement) return null;

  const rewardLabel = achievement.reward_type === 'quota'
    ? renderQuota(achievement.reward_value || 0)
    : `${achievement.reward_value || 0}`;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-sm w-full pointer-events-auto',
        'transition-all duration-300 ease-out',
        visible && !exiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
      )}
      style={{
        animation: visible && !exiting ? 'achievement-bounce 0.5s ease-out' : undefined,
      }}
    >
      <div
        className="rounded-xl border-2 border-[#C5A55A]/60 bg-gradient-to-r from-[#2D1B4E] to-[#3D2B5E] p-4 shadow-[0_0_30px_rgba(197,165,90,0.3)] cursor-pointer"
        onClick={dismiss}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{achievement.icon || '\uD83C\uDFC6'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#C5A55A] uppercase tracking-wider">
              {t('\u6210\u5C31\u89E3\u9501!')}
            </p>
            <p className="text-sm font-heading text-white mt-0.5 truncate">
              {t(achievement.name)}
            </p>
            <p className="text-xs text-white/60 mt-0.5 truncate">
              {t(achievement.description)}
            </p>
            {achievement.reward_value > 0 && (
              <p className="text-xs text-[#C5A55A]/80 mt-1">
                {t('\u5956\u52B1')}: {rewardLabel}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AchievementToastList({ achievements = [], onDismiss }) {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (achievements.length > 0) {
      setQueue((prev) => [...prev, ...achievements]);
    }
  }, [achievements]);

  const handleClose = (index) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    onDismiss?.();
  };

  return (
    <>
      {queue.map((ach, i) => (
        <div key={`${ach.key || ach.id}-${i}`} style={{ top: `${16 + i * 88}px` }} className="fixed right-4 z-50">
          <AchievementToast
            achievement={ach}
            onClose={() => handleClose(i)}
          />
        </div>
      ))}
    </>
  );
}
