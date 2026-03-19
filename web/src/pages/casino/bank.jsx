import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Clock,
  TrendingUp, Wallet, ChevronLeft,
} from 'lucide-react';
import {
  Card, Button, Input, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Tooltip, TooltipTrigger, TooltipContent,
} from '../../components/ui';
import { Pagination } from '../../components/ui/pagination';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota, getQuotaPerUnit } from '../../lib/utils';

const TERMS = [
  { days: 7, label: '7天' },
  { days: 30, label: '30天' },
  { days: 90, label: '90天' },
];

function formatRate(bps) {
  return (bps / 100).toFixed(2) + '%';
}

function formatQuota(q) {
  return '$' + (q / getQuotaPerUnit()).toFixed(2);
}

function formatTime(ts) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}

const TX_TYPE_LABELS = {
  demand_deposit: '活期存入',
  demand_withdraw: '活期取出',
  demand_interest: '活期利息',
  fixed_deposit: '定期存入',
  fixed_mature: '定期到期',
  fixed_early_withdraw: '定期提前取出',
  admin_inject: '管理员注入',
  admin_withdraw: '管理员扣除',
};

export default function BankPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [txs, setTxs] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);

  // Dialogs
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [fixedTerm, setFixedTerm] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await API.get('/api/casino/bank');
      if (res.data.success) {
        setInfo(res.data.data);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTxs = useCallback(async (page) => {
    try {
      const res = await API.get(`/api/casino/bank/transactions?page=${page}&per_page=10`);
      if (res.data.success) {
        setTxs(res.data.data.items || []);
        setTxTotal(res.data.data.total || 0);
      }
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchInfo();
    fetchTxs(1);
  }, []);

  useEffect(() => {
    fetchTxs(txPage);
  }, [txPage]);

  const handleDemandDeposit = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/deposit', { amount: val });
      if (res.data.success) {
        showSuccess('存入成功');
        setDepositOpen(false);
        setAmount('');
        fetchInfo();
        fetchTxs(1);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemandWithdraw = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/withdraw', { amount: val });
      if (res.data.success) {
        showSuccess('取出成功');
        setWithdrawOpen(false);
        setAmount('');
        fetchInfo();
        fetchTxs(1);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFixedDeposit = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/fixed/deposit', { amount: val, term: parseInt(fixedTerm) });
      if (res.data.success) {
        showSuccess('定期存入成功');
        setFixedOpen(false);
        setAmount('');
        fetchInfo();
        fetchTxs(1);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFixedWithdraw = async (depositId) => {
    if (!confirm('确认取出此定期存单？未到期将扣除部分利息。')) return;
    try {
      const res = await API.post('/api/casino/bank/fixed/withdraw', { deposit_id: depositId });
      if (res.data.success) {
        const d = res.data.data;
        showSuccess(`取出成功：本金 ${formatQuota(d.principal)} + 利息 ${formatQuota(d.interest)}`);
        fetchInfo();
        fetchTxs(1);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="p-6 text-center text-text-secondary">
        {t('银行系统未启用')}
      </div>
    );
  }

  const account = info.account;
  const fixedDeposits = info.fixed_deposits || [];

  return (
    <div className="bg-background text-text-primary p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/console/casino')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Landmark className="h-6 w-6 text-emerald-500" />
        <h1 className="text-2xl font-heading font-bold">{t('古灵阁银行')}</h1>
      </div>

      {/* Bank Pool */}
      <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Wallet className="h-4 w-4" />
          <span>{t('银行资金池')}</span>
        </div>
        <p className="text-xl font-heading font-bold mt-1">{formatQuota(info.bank_pool)}</p>
        <p className="text-xs text-text-tertiary mt-1">{t('利息从资金池中支付，池空则暂停派息')}</p>
      </Card>

      {/* Demand Account */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-semibold">{t('活期账户')}</h2>
            <p className="text-xs text-text-tertiary">{t('年化')} {formatRate(info.demand_rate)}{t('，每小时结息，随存随取')}</p>
          </div>
          <Badge variant="success">{t('活期')}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-secondary">{t('账户余额')}</p>
            <p className="text-2xl font-heading font-bold">{formatQuota(account?.balance || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">{t('累计利息')}</p>
            <p className="text-lg font-heading text-emerald-500">{formatQuota(account?.total_interest_earned || 0)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { setAmount(''); setDepositOpen(true); }}>
            <ArrowDownToLine className="h-4 w-4 mr-1" /> {t('存入')}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => { setAmount(''); setWithdrawOpen(true); }}>
            <ArrowUpFromLine className="h-4 w-4 mr-1" /> {t('取出')}
          </Button>
        </div>
      </Card>

      {/* Fixed Deposits */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-semibold">{t('定期存单')}</h2>
            <p className="text-xs text-text-tertiary">{t('锁定期限，利率更高，提前取出扣罚')} {info.early_penalty}%</p>
          </div>
          <Button size="sm" onClick={() => { setAmount(''); setFixedTerm('7'); setFixedOpen(true); }}>
            <Lock className="h-3 w-3 mr-1" /> {t('新建存单')}
          </Button>
        </div>

        {/* Rate comparison */}
        <div className="grid grid-cols-3 gap-2">
          {TERMS.map(({ days, label }) => (
            <div key={days} className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-lg font-heading font-bold text-emerald-500">
                {formatRate(info[`fixed_rate_${days}`])}
              </p>
              <p className="text-xs text-text-tertiary">{t('年化')}</p>
            </div>
          ))}
        </div>

        {/* Existing deposits */}
        {fixedDeposits.length > 0 ? (
          <div className="space-y-2">
            {fixedDeposits.map((d) => {
              const matured = d.status === 1 || (d.status === 0 && Date.now() / 1000 >= d.mature_at);
              return (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={matured ? 'success' : 'default'}>
                        {matured ? t('已到期') : `${d.term_days}${t('天')}`}
                      </Badge>
                      <span className="text-sm font-medium">{formatQuota(d.amount)}</span>
                      <span className="text-xs text-text-tertiary">@ {formatRate(d.annual_rate)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      <span><Clock className="h-3 w-3 inline mr-0.5" />{t('存入')} {formatTime(d.deposit_at)}</span>
                      <span>{t('到期')} {formatTime(d.mature_at)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={matured ? 'default' : 'outline'}
                    onClick={() => handleFixedWithdraw(d.id)}
                  >
                    {matured ? <><Unlock className="h-3 w-3 mr-1" />{t('取出')}</> : <>{t('提前取出')}</>}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-4">{t('暂无定期存单')}</p>
        )}
      </Card>

      {/* Transaction History */}
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-heading font-semibold">{t('交易记录')}</h2>
        {txs.length > 0 ? (
          <>
            <div className="space-y-1">
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm">{TX_TYPE_LABELS[tx.tx_type] || tx.tx_type}</p>
                    <p className="text-xs text-text-tertiary">{formatTime(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium tabular-nums ${
                      tx.tx_type.includes('interest') || tx.tx_type.includes('deposit') || tx.tx_type.includes('mature')
                        ? 'text-emerald-500' : 'text-text-primary'
                    }`}>
                      {tx.tx_type.includes('withdraw') ? '-' : '+'}{formatQuota(tx.amount)}
                    </p>
                    {tx.balance_after > 0 && (
                      <p className="text-xs text-text-tertiary">{t('余额')} {formatQuota(tx.balance_after)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Pagination
                currentPage={txPage}
                totalPages={Math.ceil(txTotal / 10) || 1}
                onPageChange={setTxPage}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-4">{t('暂无交易记录')}</p>
        )}
      </Card>

      {/* Demand Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('活期存入')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-text-secondary">{t('从钱包转入银行活期账户')}</p>
            <Input
              type="number"
              placeholder={`${t('最低')} ${formatQuota(info.min_deposit)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDemandDeposit()}
            />
            <p className="text-xs text-text-tertiary">{t('活期上限')} {formatQuota(info.max_demand)}</p>
            <Button className="w-full" onClick={handleDemandDeposit} disabled={submitting}>
              {submitting ? t('处理中...') : t('确认存入')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Demand Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('活期取出')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-text-secondary">{t('从银行活期账户转回钱包')}</p>
            <Input
              type="number"
              placeholder={t('取出金额')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDemandWithdraw()}
            />
            <p className="text-xs text-text-tertiary">{t('当前余额')} {formatQuota(account?.balance || 0)}</p>
            <Button className="w-full" variant="outline" onClick={handleDemandWithdraw} disabled={submitting}>
              {submitting ? t('处理中...') : t('确认取出')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fixed Deposit Dialog */}
      <Dialog open={fixedOpen} onOpenChange={setFixedOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('新建定期存单')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-text-secondary">{t('从钱包存入定期，到期后取出本金+利息')}</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-secondary">{t('期限')}</label>
              <Select value={fixedTerm} onValueChange={setFixedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map(({ days, label }) => (
                    <SelectItem key={days} value={String(days)}>
                      {label} — {formatRate(info[`fixed_rate_${days}`])} {t('年化')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              placeholder={`${t('最低')} ${formatQuota(info.min_deposit)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFixedDeposit()}
            />
            <p className="text-xs text-text-tertiary">
              {t('提前取出将扣除')} {info.early_penalty}% {t('已产生利息')}
              {' · '}{t('最多')} {info.max_fixed_count} {t('张存单')}
            </p>
            <Button className="w-full" onClick={handleFixedDeposit} disabled={submitting}>
              {submitting ? t('处理中...') : t('确认存入')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
