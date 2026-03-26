import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, renderQuota, getQuotaPerUnit, copy } from '../lib/utils';
import { ArrowRight, Copy, Gift, Users } from 'lucide-react';

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
};

// ---- Helpers ----

function quotaToDisplayDollar(quota) {
  const q = Number(quota || 0);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return q / (getQuotaPerUnit() || 500000);
}

function formatDuration(plan) {
  const units = { year: '年', month: '个月', day: '天', hour: '小时' };
  if (plan.duration_unit === 'custom') return `${plan.custom_seconds || 0}秒`;
  return `${plan.duration_value || 1}${units[plan.duration_unit] || plan.duration_unit}`;
}

function formatQuota(plan) {
  const val = Number(plan.total_amount || 0);
  if (val <= 0) return '不限';
  const usd = quotaToDisplayDollar(val);
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(0)}`;
  return `$${usd.toFixed(2)}`;
}

function formatResetPeriod(period) {
  const map = { daily: '每日', weekly: '每周', monthly: '每月', custom: '定期' };
  return map[period] || null;
}

// ---- Plan Card (Anthropic editorial style) ----

function PlanCard({ plan, featured, onBuy, buying }) {
  const price = plan.price_amount || 0;

  return (
    <div className={`
      group relative flex flex-col pt-6
      border-t-2 transition-colors duration-200
      ${featured ? 'border-t-accent' : 'border-t-border-strong hover:border-t-text-tertiary'}
    `}>
      {featured && (
        <div className="absolute -top-3.5 left-0">
          <span className="inline-block px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-accent text-text-inverse rounded-full">
            推荐
          </span>
        </div>
      )}

      <div className="flex-1 space-y-5">
        {/* Title */}
        <div>
          <p className="font-heading text-base font-medium text-text-primary leading-snug">
            {plan.title}
          </p>
          {plan.subtitle && (
            <p className="text-[13px] text-text-tertiary mt-1 leading-relaxed">{plan.subtitle}</p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-0.5">
          <span className="text-[13px] text-text-tertiary font-medium -translate-y-2.5">$</span>
          <span className="text-[36px] font-heading font-light text-text-primary leading-none tracking-tight">
            {price < 1 ? price.toFixed(2) : price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
          </span>
        </div>

        {/* Details */}
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-text-tertiary">额度</dt>
            <dd className="text-text-primary font-medium">{formatQuota(plan)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-tertiary">有效期</dt>
            <dd className="text-text-primary font-medium">{formatDuration(plan)}</dd>
          </div>
          {plan.quota_reset_period && plan.quota_reset_period !== 'never' && (
            <div className="flex justify-between">
              <dt className="text-text-tertiary">额度重置</dt>
              <dd className="text-text-primary font-medium">{formatResetPeriod(plan.quota_reset_period)}</dd>
            </div>
          )}
          {plan.upgrade_group && (
            <div className="flex justify-between">
              <dt className="text-text-tertiary">升级分组</dt>
              <dd className="text-text-primary font-medium">{plan.upgrade_group}</dd>
            </div>
          )}
          {plan.max_purchase_per_user > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-tertiary">限购</dt>
              <dd className="text-text-primary font-medium">{plan.max_purchase_per_user} 次</dd>
            </div>
          )}
        </dl>
      </div>

      {/* CTA */}
      <div className="pt-6 pb-2">
        {featured ? (
          <button
            onClick={() => onBuy(plan)}
            disabled={buying}
            className="w-full h-10 rounded-lg text-sm font-medium transition-all duration-150
              bg-accent text-text-inverse hover:bg-accent-hover active:bg-accent-active
              disabled:opacity-50 disabled:pointer-events-none"
          >
            {buying ? '处理中…' : '选择方案'}
          </button>
        ) : (
          <button
            onClick={() => onBuy(plan)}
            disabled={buying}
            className="group/btn inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary
              hover:text-accent transition-colors duration-150
              disabled:opacity-50 disabled:pointer-events-none"
          >
            {buying ? '处理中…' : '选择方案'}
            {!buying && <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/btn:translate-x-0.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function TopUpPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [affLink, setAffLink] = useState('');
  const [affCount, setAffCount] = useState(0);
  const [affQuota, setAffQuota] = useState(0);

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [confirmPlan, setConfirmPlan] = useState(null);

  const loadUserInfo = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/self');
      const { success, message, data } = res.data;
      if (success) setUserInfo(data);
      else showError(message);
    } catch {
      showError('加载用户信息失败');
    }
    setLoading(false);
  };

  const loadAffInfo = async () => {
    try {
      const res = await API.get('/api/user/aff');
      const { success, data } = res.data;
      if (success) {
        setAffLink(data.aff_link || '');
        setAffCount(data.aff_count || 0);
        setAffQuota(data.aff_quota || 0);
      }
    } catch {
      // may not be available
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/api/subscription/plans');
      const { success, data } = res.data;
      if (success && Array.isArray(data)) {
        setPlans(data.map((d) => d.plan || d));
      }
    } catch {
      // may not be available
    }
    setPlansLoading(false);
  };

  useEffect(() => {
    loadUserInfo();
    loadAffInfo();
    loadPlans();
  }, []);

  const handleRedeem = async () => {
    if (!redemptionCode.trim()) {
      showError('请输入兑换码');
      return;
    }
    setRedeeming(true);
    try {
      const res = await API.post('/api/topup', { key: redemptionCode.trim() });
      const { success, message } = res.data;
      if (success) {
        showSuccess('兑换成功');
        setRedemptionCode('');
        loadUserInfo();
      } else {
        showError(message);
      }
    } catch {
      showError('兑换失败');
    }
    setRedeeming(false);
  };

  const handleCopyAffLink = () => {
    if (!affLink) { showInfo('暂无邀请链接'); return; }
    copy(affLink);
    showSuccess('已复制');
  };

  const handleBuyPlan = (plan) => {
    setConfirmPlan(plan);
  };

  const handleConfirmBuy = async () => {
    const plan = confirmPlan;
    if (!plan?.id) return;
    setBuyingPlanId(plan.id);
    setConfirmPlan(null);
    try {
      const res = await API.post('/api/subscription/balance/pay', { plan_id: plan.id });
      const { success, message } = res.data;
      if (success) {
        showSuccess('购买成功，套餐已生效');
        loadUserInfo();
      } else {
        showError(message || '购买失败');
      }
    } catch (e) {
      showError(e?.response?.data?.message || '购买失败，请稍后重试');
    }
    setBuyingPlanId(null);
  };

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
  }, [plans]);

  const featuredIndex = sortedPlans.length >= 3
    ? Math.floor(sortedPlans.length / 2)
    : sortedPlans.length === 2 ? 1 : -1;

  return (
    <motion.div
      className="max-w-4xl mx-auto px-6 py-10 space-y-16"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >

      {/* ──── Page Header ──── */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-text-primary">钱包</h1>
        <p className="text-sm text-text-tertiary mt-0.5">管理余额、充值和邀请奖励</p>
      </motion.div>

      {/* ──── Balance Hero ──── */}
      <motion.section variants={fadeUp}>
        {loading ? (
          <div className="border-l-[3px] border-l-border pl-8 space-y-4">
            <div className="h-16 w-56 animate-pulse rounded bg-border/20" />
            <div className="flex gap-8">
              <div className="h-4 w-28 animate-pulse rounded bg-border/15" />
              <div className="h-4 w-28 animate-pulse rounded bg-border/15" />
            </div>
          </div>
        ) : userInfo ? (
          <div className="border-l-[3px] border-l-accent pl-8">
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-text-tertiary mb-4">
              账户余额
            </p>

            <div className="text-[56px] sm:text-[72px] font-heading font-light text-text-primary leading-[0.9] tracking-tight">
              {renderQuota(userInfo.quota)}
            </div>

            <div className="flex items-center gap-8 mt-6 text-[13px] text-text-tertiary">
              <span>
                已使用 <span className="text-text-secondary font-medium tabular-nums">{renderQuota(userInfo.used_quota)}</span>
              </span>
              <span className="w-px h-3.5 bg-border-strong" />
              <span>
                请求 <span className="text-text-secondary font-medium tabular-nums">{(userInfo.request_count || 0).toLocaleString()}</span> 次
              </span>
            </div>
          </div>
        ) : null}
      </motion.section>

      {/* ──── Plans ──── */}
      {!plansLoading && sortedPlans.length > 0 && (
        <motion.section variants={fadeUp}>
          <div className="border-t border-border pt-10 mb-10">
            <h2 className="font-heading text-xl font-semibold text-text-primary tracking-tight">
              充值方案
            </h2>
            <p className="text-[13px] text-text-tertiary mt-1.5 leading-relaxed max-w-md">
              选择适合你用量的方案，购买后额度即时到账。
            </p>
          </div>

          <div className={`grid gap-8 ${
            sortedPlans.length === 1 ? 'grid-cols-1 max-w-xs'
              : sortedPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {sortedPlans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                featured={i === featuredIndex}
                onBuy={handleBuyPlan}
                buying={buyingPlanId === plan.id}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* ──── Redeem + Affiliate ──── */}
      <motion.section variants={fadeUp} className="border-t border-border pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* Redeem */}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Gift className="h-4 w-4 text-accent" strokeWidth={1.8} />
              <h3 className="font-heading text-base font-semibold text-text-primary">兑换码</h3>
            </div>
            <p className="text-[13px] text-text-tertiary mb-5 pl-[26px]">输入兑换码为账户充值额度</p>
            <div className="flex gap-2">
              <Input
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value)}
                placeholder="输入兑换码"
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleRedeem} disabled={redeeming}>
                {redeeming ? '兑换中…' : '兑换'}
                {!redeeming && <ArrowRight size={14} className="ml-1" />}
              </Button>
            </div>
          </div>

          {/* Affiliate */}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Users className="h-4 w-4 text-accent" strokeWidth={1.8} />
              <h3 className="font-heading text-base font-semibold text-text-primary">邀请奖励</h3>
            </div>
            <p className="text-[13px] text-text-tertiary mb-5 pl-[26px]">
              已邀请 <span className="text-text-secondary font-medium tabular-nums">{affCount}</span> 人，累计奖励 <span className="text-text-secondary font-medium">{renderQuota(affQuota)}</span>
            </p>
            {affLink && (
              <div className="flex gap-2">
                <Input value={affLink} readOnly className="flex-1 text-[13px]" />
                <Button variant="ghost" size="sm" onClick={handleCopyAffLink} className="shrink-0 h-9 px-3">
                  <Copy size={14} />
                </Button>
              </div>
            )}
          </div>

        </div>
      </motion.section>

      {/* ──── Purchase Confirmation ──── */}
      <Dialog open={!!confirmPlan} onOpenChange={(open) => !open && setConfirmPlan(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
          </DialogHeader>
          {confirmPlan && (
            <div className="mt-2 space-y-4">
              <div className="border-b border-border pb-4">
                <p className="font-heading text-base font-semibold text-text-primary">{confirmPlan.title}</p>
                {confirmPlan.subtitle && (
                  <p className="text-[13px] text-text-tertiary mt-0.5">{confirmPlan.subtitle}</p>
                )}
              </div>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">扣除余额</dt>
                  <dd className="text-text-primary font-semibold">${(confirmPlan.price_amount || 0).toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">获得额度</dt>
                  <dd className="text-text-primary font-medium">{formatQuota(confirmPlan)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">有效期</dt>
                  <dd className="text-text-primary font-medium">{formatDuration(confirmPlan)}</dd>
                </div>
              </dl>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmPlan(null)}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handleConfirmBuy} disabled={buyingPlanId === confirmPlan.id}>
                  {buyingPlanId === confirmPlan.id ? '购买中…' : '确认购买'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
