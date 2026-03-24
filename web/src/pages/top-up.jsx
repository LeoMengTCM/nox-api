import { useState, useEffect, useMemo } from 'react';
import { Button, Input } from '../components/ui';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, renderQuota, getQuotaPerUnit, copy } from '../lib/utils';
import { ArrowRight, Copy } from 'lucide-react';

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

// ---- Plan Card ----

function PlanCard({ plan, featured, onBuy, buying }) {
  const price = plan.price_amount || 0;

  return (
    <div className={`
      group relative flex flex-col
      ${featured
        ? 'border-2 border-accent/40 bg-accent/[0.03]'
        : 'border border-border hover:border-border-strong'
      }
      rounded-xl transition-colors duration-200
    `}>
      {featured && (
        <div className="absolute -top-3 left-6">
          <span className="inline-block px-3 py-0.5 text-[11px] font-medium tracking-wide bg-accent text-text-inverse rounded-full">
            推荐
          </span>
        </div>
      )}

      <div className="p-6 pb-0 flex-1">
        {/* Title */}
        <p className="font-heading text-base font-semibold text-text-primary leading-snug">
          {plan.title}
        </p>
        {plan.subtitle && (
          <p className="text-[13px] text-text-tertiary mt-1 leading-relaxed">{plan.subtitle}</p>
        )}

        {/* Price */}
        <div className="mt-5 flex items-baseline gap-0.5">
          <span className="text-[13px] text-text-secondary font-medium -translate-y-3">$</span>
          <span className="text-[40px] font-heading font-light text-text-primary leading-none tracking-tight">
            {price < 1 ? price.toFixed(2) : price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
          </span>
        </div>

        {/* Details — minimal, separated by middle dots */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <dl className="space-y-2.5 text-[13px]">
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
      </div>

      {/* CTA */}
      <div className="p-6 pt-5">
        <button
          onClick={() => onBuy(plan)}
          disabled={buying}
          className={`
            w-full h-10 rounded-lg text-sm font-medium transition-all duration-150
            disabled:opacity-50 disabled:pointer-events-none
            ${featured
              ? 'bg-accent text-text-inverse hover:bg-accent-hover active:bg-accent-active'
              : 'bg-transparent text-text-primary border border-border-strong hover:bg-surface-hover active:bg-surface-active'
            }
          `}
        >
          {buying ? '处理中…' : '选择方案'}
        </button>
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
  const [topupInfo, setTopupInfo] = useState(null);

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

  const loadTopupInfo = async () => {
    try {
      const res = await API.get('/api/user/topup/info');
      const { success, data } = res.data;
      if (success) setTopupInfo(data);
    } catch {
      // may not be available
    }
  };

  useEffect(() => {
    loadUserInfo();
    loadAffInfo();
    loadPlans();
    loadTopupInfo();
  }, []);

  // Payment result from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payResult = params.get('pay');
    if (payResult === 'success') {
      showSuccess('支付成功，额度已到账');
      window.history.replaceState({}, '', window.location.pathname);
      loadUserInfo();
    } else if (payResult === 'fail') {
      showError('支付失败，请重试');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payResult === 'pending') {
      showInfo('支付处理中，请稍后刷新查看');
      window.history.replaceState({}, '', window.location.pathname);
    }
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

  const handleBuyPlan = async (plan) => {
    if (!plan.id) return;
    setBuyingPlanId(plan.id);
    try {
      const epayEnabled = topupInfo?.enable_online_topup;
      const stripeEnabled = topupInfo?.enable_stripe_topup;
      const creemEnabled = topupInfo?.enable_creem_topup;
      let res;
      if (epayEnabled && topupInfo?.pay_methods?.length > 0) {
        const method = topupInfo.pay_methods[0]?.type || 'alipay';
        res = await API.post('/api/subscription/epay/pay', { plan_id: plan.id, payment_method: method });
      } else if (stripeEnabled) {
        res = await API.post('/api/subscription/stripe/pay', { plan_id: plan.id });
      } else if (creemEnabled) {
        res = await API.post('/api/subscription/creem/pay', { plan_id: plan.id });
      } else {
        showError('当前未配置支付方式，请联系管理员');
        setBuyingPlanId(null);
        return;
      }
      const { data } = res;
      if (data?.url) { window.location.href = data.url; return; }
      if (data?.data?.checkout_url) { window.location.href = data.data.checkout_url; return; }
      if (data?.data?.url) { window.location.href = data.data.url; return; }
      if (data?.data && typeof data.data === 'object' && data.url) { window.location.href = data.url; return; }
      if (data?.success === false) showError(data?.message || '创建订单失败');
    } catch (e) {
      showError(e?.response?.data?.message || '购买失败，请稍后重试');
    }
    setBuyingPlanId(null);
  };

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
  }, [plans]);

  // The middle plan (by sort order) is "featured" when there are 3+
  const featuredIndex = sortedPlans.length >= 3
    ? Math.floor(sortedPlans.length / 2)
    : sortedPlans.length === 2 ? 1 : -1;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-20">

      {/* ──── Balance ──── */}
      <section>
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-text-tertiary mb-6">
          账户余额
        </p>

        {loading ? (
          <div className="space-y-4">
            <div className="h-14 w-48 animate-pulse rounded bg-border/30" />
            <div className="flex gap-12">
              <div className="h-5 w-24 animate-pulse rounded bg-border/20" />
              <div className="h-5 w-24 animate-pulse rounded bg-border/20" />
            </div>
          </div>
        ) : userInfo ? (
          <>
            <div className="text-[56px] sm:text-[72px] font-heading font-light text-text-primary leading-[0.9] tracking-tight">
              {renderQuota(userInfo.quota)}
            </div>

            <div className="flex items-center gap-10 mt-6 text-[13px] text-text-tertiary">
              <span>
                已使用 <span className="text-text-secondary font-medium">{renderQuota(userInfo.used_quota)}</span>
              </span>
              <span className="w-px h-3 bg-border" />
              <span>
                请求 <span className="text-text-secondary font-medium">{(userInfo.request_count || 0).toLocaleString()}</span> 次
              </span>
            </div>
          </>
        ) : null}
      </section>

      {/* ──── Plans ──── */}
      {!plansLoading && sortedPlans.length > 0 && (
        <section>
          <div className="border-t border-border pt-10 mb-8">
            <h2 className="font-heading text-2xl font-semibold text-text-primary tracking-tight">
              充值方案
            </h2>
            <p className="text-[13px] text-text-tertiary mt-1.5 leading-relaxed max-w-md">
              选择适合你用量的方案，购买后额度即时到账。
            </p>
          </div>

          <div className={`grid gap-5 ${
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
        </section>
      )}

      {/* ──── Redeem + Affiliate ──── */}
      <section className="border-t border-border pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* Redeem */}
          <div>
            <h3 className="font-heading text-base font-semibold text-text-primary mb-1">兑换码</h3>
            <p className="text-[13px] text-text-tertiary mb-5">输入兑换码为账户充值额度</p>
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
            <h3 className="font-heading text-base font-semibold text-text-primary mb-1">邀请奖励</h3>
            <p className="text-[13px] text-text-tertiary mb-5">
              已邀请 <span className="text-text-secondary font-medium">{affCount}</span> 人，累计奖励 <span className="text-text-secondary font-medium">{renderQuota(affQuota)}</span>
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
      </section>
    </div>
  );
}
