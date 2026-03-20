import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Clock,
  TrendingUp, Wallet, ChevronLeft, Zap, CreditCard, AlertTriangle, Skull,
} from 'lucide-react';
import {
  Card, Button, Input, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Tooltip, TooltipTrigger, TooltipContent,
} from '../../components/ui';
import { Pagination } from '../../components/ui/pagination';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';

const TERMS = [
  { days: 7, label: '7天' },
  { days: 30, label: '30天' },
  { days: 90, label: '90天' },
];

const LOAN_TERMS = [
  { days: 1, label: '1天' },
  { days: 3, label: '3天' },
  { days: 7, label: '7天' },
  { days: 14, label: '14天' },
  { days: 30, label: '30天' },
];

function formatRate(bps) {
  return (bps / 100).toFixed(2) + '%';
}

function fmtDollar(v) {
  return '$' + (v || 0).toFixed(2);
}

function formatTime(ts) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}

const TX_TYPE_LABELS = {
  demand_deposit: '活期存入',
  demand_withdraw: '活期取出',
  demand_interest: '活期利息',
  premium_deposit: '高息活期存入',
  premium_withdraw: '高息活期取出',
  premium_interest: '高息活期利息',
  fixed_deposit: '定期存入',
  fixed_mature: '定期到期',
  fixed_early_withdraw: '定期提前取出',
  admin_inject: '管理员注入',
  admin_withdraw: '管理员扣除',
  loan_borrow: '贷款借入',
  loan_repay: '贷款偿还',
  loan_interest: '贷款利息',
};

const LOAN_STATUS = {
  0: { label: '还款中', variant: 'default' },
  1: { label: '已还清', variant: 'success' },
  2: { label: '已逾期', variant: 'destructive' },
};

export default function BankPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [txs, setTxs] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);

  // Loan state
  const [loanInfo, setLoanInfo] = useState(null);
  const [deadbeats, setDeadbeats] = useState([]);

  // Dialogs
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [premiumDepositOpen, setPremiumDepositOpen] = useState(false);
  const [premiumWithdrawOpen, setPremiumWithdrawOpen] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayLoanId, setRepayLoanId] = useState(null);
  const [amount, setAmount] = useState('');
  const [fixedTerm, setFixedTerm] = useState('7');
  const [loanTerm, setLoanTerm] = useState('7');
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

  const fetchLoanInfo = useCallback(async () => {
    try {
      const res = await API.get('/api/casino/bank/loan');
      if (res.data.success) {
        setLoanInfo(res.data.data);
      }
    } catch {
      // Loan not enabled — ignore
    }
  }, []);

  const fetchDeadbeats = useCallback(async () => {
    try {
      const res = await API.get('/api/casino/bank/loan/deadbeats');
      if (res.data.success) {
        setDeadbeats(res.data.data || []);
      }
    } catch {
      // silent
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
    fetchLoanInfo();
    fetchDeadbeats();
    fetchTxs(1);
  }, []);

  useEffect(() => {
    fetchTxs(txPage);
  }, [txPage]);

  // ---- Demand deposit/withdraw ----
  const handleDemandDeposit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/deposit', { amount: val, account_type: 0 });
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
    const val = parseFloat(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/withdraw', { amount: val, account_type: 0 });
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

  // ---- Premium deposit/withdraw ----
  const handlePremiumDeposit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/deposit', { amount: val, account_type: 1 });
      if (res.data.success) {
        showSuccess('存入成功');
        setPremiumDepositOpen(false);
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

  const handlePremiumWithdraw = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/withdraw', { amount: val, account_type: 1 });
      if (res.data.success) {
        showSuccess('取出成功');
        setPremiumWithdrawOpen(false);
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

  // ---- Fixed deposit ----
  const handleFixedDeposit = async () => {
    const val = parseFloat(amount);
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
        showSuccess(`取出成功：本金 ${fmtDollar(d.principal)} + 利息 ${fmtDollar(d.interest)}`);
        fetchInfo();
        fetchTxs(1);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
  };

  // ---- Loan borrow/repay ----
  const handleBorrow = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/loan/borrow', { amount: val, term_days: parseInt(loanTerm) });
      if (res.data.success) {
        showSuccess('借款成功');
        setBorrowOpen(false);
        setAmount('');
        fetchInfo();
        fetchLoanInfo();
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

  const handleRepay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return showError('请输入有效金额');
    setSubmitting(true);
    try {
      const res = await API.post('/api/casino/bank/loan/repay', { loan_id: repayLoanId, amount: val });
      if (res.data.success) {
        const d = res.data.data;
        showSuccess(`还款成功：利息 ${fmtDollar(d.interest_payment)} + 本金 ${fmtDollar(d.principal_payment)}`);
        setRepayOpen(false);
        setAmount('');
        fetchInfo();
        fetchLoanInfo();
        fetchDeadbeats();
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

  const openRepayDialog = (loan) => {
    setRepayLoanId(loan.id);
    setAmount('');
    setRepayOpen(true);
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
  const premiumAccount = info.premium_account;
  const fixedDeposits = info.fixed_deposits || [];
  const loans = loanInfo?.loans || [];
  const selectedRepayLoan = loans.find((l) => l.id === repayLoanId);

  return (
    <div className="bg-background text-text-primary p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/console/hogwarts/casino')}>
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
        <p className="text-xl font-heading font-bold mt-1">{fmtDollar(info.bank_pool)}</p>
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
            <p className="text-2xl font-heading font-bold">{fmtDollar(account?.balance)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">{t('累计利息')}</p>
            <p className="text-lg font-heading text-emerald-500">{fmtDollar(account?.total_interest_earned)}</p>
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

      {/* Premium Demand Account */}
      <Card className="p-5 space-y-4 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {t('高息活期')}
            </h2>
            <p className="text-xs text-text-tertiary">{t('年化')} {formatRate(info.premium_demand_rate)}{t('，每小时结息，随存随取')}</p>
          </div>
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">{t('高息')}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-secondary">{t('账户余额')}</p>
            <p className="text-2xl font-heading font-bold">{fmtDollar(premiumAccount?.balance)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">{t('累计利息')}</p>
            <p className="text-lg font-heading text-amber-500">{fmtDollar(premiumAccount?.total_interest_earned)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => { setAmount(''); setPremiumDepositOpen(true); }}>
            <ArrowDownToLine className="h-4 w-4 mr-1" /> {t('存入')}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => { setAmount(''); setPremiumWithdrawOpen(true); }}>
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
                      <span className="text-sm font-medium">{fmtDollar(d.amount)}</span>
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

      {/* ==================== Credit Loan Section ==================== */}
      {loanInfo && (
        <>
          <Card className="p-5 space-y-4 border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-500" />
                  {t('信用贷款')}
                </h2>
                <p className="text-xs text-text-tertiary">{t('凭信用额度借款，按小时计息，随时还款')}</p>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => { setAmount(''); setLoanTerm('7'); setBorrowOpen(true); }}>
                <CreditCard className="h-3 w-3 mr-1" /> {t('借款')}
              </Button>
            </div>

            {/* Credit summary */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-secondary">{t('信用额度')}</p>
                <p className="text-xl font-heading font-bold">{fmtDollar(loanInfo.credit_limit)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">{t('已用额度')}</p>
                <p className="text-xl font-heading text-red-500">{fmtDollar(loanInfo.used_credit)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">{t('可用额度')}</p>
                <p className="text-xl font-heading text-emerald-500">{fmtDollar(loanInfo.available_credit)}</p>
              </div>
            </div>

            {/* Loan rate comparison */}
            <div className="grid grid-cols-5 gap-2">
              {LOAN_TERMS.map(({ days, label }) => (
                <div key={days} className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="text-sm font-heading font-bold text-red-500">
                    {formatRate(loanInfo[`loan_rate_${days}`])}
                  </p>
                </div>
              ))}
            </div>

            {/* Active loans */}
            {loans.length > 0 ? (
              <div className="space-y-2">
                {loans.map((loan) => {
                  const st = LOAN_STATUS[loan.status] || LOAN_STATUS[0];
                  const remainingInterest = loan.interest_accrued - loan.interest_paid;
                  const remainingPrincipal = loan.amount - loan.principal_paid;
                  const totalDebt = remainingInterest + remainingPrincipal;
                  return (
                    <div key={loan.id} className="p-3 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={st.variant}>
                            {loan.status === 2 && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                            {t(st.label)}
                          </Badge>
                          <span className="text-sm font-medium">{t('本金')} {fmtDollar(loan.amount)}</span>
                          <span className="text-xs text-text-tertiary">@ {formatRate(loan.annual_rate)} · {loan.term_days}{t('天')}</span>
                        </div>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10" onClick={() => openRepayDialog(loan)}>
                          {t('还款')}
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-text-tertiary">{t('剩余本金')}</span>
                          <p className="font-medium">{fmtDollar(remainingPrincipal)}</p>
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t('累计利息')}</span>
                          <p className="font-medium text-red-500">{fmtDollar(remainingInterest)}</p>
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t('总欠款')}</span>
                          <p className="font-medium font-heading">{fmtDollar(totalDebt)}</p>
                        </div>
                        <div>
                          <span className="text-text-tertiary">{t('到期')}</span>
                          <p className="font-medium">{formatTime(loan.due_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-2">{t('暂无活跃贷款')}</p>
            )}
          </Card>

          {/* Deadbeat Leaderboard */}
          {deadbeats.length > 0 && (
            <Card className="p-5 space-y-3 border-red-900/20 bg-red-900/5">
              <div className="flex items-center gap-2">
                <Skull className="h-5 w-5 text-red-700" />
                <h2 className="text-lg font-heading font-semibold text-red-700">{t('老赖排行榜')}</h2>
              </div>
              <div className="space-y-1">
                {deadbeats.map((entry, idx) => (
                  <div key={entry.user_id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center ${idx < 3 ? 'text-red-500' : 'text-text-tertiary'}`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm">{entry.username}</span>
                    </div>
                    <span className="text-sm font-medium text-red-500 tabular-nums">{fmtDollar(entry.total_debt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

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
                      tx.tx_type.includes('interest') || tx.tx_type.includes('deposit') || tx.tx_type.includes('mature') || tx.tx_type === 'loan_borrow'
                        ? 'text-emerald-500'
                        : tx.tx_type === 'loan_repay' ? 'text-red-500' : 'text-text-primary'
                    }`}>
                      {tx.tx_type.includes('withdraw') || tx.tx_type === 'loan_repay' ? '-' : '+'}{fmtDollar(tx.amount)}
                    </p>
                    {tx.balance_after > 0 && (
                      <p className="text-xs text-text-tertiary">{t('余额')} {fmtDollar(tx.balance_after)}</p>
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
              step="0.01"
              placeholder={`${t('最低')} ${fmtDollar(info.min_deposit)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDemandDeposit()}
            />
            <p className="text-xs text-text-tertiary">{t('活期上限')} {fmtDollar(info.max_demand)}</p>
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
              step="0.01"
              placeholder={t('取出金额 ($)')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDemandWithdraw()}
            />
            <p className="text-xs text-text-tertiary">{t('当前余额')} {fmtDollar(account?.balance)}</p>
            <Button className="w-full" variant="outline" onClick={handleDemandWithdraw} disabled={submitting}>
              {submitting ? t('处理中...') : t('确认取出')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Deposit Dialog */}
      <Dialog open={premiumDepositOpen} onOpenChange={setPremiumDepositOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('高息活期存入')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-text-secondary">{t('从钱包转入高息活期账户')}</p>
            <Input
              type="number"
              step="0.01"
              placeholder={`${t('最低')} ${fmtDollar(info.min_premium_deposit)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePremiumDeposit()}
            />
            <p className="text-xs text-text-tertiary">{t('高息活期上限')} {fmtDollar(info.max_premium)}</p>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handlePremiumDeposit} disabled={submitting}>
              {submitting ? t('处理中...') : t('确认存入')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Withdraw Dialog */}
      <Dialog open={premiumWithdrawOpen} onOpenChange={setPremiumWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('高息活期取出')}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-text-secondary">{t('从高息活期账户转回钱包')}</p>
            <Input
              type="number"
              step="0.01"
              placeholder={t('取出金额 ($)')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePremiumWithdraw()}
            />
            <p className="text-xs text-text-tertiary">{t('当前余额')} {fmtDollar(premiumAccount?.balance)}</p>
            <Button className="w-full" variant="outline" onClick={handlePremiumWithdraw} disabled={submitting}>
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
              step="0.01"
              placeholder={`${t('最低')} ${fmtDollar(info.min_deposit)}`}
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

      {/* Borrow Dialog */}
      {loanInfo && (
        <Dialog open={borrowOpen} onOpenChange={setBorrowOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('信用借款')}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <p className="text-sm text-text-secondary">{t('从银行借款至钱包，按小时计息')}</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">{t('期限')}</label>
                <Select value={loanTerm} onValueChange={setLoanTerm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_TERMS.map(({ days, label }) => (
                      <SelectItem key={days} value={String(days)}>
                        {label} — {formatRate(loanInfo[`loan_rate_${days}`])} {t('年化')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder={`${t('最低')} ${fmtDollar(loanInfo.min_loan_amount)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBorrow()}
              />
              <p className="text-xs text-text-tertiary">
                {t('可用额度')} {fmtDollar(loanInfo.available_credit)}
                {' · '}{t('最多')} {loanInfo.max_active_loans} {t('笔贷款')}
              </p>
              <p className="text-xs text-red-500/80">
                {t('逾期不罚款，但会登上老赖排行榜')}
              </p>
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleBorrow} disabled={submitting}>
                {submitting ? t('处理中...') : t('确认借款')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Repay Dialog */}
      {selectedRepayLoan && (
        <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('贷款还款')}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-text-tertiary">{t('剩余本金')}</p>
                  <p className="font-medium">{fmtDollar(selectedRepayLoan.amount - selectedRepayLoan.principal_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">{t('累计利息')}</p>
                  <p className="font-medium text-red-500">{fmtDollar(selectedRepayLoan.interest_accrued - selectedRepayLoan.interest_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">{t('总欠款')}</p>
                  <p className="font-heading font-bold">
                    {fmtDollar(
                      (selectedRepayLoan.amount - selectedRepayLoan.principal_paid) +
                      (selectedRepayLoan.interest_accrued - selectedRepayLoan.interest_paid)
                    )}
                  </p>
                </div>
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder={t('还款金额 ($)')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRepay()}
              />
              <p className="text-xs text-text-tertiary">{t('先还利息再还本金，支持部分还款')}</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    const total = (selectedRepayLoan.amount - selectedRepayLoan.principal_paid) +
                      (selectedRepayLoan.interest_accrued - selectedRepayLoan.interest_paid);
                    setAmount(total.toFixed(2));
                  }}
                >
                  {t('全额还清')}
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleRepay} disabled={submitting}>
                  {submitting ? t('处理中...') : t('确认还款')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
