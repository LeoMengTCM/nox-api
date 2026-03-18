import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Shield, Trophy, ChevronRight, Zap, Heart } from 'lucide-react';
import { API } from '../../lib/api';
import { showError, showSuccess, renderQuota } from '../../lib/utils';
import { cn } from '../../lib/cn';
import { Card, Spinner, Badge, Avatar, AvatarFallback } from '../../components/ui';
import BattleResult from '../../components/pet/battle-result';

export default function PetArena() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [myPets, setMyPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [challenging, setChallenging] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [arenaRes, petsRes] = await Promise.all([
        API.get('/api/pet/arena'),
        API.get('/api/pet/my'),
      ]);
      if (arenaRes.data.success) setInfo(arenaRes.data.data);
      if (petsRes.data.success) {
        const mature = (petsRes.data.data || []).filter((p) => p.stage >= 2 && p.state === 'normal');
        setMyPets(mature);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDefend = async (petId) => {
    try {
      const res = await API.post('/api/pet/arena/defend', { pet_id: petId });
      if (res.data.success) {
        showSuccess('守擂宠物设置成功');
        loadData();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    }
  };

  const handleChallenge = async (defenderUserId) => {
    if (!selectedPet) {
      showError('请先选择攻擂宠物');
      return;
    }
    setChallenging(defenderUserId);
    setBattleResult(null);
    try {
      const res = await API.post('/api/pet/arena/challenge', {
        pet_id: selectedPet,
        defender_user_id: defenderUserId,
      });
      if (res.data.success) {
        setBattleResult(res.data.data);
        loadData();
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message);
    } finally {
      setChallenging(null);
    }
  };

  const loadHistory = async () => {
    setShowHistory(true);
    try {
      const res = await API.get('/api/pet/arena/history?per_page=20');
      if (res.data.success) setHistory(res.data.data || []);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="py-20 text-center text-muted-foreground">竞技场未启用或没有活跃赛季</div>
    );
  }

  const season = info.season;
  const ranking = info.ranking || [];
  const myDefender = info.my_defender;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Season Banner */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-red-500/5 to-amber-500/5 p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-amber-400" />
          <h1 className="font-serif text-2xl font-bold">{season?.name || '宠物擂台'}</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          今日剩余攻擂次数: {info.max_attacks - info.today_attacks} / {info.max_attacks}
        </p>
        {season && (
          <p className="mt-1 text-xs text-muted-foreground">
            赛季截止: {new Date(season.end_at * 1000).toLocaleDateString()}
          </p>
        )}
      </Card>

      {/* Battle Result */}
      {battleResult && <BattleResult result={battleResult} />}

      {/* My Defender */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <h2 className="font-serif text-lg font-semibold">我的守擂</h2>
        </div>
        {myDefender ? (
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div>
              <span className="font-medium">宠物 #{myDefender.pet_id}</span>
              <div className="text-sm text-muted-foreground">
                积分: {myDefender.rating} | 胜: {myDefender.win_count} | 负: {myDefender.loss_count} | 连胜: {myDefender.win_streak}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">尚未设置守擂宠物</p>
        )}

        {/* Pet Selector for defending */}
        <div className="mt-3">
          <p className="mb-2 text-sm text-muted-foreground">选择守擂宠物:</p>
          <div className="flex flex-wrap gap-2">
            {myPets.map((pet) => (
              <button
                key={pet.id}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  myDefender?.pet_id === pet.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-border hover:border-primary'
                )}
                onClick={() => handleDefend(pet.id)}
              >
                {pet.nickname || `#${pet.id}`} (Lv.{pet.level})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Attack Pet Selector */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-5 w-5 text-red-400" />
          <h2 className="font-serif text-lg font-semibold">选择攻擂宠物</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {myPets.map((pet) => (
            <button
              key={pet.id}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                selectedPet === pet.id
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-border hover:border-primary'
              )}
              onClick={() => setSelectedPet(pet.id)}
            >
              {pet.nickname || `#${pet.id}`} (Lv.{pet.level}, {'\u2694'}{pet.power || 0})
            </button>
          ))}
        </div>
      </Card>

      {/* Ranking / Opponent List */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="font-serif text-lg font-semibold">擂台排名</h2>
          </div>
          <button
            className="text-sm text-primary hover:underline"
            onClick={loadHistory}
          >
            战斗历史
          </button>
        </div>

        <div className="space-y-2">
          {ranking.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无守擂者</p>
          ) : (
            ranking.map((defender, i) => (
              <div
                key={defender.user_id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium">{defender.display_name || defender.username}</span>
                    <div className="text-xs text-muted-foreground">
                      积分: {defender.rating} | {defender.win_count}胜{defender.loss_count}负 | 连胜: {defender.win_streak}
                    </div>
                  </div>
                </div>
                <button
                  className="rounded-md bg-red-500/10 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  disabled={challenging === defender.user_id || !selectedPet}
                  onClick={() => handleChallenge(defender.user_id)}
                >
                  {challenging === defender.user_id ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <>
                      <Swords className="mr-1 inline h-3.5 w-3.5" />
                      挑战
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* History Dialog */}
      {showHistory && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold">战斗历史</h3>
            <button className="text-sm text-primary" onClick={() => setShowHistory(false)}>关闭</button>
          </div>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无战斗记录</p>
            ) : history.map((battle) => (
              <div key={battle.id} className="rounded-lg border border-border/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>
                    攻方 #{battle.attacker_user_id} vs 守方 #{battle.defender_user_id}
                  </span>
                  <Badge variant={battle.winner_user_id === battle.attacker_user_id ? 'default' : 'secondary'}>
                    {battle.winner_user_id === battle.attacker_user_id ? '攻胜' : '守胜'}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  积分变化: {battle.attacker_rating_before} → {battle.attacker_rating_after}
                  {' | '}
                  {new Date(battle.created_at * 1000).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
