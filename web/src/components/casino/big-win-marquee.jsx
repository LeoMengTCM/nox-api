import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API } from '../../lib/api';
import { renderQuota } from '../../lib/utils';

const GAME_LABELS = {
  blackjack: '21\u70B9',
  dice: '\u9AB0\u5B50',
  roulette: '\u8F6E\u76D8',
  baccarat: '\u767E\u5BB6\u4E50',
  slots: '\u8001\u864E\u673A',
  poker: '德州扑克',
};

export function BigWinMarquee() {
  const { t } = useTranslation();
  const [wins, setWins] = useState([]);
  const intervalRef = useRef(null);

  const loadBigWins = async () => {
    try {
      const res = await API.get('/api/casino/big-wins?limit=10', { disableDuplicate: true });
      if (res.data.success && res.data.data?.length > 0) {
        setWins(res.data.data);
      }
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    loadBigWins();
    intervalRef.current = setInterval(loadBigWins, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (wins.length === 0) return null;

  const items = wins.map((w, i) => {
    const gameName = t(GAME_LABELS[w.game_type] || w.game_type);
    const multiplier = w.multiplier ? `${Number(w.multiplier).toFixed(1)}x` : '';
    return (
      <span key={i} className="inline-flex items-center gap-1 whitespace-nowrap">
        <span>🏆</span>
        <span className="font-medium text-[#C5A55A]">{w.username}</span>
        <span className="text-white/60">{t('\u5728')}</span>
        <span className="text-white/80">{gameName}</span>
        <span className="text-white/60">{t('\u4E2D\u8D62\u5F97')}</span>
        <span className="font-medium text-red-400">{renderQuota(w.payout || 0)}</span>
        {multiplier && (
          <span className="text-[#C5A55A]/70">({multiplier})</span>
        )}
        {i < wins.length - 1 && <span className="mx-4 text-white/20">|</span>}
      </span>
    );
  });

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2D1B4E]/80 via-[#2D1B4E]/60 to-[#2D1B4E]/80 border border-[#C5A55A]/20 py-2.5 px-4">
      <div className="flex animate-[marquee-scroll_30s_linear_infinite]">
        <div className="flex items-center gap-1 text-sm shrink-0 pr-12">
          {items}
        </div>
        <div className="flex items-center gap-1 text-sm shrink-0 pr-12">
          {items}
        </div>
      </div>
    </div>
  );
}
