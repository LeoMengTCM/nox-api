import React, { useRef, useEffect, useState } from 'react';
import { marked } from 'marked';

/**
 * Detect whether a string is a full HTML document (has <!DOCTYPE or <html),
 * an HTML fragment (starts with < but no doctype/html wrapper),
 * or Markdown/plain text.
 */
function detectContentType(content) {
  if (!content || !content.trim()) return 'empty';
  const trimmed = content.trim();
  if (/^<!DOCTYPE\s/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return 'html-document';
  }
  // HTML fragment: starts with a tag and contains common block-level HTML
  if (/^<[a-z][\s\S]*>/i.test(trimmed) && /<\/(div|p|span|h[1-6]|section|style|table|ul|ol|li|a|br|img)\s*>/i.test(trimmed)) {
    return 'html-fragment';
  }
  return 'markdown';
}

/**
 * Auto-resizing iframe for full HTML documents.
 */
function IframeRenderer({ html, className }) {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          // Wait a tick for styles to apply
          requestAnimationFrame(() => {
            const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
            setHeight(Math.min(Math.max(h, 100), 800));
          });
        }
      } catch {
        // cross-origin, keep default height
      }
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      sandbox="allow-same-origin"
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        border: 'none',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      title="公告内容"
    />
  );
}

/**
 * HtmlRenderer: smart renderer that handles full HTML documents, HTML fragments,
 * and Markdown content appropriately.
 *
 * - Full HTML document (<!DOCTYPE / <html>): rendered in sandboxed iframe
 * - HTML fragment: rendered directly via dangerouslySetInnerHTML
 * - Markdown: parsed with marked then rendered
 */
export function HtmlRenderer({ content, className = '' }) {
  if (!content?.trim()) return null;

  const type = detectContentType(content);

  if (type === 'html-document') {
    return <IframeRenderer html={content} className={className} />;
  }

  const html = type === 'html-fragment' ? content : marked.parse(content);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export { detectContentType };
