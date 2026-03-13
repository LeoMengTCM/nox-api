/*
Copyright (C) 2025 LeoMengTCM

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact leomengtcm@gmail.com
*/

export const CHANNEL_OPTIONS = [
  { value: 1, color: 'green', label: 'OpenAI' },
  {
    value: 2,
    color: 'light-blue',
    label: 'Midjourney Proxy',
  },
  {
    value: 5,
    color: 'blue',
    label: 'Midjourney Proxy Plus',
  },
  {
    value: 36,
    color: 'purple',
    label: 'Suno API',
  },
  { value: 4, color: 'grey', label: 'Ollama' },
  {
    value: 14,
    color: 'indigo',
    label: 'Anthropic Claude',
  },
  {
    value: 33,
    color: 'indigo',
    label: 'AWS Claude',
  },
  { value: 41, color: 'blue', label: 'Vertex AI' },
  {
    value: 3,
    color: 'teal',
    label: 'Azure OpenAI',
  },
  {
    value: 34,
    color: 'purple',
    label: 'Cohere',
  },
  { value: 39, color: 'grey', label: 'Cloudflare' },
  { value: 43, color: 'blue', label: 'DeepSeek' },
  {
    value: 15,
    color: 'blue',
    label: '百度文心千帆',
  },
  {
    value: 46,
    color: 'blue',
    label: '百度文心千帆V2',
  },
  {
    value: 17,
    color: 'orange',
    label: '阿里通义千问',
  },
  {
    value: 18,
    color: 'blue',
    label: '讯飞星火认知',
  },
  {
    value: 16,
    color: 'violet',
    label: '智谱 ChatGLM（已经弃用，请使用智谱 GLM-4V）',
  },
  {
    value: 26,
    color: 'purple',
    label: '智谱 GLM-4V',
  },
  {
    value: 27,
    color: 'blue',
    label: 'Perplexity',
  },
  {
    value: 24,
    color: 'orange',
    label: 'Google Gemini',
  },
  {
    value: 11,
    color: 'orange',
    label: 'Google PaLM2',
  },
  {
    value: 47,
    color: 'blue',
    label: 'Xinference',
  },
  { value: 25, color: 'green', label: 'Moonshot' },
  { value: 20, color: 'green', label: 'OpenRouter' },
  { value: 19, color: 'blue', label: '360 智脑' },
  { value: 23, color: 'teal', label: '腾讯混元' },
  { value: 31, color: 'green', label: '零一万物' },
  { value: 35, color: 'green', label: 'MiniMax' },
  { value: 37, color: 'teal', label: 'Dify' },
  { value: 38, color: 'blue', label: 'Jina' },
  { value: 40, color: 'purple', label: 'SiliconCloud' },
  { value: 42, color: 'blue', label: 'Mistral AI' },
  { value: 8, color: 'pink', label: '自定义渠道' },
  {
    value: 22,
    color: 'blue',
    label: '知识库：FastGPT',
  },
  {
    value: 21,
    color: 'purple',
    label: '知识库：AI Proxy',
  },
  {
    value: 44,
    color: 'purple',
    label: '嵌入模型：MokaAI M3E',
  },
  {
    value: 45,
    color: 'blue',
    label: '字节火山方舟、豆包通用',
  },
  {
    value: 48,
    color: 'blue',
    label: 'xAI',
  },
  {
    value: 49,
    color: 'blue',
    label: 'Coze',
  },
  {
    value: 50,
    color: 'green',
    label: '可灵',
  },
  {
    value: 51,
    color: 'blue',
    label: '即梦',
  },
  {
    value: 52,
    color: 'purple',
    label: 'Vidu',
  },
  {
    value: 53,
    color: 'blue',
    label: 'SubModel',
  },
  {
    value: 54,
    color: 'blue',
    label: '豆包视频',
  },
  {
    value: 55,
    color: 'green',
    label: 'Sora',
  },
  {
    value: 56,
    color: 'blue',
    label: 'Replicate',
  },
  {
    value: 57,
    color: 'blue',
    label: 'Codex (OpenAI OAuth)',
  },
];

// Channel types that support upstream model list fetching in UI.
export const MODEL_FETCHABLE_CHANNEL_TYPES = new Set([
  1, 4, 14, 34, 17, 26, 27, 24, 47, 25, 20, 23, 31, 40, 42, 48, 43,
]);

export const MODEL_TABLE_PAGE_SIZE = 10;

// Model provider categories for grouping models by vendor
export const MODEL_PROVIDER_CATEGORIES = [
  { name: 'OpenAI', prefixes: ['gpt-', 'o1-', 'o1', 'o3-', 'o3', 'o4-', 'o4', 'dall-e', 'text-', 'whisper', 'tts-', 'chatgpt', 'ft:gpt', 'gpt4'], color: 'green' },
  { name: 'Anthropic', prefixes: ['claude'], color: 'orange' },
  { name: 'Google', prefixes: ['gemini', 'gemma', 'palm', 'models/gemini'], color: 'blue' },
  { name: 'Meta', prefixes: ['llama', 'meta-llama', 'codellama'], color: 'violet' },
  { name: 'Mistral', prefixes: ['mistral', 'mixtral', 'codestral', 'pixtral', 'open-mistral', 'open-mixtral', 'ministral'], color: 'purple' },
  { name: 'DeepSeek', prefixes: ['deepseek'], color: 'cyan' },
  { name: 'Qwen', prefixes: ['qwen'], color: 'red' },
  { name: 'Zhipu', prefixes: ['glm', 'chatglm', 'codegeex', 'cogview', 'cogvideo'], color: 'teal' },
  { name: 'Baidu', prefixes: ['ernie', 'ERNIE', 'eb-'], color: 'amber' },
  { name: 'xAI', prefixes: ['grok'], color: 'gray' },
  { name: 'Cohere', prefixes: ['command', 'embed-', 'rerank-'], color: 'pink' },
  { name: 'Moonshot', prefixes: ['moonshot'], color: 'indigo' },
  { name: 'Yi', prefixes: ['yi-'], color: 'lime' },
  { name: 'MiniMax', prefixes: ['minimax', 'abab'], color: 'rose' },
];

const COLOR_CLASS_MAP = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
  grey: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400',
  'light-blue': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
};

export const CHANNEL_TYPE_MAP = Object.fromEntries(
  CHANNEL_OPTIONS.map((opt) => [opt.value, opt.label])
);

export const CHANNEL_TYPE_COLORS = Object.fromEntries(
  CHANNEL_OPTIONS.map((opt) => [opt.value, COLOR_CLASS_MAP[opt.color] || COLOR_CLASS_MAP.gray])
);

export function getProviderColorClass(color) {
  return COLOR_CLASS_MAP[color] || COLOR_CLASS_MAP.gray;
}

export function categorizeModels(models) {
  const categorized = new Map();
  const uncategorized = [];

  for (const model of models) {
    const lower = model.toLowerCase();
    let matched = false;
    for (const cat of MODEL_PROVIDER_CATEGORIES) {
      if (cat.prefixes.some((p) => lower.startsWith(p.toLowerCase()))) {
        if (!categorized.has(cat.name)) {
          categorized.set(cat.name, { ...cat, models: [] });
        }
        categorized.get(cat.name).models.push(model);
        matched = true;
        break;
      }
    }
    if (!matched) uncategorized.push(model);
  }

  const result = [...categorized.values()];
  if (uncategorized.length > 0) {
    result.push({ name: '其他', prefixes: [], color: 'gray', models: uncategorized });
  }
  return result;
}
