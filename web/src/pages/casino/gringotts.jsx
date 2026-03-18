import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Flame, Skull, Clock, Coins, History, ChevronRight, AlertTriangle } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Spinner, Badge } from '../../components/ui';

const HEIST_TYPES = [
  {
    key: 'sneak',
    name: '隐形斗篷潜入',
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: '披上隐形斗篷悄悄潜入金库',
    risk: '低风险',
    riskColor: 'text-green-400',
  },
  {
    key: 'dragon',
    name: '骑龙闯关',
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: '骑乘乌克兰铁肚皮龙冲破穹顶',
    risk: '中风险',
    riskColor: 'text-yellow-400',
  },
  {
    key: 'imperio',
    name: '夺魂咒控制妖精',
    icon: Skull,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: '使用不可饶恕咒控制古灵阁妖精',
    risk: '高风险',
    riskColor: 'text-red-400',
  },
];

export default function Gringotts() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [heisting, setHeisting] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const loadInfo = useCallback(async () => {
    try {
      const res = await API.get('/api/casino/gringotts');
      if (res.data.success) {
        setInfo(res.data.data);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (page = 1) => {
    try {
      const res = await API.get(`/api/casino/gringotts/history?page=${page}&per_page=10`);
      if (res.data.success) {
        setHistory(res.data.data.records || []);
        setHistoryTotal(res.data.data.total || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadInfo();
    loadHistory();
  }, [loadInfo, loadHistory]);

  const handleHeist = async (heistType) => {
    setHeisting(heistType);
    setResult(null);
    try {
      const res = await API.post('/api/casino/gringotts/heist', { heist_type: heistType });
      if (res.data.success) {
        setResult(res.data.data);
        loadInfo();
        loadHistory();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setHeisting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-foreground">古灵阁金库</h1>
        <p className="mt-2 text-muted-foreground">巫师世界最安全的金库...直到你出现</p>
      </div>

      {/* Vault Balance */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Coins className="h-4 w-4" />
          金库当前余额
        </div>
        <div className="mt-2 font-serif text-4xl font-bold text-amber-400">
          {info ? renderQuota(info.vault_balance, 2) : '$0.00'}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          赌场所有玩家亏损的累积 — 等待被勇敢的巫师取走
        </p>
      </Card>

      {/* Result Banner */}
      {result && (
        <Card className={cn(
          'p-6 text-center',
          result.success
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'
        )}>
          <div className={cn(
            'text-2xl font-bold',
            result.success ? 'text-green-400' : 'text-red-400'
          )}>
            {result.success ? '打劫成功！' : '打劫失败！'}
          </div>
          <p className="mt-2 text-muted-foreground">{result.narrative}</p>
          {result.success && result.reward_display && (
            <div className="mt-3 text-xl font-bold text-amber-400">
              +{result.reward_display}
            </div>
          )}
          {result.penalty > 0 && (
            <div className="mt-2 text-sm text-red-400">
              额外罚没: {renderQuota(result.penalty, 2)}
            </div>
          )}
          {result.banned_until && (
            <div className="mt-2 flex items-center justify-center gap-1 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              赌场禁入6小时
            </div>
          )}
        </Card>
      )}

      {/* Heist Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {HEIST_TYPES.map((heist) => {
          const cooldown = info?.cooldowns?.[heist.key];
          const isAvailable = cooldown?.available;
          const Icon = heist.icon;

          return (
            <Card
              key={heist.key}
              className={cn(
                'relative overflow-hidden p-5 transition-all',
                heist.borderColor,
                isAvailable && 'cursor-pointer hover:scale-[1.02]',
                !isAvailable && 'opacity-60'
              )}
              onClick={() => isAvailable && !heisting && handleHeist(heist.key)}
            >
              <div className={cn('mb-3 inline-flex rounded-lg p-2', heist.bgColor)}>
                <Icon className={cn('h-6 w-6', heist.color)} />
              </div>
              <h3 className="font-serif text-lg font-semibold">{heist.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{heist.description}</p>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">入场费</span>
                  <span>{cooldown?.fee_display || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">成功率</span>
                  <span>{cooldown?.base_rate || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">风险</span>
                  <span className={heist.riskColor}>{heist.risk}</span>
                </div>
              </div>

              {!isAvailable && cooldown?.cooldown_ends > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  冷却中
                </div>
              )}

              {heisting === heist.key && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Spinner />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* History */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-serif text-lg font-semibold">打劫记录</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">暂无打劫记录</p>
        ) : (
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={record.success ? 'default' : 'destructive'}>
                    {record.success ? '成功' : '失败'}
                  </Badge>
                  <div>
                    <span className="text-sm">
                      {HEIST_TYPES.find((h) => h.key === record.heist_type)?.name || record.heist_type}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {new Date(record.created_at * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {record.success ? (
                    <span className="text-sm font-medium text-green-400">
                      +{renderQuota(record.reward, 2)}
                    </span>
                  ) : (
                    <span className="text-sm text-red-400">
                      -{renderQuota(record.entrance_fee + record.penalty, 2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {historyTotal > 10 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              className="text-sm text-primary hover:underline disabled:opacity-50"
              disabled={historyPage <= 1}
              onClick={() => { setHistoryPage(historyPage - 1); loadHistory(historyPage - 1); }}
            >
              上一页
            </button>
            <span className="text-sm text-muted-foreground">
              第 {historyPage} 页
            </span>
            <button
              className="text-sm text-primary hover:underline disabled:opacity-50"
              disabled={historyPage * 10 >= historyTotal}
              onClick={() => { setHistoryPage(historyPage + 1); loadHistory(historyPage + 1); }}
            >
              下一页
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
