import * as React from 'react';
import { cn } from '../../lib/cn';
import { Input } from './input';
import { Button } from './button';

/**
 * JsonMapEditor — visual editor for JSON key-value maps.
 *
 * Replaces raw JSON textareas with an interactive table where users can
 * add, edit, delete, and search entries.  Supports toggling between
 * table view and raw JSON mode.
 *
 * @param {string}  value        - JSON string, e.g. '{"gpt-4": 15}'
 * @param {(v: string) => void} onChange - called with the updated JSON string
 * @param {string}  keyLabel     - column header for keys   (default "键")
 * @param {string}  valueLabel   - column header for values (default "值")
 * @param {"number"|"string"} valueType - input type for values (default "number")
 * @param {string}  placeholder  - placeholder for new-key input
 * @param {string}  description  - helper text rendered below the editor
 * @param {boolean} searchable   - show a search/filter bar (default false)
 * @param {boolean} disabled     - disable all editing (default false)
 */

// ── helpers ──────────────────────────────────────────────────────────

function parseJsonMap(raw) {
  if (!raw || raw.trim() === '') return { entries: [], error: null };
  try {
    const obj = JSON.parse(raw);
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return { entries: [], error: '必须是一个 JSON 对象（键值对）' };
    }
    const entries = Object.entries(obj).map(([key, value]) => ({ key, value }));
    entries.sort((a, b) => a.key.localeCompare(b.key));
    return { entries, error: null };
  } catch {
    return { entries: [], error: 'JSON 格式错误' };
  }
}

function entriesToJson(entries) {
  const obj = {};
  for (const { key, value } of entries) {
    if (key === '') continue;
    obj[key] = value;
  }
  // sort keys for stable output
  const sorted = Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});
  return JSON.stringify(sorted, null, 2);
}

function findDuplicateKeys(entries) {
  const seen = new Set();
  const dupes = new Set();
  for (const { key } of entries) {
    if (key === '') continue;
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}

// ── icons (inline SVGs to avoid external deps) ──────────────────────

function SearchIcon({ className }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CodeIcon({ className }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function TableIcon({ className }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="3" x2="21" y1="15" y2="15" />
      <line x1="9" x2="9" y1="3" y2="21" />
    </svg>
  );
}

// ── main component ──────────────────────────────────────────────────

const JsonMapEditor = React.forwardRef(
  (
    {
      value = '{}',
      onChange,
      keyLabel = '键',
      valueLabel = '值',
      valueType = 'number',
      placeholder = '输入键名',
      description,
      searchable = false,
      disabled = false,
      className,
    },
    ref
  ) => {
    // ── state ────────────────────────────────────────────────────────
    const [entries, setEntries] = React.useState([]);
    const [jsonMode, setJsonMode] = React.useState(false);
    const [rawJson, setRawJson] = React.useState(value);
    const [parseError, setParseError] = React.useState(null);
    const [search, setSearch] = React.useState('');
    const newKeyRef = React.useRef(null);

    // Track whether changes originated internally to avoid loops
    const internalChange = React.useRef(false);

    // ── sync from external value prop ────────────────────────────────
    React.useEffect(() => {
      if (internalChange.current) {
        internalChange.current = false;
        return;
      }
      const { entries: parsed, error } = parseJsonMap(value);
      if (error) {
        setParseError(error);
        setJsonMode(true);
        setRawJson(value);
      } else {
        setParseError(null);
        setEntries(parsed);
        setRawJson(value);
      }
    }, [value]);

    // ── emit changes ─────────────────────────────────────────────────
    const emitChange = React.useCallback(
      (newEntries) => {
        const json = entriesToJson(newEntries);
        internalChange.current = true;
        setRawJson(json);
        onChange?.(json);
      },
      [onChange]
    );

    // ── entry mutations ──────────────────────────────────────────────
    const updateEntry = React.useCallback(
      (index, field, val) => {
        setEntries((prev) => {
          const next = prev.map((e, i) =>
            i === index ? { ...e, [field]: val } : e
          );
          emitChange(next);
          return next;
        });
      },
      [emitChange]
    );

    const deleteEntry = React.useCallback(
      (index) => {
        setEntries((prev) => {
          const next = prev.filter((_, i) => i !== index);
          emitChange(next);
          return next;
        });
      },
      [emitChange]
    );

    const addEntry = React.useCallback(() => {
      setEntries((prev) => {
        const next = [...prev, { key: '', value: valueType === 'number' ? 0 : '' }];
        // We don't emit here because empty key would be skipped.
        // The user needs to fill in the key first.
        return next;
      });
      // Focus the new key input after render
      requestAnimationFrame(() => {
        newKeyRef.current?.focus();
      });
    }, [valueType]);

    // ── raw JSON mode handlers ───────────────────────────────────────
    const handleRawJsonChange = React.useCallback(
      (e) => {
        const raw = e.target.value;
        setRawJson(raw);
        const { entries: parsed, error } = parseJsonMap(raw);
        if (error) {
          setParseError(error);
        } else {
          setParseError(null);
          setEntries(parsed);
        }
        internalChange.current = true;
        onChange?.(raw);
      },
      [onChange]
    );

    const toggleJsonMode = React.useCallback(() => {
      if (jsonMode) {
        // Switching from JSON to table: re-parse
        const { entries: parsed, error } = parseJsonMap(rawJson);
        if (error) {
          setParseError(error);
          return; // stay in JSON mode if invalid
        }
        setParseError(null);
        setEntries(parsed);
      } else {
        // Switching from table to JSON: serialize
        setRawJson(entriesToJson(entries));
      }
      setJsonMode((prev) => !prev);
    }, [jsonMode, rawJson, entries]);

    // ── derived ──────────────────────────────────────────────────────
    const duplicateKeys = React.useMemo(() => findDuplicateKeys(entries), [entries]);

    const filteredEntries = React.useMemo(() => {
      if (!search.trim()) return entries.map((e, i) => ({ ...e, _idx: i }));
      const q = search.toLowerCase();
      return entries
        .map((e, i) => ({ ...e, _idx: i }))
        .filter((e) => e.key.toLowerCase().includes(q));
    }, [entries, search]);

    const totalCount = entries.filter((e) => e.key !== '').length;

    // ── render ───────────────────────────────────────────────────────
    return (
      <div ref={ref} className={cn('flex flex-col gap-0', className)}>
        {/* search bar */}
        {searchable && !jsonMode && (
          <div className="mb-2">
            <Input
              inputSize="sm"
              placeholder="搜索..."
              prefixIcon={<SearchIcon />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {jsonMode ? (
          /* ── raw JSON textarea ─────────────────────────────────── */
          <div className="flex flex-col gap-1.5">
            <textarea
              className={cn(
                'flex w-full bg-surface text-text-primary font-mono text-sm',
                'border border-border rounded-lg',
                'placeholder:text-text-tertiary',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-vertical px-3 py-2 min-h-[160px]',
                parseError && 'border-danger focus-visible:ring-danger/30'
              )}
              value={rawJson}
              onChange={handleRawJsonChange}
              disabled={disabled}
              spellCheck={false}
            />
            {parseError && (
              <p className="text-xs text-danger" role="alert">
                {parseError}
              </p>
            )}
          </div>
        ) : (
          /* ── table view ────────────────────────────────────────── */
          <div className="border border-border rounded-lg overflow-hidden">
            {/* table header */}
            <div
              className={cn(
                'grid gap-0 bg-surface-hover text-text-secondary text-xs font-medium uppercase tracking-wide select-none',
                'border-b border-border'
              )}
              style={{ gridTemplateColumns: '1fr 1fr 56px' }}
            >
              <div className="px-3 py-2">{keyLabel}</div>
              <div className="px-3 py-2 border-l border-border">{valueLabel}</div>
              <div className="px-3 py-2 border-l border-border text-center">
                操作
              </div>
            </div>

            {/* table body */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredEntries.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-text-tertiary">
                  {search ? '没有匹配的条目' : '暂无数据，点击下方添加'}
                </div>
              ) : (
                filteredEntries.map((entry, visIdx) => {
                  const realIdx = entry._idx;
                  const isDup = duplicateKeys.has(entry.key) && entry.key !== '';
                  const isLast = visIdx === filteredEntries.length - 1;

                  return (
                    <div
                      key={realIdx}
                      className={cn(
                        'grid gap-0 items-center group',
                        visIdx % 2 === 1 && 'bg-surface-hover/50',
                        !isLast && 'border-b border-border'
                      )}
                      style={{ gridTemplateColumns: '1fr 1fr 56px' }}
                    >
                      {/* key cell */}
                      <div className="px-1.5 py-1">
                        <input
                          className={cn(
                            'w-full bg-transparent text-sm text-text-primary px-1.5 py-1 rounded-md',
                            'outline-none focus:bg-surface focus:ring-1 focus:ring-accent/30',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            isDup && 'text-danger bg-danger/10'
                          )}
                          value={entry.key}
                          onChange={(e) =>
                            updateEntry(realIdx, 'key', e.target.value)
                          }
                          placeholder={placeholder}
                          disabled={disabled}
                          ref={
                            realIdx === entries.length - 1 && entry.key === ''
                              ? newKeyRef
                              : undefined
                          }
                        />
                      </div>

                      {/* value cell */}
                      <div className="px-1.5 py-1 border-l border-border">
                        <input
                          className={cn(
                            'w-full bg-transparent text-sm text-text-primary px-1.5 py-1 rounded-md',
                            'outline-none focus:bg-surface focus:ring-1 focus:ring-accent/30',
                            'disabled:cursor-not-allowed disabled:opacity-50'
                          )}
                          type={valueType === 'number' ? 'number' : 'text'}
                          step={valueType === 'number' ? 'any' : undefined}
                          value={entry.value}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val =
                              valueType === 'number'
                                ? raw === '' || raw === '-'
                                  ? raw
                                  : Number(raw)
                                : raw;
                            updateEntry(realIdx, 'value', val);
                          }}
                          onBlur={(e) => {
                            // Normalize empty or partial number on blur
                            if (valueType === 'number') {
                              const raw = e.target.value;
                              if (raw === '' || raw === '-') {
                                updateEntry(realIdx, 'value', 0);
                              }
                            }
                          }}
                          disabled={disabled}
                        />
                      </div>

                      {/* delete button cell */}
                      <div className="flex items-center justify-center border-l border-border">
                        <button
                          type="button"
                          className={cn(
                            'p-1.5 rounded-md text-text-tertiary',
                            'hover:text-danger hover:bg-danger/10',
                            'transition-colors duration-150',
                            'opacity-0 group-hover:opacity-100 focus:opacity-100',
                            'disabled:pointer-events-none disabled:opacity-0'
                          )}
                          onClick={() => deleteEntry(realIdx)}
                          disabled={disabled}
                          title="删除"
                          aria-label={`删除 ${entry.key}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* add row */}
            {!disabled && (
              <div className="border-t border-border">
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1.5 w-full px-3 py-2',
                    'text-sm text-text-secondary',
                    'hover:bg-surface-hover hover:text-accent',
                    'transition-colors duration-150'
                  )}
                  onClick={addEntry}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  添加
                </button>
              </div>
            )}
          </div>
        )}

        {/* footer toolbar */}
        <div className="flex items-center justify-between mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={jsonMode ? <TableIcon /> : <CodeIcon />}
            onClick={toggleJsonMode}
            disabled={disabled && !jsonMode}
          >
            {jsonMode ? '表格模式' : 'JSON 模式'}
          </Button>
          <span className="text-xs text-text-tertiary">
            共 {totalCount} 项
          </span>
        </div>

        {/* description */}
        {description && (
          <p className="text-xs text-text-tertiary mt-1">{description}</p>
        )}
      </div>
    );
  }
);

JsonMapEditor.displayName = 'JsonMapEditor';

export { JsonMapEditor };
export default JsonMapEditor;
