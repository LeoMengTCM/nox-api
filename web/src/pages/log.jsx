import { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Card,
  Badge,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError, timestamp2string, getQuotaPerUnit, isAdmin } from '../lib/utils';

const LOG_TYPES = {
  0: '全部',
  1: '充值',
  2: '消费',
  3: '管理',
  4: '系统',
  5: '错误',
  6: '退款',
};

const TYPE_BADGE_VARIANT = {
  1: 'success',
  2: 'warning',
  3: 'info',
  4: 'default',
  5: 'destructive',
  6: 'outline',
};

// Detect sub-category from system log content
function getSystemSubLabel(content) {
  if (!content) return null;
  if (content.includes('签到')) return '签到';
  if (content.includes('银行')) return '银行';
  if (content.includes('赌场') || content.includes('赢得') || content.includes('输掉') || content.includes('平局')) return '赌场';
  if (content.includes('古灵阁') || content.includes('打劫')) return '古灵阁';
  if (content.includes('擂台') || content.includes('攻擂') || content.includes('守擂') || content.includes('赛季结算')) return '竞技场';
  if (content.includes('成就')) return '成就';
  if (content.includes('验证') || content.includes('两步') || content.includes('2FA') || content.includes('Passkey')) return '安全';
  if (content.includes('注册赠送') || content.includes('邀请')) return '注册奖励';
  if (content.includes('渠道密钥')) return '渠道';
  return null;
}

const PAGE_SIZE = 20;

export default function LogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [type, setType] = useState('0');
  const [username, setUsername] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [modelName, setModelName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [startTimestamp, setStartTimestamp] = useState('');
  const [endTimestamp, setEndTimestamp] = useState('');

  const admin = isAdmin();

  const fetchLogs = async (currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('p', currentPage);
      params.append('page_size', PAGE_SIZE);

      if (type !== '0') {
        params.append('type', type);
      }
      if (admin && username) {
        params.append('username', username);
      }
      if (tokenName) {
        params.append('token_name', tokenName);
      }
      if (modelName) {
        params.append('model_name', modelName);
      }
      if (admin && channelId) {
        params.append('channel', channelId);
      }
      if (startTimestamp) {
        const start = Math.floor(new Date(startTimestamp).getTime() / 1000);
        params.append('start_timestamp', start);
      }
      if (endTimestamp) {
        const end = Math.floor(new Date(endTimestamp).getTime() / 1000);
        params.append('end_timestamp', end);
      }

      const endpoint = admin ? '/api/log/' : '/api/log/self/';
      const res = await API.get(`${endpoint}?${params.toString()}`);
      const { success, message, data } = res.data;
      if (success) {
        setLogs(data.items || []);
        setTotalCount(data.total || 0);
      } else {
        showError(message);
      }
    } catch (err) {
      showError(err.message || '加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatQuota = (quota) => {
    return '$' + (quota / getQuotaPerUnit()).toFixed(6);
  };

  const getElapsedTimeColor = (ms) => {
    if (ms < 1000) return 'text-green-600 dark:text-green-400';
    if (ms < 3000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleRowClick = (log) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const columns = [
    {
      header: '时间',
      accessorKey: 'created_at',
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {timestamp2string(row.original.created_at)}
        </span>
      ),
    },
    {
      header: '类型',
      accessorKey: 'type',
      cell: ({ row }) => {
        const logType = row.original.type;
        const content = row.original.content;
        const subLabel = logType === 4 ? getSystemSubLabel(content) : null;
        return (
          <div className="flex items-center gap-1">
            <Badge variant={TYPE_BADGE_VARIANT[logType] || 'default'}>
              {LOG_TYPES[logType] || '未知'}
            </Badge>
            {subLabel && (
              <span className="text-xs text-text-secondary bg-muted px-1.5 py-0.5 rounded">
                {subLabel}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: '内容',
      accessorKey: 'content',
      cell: ({ row }) => {
        const content = row.original.content;
        if (!content) return <span className="text-sm text-text-secondary">-</span>;
        const truncated = content.length > 40 ? content.slice(0, 40) + '...' : content;
        if (content.length > 40) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm truncate max-w-[240px] inline-block cursor-default">
                  {truncated}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">{content}</TooltipContent>
            </Tooltip>
          );
        }
        return <span className="text-sm">{content}</span>;
      },
    },
    {
      header: '用户',
      accessorKey: 'username',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.username || '-'}</span>
      ),
    },
    {
      header: '令牌',
      accessorKey: 'token_name',
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[120px] inline-block">
          {row.original.token_name || '-'}
        </span>
      ),
    },
    {
      header: '模型',
      accessorKey: 'model_name',
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[160px] inline-block font-mono">
          {row.original.model_name || '-'}
        </span>
      ),
    },
    ...(admin
      ? [
          {
            header: '渠道',
            accessorKey: 'channel',
            cell: ({ row }) => {
              const id = row.original.channel;
              const name = row.original.channel_name;
              if (!id) return <span className="text-sm">-</span>;
              if (name) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm tabular-nums cursor-default">
                        {id}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{name}</TooltipContent>
                  </Tooltip>
                );
              }
              return <span className="text-sm tabular-nums">{id}</span>;
            },
          },
        ]
      : []),
    {
      header: '额度',
      accessorKey: 'quota',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums font-medium">
          {row.original.quota != null ? formatQuota(row.original.quota) : '-'}
        </span>
      ),
    },
    {
      header: '耗时(ms)',
      accessorKey: 'elapsed_time',
      cell: ({ row }) => {
        const elapsed = row.original.elapsed_time;
        if (elapsed == null) return <span className="text-sm">-</span>;
        return (
          <span className={`text-sm tabular-nums font-medium ${getElapsedTimeColor(elapsed)}`}>
            {elapsed.toLocaleString()}
          </span>
        );
      },
    },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="bg-background text-text-primary p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-heading font-bold">日志</h1>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">类型</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOG_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {admin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary">用户名</label>
              <Input
                className="w-[140px]"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">令牌名称</label>
            <Input
              className="w-[140px]"
              placeholder="令牌名称"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">模型名称</label>
            <Input
              className="w-[160px]"
              placeholder="模型名称"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {admin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary">渠道ID</label>
              <Input
                className="w-[100px]"
                placeholder="渠道ID"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">起始时间</label>
            <Input
              type="date"
              className="w-[160px]"
              value={startTimestamp}
              onChange={(e) => setStartTimestamp(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">结束时间</label>
            <Input
              type="date"
              className="w-[160px]"
              value={endTimestamp}
              onChange={(e) => setEndTimestamp(e.target.value)}
            />
          </div>

          <Button onClick={handleSearch} disabled={loading}>
            {loading ? '搜索中...' : '搜索'}
          </Button>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          onRowClick={handleRowClick}
          noDataText="暂无日志数据"
        />
      </Card>

      <div className="flex justify-end">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>日志详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <DetailField label="ID" value={selectedLog.id} />
              <DetailField
                label="时间"
                value={timestamp2string(selectedLog.created_at)}
              />
              <DetailField
                label="类型"
                value={
                  <Badge variant={TYPE_BADGE_VARIANT[selectedLog.type] || 'default'}>
                    {LOG_TYPES[selectedLog.type] || '未知'}
                  </Badge>
                }
              />
              <DetailField label="用户" value={selectedLog.username || '-'} />
              <DetailField label="令牌" value={selectedLog.token_name || '-'} />
              <DetailField label="模型" value={selectedLog.model_name || '-'} />
              <DetailField label="渠道" value={
                selectedLog.channel
                  ? selectedLog.channel_name
                    ? `${selectedLog.channel} (${selectedLog.channel_name})`
                    : selectedLog.channel
                  : '-'
              } />
              <DetailField
                label="提示tokens"
                value={
                  selectedLog.prompt_tokens != null
                    ? selectedLog.prompt_tokens.toLocaleString()
                    : '-'
                }
              />
              <DetailField
                label="补全tokens"
                value={
                  selectedLog.completion_tokens != null
                    ? selectedLog.completion_tokens.toLocaleString()
                    : '-'
                }
              />
              <DetailField
                label="额度"
                value={
                  selectedLog.quota != null ? formatQuota(selectedLog.quota) : '-'
                }
              />
              <DetailField
                label="耗时"
                value={
                  selectedLog.elapsed_time != null ? (
                    <span className={getElapsedTimeColor(selectedLog.elapsed_time)}>
                      {selectedLog.elapsed_time.toLocaleString()} ms
                    </span>
                  ) : (
                    '-'
                  )
                }
              />
              <DetailField
                label="Request ID"
                value={
                  <span className="font-mono text-xs break-all">
                    {selectedLog.request_id || '-'}
                  </span>
                }
              />
              <div className="md:col-span-2">
                <DetailField
                  label="内容"
                  value={
                    <pre className="whitespace-pre-wrap break-words text-sm bg-muted p-3 rounded-md max-h-[300px] overflow-y-auto">
                      {selectedLog.content || '-'}
                    </pre>
                  }
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="text-sm text-text-primary">{value}</dd>
    </div>
  );
}
