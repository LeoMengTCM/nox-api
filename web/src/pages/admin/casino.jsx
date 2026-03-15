import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, Settings, BarChart3, Users, TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Switch, Spinner, Badge,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Pagination,
} from '../../components/ui';

const GAME_NAMES = {
  blackjack: '21点',
  dice: '骰子',
  roulette: '轮盘',
  baccarat: '百家乐',
  slots: '老虎机',
  poker: '德州扑克',
};

const GAME_KEYS = ['blackjack', 'dice', 'roulette', 'baccarat', 'slots', 'poker'];

// Settings Tab
function SettingsTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    min_bet: 0,
    max_bet: 0,
    daily_loss_limit: 0,
    games: {},
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      if (res.data.success) {
        const raw = res.data.data;
        const opts = {};
        if (Array.isArray(raw)) {
          for (const opt of raw) {
            if (opt.key) opts[opt.key] = opt.value;
          }
        }

        const games = {};
        GAME_KEYS.forEach((g) => {
          const key = `CasinoGame_${g}`;
          games[g] = opts[key] === 'true' || opts[key] === true;
        });

        setSettings({
          enabled: opts.CasinoEnabled === 'true' || opts.CasinoEnabled === true,
          min_bet: parseInt(opts.CasinoMinBet) || 0,
          max_bet: parseInt(opts.CasinoMaxBet) || 0,
          daily_loss_limit: parseInt(opts.CasinoDailyLossLimit) || 0,
          games,
        });
      }
    } catch {
      showError(t('加载设置失败'));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const pairs = [
        { key: 'CasinoEnabled', value: String(settings.enabled) },
        { key: 'CasinoMinBet', value: String(settings.min_bet) },
        { key: 'CasinoMaxBet', value: String(settings.max_bet) },
        { key: 'CasinoDailyLossLimit', value: String(settings.daily_loss_limit) },
      ];

      GAME_KEYS.forEach((g) => {
        pairs.push({ key: `CasinoGame_${g}`, value: String(!!settings.games[g]) });
      });

      const errors = [];
      for (const { key, value } of pairs) {
        const res = await API.put('/api/option/', { key, value });
        if (!res.data?.success) {
          errors.push(res.data?.message || `${key} failed`);
        }
      }

      if (errors.length > 0) {
        showError(errors.join('; '));
      } else {
        showSuccess(t('保存成功'));
      }
    } catch {
      showError(t('保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateGame = (game, value) => {
    setSettings((prev) => ({
      ...prev,
      games: { ...prev.games, [game]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('启用赌场系统')}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{t('关闭后用户无法访问赌场')}</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => update('enabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bet Limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('下注限制')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('最小下注额')}</label>
              <Input
                type="number"
                value={settings.min_bet || ''}
                onChange={(e) => update('min_bet', parseInt(e.target.value) || 0)}
              />
              <p className="text-[10px] text-text-tertiary">= {renderQuota(settings.min_bet || 0)}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('最大下注额')}</label>
              <Input
                type="number"
                value={settings.max_bet || ''}
                onChange={(e) => update('max_bet', parseInt(e.target.value) || 0)}
              />
              <p className="text-[10px] text-text-tertiary">= {renderQuota(settings.max_bet || 0)}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">{t('每日亏损限额')}</label>
              <Input
                type="number"
                value={settings.daily_loss_limit || ''}
                onChange={(e) => update('daily_loss_limit', parseInt(e.target.value) || 0)}
              />
              <p className="text-[10px] text-text-tertiary">= {renderQuota(settings.daily_loss_limit || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('游戏开关')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GAME_KEYS.map((game) => (
            <div key={game} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-text-primary">{t(GAME_NAMES[game])}</span>
              <Switch
                checked={!!settings.games[game]}
                onCheckedChange={(v) => updateGame(game, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={saveSettings} loading={saving} className="w-full sm:w-auto">
        {t('保存设置')}
      </Button>
    </div>
  );
}

// Statistics Tab
function StatsTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [gameBreakdown, setGameBreakdown] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/casino/admin/stats');

      if (res.data.success) setSummary(res.data.data);
    } catch {
      showError(t('加载统计失败'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title={t('总下注次数')} value={summary.total_bets || 0} />
          <SummaryCard title={t('总下注金额')} value={renderQuota(summary.total_wagered || 0)} />
          <SummaryCard
            title={t('庄家利润')}
            value={renderQuota(summary.house_profit || 0)}
            trend={(summary.house_profit || 0) >= 0 ? 'up' : 'down'}
          />
          <SummaryCard title={t('活跃用户')} value={summary.active_users || 0} />
        </div>
      )}

      {/* Daily Profit Chart */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('每日庄家利润')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgb(var(--text-tertiary))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgb(var(--text-tertiary))" />
                  <RTooltip
                    contentStyle={{
                      background: 'rgb(var(--surface))',
                      border: '1px solid rgb(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="profit" stroke="#C5A55A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Breakdown */}
      {gameBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('游戏数据')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gameBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="game" tick={{ fontSize: 10 }} stroke="rgb(var(--text-tertiary))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgb(var(--text-tertiary))" />
                  <RTooltip
                    contentStyle={{
                      background: 'rgb(var(--surface))',
                      border: '1px solid rgb(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="bets" fill="#D97757" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('游戏')}</TableHead>
                  <TableHead className="text-right">{t('下注次数')}</TableHead>
                  <TableHead className="text-right">{t('下注金额')}</TableHead>
                  <TableHead className="text-right">{t('庄家利润')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameBreakdown.map((g) => (
                  <TableRow key={g.game}>
                    <TableCell>{t(GAME_NAMES[g.game] || g.game)}</TableCell>
                    <TableCell className="text-right">{g.bets || 0}</TableCell>
                    <TableCell className="text-right">{renderQuota(g.wagered || 0)}</TableCell>
                    <TableCell className={cn(
                      'text-right font-medium',
                      (g.profit || 0) >= 0 ? 'text-success' : 'text-danger',
                    )}>
                      {renderQuota(g.profit || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// User Management Tab
function UsersTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 20;

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (search) params.search = search;
      const res = await API.get('/api/casino/admin/users', { params });
      if (res.data.success) {
        setUsers(res.data.data?.users || []);
        setTotal(res.data.data?.total || 0);
      }
    } catch {
      showError(t('加载用户失败'));
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userId, banned) => {
    try {
      const res = await API.post('/api/casino/admin/ban', { user_id: userId, banned: !banned });
      if (res.data.success) {
        showSuccess(t(!banned ? '已禁止' : '已解禁'));
        loadUsers();
      } else {
        showError(res.data.message);
      }
    } catch {
      showError(t('操作失败'));
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder={t('搜索用户名...')}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-xs"
      />

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('用户名')}</TableHead>
                  <TableHead className="text-right">{t('总下注')}</TableHead>
                  <TableHead className="text-right">{t('净盈亏')}</TableHead>
                  <TableHead className="text-right">{t('场次')}</TableHead>
                  <TableHead className="text-right">{t('状态')}</TableHead>
                  <TableHead className="text-right">{t('操作')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.username || '-'}</TableCell>
                    <TableCell className="text-right">{renderQuota(u.total_wagered || 0)}</TableCell>
                    <TableCell className={cn(
                      'text-right font-medium',
                      (u.net_profit || 0) >= 0 ? 'text-success' : 'text-danger',
                    )}>
                      {renderQuota(u.net_profit || 0)}
                    </TableCell>
                    <TableCell className="text-right">{u.games_played || 0}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={u.banned ? 'danger' : 'success'} size="sm">
                        {u.banned ? t('已禁止') : t('正常')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={u.banned ? 'secondary' : 'danger'}
                        size="sm"
                        onClick={() => toggleBan(u.user_id, u.banned)}
                      >
                        {u.banned ? t('解禁') : t('禁止')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-tertiary py-8">
                      {t('暂无数据')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {total > perPage && (
            <div className="flex justify-center">
              <Pagination
                current={page}
                total={total}
                pageSize={perPage}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ title, value, trend }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-text-tertiary">{title}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-lg font-heading text-text-primary">{value}</p>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-success" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-danger" />}
      </div>
    </Card>
  );
}

// Main Admin Page
export default function AdminCasino() {
  const { t } = useTranslation();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
          <Dices className="h-6 w-6 text-[#C5A55A]" />
          {t('赌场管理')}
        </h1>
        <p className="text-sm text-text-tertiary mt-1">{t('韦斯莱魔法赌坊管理面板')}</p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            {t('赌场设置')}
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('运营统计')}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {t('用户管理')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
