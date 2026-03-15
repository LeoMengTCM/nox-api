import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, isRoot, renderQuota } from '../lib/utils';
import { cn } from '../lib/cn';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  Separator,
  Checkbox,
  Badge,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../components/ui';
import { JsonMapEditor } from '../components/ui/json-map-editor';
import {
  Settings,
  Globe,
  Users,
  Mail,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Image,
  Eye,
  EyeOff,
  Info,
  Code,
  AlertTriangle,
  ExternalLink,
  Activity,
  Gauge,
  Brain,
  Server,
  Zap,
  MoreHorizontal,
  Lightbulb,
  CreditCard,
  KeyRound,
  CalendarCheck,
  Shield,
  Send,
  MessageSquareMore,
  PawPrint,
} from 'lucide-react';

// Generic settings section component
const SettingsSection = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-base font-medium text-text-primary">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const SettingsField = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const SettingsInput = ({ label, description, value, onChange, type = 'text', placeholder = '' }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-text-primary">{label}</label>
    {description && <p className="text-xs text-text-tertiary">{description}</p>}
    <Input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const SettingsTextarea = ({ label, description, value, onChange, placeholder = '', rows = 3 }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-text-primary">{label}</label>
    {description && <p className="text-xs text-text-tertiary">{description}</p>}
    <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
  </div>
);

// Section header with icon
const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-2.5 mb-1">
    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      {description && <p className="text-xs text-text-tertiary">{description}</p>}
    </div>
  </div>
);

// Logo thumbnail preview
const LogoPreview = ({ url }) => {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [url]);
  if (!url || error) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-hover/50 border border-border">
      <img src={url} alt="Logo preview" className="w-8 h-8 rounded object-contain" onError={() => setError(true)} />
      <span className="text-xs text-text-tertiary truncate">{url}</span>
    </div>
  );
};

// Quota display with USD equivalent
const QuotaDisplay = ({ value, onChange }) => {
  const numVal = parseInt(value) || 0;
  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit')) || 500000;
  const usdEquiv = (numVal / quotaPerUnit).toFixed(2);
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-primary">默认额度</label>
      <p className="text-xs text-text-tertiary">新注册用户获得的初始额度</p>
      <div className="flex items-center gap-3">
        <Input type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="0" className="w-40" />
        {numVal > 0 && (
          <span className="text-xs text-text-secondary px-2 py-1 rounded-md bg-surface-hover">
            ≈ ${usdEquiv} USD
          </span>
        )}
      </div>
    </div>
  );
};

// Markdown preview toggle for textarea content
const PreviewableTextarea = ({ label, description, value, onChange, placeholder, rows = 6 }) => {
  const [previewing, setPreviewing] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-text-primary">{label}</label>
          {description && <p className="text-xs text-text-tertiary">{description}</p>}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPreviewing((v) => !v)}
          className="gap-1.5 text-xs"
        >
          {previewing ? <><EyeOff className="w-3.5 h-3.5" /> 编辑</> : <><Eye className="w-3.5 h-3.5" /> 预览</>}
        </Button>
      </div>
      {previewing ? (
        <div
          className="min-h-[120px] rounded-md border border-border bg-surface-hover/30 px-3 py-2 text-sm text-text-primary prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value || '<span class="text-text-tertiary">暂无内容</span>' }}
        />
      ) : (
        <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
      )}
    </div>
  );
};

// JSON format example hint button
const JsonFormatHint = ({ example, title = '格式示例' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} className="gap-1.5 text-xs text-text-secondary">
        <Code className="w-3.5 h-3.5" /> {title}
      </Button>
      {open && (
        <pre className="mt-1.5 rounded-md border border-border bg-surface-hover/50 px-3 py-2 text-xs text-text-secondary font-mono overflow-x-auto">
          {example}
        </pre>
      )}
    </div>
  );
};

// Helper: safely parse a JSON string to an object, returning {} on failure.
function safeParseJsonObj(raw) {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    return {};
  } catch {
    return {};
  }
}

// Sub-component: "Unset Models" panel that shows enabled channel models
// which are missing from both ModelRatio and ModelPrice.
const UnsetModelsPanel = ({ options, updateOption }) => {
  const [enabledModels, setEnabledModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [defaultRatio, setDefaultRatio] = useState('1');
  const [search, setSearch] = useState('');

  const fetchEnabledModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const res = await API.get('/api/channel/models_enabled');
      if (res.data.success) {
        setEnabledModels(res.data.data || []);
      } else {
        showError(res.data.message || '获取启用模型失败');
      }
    } catch {
      showError('获取启用模型失败');
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchEnabledModels();
  }, [fetchEnabledModels]);

  // Compute which models lack a configured ratio AND price
  const unsetModels = useMemo(() => {
    const ratioMap = safeParseJsonObj(options.ModelRatio);
    const priceMap = safeParseJsonObj(options.ModelPrice);
    const configured = new Set([...Object.keys(ratioMap), ...Object.keys(priceMap)]);
    return enabledModels
      .filter((m) => !configured.has(m))
      .sort((a, b) => a.localeCompare(b));
  }, [enabledModels, options.ModelRatio, options.ModelPrice]);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return unsetModels;
    const q = search.toLowerCase();
    return unsetModels.filter((m) => m.toLowerCase().includes(q));
  }, [unsetModels, search]);

  const toggleSelect = (model) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredModels));
  };

  const selectNone = () => {
    setSelected(new Set());
  };

  const [addSaving, setAddSaving] = useState(false);

  const saveModelRatioDirect = async (newValue, count) => {
    setAddSaving(true);
    try {
      const res = await API.put('/api/option/', { key: 'ModelRatio', value: newValue });
      if (res.data?.success) {
        updateOption('ModelRatio', newValue);
        showSuccess(`已添加 ${count} 个模型到模型倍率并保存`);
        setSelected(new Set());
      } else {
        showError(res.data?.message || '保存失败');
      }
    } catch {
      showError('保存失败');
    } finally {
      setAddSaving(false);
    }
  };

  const addSelectedToRatio = () => {
    const ratio = parseFloat(defaultRatio);
    if (isNaN(ratio)) { showError('请输入有效的倍率数值'); return; }
    if (selected.size === 0) { showError('请至少选择一个模型'); return; }
    const ratioMap = safeParseJsonObj(options.ModelRatio);
    for (const model of selected) { ratioMap[model] = ratio; }
    const sorted = Object.keys(ratioMap).sort().reduce((acc, k) => { acc[k] = ratioMap[k]; return acc; }, {});
    saveModelRatioDirect(JSON.stringify(sorted, null, 2), selected.size);
  };

  const addAllToRatio = () => {
    const ratio = parseFloat(defaultRatio);
    if (isNaN(ratio)) { showError('请输入有效的倍率数值'); return; }
    if (unsetModels.length === 0) return;
    const ratioMap = safeParseJsonObj(options.ModelRatio);
    for (const model of unsetModels) { ratioMap[model] = ratio; }
    const sorted = Object.keys(ratioMap).sort().reduce((acc, k) => { acc[k] = ratioMap[k]; return acc; }, {});
    saveModelRatioDirect(JSON.stringify(sorted, null, 2), unsetModels.length);
  };

  if (loadingModels) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-text-secondary">
          以下模型已在渠道中启用，但尚未配置模型倍率或固定价格。选择模型并设置默认倍率后添加。
        </p>
        <p className="text-xs text-text-tertiary">
          共 {enabledModels.length} 个启用模型，其中 {unsetModels.length} 个未设置倍率
        </p>
      </div>

      {unsetModels.length === 0 ? (
        <div className="border border-border rounded-lg px-4 py-8 text-center">
          <p className="text-sm font-medium text-text-primary">所有模型均已设置倍率</p>
          <p className="text-xs text-text-tertiary mt-1">当前没有未设置定价的启用模型</p>
        </div>
      ) : (
        <>
          {/* Controls row */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">默认倍率</label>
              <Input
                inputSize="sm"
                type="number"
                step="any"
                value={defaultRatio}
                onChange={(e) => setDefaultRatio(e.target.value)}
                className="w-24"
              />
            </div>
            <Button size="sm" variant="primary" onClick={addSelectedToRatio} disabled={selected.size === 0}>
              添加选中 ({selected.size})
            </Button>
            <Button size="sm" variant="secondary" onClick={addAllToRatio}>
              全部添加 ({unsetModels.length})
            </Button>
          </div>

          {/* Search + select controls */}
          <div className="flex items-center gap-2">
            <Input
              inputSize="sm"
              placeholder="搜索模型..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" variant="ghost" onClick={selectAll}>全选</Button>
            <Button size="sm" variant="ghost" onClick={selectNone}>取消全选</Button>
          </div>

          {/* Model list */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
              {filteredModels.map((model) => (
                <label
                  key={model}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 cursor-pointer',
                    'hover:bg-surface-hover transition-colors duration-100',
                    selected.has(model) && 'bg-accent/5'
                  )}
                >
                  <Checkbox
                    checked={selected.has(model)}
                    onCheckedChange={() => toggleSelect(model)}
                  />
                  <span className="text-sm text-text-primary font-mono truncate">{model}</span>
                </label>
              ))}
              {filteredModels.length === 0 && search && (
                <div className="px-3 py-4 text-center text-sm text-text-tertiary">
                  没有匹配的模型
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Sub-component: "Import from Channels" dialog (inline panel) for the Model Ratio editor.
const ImportFromChannelsPanel = ({ options, updateOption, onClose }) => {
  const [enabledModels, setEnabledModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [defaultRatio, setDefaultRatio] = useState('1');
  const [search, setSearch] = useState('');

  const fetchEnabledModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const res = await API.get('/api/channel/models_enabled');
      if (res.data.success) {
        setEnabledModels(res.data.data || []);
      } else {
        showError(res.data.message || '获取启用模型失败');
      }
    } catch {
      showError('获取启用模型失败');
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchEnabledModels();
  }, [fetchEnabledModels]);

  // Models missing from ModelRatio specifically
  const missingModels = useMemo(() => {
    const ratioMap = safeParseJsonObj(options.ModelRatio);
    return enabledModels
      .filter((m) => !(m in ratioMap))
      .sort((a, b) => a.localeCompare(b));
  }, [enabledModels, options.ModelRatio]);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return missingModels;
    const q = search.toLowerCase();
    return missingModels.filter((m) => m.toLowerCase().includes(q));
  }, [missingModels, search]);

  const toggleSelect = (model) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  };

  const importSelected = () => {
    const ratio = parseFloat(defaultRatio);
    if (isNaN(ratio)) {
      showError('请输入有效的倍率数值');
      return;
    }
    if (selected.size === 0) {
      showError('请至少选择一个模型');
      return;
    }
    const ratioMap = safeParseJsonObj(options.ModelRatio);
    for (const model of selected) {
      ratioMap[model] = ratio;
    }
    const sorted = Object.keys(ratioMap).sort().reduce((acc, k) => { acc[k] = ratioMap[k]; return acc; }, {});
    updateOption('ModelRatio', JSON.stringify(sorted, null, 2));
    showSuccess(`已导入 ${selected.size} 个模型`);
    onClose();
  };

  const importAll = () => {
    const ratio = parseFloat(defaultRatio);
    if (isNaN(ratio)) {
      showError('请输入有效的倍率数值');
      return;
    }
    if (missingModels.length === 0) return;
    const ratioMap = safeParseJsonObj(options.ModelRatio);
    for (const model of missingModels) {
      ratioMap[model] = ratio;
    }
    const sorted = Object.keys(ratioMap).sort().reduce((acc, k) => { acc[k] = ratioMap[k]; return acc; }, {});
    updateOption('ModelRatio', JSON.stringify(sorted, null, 2));
    showSuccess(`已导入全部 ${missingModels.length} 个模型`);
    onClose();
  };

  if (loadingModels) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (missingModels.length === 0) {
    return (
      <div className="border border-border rounded-lg p-4 bg-surface-hover/50 space-y-2">
        <p className="text-sm text-text-primary font-medium">所有渠道模型均已配置倍率</p>
        <p className="text-xs text-text-tertiary">没有需要导入的模型</p>
        <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-surface-hover/30 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">从渠道导入模型</p>
          <p className="text-xs text-text-tertiary">{missingModels.length} 个渠道模型尚未配置倍率</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">默认倍率</label>
          <Input
            inputSize="sm"
            type="number"
            step="any"
            value={defaultRatio}
            onChange={(e) => setDefaultRatio(e.target.value)}
            className="w-24"
          />
        </div>
        <Button size="sm" variant="primary" onClick={importSelected} disabled={selected.size === 0}>
          导入选中 ({selected.size})
        </Button>
        <Button size="sm" variant="secondary" onClick={importAll}>
          全部导入 ({missingModels.length})
        </Button>
      </div>

      <Input
        inputSize="sm"
        placeholder="搜索模型..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        <div className="max-h-[250px] overflow-y-auto divide-y divide-border">
          {filteredModels.map((model) => (
            <label
              key={model}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 cursor-pointer',
                'hover:bg-surface-hover transition-colors duration-100',
                selected.has(model) && 'bg-accent/5'
              )}
            >
              <Checkbox
                checked={selected.has(model)}
                onCheckedChange={() => toggleSelect(model)}
              />
              <span className="text-sm text-text-primary font-mono truncate">{model}</span>
            </label>
          ))}
          {filteredModels.length === 0 && search && (
            <div className="px-3 py-3 text-center text-sm text-text-tertiary">没有匹配的模型</div>
          )}
        </div>
      </div>
    </div>
  );
};

const RatioTab = ({ options, updateOption, saveOptions, saving }) => {
  const [ratioTab, setRatioTab] = useState('model');
  const [resetting, setResetting] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);

  const handleResetModelRatio = async () => {
    if (!window.confirm('确定重置模型倍率吗？此修改将不可逆。')) return;
    setResetting(true);
    try {
      const res = await API.post('/api/option/rest_model_ratio');
      if (res.data.success) {
        showSuccess(res.data.message || '重置成功');
        // Reload the page to refresh options
        window.location.reload();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError('重置失败');
    } finally {
      setResetting(false);
    }
  };

  const modelRatioKeys = [
    'ModelRatio', 'CompletionRatio', 'ModelPrice', 'CacheRatio',
    'ImageRatio', 'AudioRatio', 'AudioCompletionRatio', 'ExposeRatioEnabled',
  ];
  const groupRatioKeys = ['GroupRatio', 'UserUsableGroups'];

  return (
    <Card>
      <CardHeader><CardTitle>分组与倍率</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Sub-tab buttons */}
        <div className="flex gap-1 border-b border-border mb-4">
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md',
              'hover:text-text-primary',
              ratioTab === 'model'
                ? 'border-b-2 border-accent text-accent'
                : 'text-text-secondary'
            )}
            onClick={() => setRatioTab('model')}
          >
            模型倍率
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md',
              'hover:text-text-primary',
              ratioTab === 'group'
                ? 'border-b-2 border-accent text-accent'
                : 'text-text-secondary'
            )}
            onClick={() => setRatioTab('group')}
          >
            分组倍率
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md',
              'hover:text-text-primary',
              ratioTab === 'unset'
                ? 'border-b-2 border-accent text-accent'
                : 'text-text-secondary'
            )}
            onClick={() => setRatioTab('unset')}
          >
            未设置模型
          </button>
        </div>

        {/* Sub-tab: Model Ratio */}
        {ratioTab === 'model' && (
          <div className="space-y-6">
            {/* Import from Channels button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImportPanel((v) => !v)}
              >
                {showImportPanel ? '收起导入面板' : '从渠道导入'}
              </Button>
            </div>

            {/* Import panel (collapsible) */}
            {showImportPanel && (
              <ImportFromChannelsPanel
                options={options}
                updateOption={updateOption}
                onClose={() => setShowImportPanel(false)}
              />
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">模型倍率 (ModelRatio)</label>
              <p className="text-xs text-text-tertiary">模型输入倍率，相对于 gpt-3.5-turbo ($0.75/1M tokens) 的倍数</p>
              <JsonMapEditor
                value={options.ModelRatio}
                onChange={(v) => updateOption('ModelRatio', v)}
                keyLabel="模型名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">补全倍率 (CompletionRatio)</label>
              <p className="text-xs text-text-tertiary">模型输出与输入的倍率关系，未设置默认为 1</p>
              <JsonMapEditor
                value={options.CompletionRatio}
                onChange={(v) => updateOption('CompletionRatio', v)}
                keyLabel="模型名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">模型固定价格 (ModelPrice)</label>
              <p className="text-xs text-text-tertiary">固定价格将覆盖倍率设置，按次收费 ($/1k次)</p>
              <JsonMapEditor
                value={options.ModelPrice}
                onChange={(v) => updateOption('ModelPrice', v)}
                keyLabel="模型名称"
                valueLabel="价格"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">缓存倍率 (CacheRatio)</label>
              <p className="text-xs text-text-tertiary">提示缓存倍率，如 Anthropic prompt caching</p>
              <JsonMapEditor
                value={options.CacheRatio}
                onChange={(v) => updateOption('CacheRatio', v)}
                keyLabel="模型名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">图像倍率 (ImageRatio)</label>
              <p className="text-xs text-text-tertiary">图像输入倍率，部分模型支持</p>
              <JsonMapEditor
                value={options.ImageRatio}
                onChange={(v) => updateOption('ImageRatio', v)}
                keyLabel="模型名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">音频倍率 (AudioRatio)</label>
              <p className="text-xs text-text-tertiary">音频输入倍率，部分模型支持</p>
              <JsonMapEditor
                value={options.AudioRatio}
                onChange={(v) => updateOption('AudioRatio', v)}
                keyLabel="模型名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">音频补全倍率 (AudioCompletionRatio)</label>
              <p className="text-xs text-text-tertiary">音频输出补全倍率，部分模型支持</p>
              <JsonMapEditor
                value={options.AudioCompletionRatio}
                onChange={(v) => updateOption('AudioCompletionRatio', v)}
                keyLabel="模型名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">公开倍率信息</p>
                <p className="text-xs text-text-tertiary mt-0.5">允许通过 API 公开查询倍率数据</p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={options.ExposeRatioEnabled === 'true'}
                  onCheckedChange={(v) => updateOption('ExposeRatioEnabled', v ? 'true' : 'false')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="destructive"
                onClick={handleResetModelRatio}
                disabled={resetting}
              >
                {resetting ? '重置中...' : '重置模型倍率'}
              </Button>
              <Button
                variant="primary"
                onClick={() => saveOptions(modelRatioKeys)}
                loading={saving}
              >
                保存模型倍率
              </Button>
            </div>
          </div>
        )}

        {/* Sub-tab: Group Ratio */}
        {ratioTab === 'group' && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">分组倍率 (GroupRatio)</label>
              <p className="text-xs text-text-tertiary">分组名到倍率的映射，例如 &quot;vip&quot;: 0.5 表示 vip 分组倍率为 0.5</p>
              <JsonMapEditor
                value={options.GroupRatio}
                onChange={(v) => updateOption('GroupRatio', v)}
                keyLabel="分组名称"
                valueLabel="倍率"
                valueType="number"
                searchable={true}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">用户可用分组 (UserUsableGroups)</label>
              <p className="text-xs text-text-tertiary">用户新建令牌时可选的分组，键为分组 ID，值为显示名称</p>
              <JsonMapEditor
                value={options.UserUsableGroups}
                onChange={(v) => updateOption('UserUsableGroups', v)}
                keyLabel="分组ID"
                valueLabel="显示名称"
                valueType="string"
                searchable={true}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                onClick={() => saveOptions(groupRatioKeys)}
                loading={saving}
              >
                保存分组倍率
              </Button>
            </div>
          </div>
        )}

        {/* Sub-tab: Unset Models */}
        {ratioTab === 'unset' && (
          <div className="space-y-6">
            <UnsetModelsPanel options={options} updateOption={updateOption} />
            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                onClick={() => saveOptions(modelRatioKeys)}
                loading={saving}
              >
                保存模型倍率
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Setting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'operation');

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      if (res.data.success) {
        const raw = res.data.data;
        // Backend returns [{key, value}, ...] array — transform to {key: value} map
        if (Array.isArray(raw)) {
          const obj = {};
          for (const opt of raw) {
            if (opt.key) obj[opt.key] = opt.value;
          }
          setOptions(obj);
        } else {
          setOptions(raw || {});
        }
      } else {
        showError(res.data.message);
      }
    } catch {
      showError('获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const updateOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const saveOptions = async (keys) => {
    setSaving(true);
    try {
      const errors = [];
      for (const k of keys) {
        const val = options[k];
        // Skip keys that have no value (never loaded / never set)
        if (val === undefined || val === null || val === '') continue;
        const res = await API.put('/api/option/', { key: k, value: String(val) });
        if (!res.data?.success) {
          errors.push(res.data?.message || `保存 ${k} 失败`);
        }
      }
      if (errors.length > 0) {
        showError(errors.join('；'));
      } else {
        showSuccess('保存成功');
      }
    } catch (err) {
      showError(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: 'operation', label: '运营设置' },
    { key: 'dashboard', label: '仪表盘' },
    { key: 'chat', label: '聊天设置' },
    { key: 'drawing', label: '绘图设置' },
    { key: 'payment', label: '支付设置' },
    { key: 'ratio', label: '分组与倍率' },
    { key: 'ratelimit', label: '限速设置' },
    { key: 'model', label: '模型设置' },
    { key: 'deployment', label: '模型部署' },
    { key: 'performance', label: '性能设置' },
    { key: 'system', label: '系统设置' },
    { key: 'other', label: '其他设置' },
    { key: 'pet', label: '神奇动物设置' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">系统设置</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs px-3 py-1.5">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Operation Settings */}
        <TabsContent value="operation">
          <Card>
            <CardHeader><CardTitle>运营设置</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader icon={Settings} title="通用" description="站点基本信息与品牌设置" />
              <div className="space-y-3">
                <SettingsInput label="系统名称" description="显示在浏览器标题栏和页面顶部的站点名称" value={options.SystemName} onChange={(v) => updateOption('SystemName', v)} placeholder="例如：Nox API" />
                <div>
                  <SettingsInput label="Logo URL" description="站点 Logo 图片地址，建议使用 SVG 或透明 PNG" value={options.Logo} onChange={(v) => updateOption('Logo', v)} placeholder="https://example.com/logo.svg" />
                  <LogoPreview url={options.Logo} />
                </div>
                <SettingsTextarea label="Footer HTML" description="页面底部内容，支持 HTML 和 Markdown 语法" value={options.Footer} onChange={(v) => updateOption('Footer', v)} placeholder="<p>Powered by Nox API</p>" />
                <SettingsInput label="服务器地址" description="对外公开的 API 基础 URL，用于生成文档链接和令牌调用地址" value={options.ServerAddress} onChange={(v) => updateOption('ServerAddress', v)} placeholder="https://api.example.com" />
                <SettingsField label="自用模式" description="开启后，未配置倍率/价格的模型也可使用（默认倍率 37.5），关闭时未配置的模型将被拒绝">
                  <Switch checked={options.SelfUseModeEnabled === 'true'} onCheckedChange={(v) => updateOption('SelfUseModeEnabled', v ? 'true' : 'false')} />
                </SettingsField>
              </div>
              <Separator />
              <SectionHeader icon={Users} title="注册控制" description="管理新用户注册与验证方式" />
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">关闭注册</p>
                    <p className="text-xs text-text-tertiary mt-0.5">关闭后不允许新用户注册</p>
                    {options.RegisterEnabled === 'false' && (
                      <Badge variant="warning" size="sm" className="mt-1.5">
                        <AlertTriangle className="w-3 h-3 mr-1" /> 新用户无法注册
                      </Badge>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Switch checked={options.RegisterEnabled === 'false'} onCheckedChange={(v) => updateOption('RegisterEnabled', v ? 'false' : 'true')} />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">邮箱验证</p>
                    <p className="text-xs text-text-tertiary mt-0.5">注册时需要验证邮箱，请先在「系统设置」中配置 SMTP</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Switch checked={options.EmailVerificationEnabled === 'true'} onCheckedChange={(v) => updateOption('EmailVerificationEnabled', v ? 'true' : 'false')} />
                  </div>
                </div>
                <QuotaDisplay value={options.QuotaForNewUser} onChange={(v) => updateOption('QuotaForNewUser', v)} />
              </div>
              <Separator />
              <SectionHeader icon={CalendarCheck} title="签到功能" description="配置用户每日签到的额度奖励" />
              <div className="space-y-3">
                <SettingsField label="启用签到功能" description="开启后用户可每日签到获取额度奖励">
                  <Switch checked={options['checkin_setting.enabled'] === 'true'} onCheckedChange={(v) => updateOption('checkin_setting.enabled', v ? 'true' : 'false')} />
                </SettingsField>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">最小奖励额度</label>
                  <p className="text-xs text-text-tertiary">每次签到随机奖励的最小额度值</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={options['checkin_setting.min_quota'] || ''} onChange={(e) => updateOption('checkin_setting.min_quota', e.target.value)} placeholder="0" className="w-40" />
                    {parseInt(options['checkin_setting.min_quota']) > 0 && (
                      <span className="text-xs text-text-secondary px-2 py-1 rounded-md bg-surface-hover">
                        ≈ {renderQuota(parseInt(options['checkin_setting.min_quota']))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">最大奖励额度</label>
                  <p className="text-xs text-text-tertiary">每次签到随机奖励的最大额度值</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={options['checkin_setting.max_quota'] || ''} onChange={(e) => updateOption('checkin_setting.max_quota', e.target.value)} placeholder="0" className="w-40" />
                    {parseInt(options['checkin_setting.max_quota']) > 0 && (
                      <span className="text-xs text-text-secondary px-2 py-1 rounded-md bg-surface-hover">
                        ≈ {renderQuota(parseInt(options['checkin_setting.max_quota']))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <SectionHeader icon={MessageSquareMore} title="社区功能" description="配置社区帖子、转发和通知功能" />
              <div className="space-y-3">
                <SettingsField label="启用社区功能" description="开启后用户可发帖、关注、评论、转发和收到通知">
                  <Switch checked={options['social_setting.enabled'] === 'true'} onCheckedChange={(v) => updateOption('social_setting.enabled', v ? 'true' : 'false')} />
                </SettingsField>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">帖子最大字数</label>
                  <p className="text-xs text-text-tertiary">单条帖子允许的最大字符数</p>
                  <Input type="number" value={options['social_setting.max_post_length'] || ''} onChange={(e) => updateOption('social_setting.max_post_length', e.target.value)} placeholder="500" className="w-40" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['SystemName', 'Logo', 'Footer', 'ServerAddress', 'SelfUseModeEnabled', 'RegisterEnabled', 'EmailVerificationEnabled', 'QuotaForNewUser', 'checkin_setting.enabled', 'checkin_setting.min_quota', 'checkin_setting.max_quota', 'social_setting.enabled', 'social_setting.max_post_length'])} loading={saving}>
                  保存运营设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Settings */}
        <TabsContent value="dashboard">
          <Card>
            <CardHeader><CardTitle>仪表盘设置</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader icon={LayoutDashboard} title="公告与内容" description="配置仪表盘展示的信息与链接" />
              <PreviewableTextarea label="公告内容" description="支持 HTML 语法，将展示在用户仪表盘顶部" value={options.Notice} onChange={(v) => updateOption('Notice', v)} rows={6} placeholder="在这里输入公告内容..." />
              <Separator />
              <SettingsInput label="API 文档链接" description="用户仪表盘中展示的 API 使用文档链接地址" value={options.DocsLink} onChange={(v) => updateOption('DocsLink', v)} placeholder="https://docs.example.com" />
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-text-primary">FAQ 内容</label>
                    <p className="text-xs text-text-tertiary">常见问题列表，以 JSON 数组格式配置，展示在仪表盘中</p>
                  </div>
                  <JsonFormatHint example={'[\n  { "q": "如何获取 API Key？", "a": "在令牌页面创建新令牌即可获得" },\n  { "q": "支持哪些模型？", "a": "支持 GPT-4、Claude、Gemini 等主流模型" }\n]'} />
                </div>
                <Textarea value={options.FAQ || ''} onChange={(e) => updateOption('FAQ', e.target.value)} rows={4} placeholder='[{"q":"问题","a":"回答"}]' />
              </div>
              <Separator />
              <SettingsInput label="Uptime Kuma URL" description="Uptime Kuma 是开源的服务监控工具，配置后仪表盘将展示服务可用性状态" value={options.UptimeKumaUrl} onChange={(v) => updateOption('UptimeKumaUrl', v)} placeholder="https://status.example.com" />
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['Notice', 'DocsLink', 'FAQ', 'UptimeKumaUrl'])} loading={saving}>保存仪表盘设置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Settings */}
        <TabsContent value="chat">
          <Card>
            <CardHeader><CardTitle>聊天设置</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader icon={MessageSquare} title="聊天链接" description="配置用户可访问的第三方聊天界面" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-text-primary">聊天链接列表</label>
                    <p className="text-xs text-text-tertiary">配置后将在用户界面展示快捷聊天入口，支持多个链接</p>
                  </div>
                  <JsonFormatHint example={'[\n  { "name": "ChatGPT Next Web", "url": "https://chat.example.com" },\n  { "name": "Lobe Chat", "url": "https://lobe.example.com" }\n]'} />
                </div>
                <Textarea value={options.ChatLinks || ''} onChange={(e) => updateOption('ChatLinks', e.target.value)} rows={4} placeholder='[{"name":"Chat","url":"https://..."}]' />
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['ChatLinks'])} loading={saving}>保存聊天设置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drawing Settings */}
        <TabsContent value="drawing">
          <Card>
            <CardHeader><CardTitle>绘图设置</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader icon={Palette} title="AI 绘图" description="管理 AI 图像生成相关功能" />
              <SettingsField label="启用绘图功能" description="开启后用户可使用 Midjourney、DALL-E 等 AI 绘图功能">
                <Switch checked={options.DrawingEnabled === 'true'} onCheckedChange={(v) => updateOption('DrawingEnabled', v ? 'true' : 'false')} />
              </SettingsField>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-hover/30 p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-info" />
                <div className="text-xs text-text-secondary space-y-1">
                  <p>绘图功能支持以下服务：</p>
                  <ul className="list-disc list-inside space-y-0.5 text-text-tertiary">
                    <li>Midjourney (需配置相应渠道)</li>
                    <li>DALL-E (通过 OpenAI 渠道)</li>
                    <li>Stable Diffusion (需配置相应渠道)</li>
                  </ul>
                  <p className="text-text-tertiary">启用后，绘图任务将出现在「任务」页面中，用户可查看生成进度与结果。</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['DrawingEnabled'])} loading={saving}>保存绘图设置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-accent" />
                支付设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingsField label="启用在线支付" description="开启后用户可通过 Stripe 在线充值余额">
                <Switch checked={options.PaymentEnabled === 'true'} onCheckedChange={(v) => updateOption('PaymentEnabled', v ? 'true' : 'false')} />
              </SettingsField>

              <Separator />

              <div className="space-y-4">
                <SectionHeader icon={CreditCard} title="Stripe 配置" description="连接 Stripe 以启用在线支付功能" />
                <div className={cn('space-y-3 transition-opacity', options.PaymentEnabled !== 'true' && 'opacity-50 pointer-events-none')}>
                  <SettingsInput
                    label="Stripe Webhook Secret"
                    description="在 Stripe Dashboard → Developers → Webhooks 中创建 Webhook 后获取，以 whsec_ 开头"
                    value={options.StripeWebhookSecret}
                    onChange={(v) => updateOption('StripeWebhookSecret', v)}
                    placeholder="whsec_..."
                  />
                  <SettingsInput
                    label="Stripe API Key"
                    description="Stripe 密钥，在 Stripe Dashboard → Developers → API keys 中获取，以 sk_live_ 或 sk_test_ 开头"
                    value={options.StripeApiKey}
                    onChange={(v) => updateOption('StripeApiKey', v)}
                    placeholder="sk_live_..."
                  />
                  {options.ServerAddress && (
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-hover/30 p-3">
                      <Info className="h-4 w-4 mt-0.5 shrink-0 text-info" />
                      <div className="text-xs text-text-secondary space-y-1">
                        <p>配置完成后，需要在 Stripe Dashboard 中设置 Webhook 端点指向：</p>
                        <code className="block px-2 py-1 rounded bg-surface text-text-primary font-mono text-xs border border-border">
                          {options.ServerAddress}/api/stripe/webhook
                        </code>
                      </div>
                    </div>
                  )}
                  {!options.ServerAddress && (
                    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                      <p className="text-xs text-text-secondary">
                        请先在「运营设置」中配置服务器地址，以便生成正确的 Webhook 端点 URL
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['PaymentEnabled', 'StripeWebhookSecret', 'StripeApiKey'])} loading={saving}>保存支付设置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ratio Settings */}
        <TabsContent value="ratio">
          <RatioTab options={options} updateOption={updateOption} saveOptions={saveOptions} saving={saving} />
        </TabsContent>

        {/* Rate Limit */}
        <TabsContent value="ratelimit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-accent" />
                限速设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingsInput
                label="全局请求速率限制"
                description="所有用户共享的每分钟最大请求数，0 表示不限制"
                value={options.GlobalApiRateLimitNum}
                onChange={(v) => updateOption('GlobalApiRateLimitNum', v)}
                type="number"
                placeholder="0"
              />
              <SettingsInput
                label="默认用户速率限制"
                description="单个用户每分钟最大请求数，0 表示不限制"
                value={options.DefaultUserRateLimitNum}
                onChange={(v) => updateOption('DefaultUserRateLimitNum', v)}
                type="number"
                placeholder="0"
              />
              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-hover/30 p-3">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                <p className="text-xs text-text-secondary">提示：可在分组设置中为不同分组配置独立的速率限制</p>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['GlobalApiRateLimitNum', 'DefaultUserRateLimitNum'])} loading={saving}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Settings */}
        <TabsContent value="model">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                模型设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingsTextarea
                label="全局模型重定向"
                description='将请求中的模型名称重定向到其他模型。JSON 格式: {"源模型": "目标模型"}'
                value={options.ModelRedirect}
                onChange={(v) => updateOption('ModelRedirect', v)}
                rows={6}
                placeholder={'{\n  "gpt-4": "gpt-4o",\n  "claude-3-opus": "claude-3.5-sonnet"\n}'}
              />
              <Separator />
              <SettingsInput
                label="Claude Max Tokens 倍率"
                description="调整 Claude 模型的 max_tokens 参数，默认 1"
                value={options.ClaudeMaxTokensRatio}
                onChange={(v) => updateOption('ClaudeMaxTokensRatio', v)}
                placeholder="1"
              />
              <SettingsInput
                label="Gemini Max Tokens"
                description="Gemini 模型的最大 token 数"
                value={options.GeminiMaxTokens}
                onChange={(v) => updateOption('GeminiMaxTokens', v)}
                type="number"
                placeholder="8192"
              />
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['ModelRedirect', 'ClaudeMaxTokensRatio', 'GeminiMaxTokens'])} loading={saving}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Deployment */}
        <TabsContent value="deployment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-accent" />
                模型部署设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingsField label="启用模型部署" description="启用后可通过 API 管理模型部署，适用于 io.net 等 GPU 部署服务">
                <Switch checked={options.ModelDeploymentEnabled === 'true'} onCheckedChange={(v) => updateOption('ModelDeploymentEnabled', v ? 'true' : 'false')} />
              </SettingsField>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-hover/30 p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-info" />
                <p className="text-xs text-text-secondary">启用模型部署后，管理员可通过模型部署页面创建、管理和监控部署任务，支持与外部 GPU 服务商集成。</p>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['ModelDeploymentEnabled'])} loading={saving}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                性能设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingsField label="启用内存缓存" description="将频繁查询的数据缓存到内存，减少数据库压力">
                <Switch checked={options.MemoryCacheEnabled === 'true'} onCheckedChange={(v) => updateOption('MemoryCacheEnabled', v ? 'true' : 'false')} />
              </SettingsField>
              <SettingsInput
                label="同步频率(秒)"
                description="内存缓存与数据库同步的间隔，单位秒，默认 600"
                value={options.SyncFrequency}
                onChange={(v) => updateOption('SyncFrequency', v)}
                type="number"
                placeholder="600"
              />
              <SettingsInput
                label="批量更新频率(秒)"
                description="批量更新用额度等数据的间隔，单位秒，默认 300"
                value={options.BatchUpdateInterval}
                onChange={(v) => updateOption('BatchUpdateInterval', v)}
                type="number"
                placeholder="300"
              />
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-subtle/30 p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                <p className="text-xs text-text-secondary">修改性能参数后需要重启服务才能生效</p>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['MemoryCacheEnabled', 'SyncFrequency', 'BatchUpdateInterval'])} loading={saving}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-accent" />
                系统设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* --- OAuth Section --- */}
              <div className="space-y-4">
                <SectionHeader icon={KeyRound} title="OAuth 登录" description="配置第三方登录方式" />

                {/* GitHub OAuth */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <SettingsField label="GitHub OAuth" description="允许用户使用 GitHub 账号登录">
                    <Switch checked={options.GitHubOAuthEnabled === 'true'} onCheckedChange={(v) => updateOption('GitHubOAuthEnabled', v ? 'true' : 'false')} />
                  </SettingsField>
                  <div className={cn('space-y-3 transition-opacity', options.GitHubOAuthEnabled !== 'true' && 'opacity-40 pointer-events-none')}>
                    <SettingsInput
                      label="GitHub Client ID"
                      description="在 GitHub → Settings → Developer settings → OAuth Apps 中获取"
                      value={options.GitHubClientId}
                      onChange={(v) => updateOption('GitHubClientId', v)}
                      placeholder="Ov23li..."
                    />
                    <SettingsInput
                      label="GitHub Client Secret"
                      description="创建 OAuth App 后生成的密钥，请妥善保管"
                      value={options.GitHubClientSecret}
                      onChange={(v) => updateOption('GitHubClientSecret', v)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Discord OAuth */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <SettingsField label="Discord OAuth" description="允许用户使用 Discord 账号登录">
                    <Switch checked={options['discord.enabled'] === 'true'} onCheckedChange={(v) => updateOption('discord.enabled', v ? 'true' : 'false')} />
                  </SettingsField>
                  <div className={cn('space-y-3 transition-opacity', options['discord.enabled'] !== 'true' && 'opacity-40 pointer-events-none')}>
                    <SettingsInput
                      label="Discord Client ID"
                      description="在 Discord Developer Portal → Applications → OAuth2 中获取"
                      value={options['discord.client_id']}
                      onChange={(v) => updateOption('discord.client_id', v)}
                      placeholder="应用程序 ID"
                    />
                    <SettingsInput
                      label="Discord Client Secret"
                      description="OAuth2 页面中的 Client Secret"
                      value={options['discord.client_secret']}
                      onChange={(v) => updateOption('discord.client_secret', v)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* OIDC */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <SettingsField label="OIDC 登录" description="通过 OpenID Connect 协议接入自定义身份提供商">
                    <Switch checked={options['oidc.enabled'] === 'true'} onCheckedChange={(v) => updateOption('oidc.enabled', v ? 'true' : 'false')} />
                  </SettingsField>
                  <div className={cn('space-y-3 transition-opacity', options['oidc.enabled'] !== 'true' && 'opacity-40 pointer-events-none')}>
                    <SettingsInput
                      label="OIDC Client ID"
                      description="身份提供商分配的客户端 ID"
                      value={options['oidc.client_id']}
                      onChange={(v) => updateOption('oidc.client_id', v)}
                      placeholder="client-id"
                    />
                    <SettingsInput
                      label="OIDC Client Secret"
                      description="身份提供商分配的客户端密钥"
                      value={options['oidc.client_secret']}
                      onChange={(v) => updateOption('oidc.client_secret', v)}
                      placeholder="••••••••"
                    />
                    <SettingsInput
                      label="Well-Known URL"
                      description="OIDC 发现端点，如 https://accounts.google.com/.well-known/openid-configuration"
                      value={options['oidc.well_known']}
                      onChange={(v) => updateOption('oidc.well_known', v)}
                      placeholder="https://.../.well-known/openid-configuration"
                    />
                  </div>
                </div>

                {/* WeChat OAuth */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <SettingsField label="微信登录" description="允许用户通过微信扫码登录">
                    <Switch checked={options.WeChatAuthEnabled === 'true'} onCheckedChange={(v) => updateOption('WeChatAuthEnabled', v ? 'true' : 'false')} />
                  </SettingsField>
                  <div className={cn('space-y-3 transition-opacity', options.WeChatAuthEnabled !== 'true' && 'opacity-40 pointer-events-none')}>
                    <SettingsInput
                      label="微信服务器地址"
                      description="微信授权服务的回调地址"
                      value={options.WeChatServerAddress}
                      onChange={(v) => updateOption('WeChatServerAddress', v)}
                      placeholder="https://..."
                    />
                    <SettingsInput
                      label="微信服务器 Token"
                      description="微信公众号后台配置的 Token"
                      value={options.WeChatServerToken}
                      onChange={(v) => updateOption('WeChatServerToken', v)}
                      placeholder="Token"
                    />
                    <SettingsInput
                      label="微信公众号二维码 URL"
                      description="用于登录页面展示的公众号二维码图片地址"
                      value={options.WeChatAccountQRCodeImageURL}
                      onChange={(v) => updateOption('WeChatAccountQRCodeImageURL', v)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* --- SMTP Section --- */}
              <div className="space-y-4">
                <SectionHeader icon={Mail} title="SMTP 邮件" description="配置邮件发送服务，用于邮箱验证和通知" />
                <SettingsInput
                  label="SMTP 服务器"
                  description="邮件服务器地址，如 smtp.gmail.com、smtp.qq.com、smtp.163.com"
                  value={options.SMTPServer}
                  onChange={(v) => updateOption('SMTPServer', v)}
                  placeholder="smtp.example.com"
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">SMTP 端口</label>
                  <p className="text-xs text-text-tertiary">选择邮件服务器端口，不同端口对应不同的加密方式</p>
                  {(['25', '465', '587'].includes(options.SMTPPort) || !options.SMTPPort) && options._smtpPortCustom !== 'true' ? (
                    <Select
                      value={options.SMTPPort || ''}
                      onValueChange={(v) => {
                        if (v === '__other__') {
                          updateOption('SMTPPort', '');
                          updateOption('_smtpPortCustom', 'true');
                        } else {
                          updateOption('SMTPPort', v);
                          updateOption('_smtpPortCustom', '');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择端口..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 — SMTP（明文）</SelectItem>
                        <SelectItem value="465">465 — SMTPS（SSL）</SelectItem>
                        <SelectItem value="587">587 — SMTP（STARTTLS）</SelectItem>
                        <SelectItem value="__other__">其他自定义端口</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={options.SMTPPort || ''}
                        onChange={(e) => updateOption('SMTPPort', e.target.value)}
                        placeholder="自定义端口"
                        className="w-40"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { updateOption('SMTPPort', '587'); updateOption('_smtpPortCustom', ''); }}
                        className="text-xs"
                      >
                        选择常用端口
                      </Button>
                    </div>
                  )}
                </div>
                <SettingsField label="启用 SSL" description="端口 465 通常需要启用 SSL">
                  <Switch checked={options.SMTPSSLEnabled === 'true'} onCheckedChange={(v) => updateOption('SMTPSSLEnabled', v ? 'true' : 'false')} />
                </SettingsField>
                <SettingsInput
                  label="SMTP 账号"
                  description="用于登录邮件服务器的账号，通常是邮箱地址"
                  value={options.SMTPAccount}
                  onChange={(v) => updateOption('SMTPAccount', v)}
                  placeholder="user@example.com"
                />
                <SettingsInput
                  label="SMTP Token / 密码"
                  description="邮件服务器的登录密码或应用专用密码（如 Gmail 的 App Password）"
                  value={options.SMTPToken}
                  onChange={(v) => updateOption('SMTPToken', v)}
                  placeholder="••••••••"
                />
                <SettingsInput
                  label="发件人邮箱"
                  description="邮件显示的发件人地址，部分服务商要求与 SMTP 账号一致"
                  value={options.SMTPFrom}
                  onChange={(v) => updateOption('SMTPFrom', v)}
                  placeholder="noreply@example.com"
                />
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      if (!options.SMTPServer || !options.SMTPPort || !options.SMTPAccount || !options.SMTPToken) {
                        showError('请先完整填写 SMTP 配置');
                        return;
                      }
                      showInfo('发送测试邮件功能即将上线');
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    发送测试邮件
                  </Button>
                </div>
              </div>

              <Separator />

              {/* --- Turnstile Section --- */}
              <div className="space-y-4">
                <SectionHeader icon={Shield} title="Turnstile 验证" description="Cloudflare Turnstile 人机验证" />
                <SettingsField label="启用 Turnstile" description="开启后登录和注册页面将显示人机验证">
                  <Switch checked={options.TurnstileCheckEnabled === 'true'} onCheckedChange={(v) => updateOption('TurnstileCheckEnabled', v ? 'true' : 'false')} />
                </SettingsField>
                <div className={cn('space-y-3 transition-opacity', options.TurnstileCheckEnabled !== 'true' && 'opacity-40 pointer-events-none')}>
                  <SettingsInput
                    label="Site Key"
                    description="从 Cloudflare Dashboard → Turnstile 获取"
                    value={options.TurnstileSiteKey}
                    onChange={(v) => updateOption('TurnstileSiteKey', v)}
                    placeholder="0x..."
                  />
                  <SettingsInput
                    label="Secret Key"
                    description="从 Cloudflare Dashboard → Turnstile 获取，请妥善保管"
                    value={options.TurnstileSecretKey}
                    onChange={(v) => updateOption('TurnstileSecretKey', v)}
                    placeholder="0x..."
                  />
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-hover/30 p-3">
                    <ExternalLink className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                    <p className="text-xs text-text-secondary">
                      前往{' '}
                      <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        Cloudflare Dashboard
                      </a>
                      {' '}创建 Turnstile Widget 并获取密钥
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
                  onClick={() => saveOptions([
                    'GitHubOAuthEnabled', 'GitHubClientId', 'GitHubClientSecret',
                    'discord.enabled', 'discord.client_id', 'discord.client_secret',
                    'oidc.enabled', 'oidc.client_id', 'oidc.client_secret', 'oidc.well_known',
                    'WeChatAuthEnabled', 'WeChatServerAddress', 'WeChatServerToken', 'WeChatAccountQRCodeImageURL',
                    'SMTPServer', 'SMTPPort', 'SMTPAccount', 'SMTPToken', 'SMTPFrom', 'SMTPSSLEnabled',
                    'TurnstileCheckEnabled', 'TurnstileSiteKey', 'TurnstileSecretKey',
                  ])}
                  loading={saving}
                >
                  保存系统设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Settings */}
        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoreHorizontal className="h-5 w-5 text-accent" />
                其他设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingsField
                label={
                  <span className="flex items-center gap-2">
                    调试模式
                    <Badge variant="warning" size="sm">仅开发环境使用</Badge>
                  </span>
                }
                description="开启后后端日志将输出详细的请求和响应信息"
              >
                <Switch checked={options.DebugEnabled === 'true'} onCheckedChange={(v) => updateOption('DebugEnabled', v ? 'true' : 'false')} />
              </SettingsField>
              <Separator />
              <SettingsField label="数据看板" description="在仪表盘页面显示请求量、Token 用量等统计图表">
                <Switch checked={options.DataDashboardEnabled === 'true'} onCheckedChange={(v) => updateOption('DataDashboardEnabled', v ? 'true' : 'false')} />
              </SettingsField>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['DebugEnabled', 'DataDashboardEnabled'])} loading={saving}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pet Settings */}
        <TabsContent value="pet">
          <Card>
            <CardHeader><CardTitle>神奇动物设置</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SectionHeader icon={PawPrint} title="基本设置" description="配置神奇动物养成功能" />
              <div className="space-y-3">
                <SettingsField label="启用神奇动物系统" description="开启后用户可领养和养成魔法生物">
                  <Switch checked={options['pet_setting.enabled'] === 'true'} onCheckedChange={(v) => updateOption('pet_setting.enabled', v ? 'true' : 'false')} />
                </SettingsField>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">每用户魔法生物上限</label>
                  <p className="text-xs text-text-tertiary">每个用户最多可同时拥有的魔法生物数量</p>
                  <Input type="number" value={options['pet_setting.max_pets_per_user'] || ''} onChange={(e) => updateOption('pet_setting.max_pets_per_user', e.target.value)} placeholder="20" className="w-40" />
                </div>
              </div>
              <Separator />
              <div className="text-sm font-medium text-text-primary pt-2">互动参数</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">玩耍冷却(分钟)</label>
                  <Input type="number" value={options['pet_setting.play_cooldown_minutes'] || ''} onChange={(e) => updateOption('pet_setting.play_cooldown_minutes', e.target.value)} placeholder="5" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">每日清洁上限</label>
                  <Input type="number" value={options['pet_setting.clean_daily_limit'] || ''} onChange={(e) => updateOption('pet_setting.clean_daily_limit', e.target.value)} placeholder="3" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">清洁增量</label>
                  <Input type="number" value={options['pet_setting.clean_boost'] || ''} onChange={(e) => updateOption('pet_setting.clean_boost', e.target.value)} placeholder="20" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">玩耍心情增量</label>
                  <Input type="number" value={options['pet_setting.play_mood_boost'] || ''} onChange={(e) => updateOption('pet_setting.play_mood_boost', e.target.value)} placeholder="10" className="w-full" />
                </div>
              </div>
              <div className="text-sm font-medium text-text-primary pt-2">EXP 奖励</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">喂食EXP</label>
                  <Input type="number" value={options['pet_setting.feed_exp'] || ''} onChange={(e) => updateOption('pet_setting.feed_exp', e.target.value)} placeholder="15" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">玩耍EXP</label>
                  <Input type="number" value={options['pet_setting.play_exp'] || ''} onChange={(e) => updateOption('pet_setting.play_exp', e.target.value)} placeholder="10" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">清洁EXP</label>
                  <Input type="number" value={options['pet_setting.clean_exp'] || ''} onChange={(e) => updateOption('pet_setting.clean_exp', e.target.value)} placeholder="5" className="w-full" />
                </div>
              </div>
              <div className="text-sm font-medium text-text-primary pt-2">状态衰减</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">饥饿衰减/h</label>
                  <Input type="number" value={options['pet_setting.hunger_decay_per_hour'] || ''} onChange={(e) => updateOption('pet_setting.hunger_decay_per_hour', e.target.value)} placeholder="4" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">心情衰减/h</label>
                  <Input type="number" value={options['pet_setting.mood_decay_per_hour'] || ''} onChange={(e) => updateOption('pet_setting.mood_decay_per_hour', e.target.value)} placeholder="3" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">洁净衰减/h</label>
                  <Input type="number" value={options['pet_setting.cleanliness_decay_per_hour'] || ''} onChange={(e) => updateOption('pet_setting.cleanliness_decay_per_hour', e.target.value)} placeholder="2" className="w-full" />
                </div>
              </div>
              <div className="text-sm font-medium text-text-primary pt-2">升级进化</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">升级公式倍数</label>
                  <Input type="number" value={options['pet_setting.level_exp_multiplier'] || ''} onChange={(e) => updateOption('pet_setting.level_exp_multiplier', e.target.value)} placeholder="100" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">一阶进化等级</label>
                  <Input type="number" value={options['pet_setting.evolution_stage1_level'] || ''} onChange={(e) => updateOption('pet_setting.evolution_stage1_level', e.target.value)} placeholder="10" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">二阶进化等级</label>
                  <Input type="number" value={options['pet_setting.evolution_stage2_level'] || ''} onChange={(e) => updateOption('pet_setting.evolution_stage2_level', e.target.value)} placeholder="30" className="w-full" />
                </div>
              </div>
              <div className="text-sm font-medium text-text-primary pt-2">孵化</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">孵化时长(分钟)</label>
                  <Input type="number" value={options['pet_setting.hatch_duration_minutes'] || ''} onChange={(e) => updateOption('pet_setting.hatch_duration_minutes', e.target.value)} placeholder="30" className="w-full" />
                </div>
              </div>
              <div className="text-sm font-medium text-text-primary pt-2">融合参数</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">融合基础费用</label>
                  <Input type="number" value={options['pet_setting.fusion_base_cost'] || ''} onChange={(e) => updateOption('pet_setting.fusion_base_cost', e.target.value)} placeholder="200" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">最大星级</label>
                  <Input type="number" value={options['pet_setting.max_star'] || ''} onChange={(e) => updateOption('pet_setting.max_star', e.target.value)} placeholder="5" className="w-full" />
                </div>
              </div>
              <div className="text-sm font-medium text-text-primary pt-2">猪头酒吧参数</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">手续费率(%)</label>
                  <Input type="number" step="0.01" value={options['pet_setting.market_fee_rate'] || ''} onChange={(e) => updateOption('pet_setting.market_fee_rate', e.target.value)} placeholder="0.05" className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-secondary">竞拍最低加价(%)</label>
                  <Input type="number" step="0.01" value={options['pet_setting.auction_bid_increment'] || ''} onChange={(e) => updateOption('pet_setting.auction_bid_increment', e.target.value)} placeholder="0.05" className="w-full" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={() => saveOptions(['pet_setting.enabled', 'pet_setting.max_pets_per_user', 'pet_setting.play_cooldown_minutes', 'pet_setting.clean_daily_limit', 'pet_setting.clean_boost', 'pet_setting.play_mood_boost', 'pet_setting.feed_exp', 'pet_setting.play_exp', 'pet_setting.clean_exp', 'pet_setting.hunger_decay_per_hour', 'pet_setting.mood_decay_per_hour', 'pet_setting.cleanliness_decay_per_hour', 'pet_setting.level_exp_multiplier', 'pet_setting.evolution_stage1_level', 'pet_setting.evolution_stage2_level', 'pet_setting.hatch_duration_minutes', 'pet_setting.fusion_base_cost', 'pet_setting.max_star', 'pet_setting.market_fee_rate', 'pet_setting.auction_bid_increment'])} loading={saving}>
                  保存神奇动物设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Setting;
