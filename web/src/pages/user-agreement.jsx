import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { API } from '../lib/api';
import { showError } from '../lib/utils';

export default function UserAgreement() {
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setContent(localStorage.getItem('user_agreement') || '');
      try {
        const res = await API.get('/api/user-agreement');
        const { success, message, data } = res.data;
        if (success) {
          let parsed = data;
          if (!data.startsWith('https://')) {
            parsed = marked.parse(data);
          }
          setContent(parsed);
          localStorage.setItem('user_agreement', parsed);
        } else {
          showError(message);
        }
      } catch {
        // error handled by interceptor
      }
      setLoaded(true);
    };
    load();
  }, []);

  if (loaded && content && content.startsWith('https://')) {
    return (
      <div className="w-full">
        <iframe
          src={content}
          className="w-full h-screen border-none"
          title="用户协议"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-text-primary mb-8">
        用户协议
      </h1>
      {!loaded ? (
        <div className="text-text-tertiary animate-pulse">加载中...</div>
      ) : content ? (
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <p className="text-text-tertiary">暂无用户协议内容</p>
      )}
    </div>
  );
}
