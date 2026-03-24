import { useContext, useMemo, useState, useCallback } from 'react';
import { Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { StatusContext } from '../../contexts/status-context';
import { HtmlRenderer } from '../ui/html-renderer';
import { Badge } from '../ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../ui/tooltip';

const LS_KEY = 'announcement_last_read_time';

const TYPE_COLORS = {
  default: 'bg-blue-500',
  ongoing: 'bg-yellow-500',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  error: 'bg-red-500',
};

function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const pub = new Date(dateStr).getTime();
  if (isNaN(pub)) return '';
  const diff = now - pub;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  return `${months}个月前`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AnnouncementDrawer() {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [open, setOpen] = useState(false);

  const announcementsEnabled = statusState?.status?.announcements_enabled ?? true;
  const announcements = useMemo(() => {
    const raw = statusState?.status?.announcements;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw;
  }, [statusState?.status?.announcements]);

  // Unread logic: compare latest announcement publishDate with localStorage
  const [hasUnread, setHasUnread] = useState(false);

  // Recompute unread state when announcements change or sheet closes
  useMemo(() => {
    if (announcements.length === 0) { setHasUnread(false); return; }
    const lastRead = localStorage.getItem(LS_KEY);
    if (!lastRead) { setHasUnread(true); return; }
    const lastReadTime = parseInt(lastRead, 10);
    if (isNaN(lastReadTime)) { setHasUnread(true); return; }
    setHasUnread(announcements.some((a) => {
      const pub = new Date(a.publishDate).getTime();
      return !isNaN(pub) && pub > lastReadTime;
    }));
  }, [announcements]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    localStorage.setItem(LS_KEY, String(Date.now()));
    setHasUnread(false);
  }, []);

  if (!announcementsEnabled || announcements.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Trigger button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpen}
              className={cn(
                'relative p-2 rounded-md transition-colors',
                'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
              aria-label={t('系统公告')}
            >
              <Megaphone size={16} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-surface" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t('系统公告')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Drawer content */}
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-accent shrink-0" />
            <SheetTitle className="text-base">{t('系统公告')}</SheetTitle>
            <Badge variant="outline" size="sm">{announcements.length}</Badge>
          </div>
          <SheetDescription className="sr-only">{t('系统公告列表')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {announcements.map((item, idx) => {
              const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.default;
              const relative = getRelativeTime(item.publishDate);
              const absolute = formatDate(item.publishDate);

              return (
                <div key={idx} className="relative pl-5">
                  {/* Timeline line */}
                  {idx < announcements.length - 1 && (
                    <div className="absolute left-[3px] top-3 bottom-0 w-px bg-border" />
                  )}
                  {/* Timeline dot */}
                  <div className={cn('absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full ring-2 ring-surface', typeColor)} />

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <span>{relative}</span>
                      <span className="text-text-quaternary">{absolute}</span>
                    </div>
                    <HtmlRenderer
                      content={item.content || ''}
                      className="text-sm text-text-primary prose prose-sm max-w-none"
                    />
                    {item.extra && (
                      <HtmlRenderer
                        content={item.extra}
                        className="text-xs text-text-tertiary"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
