import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input, Button, Tag, Checkbox } from './ui';
import { ScrollArea } from './ui/scroll-area';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './ui/collapsible';
import {
  categorizeModels,
  getProviderColorClass,
} from '../constants/channel.constants';

export function ModelSelector({ value, onChange, onFetch, canFetch }) {
  const [search, setSearch] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [fetching, setFetching] = useState(false);

  const selectedModels = useMemo(() => {
    if (!value) return [];
    return value
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }, [value]);

  const selectedSet = useMemo(() => new Set(selectedModels), [selectedModels]);

  const allModels = useMemo(() => {
    const set = new Set([...availableModels, ...selectedModels]);
    return Array.from(set).sort();
  }, [availableModels, selectedModels]);

  const categories = useMemo(() => categorizeModels(allModels), [allModels]);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        models: cat.models.filter((m) => m.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.models.length > 0);
  }, [categories, search]);

  const updateSelection = (newSet) => {
    onChange(Array.from(newSet).join(','));
  };

  const toggleModel = (model) => {
    const s = new Set(selectedSet);
    if (s.has(model)) s.delete(model);
    else s.add(model);
    updateSelection(s);
  };

  const selectCategory = (models) => {
    const s = new Set(selectedSet);
    models.forEach((m) => s.add(m));
    updateSelection(s);
  };

  const deselectCategory = (models) => {
    const s = new Set(selectedSet);
    models.forEach((m) => s.delete(m));
    updateSelection(s);
  };

  const clearAll = () => onChange('');

  const handleFetch = async () => {
    if (!onFetch) return;
    setFetching(true);
    try {
      const models = await onFetch();
      if (models && models.length > 0) {
        setAvailableModels((prev) =>
          Array.from(new Set([...prev, ...models]))
        );
        // Auto-select all fetched models
        const s = new Set([...selectedModels, ...models]);
        updateSelection(s);
      }
    } finally {
      setFetching(false);
    }
  };

  const addManual = () => {
    const input = manualInput.trim();
    if (!input) return;
    const newModels = input
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const s = new Set(selectedSet);
    newModels.forEach((m) => s.add(m));
    setAvailableModels((prev) =>
      Array.from(new Set([...prev, ...newModels]))
    );
    updateSelection(s);
    setManualInput('');
  };

  const removeModel = (model) => {
    const s = new Set(selectedSet);
    s.delete(model);
    updateSelection(s);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">
          模型选择
          {selectedModels.length > 0 && (
            <span className="ml-2 text-text-secondary font-normal">
              已选 {selectedModels.length} 个
            </span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {selectedModels.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs h-7"
            >
              清空
            </Button>
          )}
          {canFetch && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetch}
              disabled={fetching}
              className="text-xs h-7"
            >
              {fetching ? '获取中...' : '获取模型列表'}
            </Button>
          )}
        </div>
      </div>

      {/* Selected models as tags */}
      {selectedModels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-border bg-surface-hover/50 max-h-28 overflow-y-auto">
          {selectedModels.map((model) => (
            <Tag
              key={model}
              onClose={() => removeModel(model)}
              className="text-xs"
            >
              {model}
            </Tag>
          ))}
        </div>
      )}

      {/* Search */}
      {allModels.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <Input
            placeholder="搜索模型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      {/* Categorized model list */}
      {filteredCategories.length > 0 && (
        <ScrollArea className="max-h-64 rounded-lg border border-border">
          <div className="p-1">
            {filteredCategories.map((category) => {
              const allSelected = category.models.every((m) =>
                selectedSet.has(m)
              );
              const selectedCount = category.models.filter((m) =>
                selectedSet.has(m)
              ).length;

              return (
                <Collapsible key={category.name} defaultOpen>
                  <div className="flex items-center">
                    <CollapsibleTrigger className="flex-1 py-1.5 px-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getProviderColorClass(category.color)}`}
                        >
                          {category.name}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {selectedCount}/{category.models.length}
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      className="shrink-0 mr-2 px-2 py-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      onClick={() =>
                        allSelected
                          ? deselectCategory(category.models)
                          : selectCategory(category.models)
                      }
                    >
                      {allSelected ? '取消' : '全选'}
                    </button>
                  </div>
                  <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pb-2">
                      {category.models.map((model) => (
                        <Checkbox
                          key={model}
                          checked={selectedSet.has(model)}
                          onCheckedChange={() => toggleModel(model)}
                          label={model}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Empty state */}
      {allModels.length === 0 && !fetching && (
        <div className="text-center py-6 text-text-tertiary text-sm border border-dashed border-border rounded-lg">
          {canFetch
            ? '点击「获取模型列表」从上游获取可用模型，或在下方手动输入'
            : '请在下方手动输入模型名称'}
        </div>
      )}

      {/* Manual input */}
      <div className="flex gap-2">
        <Input
          placeholder="手动输入模型名称，支持逗号分隔批量添加"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addManual();
            }
          }}
          className="flex-1 h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addManual}
          disabled={!manualInput.trim()}
          className="h-8"
        >
          添加
        </Button>
      </div>
    </div>
  );
}
