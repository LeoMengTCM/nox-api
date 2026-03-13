import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import { API } from '../lib/api';
import { showError, showSuccess, copy } from '../lib/utils';
import { useStatus } from '../contexts/status-context';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../components/ui/dialog';
import { API_ENDPOINTS } from '../constants/common.constant';

export default function Home() {
  const [statusState] = useStatus();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeContent, setNoticeContent] = useState('');
  const [endpointIndex, setEndpointIndex] = useState(0);

  const systemName = statusState?.status?.system_name || 'Nox API';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS;

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    try {
      const res = await API.get('/api/home_page_content');
      const { success, message, data } = res.data;
      if (success) {
        let content = data;
        if (!data.startsWith('https://')) {
          content = marked.parse(data);
        }
        setHomePageContent(content);
        localStorage.setItem('home_page_content', content);
      } else {
        showError(message);
        setHomePageContent('');
      }
    } catch {
      // error handled by interceptor
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess('已复制到剪切板');
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeContent(marked.parse(data));
            setNoticeVisible(true);
          }
        } catch {
          // silent
        }
      }
    };
    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  const handleNoticeClose = () => {
    setNoticeVisible(false);
    localStorage.setItem('notice_close_date', new Date().toDateString());
  };

  // Custom content mode (markdown or iframe)
  if (homePageContentLoaded && homePageContent !== '') {
    return (
      <div className="w-full overflow-x-hidden">
        <NoticeDialog
          open={noticeVisible}
          onClose={handleNoticeClose}
          content={noticeContent}
        />
        {homePageContent.startsWith('https://') ? (
          <iframe
            src={homePageContent}
            className="w-full h-screen border-none"
            title="Home"
          />
        ) : (
          <div
            className="max-w-4xl mx-auto px-6 py-12 prose prose-neutral dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: homePageContent }}
          />
        )}
      </div>
    );
  }

  // Default landing page
  return (
    <div className="w-full overflow-x-hidden">
      <NoticeDialog
        open={noticeVisible}
        onClose={handleNoticeClose}
        content={noticeContent}
      />

      {/* Hero — Personal welcome */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20">
        {/* Warm gradient blob */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-accent/[0.05] via-accent/[0.02] to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          {/* Accent dot decoration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
            className="flex items-center justify-center gap-1.5 mb-8"
          >
            <span className="w-1 h-1 rounded-full bg-accent/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
            <span className="w-1 h-1 rounded-full bg-accent/40" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary leading-[1.15] tracking-tight"
          >
            {systemName}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="text-lg text-text-secondary mt-4 leading-relaxed"
          >
            个人维护的 AI 服务站，提供稳定可靠的模型访问
          </motion.p>
        </div>
      </section>

      {/* About — Brief personal intro */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="pb-12 md:pb-16 px-6"
      >
        <div className="max-w-xl mx-auto">
          <div className="rounded-xl bg-surface/60 border border-border px-6 py-5">
            <p className="text-sm text-text-secondary leading-relaxed">
              这是一个个人维护的 AI API
              中转站，聚合了主流大语言模型，提供 OpenAI
              兼容的标准接口。无论你在开发什么应用，都可以通过同一套
              API 接入不同的模型。
            </p>
            <p className="text-xs text-text-tertiary mt-3">
              支持 OpenAI / Claude / Gemini / DeepSeek 等 40+ 模型
            </p>
          </div>
        </div>
      </motion.section>

      {/* API Endpoint */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="pb-12 md:pb-16 px-6"
      >
        <div className="max-w-xl mx-auto">
          <p className="text-xs text-text-tertiary mb-3 text-center tracking-wide">
            API 地址
          </p>
          <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 shadow-sm w-full">
            <div className="flex-1 text-left min-w-0">
              <span className="text-text-primary text-sm font-mono select-all truncate">
                {serverAddress}
              </span>
              <span className="text-accent/60 text-xs font-mono ml-1 transition-opacity duration-500">
                {endpointItems[endpointIndex]}
              </span>
            </div>
            <button
              onClick={handleCopyBaseURL}
              className="shrink-0 p-2 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent-subtle transition-colors"
              aria-label="Copy API address"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Quick access cards */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="pb-20 md:pb-28 px-6"
      >
        <div className="max-w-xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/console"
              className="group rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent/30 hover:bg-accent-subtle/30 text-center no-underline"
            >
              <div className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                开始使用
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                进入控制台
              </div>
            </Link>

            <Link
              to="/pricing"
              className="group rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent/30 hover:bg-accent-subtle/30 text-center no-underline"
            >
              <div className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                模型定价
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                查看价格
              </div>
            </Link>

            <Link
              to="/guide"
              className="group rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent/30 hover:bg-accent-subtle/30 text-center no-underline"
            >
              <div className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                接入指南
              </div>
              <div className="text-xs text-text-tertiary mt-1">
                快速上手
              </div>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function NoticeDialog({ open, onClose, content }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>公告</DialogTitle>
          <DialogDescription>
            <span className="sr-only">系统公告内容</span>
          </DialogDescription>
        </DialogHeader>
        <div
          className="prose prose-sm prose-neutral dark:prose-invert max-h-[60vh] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <div className="flex justify-end pt-4">
          <DialogClose asChild>
            <Button size="default" onClick={onClose}>
              我知道了
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
