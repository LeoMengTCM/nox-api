import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
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
import { PetSprite } from '../../components/pet/pet-sprite';
import { RarityBadge } from '../../components/pet/rarity-badge';
import { API } from '../../lib/api';
import { showError } from '../../lib/utils';
import { Search, Users } from 'lucide-react';

export default function PetUsersPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const id = userId.trim();
    if (!id) {
      showError(t('请输入用户 ID'));
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await API.get(`/api/pet/admin/users/${id}/pets`);
      const { success, data, message } = res.data;
      if (success) {
        setPets(Array.isArray(data) ? data : []);
      } else {
        showError(message || t('加载失败'));
        setPets([]);
      }
    } catch {
      showError(t('加载失败'));
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const renderStars = (star) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < (star || 0) ? 'text-amber-500' : 'text-amber-500/20'}>
        ★
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">
        {t('用户宠物查看')}
      </h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('输入用户 ID')}
              className="max-w-xs"
            />
            <Button
              variant="primary"
              onClick={handleSearch}
              loading={loading}
              leftIcon={<Search className="w-4 h-4" />}
            >
              {t('搜索')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : pets.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('暂无宠物')}
                description={t('该用户暂无宠物数据')}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-16">{t('预览')}</TableHead>
                    <TableHead>{t('昵称')}</TableHead>
                    <TableHead>{t('物种')}</TableHead>
                    <TableHead className="w-20">{t('稀有度')}</TableHead>
                    <TableHead className="w-16">{t('等级')}</TableHead>
                    <TableHead className="w-28">{t('星级')}</TableHead>
                    <TableHead className="w-20">{t('状态')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pets.map((pet) => (
                    <TableRow key={pet.id}>
                      <TableCell className="text-text-tertiary">{pet.id}</TableCell>
                      <TableCell>
                        <PetSprite visualKey={pet.visual_key} size="sm" />
                      </TableCell>
                      <TableCell className="font-medium">{pet.nickname || '-'}</TableCell>
                      <TableCell className="text-text-secondary">{pet.species_name || '-'}</TableCell>
                      <TableCell>
                        <RarityBadge rarity={pet.rarity} />
                      </TableCell>
                      <TableCell className="text-text-secondary">Lv.{pet.level || 1}</TableCell>
                      <TableCell>
                        <span className="text-xs tracking-tight">{renderStars(pet.star)}</span>
                      </TableCell>
                      <TableCell>
                        {pet.state === 'dispatched' ? (
                          <Badge variant="warning" size="sm">{t('任务中')}</Badge>
                        ) : pet.state === 'listed' ? (
                          <Badge variant="info" size="sm">{t('上架中')}</Badge>
                        ) : pet.state === 'weak' ? (
                          <Badge variant="outline" size="sm">{t('虚弱')}</Badge>
                        ) : (
                          <Badge variant="success" size="sm">{t('正常')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
