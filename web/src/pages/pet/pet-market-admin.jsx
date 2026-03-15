import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui';
import { API } from '../../lib/api';
import { showError, renderQuota, timestamp2string } from '../../lib/utils';
import { ArrowLeftRight } from 'lucide-react';

const LISTING_TYPE_MAP = {
  fixed_price: { label: '一口价', variant: 'default' },
  auction: { label: '拍卖', variant: 'info' },
};

export default function PetMarketAdminPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pet/admin/market/recent?limit=50');
      const { success, data, message } = res.data;
      if (success) {
        setTransactions(Array.isArray(data) ? data : []);
      } else {
        showError(message || t('加载失败'));
      }
    } catch {
      showError(t('加载失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">
        {t('酒吧监控')}
      </h1>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title={t('暂无交易')}
              description={t('近期没有交易记录')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t('寄售巫师 ID')}</TableHead>
                  <TableHead>{t('买方巫师 ID')}</TableHead>
                  <TableHead>{t('魔法生物 ID')}</TableHead>
                  <TableHead>{t('成交价')}</TableHead>
                  <TableHead>{t('手续费')}</TableHead>
                  <TableHead className="w-20">{t('类型')}</TableHead>
                  <TableHead>{t('时间')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeConfig = LISTING_TYPE_MAP[tx.listing_type] || { label: tx.listing_type, variant: 'outline' };
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-text-tertiary">{tx.id}</TableCell>
                      <TableCell className="text-text-secondary">{tx.seller_id}</TableCell>
                      <TableCell className="text-text-secondary">{tx.buyer_id}</TableCell>
                      <TableCell className="text-text-secondary">{tx.pet_id}</TableCell>
                      <TableCell className="font-medium">{renderQuota(tx.price)}</TableCell>
                      <TableCell className="text-text-tertiary">{renderQuota(tx.fee)}</TableCell>
                      <TableCell>
                        <Badge variant={typeConfig.variant} size="sm">
                          {t(typeConfig.label)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {tx.created_at ? timestamp2string(tx.created_at) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
