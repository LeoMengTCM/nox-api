import React from 'react';
import { Link } from 'react-router-dom';
import { useStatus } from '../contexts/status-context';
import { Button } from '../components/ui/button';

export default function Guide() {
  const [statusState] = useStatus();
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;

  return (
    <div className="w-full overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-accent/[0.05] via-accent/[0.02] to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-text-primary leading-[1.15] tracking-tight">
            接入指南
          </h1>
          <p className="text-lg text-text-secondary mt-4 leading-relaxed">
            几分钟即可完成接入，以下是你需要知道的一切
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 pb-20 md:pb-28 space-y-12">
        {/* Step 1 */}
        <section className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold border border-accent/20">
              1
            </div>
            <div className="space-y-3 min-w-0">
              <h2 className="font-serif text-xl font-semibold text-text-primary">
                获取 API Key
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                登录后进入{' '}
                <Link to="/console/token" className="text-accent hover:underline">
                  控制台 → 令牌管理
                </Link>
                ，点击「创建令牌」。给你的令牌起个名字，选择好额度和过期时间，然后点击创建。
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                创建后会显示一个以{' '}
                <code className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 font-mono">
                  sk-
                </code>{' '}
                开头的密钥，请立即复制保存——它只会显示一次。这个密钥就是你调用 API 的凭证，请妥善保管，不要泄露给他人。
              </p>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold border border-accent/20">
              2
            </div>
            <div className="space-y-3 min-w-0">
              <h2 className="font-serif text-xl font-semibold text-text-primary">
                配置 Base URL
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                将你使用的客户端或代码中的 API 地址（Base URL）设置为：
              </p>
              <div className="rounded-lg border border-border bg-surface p-4 font-mono text-sm text-text-primary select-all break-all">
                {serverAddress}
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">
                我们完全兼容 OpenAI 的接口格式，所以大部分客户端只需要替换 Base URL 和 API Key 就能直接使用。
              </p>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold border border-accent/20">
              3
            </div>
            <div className="space-y-3 min-w-0">
              <h2 className="font-serif text-xl font-semibold text-text-primary">
                发送第一个请求
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                打开终端，粘贴以下命令试试看（记得把{' '}
                <code className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 font-mono">
                  sk-your-key-here
                </code>{' '}
                换成你的真实密钥）：
              </p>
              <div className="rounded-lg border border-border bg-surface p-4 font-mono text-sm text-text-primary overflow-x-auto">
                <pre className="whitespace-pre-wrap break-all m-0">{`curl ${serverAddress}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-your-key-here" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "你好！"}]
  }'`}</pre>
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">
                如果一切顺利，你会收到一段 JSON 格式的回复，里面包含模型的回答。恭喜，接入成功！
              </p>
            </div>
          </div>
        </section>

        {/* Client configs */}
        <section className="space-y-5">
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            常见客户端配置
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            以下是一些常见工具的配置方式，基本都是填入 API Key 和 Base URL 就行。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ChatGPT Next Web / LobeChat */}
            <div className="rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-colors">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                ChatGPT Next Web / LobeChat
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                打开设置 → 找到 API Key 和 Base URL 两个输入框 → 分别填入你的密钥和{' '}
                <code className="text-xs bg-background border border-border rounded px-1 py-0.5 font-mono break-all">
                  {serverAddress}
                </code>
                ，保存即可。
              </p>
            </div>

            {/* Cherry Studio */}
            <div className="rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-colors">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                Cherry Studio
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                设置 → 模型服务商 → 选择 OpenAI → 填入 API Key 和 Base URL，保存后即可在对话中选择模型使用。
              </p>
            </div>

            {/* Python */}
            <div className="rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-colors">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                Python（openai SDK）
              </h3>
              <div className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-text-primary overflow-x-auto">
                <pre className="whitespace-pre-wrap break-all m-0">{`from openai import OpenAI
client = OpenAI(api_key="sk-...", base_url="${serverAddress}/v1")
resp = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"user","content":"Hi"}])`}</pre>
              </div>
            </div>

            {/* Node.js */}
            <div className="rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-colors">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                Node.js（openai SDK）
              </h3>
              <div className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-text-primary overflow-x-auto">
                <pre className="whitespace-pre-wrap break-all m-0">{`import OpenAI from "openai";
const client = new OpenAI({ apiKey: "sk-...", baseURL: "${serverAddress}/v1" });
const res = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hi" }] });`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-text-primary">
            注意事项
          </h2>
          <ul className="space-y-2.5 text-sm text-text-secondary leading-relaxed list-none p-0 m-0">
            <li className="flex items-start gap-2.5">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/50" />
              <span>请妥善保管你的 API Key，不要将其公开在代码仓库、论坛或聊天中。如果不慎泄露，请立即在控制台删除并重新创建。</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/50" />
              <span>账户额度用完后需要充值才能继续使用。你可以在控制台查看剩余额度。</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/50" />
              <span>如果遇到任何问题，欢迎联系管理员获取帮助。</span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center pt-4">
          <Link to="/console/token">
            <Button size="lg">
              前往创建令牌
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
