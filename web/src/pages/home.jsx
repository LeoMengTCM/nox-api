import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import { ChevronDown } from 'lucide-react';
import { API } from '../lib/api';
import { showSuccess, copy } from '../lib/utils';
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

/* ─── Typewriter ─── */
function Typewriter({ text, baseDelay = 70 }) {
  const [index, setIndex] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    if (index >= text.length) return;
    const char = text[index];
    let delay = baseDelay;
    if (char === '.' || char === ',') delay *= 4;
    else if (char === ' ') delay *= 0.5;
    else delay += Math.random() * 30;
    const t = setTimeout(() => setIndex((i) => i + 1), delay);
    return () => clearTimeout(t);
  }, [index, text, baseDelay]);

  useEffect(() => {
    const t = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {text.slice(0, index)}
      <span
        className={`inline-block w-[2px] h-[0.85em] ml-0.5 align-middle bg-current transition-opacity duration-100 ${
          cursorOn ? 'opacity-50' : 'opacity-0'
        }`}
      />
    </>
  );
}

/* ─── Constants ─── */
const MODEL_PROVIDERS = [
  { name: 'OpenAI', models: 'GPT-4o · o1 · o3', color: '#10b981' },
  { name: 'Anthropic', models: 'Claude Opus · Sonnet', color: '#D97757' },
  { name: 'Google', models: 'Gemini 2.5 · 2.0', color: '#4285f4' },
  { name: 'DeepSeek', models: 'V3 · R1', color: '#5b8def' },
  { name: 'Meta', models: 'Llama 4 · 3.3', color: '#0668e1' },
  { name: 'xAI', models: 'Grok 3 · 3 Mini', color: '#6b7280' },
  { name: 'Mistral', models: 'Large · Medium', color: '#f97316' },
  { name: 'Alibaba', models: 'Qwen 3 · QwQ', color: '#ff6a00' },
];

const FAQ_ITEMS = [
  {
    q: '这是什么？',
    a: '一个个人维护的 AI 模型聚合服务站。把 OpenAI、Claude、Gemini 等主流大模型统一到一个兼容 OpenAI 格式的 API 接口，方便大家使用。',
  },
  {
    q: '怎么开始使用？',
    a: '注册账号后，在控制台创建一个令牌（API Key），然后用这个令牌和本站的 API 地址，就可以在任何支持 OpenAI 接口的客户端中调用了。',
  },
  {
    q: '支持哪些模型？',
    a: '支持 40+ 主流 AI 模型，涵盖对话、写作、编程、图像生成、语音等多种能力。具体可以查看模型定价页面。',
  },
  {
    q: '数据安全吗？',
    a: '所有请求通过加密传输，不记录对话内容，仅保留用量统计用于计费。这是给家人朋友用的站，请放心使用。',
  },
];

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

/* ─── Main Component ─── */
export default function Home() {
  const [statusState] = useStatus();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeContent, setNoticeContent] = useState('');
  const [endpointIndex, setEndpointIndex] = useState(0);
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const quoteRef = useRef(null);
  const quoteInView = useInView(quoteRef, { once: true, margin: '-80px' });

  const systemName = statusState?.status?.system_name || 'Nox API';
  const serverAddress =
    statusState?.status?.server_address || window.location.origin;

  // Load homepage content
  useEffect(() => {
    const load = async () => {
      setHomePageContent(localStorage.getItem('home_page_content') || '');
      try {
        const res = await API.get('/api/home_page_content');
        const { success, data } = res.data;
        if (success) {
          const content = data.startsWith('https://') ? data : marked.parse(data);
          setHomePageContent(content);
          localStorage.setItem('home_page_content', content);
        } else {
          setHomePageContent('');
        }
      } catch {
        // silent
      }
      setHomePageContentLoaded(true);
    };
    load();
  }, []);

  // Notice
  useEffect(() => {
    const check = async () => {
      if (localStorage.getItem('notice_close_date') === new Date().toDateString())
        return;
      try {
        const res = await API.get('/api/notice');
        const { success, data } = res.data;
        if (success && data?.trim()) {
          setNoticeContent(marked.parse(data));
          setNoticeVisible(true);
        }
      } catch {
        // silent
      }
    };
    check();
  }, []);

  // Endpoint cycling
  useEffect(() => {
    const t = setInterval(
      () => setEndpointIndex((i) => (i + 1) % API_ENDPOINTS.length),
      3000
    );
    return () => clearInterval(t);
  }, []);

  // Avatar — try common extensions for admin user
  useEffect(() => {
    const tryLoad = async () => {
      for (const ext of ['jpg', 'png', 'webp', 'jpeg', 'gif']) {
        try {
          const r = await fetch(`/api/user/avatar/user_1.${ext}`, {
            method: 'HEAD',
          });
          if (r.ok) {
            setAvatarSrc(`/api/user/avatar/user_1.${ext}`);
            return;
          }
        } catch {
          // try next
        }
      }
    };
    tryLoad();
  }, []);

  const handleCopyBaseURL = async () => {
    if (await copy(serverAddress)) showSuccess('已复制到剪切板');
  };

  const handleNoticeClose = () => {
    setNoticeVisible(false);
    localStorage.setItem('notice_close_date', new Date().toDateString());
  };

  // Custom content override
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

  /* ─── Default Landing Page ─── */
  return (
    <div className="w-full overflow-x-hidden">
      <NoticeDialog
        open={noticeVisible}
        onClose={handleNoticeClose}
        content={noticeContent}
      />

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-16 md:pt-36 md:pb-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-accent/[0.06] via-accent/[0.02] to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Leo"
                className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover mx-auto ring-2 ring-border shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-accent/10 flex items-center justify-center mx-auto ring-2 ring-border">
                <span className="text-3xl font-serif text-accent">L</span>
              </div>
            )}
          </motion.div>

          {/* Greeting */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-serif text-3xl md:text-5xl font-bold text-text-primary leading-tight tracking-tight"
          >
            Hey, 我是 Leo
          </motion.h1>

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-text-secondary mt-4 leading-relaxed"
          >
            什么都懂一点，生活更精彩一点。
          </motion.p>

          {/* Bio */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-sm text-text-tertiary mt-4 leading-relaxed max-w-md mx-auto"
          >
            中医博士，对编程和 AI 充满好奇。
            <br />
            这是我为家人朋友们搭建的 AI 服务站。
          </motion.p>

          {/* GitHub */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-6"
          >
            <a
              href="https://github.com/LeoMengTCM/nox-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Quote ── */}
      <section ref={quoteRef} className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="py-10 md:py-14 border-y border-accent/15">
            <p className="font-serif italic text-xl md:text-3xl lg:text-4xl text-text-primary leading-relaxed tracking-tight">
              {quoteInView ? (
                <Typewriter
                  text="If we die, we die. But first we live."
                  baseDelay={80}
                />
              ) : (
                <span className="invisible">
                  If we die, we die. But first we live.
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── About & API Endpoint ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="py-16 md:py-24 px-6"
      >
        <div className="max-w-xl mx-auto space-y-8">
          <motion.div variants={fadeUp} custom={0}>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-text-primary text-center mb-4">
              {systemName}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed text-center">
              聚合 OpenAI、Claude、Gemini、DeepSeek 等 40+ 主流 AI
              模型，提供统一的 API 接口。无论你用什么客户端，都可以通过同一个地址接入。
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={0.15}>
            <p className="text-xs text-text-tertiary mb-2 text-center tracking-wide">
              API 地址
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 shadow-sm">
              <div className="flex-1 min-w-0 text-left">
                <span className="text-sm font-mono text-text-primary select-all truncate">
                  {serverAddress}
                </span>
                <span className="text-xs font-mono text-accent/60 ml-1 transition-opacity duration-500">
                  {API_ENDPOINTS[endpointIndex]}
                </span>
              </div>
              <button
                onClick={handleCopyBaseURL}
                className="shrink-0 p-2 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent-subtle transition-colors"
                aria-label="Copy API address"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Models ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="py-16 md:py-24 px-6 bg-background-subtle/50"
      >
        <div className="max-w-2xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="font-serif text-xl md:text-2xl font-semibold text-text-primary text-center mb-10"
          >
            支持的模型
          </motion.h2>

          <motion.div
            variants={fadeUp}
            custom={0.1}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {MODEL_PROVIDERS.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-border bg-surface px-4 py-3.5 text-center hover:border-accent/25 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {p.name}
                  </span>
                </div>
                <span className="text-[11px] text-text-tertiary leading-tight">
                  {p.models}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={0.2}
            className="text-xs text-text-tertiary text-center mt-6"
          >
            + 更多模型持续接入中
          </motion.p>
        </div>
      </motion.section>

      {/* ── Quick Links ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="py-16 md:py-24 px-6"
      >
        <div className="max-w-xl mx-auto">
          <motion.div
            variants={fadeUp}
            custom={0}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {[
              { to: '/console', title: '开始使用', desc: '进入控制台' },
              { to: '/pricing', title: '模型定价', desc: '查看价格' },
              { to: '/guide', title: '接入指南', desc: '快速上手' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-xl border border-border bg-surface px-5 py-4 transition-all hover:border-accent/30 hover:bg-accent-subtle/30 hover:shadow-sm text-center no-underline"
              >
                <div className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {item.desc}
                </div>
              </Link>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── FAQ ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="py-16 md:py-24 px-6 bg-background-subtle/50"
      >
        <div className="max-w-xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="font-serif text-xl md:text-2xl font-semibold text-text-primary text-center mb-8"
          >
            常见问题
          </motion.h2>

          <motion.div
            variants={fadeUp}
            custom={0.1}
            className="rounded-xl border border-border bg-surface overflow-hidden"
          >
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={i > 0 ? 'border-t border-border' : ''}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-hover transition-colors"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary transition-transform duration-200 shrink-0 ml-4 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{
                        duration: 0.25,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

/* ─── Notice Dialog ─── */
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
