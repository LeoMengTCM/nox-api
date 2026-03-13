import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui';
import { API } from '../lib/api';
import { showError } from '../lib/utils';

export default function PlaygroundPage() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(null);
  const [debugInfo, setDebugInfo] = useState({ request: null, response: null });
  const [apiKey, setApiKey] = useState('');
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    fetchModels();
    fetchApiKey();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchModels = async () => {
    try {
      const res = await API.get('/api/user/models');
      if (res.data?.success) {
        const list = res.data.data || [];
        setModels(list);
        if (list.length > 0) setSelectedModel(list[0].id || list[0]);
      }
    } catch {
      showError('获取模型列表失败');
    }
  };

  const fetchApiKey = async () => {
    try {
      // Get the user's token list
      const res = await API.get('/api/token/?p=0&size=100');
      if (res.data?.success) {
        const items = res.data.data?.items || res.data.data || [];
        // Find an active (status === 1) token
        const activeToken = items.find((t) => t.status === 1) || items[0];
        if (activeToken?.id) {
          // Fetch the full unmasked key
          const keyRes = await API.post(`/api/token/${activeToken.id}/key`);
          if (keyRes.data?.success && keyRes.data.data?.key) {
            setApiKey(keyRes.data.data.key);
            return;
          }
        }
      }
      showError('未找到可用的 API 令牌，请先创建一个令牌');
    } catch {
      showError('获取 API 令牌失败，请先创建一个令牌');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) {
      showError('未找到可用的 API 令牌，请先在令牌管理页面创建一个令牌');
      return;
    }
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setTokensUsed(null);

    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...newMessages]
      : newMessages;

    const requestBody = {
      model: selectedModel,
      messages: allMessages,
      temperature: parseFloat(temperature),
      max_tokens: parseInt(maxTokens),
      stream: true,
    };

    setDebugInfo({ request: requestBody, response: null });

    const assistantMsg = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMsg]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        setDebugInfo((prev) => ({ ...prev, response: errText }));
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let rawResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawResponse += chunk;
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              fullContent += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                return updated;
              });
              if (parsed.usage) {
                setTokensUsed(parsed.usage);
              }
            } catch {
              // ignore parse errors for incomplete chunks
            }
          }
        }
      }

      setDebugInfo((prev) => ({ ...prev, response: rawResponse }));
    } catch (err) {
      if (err.name !== 'AbortError') {
        showError('请求失败: ' + err.message);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '请求失败: ' + err.message,
          };
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setTokensUsed(null);
    setDebugInfo({ request: null, response: null });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-60px)] gap-3 p-3">
      {/* Settings Panel */}
      <Card className="w-64 flex-shrink-0 p-4 overflow-y-auto">
        <h3 className="font-heading text-text-primary text-lg mb-4">设置</h3>

        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-1">模型</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary"
          >
            {models.map((m) => {
              const id = typeof m === 'string' ? m : m.id;
              return (
                <option key={id} value={id}>{id}</option>
              );
            })}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-1">
            Temperature: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-1">Max Tokens</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary"
            min="1"
            max="128000"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-1">系统提示词</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary resize-none"
            rows={6}
            placeholder="输入系统提示词..."
          />
        </div>

        <button
          onClick={clearMessages}
          className="w-full px-4 py-2 bg-background border border-border rounded text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          清空对话
        </button>
      </Card>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface rounded-t-lg border border-b-0 border-border">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-text-secondary">
              输入消息开始对话
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-background border border-border text-text-primary'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans break-words">{msg.content}</pre>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {tokensUsed && (
          <div className="px-4 py-1 bg-surface border-x border-border text-xs text-text-secondary">
            Tokens: {tokensUsed.prompt_tokens} prompt + {tokensUsed.completion_tokens} completion = {tokensUsed.total_tokens} total
          </div>
        )}

        <div className="flex gap-2 p-3 bg-surface rounded-b-lg border border-border">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm text-text-primary resize-none"
            rows={2}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={stopGeneration}
              className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded text-sm hover:bg-red-600 dark:hover:bg-red-500 transition-colors self-end"
            >
              停止
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-4 py-2 bg-accent text-white rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50 self-end"
            >
              发送
            </button>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      <Card className="w-72 flex-shrink-0 p-4 overflow-y-auto">
        <h3 className="font-heading text-text-primary text-lg mb-4">调试</h3>

        <div className="mb-4">
          <h4 className="text-sm text-text-secondary mb-2">请求</h4>
          <pre className="text-xs bg-background p-2 rounded border border-border overflow-auto max-h-60 text-text-primary whitespace-pre-wrap">
            {debugInfo.request ? JSON.stringify(debugInfo.request, null, 2) : '暂无数据'}
          </pre>
        </div>

        <div>
          <h4 className="text-sm text-text-secondary mb-2">响应</h4>
          <pre className="text-xs bg-background p-2 rounded border border-border overflow-auto max-h-96 text-text-primary whitespace-pre-wrap">
            {debugInfo.response || '暂无数据'}
          </pre>
        </div>
      </Card>
    </div>
  );
}
