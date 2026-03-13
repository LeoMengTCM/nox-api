import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { API } from '../lib/api';
import { showError } from '../lib/utils';

export default function About() {
  const [about, setAbout] = useState('');
  const [aboutLoaded, setAboutLoaded] = useState(false);
  const currentYear = new Date().getFullYear();

  const displayAbout = async () => {
    setAbout(localStorage.getItem('about') || '');
    try {
      const res = await API.get('/api/about');
      const { success, message, data } = res.data;
      if (success) {
        let aboutContent = data;
        if (!data.startsWith('https://')) {
          aboutContent = marked.parse(data);
        }
        setAbout(aboutContent);
        localStorage.setItem('about', aboutContent);
      } else {
        showError(message);
        setAbout('');
      }
    } catch {
      // error handled by interceptor
    }
    setAboutLoaded(true);
  };

  useEffect(() => {
    displayAbout();
  }, []);

  // Custom content (markdown or iframe)
  if (aboutLoaded && about !== '') {
    if (about.startsWith('https://')) {
      return (
        <div className="w-full">
          <iframe
            src={about}
            className="w-full h-screen border-none"
            title="About"
          />
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: about }}
        />
      </div>
    );
  }

  // Empty / default state
  if (aboutLoaded && about === '') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="text-text-tertiary mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto opacity-40"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <h2 className="font-serif text-2xl font-semibold text-text-primary mb-3">
          关于
        </h2>
        <p className="text-text-secondary mb-6">
          管理员暂时未设置任何关于内容
        </p>
        <p className="text-text-tertiary text-sm">
          可在设置页面设置关于内容，支持 HTML &amp; Markdown
        </p>
        <div className="mt-8 text-text-tertiary text-sm">
          <p>&copy; {currentYear} Nox API</p>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center">
      <div className="text-text-tertiary animate-pulse">加载中...</div>
    </div>
  );
}
