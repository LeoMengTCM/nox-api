import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Switch, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui';
import { DataTable } from '../components/ui/data-table';
import { Pagination } from '../components/ui/pagination';
import { API } from '../lib/api';
import { showError, showSuccess, showInfo, timestamp2string, getQuotaPerUnit, copy } from '../lib/utils';

function getPriceColor(ratio) {
  if (ratio <= 0) return 'text-text-secondary';
  if (ratio <= 0.5) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio <= 1) return 'text-sky-600 dark:text-sky-400';
  if (ratio <= 3) return 'text-blue-600 dark:text-blue-400';
  if (ratio <= 10) return 'text-amber-600 dark:text-amber-400';
  if (ratio <= 30) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getPriceBadgeVariant(ratio) {
  if (ratio <= 1) return 'success';
  if (ratio <= 5) return 'info';
  if (ratio <= 15) return 'warning';
  return 'danger';
}

export default function PricingPage() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const loadPricing = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/pricing');
      const { success, message, data } = res.data;
      if (success) {
        setPricing(data || []);
      } else {
        showError(message);
      }
    } catch (e) {
      showError('加载模型定价失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const filteredPricing = useMemo(() => {
    if (!searchKeyword.trim()) return pricing;
    const keyword = searchKeyword.trim().toLowerCase();
    return pricing.filter((item) =>
      item.model_name?.toLowerCase().includes(keyword)
    );
  }, [pricing, searchKeyword]);

  const columns = [
    {
      header: '模型名称',
      accessorKey: 'model_name',
      cell: ({ row }) => (
        <span className="font-medium text-text-primary">{row.original.model_name}</span>
      ),
    },
    {
      header: 'Prompt 价格',
      accessorKey: 'model_ratio',
      cell: ({ row }) => {
        const ratio = row.original.model_ratio;
        return (
          <span className={getPriceColor(ratio)}>
            {ratio !== undefined ? ratio.toFixed(4) : '-'}
          </span>
        );
      },
    },
    {
      header: '补全价格',
      accessorKey: 'completion_ratio',
      cell: ({ row }) => {
        const ratio = row.original.completion_ratio;
        return (
          <span className={getPriceColor(ratio)}>
            {ratio !== undefined ? ratio.toFixed(4) : '-'}
          </span>
        );
      },
    },
    {
      header: '分组倍率',
      accessorKey: 'group_ratio',
      cell: ({ row }) => {
        const ratio = row.original.group_ratio;
        if (ratio === undefined || ratio === null) return '-';
        return (
          <Badge variant={getPriceBadgeVariant(ratio)}>
            {ratio.toFixed(2)}x
          </Badge>
        );
      },
    },
    {
      header: '价格等级',
      id: 'price_tier',
      cell: ({ row }) => {
        const ratio = row.original.model_ratio || 0;
        if (ratio <= 0.5) return <Badge variant="success">低价</Badge>;
        if (ratio <= 3) return <Badge variant="info">标准</Badge>;
        if (ratio <= 15) return <Badge variant="warning">较贵</Badge>;
        return <Badge variant="danger">高价</Badge>;
      },
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-heading text-text-primary">模型定价</h1>
      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="搜索模型名称"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>共 {filteredPricing.length} 个模型</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Badge variant="success">低价 (0-0.5)</Badge>
          <Badge variant="info">标准 (0.5-3)</Badge>
          <Badge variant="warning">较贵 (3-15)</Badge>
          <Badge variant="danger">高价 (15+)</Badge>
        </div>

        <DataTable columns={columns} data={filteredPricing} loading={loading} />
      </Card>
    </div>
  );
}
