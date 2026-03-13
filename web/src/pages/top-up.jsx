import { useState, useEffect } from 'react';
import { Button, Input, Card } from '../components/ui';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, renderQuota, copy } from '../lib/utils';
import { Wallet, Gift, Users, Copy, ArrowRight } from 'lucide-react';

export default function TopUpPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [affLink, setAffLink] = useState('');
  const [affCount, setAffCount] = useState(0);
  const [affQuota, setAffQuota] = useState(0);

  const loadUserInfo = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/self');
      const { success, message, data } = res.data;
      if (success) {
        setUserInfo(data);
      } else {
        showError(message);
      }
    } catch (e) {
      showError('加载用户信息失败');
    }
    setLoading(false);
  };

  const loadAffInfo = async () => {
    try {
      const res = await API.get('/api/user/aff');
      const { success, message, data } = res.data;
      if (success) {
        setAffLink(data.aff_link || '');
        setAffCount(data.aff_count || 0);
        setAffQuota(data.aff_quota || 0);
      }
    } catch (e) {
      // affiliate info may not be available
    }
  };

  useEffect(() => {
    loadUserInfo();
    loadAffInfo();
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
    } catch (e) {
      showError('兑换失败');
    }
    setRedeeming(false);
  };

  const handleCopyAffLink = () => {
    if (!affLink) {
      showInfo('暂无邀请链接');
      return;
    }
    copy(affLink);
    showSuccess('邀请链接已复制到剪贴板');
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-primary">钱包</h1>
        <p className="text-sm text-text-secondary mt-1">
          管理余额、兑换充值码、邀请好友获取奖励
        </p>
      </div>

      <Card className="overflow-hidden border-accent/20">
        <div className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2.5 rounded-xl bg-accent/15">
              <Wallet size={22} className="text-accent" />
            </span>
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              当前额度
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-12 w-32 animate-pulse rounded-lg bg-accent/10" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 animate-pulse rounded-lg bg-accent/5" />
                <div className="h-16 animate-pulse rounded-lg bg-accent/5" />
              </div>
            </div>
          ) : userInfo ? (
            <>
              <div className="mb-5">
                <p className="text-xs text-text-tertiary mb-1">可用余额</p>
                <span className="text-4xl font-bold text-accent font-heading">
                  {renderQuota(userInfo.quota)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface/80 border border-border/60 p-3">
                  <p className="text-xs text-text-tertiary mb-0.5">已用额度</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {renderQuota(userInfo.used_quota)}
                  </p>
                </div>
                <div className="rounded-lg bg-surface/80 border border-border/60 p-3">
                  <p className="text-xs text-text-tertiary mb-0.5">请求次数</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {userInfo.request_count || 0}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2 rounded-lg bg-accent/10">
              <Gift size={18} className="text-accent" />
            </span>
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              兑换码充值
            </h2>
          </div>
          <p className="text-sm text-text-tertiary mb-4">
            输入兑换码为账户充值额度
          </p>
          <div className="flex gap-3">
            <Input
              value={redemptionCode}
              onChange={(e) => setRedemptionCode(e.target.value)}
              placeholder="输入兑换码"
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              className="flex-1"
            />
            <Button onClick={handleRedeem} disabled={redeeming}>
              {redeeming ? '兑换中...' : '兑换'}
              {!redeeming && <ArrowRight size={16} className="ml-1.5" />}
            </Button>
          </div>
      </Card>

      <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2 rounded-lg bg-accent/10">
              <Users size={18} className="text-accent" />
            </span>
            <h2 className="text-lg font-heading font-semibold text-text-primary">
              邀请奖励
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-surface-hover p-3">
              <p className="text-xs text-text-tertiary mb-0.5">邀请人数</p>
              <p className="text-lg font-semibold text-text-primary">{affCount}</p>
            </div>
            <div className="rounded-lg bg-surface-hover p-3">
              <p className="text-xs text-text-tertiary mb-0.5">邀请奖励额度</p>
              <p className="text-lg font-semibold text-text-primary">
                {renderQuota(affQuota)}
              </p>
            </div>
          </div>

          {affLink && (
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                邀请链接
              </label>
              <div className="flex gap-3">
                <Input value={affLink} readOnly className="flex-1" />
                <Button variant="outline" onClick={handleCopyAffLink}>
                  <Copy size={16} className="mr-1.5" />
                  复制
                </Button>
              </div>
            </div>
          )}
      </Card>
    </div>
  );
}
