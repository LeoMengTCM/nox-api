import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../../components/ui';
import { API } from '../../lib/api';
import { showError, showSuccess } from '../../lib/utils';
import { Gift, Package } from 'lucide-react';

export default function PetGrantPage() {
  const { t } = useTranslation();
  const [speciesList, setSpeciesList] = useState([]);
  const [itemsList, setItemsList] = useState([]);

  // Grant pet form
  const [petForm, setPetForm] = useState({
    user_id: '',
    species_id: '',
    level: 1,
    star: 0,
  });
  const [petSubmitting, setPetSubmitting] = useState(false);

  // Grant item form
  const [itemForm, setItemForm] = useState({
    user_id: '',
    item_id: '',
    quantity: 1,
  });
  const [itemSubmitting, setItemSubmitting] = useState(false);

  useEffect(() => {
    loadSpecies();
    loadItems();
  }, []);

  const loadSpecies = async () => {
    try {
      const res = await API.get('/api/pet/admin/species');
      const { success, data } = res.data;
      if (success) {
        setSpeciesList(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  };

  const loadItems = async () => {
    try {
      const res = await API.get('/api/pet/admin/items');
      const { success, data } = res.data;
      if (success) {
        setItemsList(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  };

  const handleGrantPet = async () => {
    if (!petForm.user_id.trim()) {
      showError(t('请输入用户 ID'));
      return;
    }
    if (!petForm.species_id) {
      showError(t('请选择物种'));
      return;
    }
    setPetSubmitting(true);
    try {
      const res = await API.post('/api/pet/admin/grant', {
        user_id: parseInt(petForm.user_id),
        species_id: parseInt(petForm.species_id),
        level: petForm.level,
        star: petForm.star,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('发放成功'));
        setPetForm((p) => ({ ...p, user_id: '', species_id: '' }));
      } else {
        showError(message || t('操作失败'));
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setPetSubmitting(false);
    }
  };

  const handleGrantItem = async () => {
    if (!itemForm.user_id.trim()) {
      showError(t('请输入用户 ID'));
      return;
    }
    if (!itemForm.item_id) {
      showError(t('请选择物品'));
      return;
    }
    setItemSubmitting(true);
    try {
      const res = await API.post('/api/pet/admin/grant-item', {
        user_id: parseInt(itemForm.user_id),
        item_id: parseInt(itemForm.item_id),
        quantity: itemForm.quantity,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('发放成功'));
        setItemForm((p) => ({ ...p, user_id: '', item_id: '' }));
      } else {
        showError(message || t('操作失败'));
      }
    } catch {
      showError(t('操作失败'));
    } finally {
      setItemSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">
        {t('发放魔法生物/物品')}
      </h1>

      <Tabs defaultValue="pet">
        <TabsList>
          <TabsTrigger value="pet">{t('发放魔法生物')}</TabsTrigger>
          <TabsTrigger value="item">{t('发放物品')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-accent" />
                {t('发放魔法生物')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('用户 ID')}</label>
                  <Input
                    value={petForm.user_id}
                    onChange={(e) => setPetForm((p) => ({ ...p, user_id: e.target.value }))}
                    placeholder={t('输入用户 ID')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('物种')}</label>
                  <Select
                    value={petForm.species_id}
                    onValueChange={(v) => setPetForm((p) => ({ ...p, species_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('选择物种')} />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesList.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} ({s.rarity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('等级')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={petForm.level}
                    onChange={(e) => setPetForm((p) => ({ ...p, level: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('星级')}</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={petForm.star}
                    onChange={(e) => setPetForm((p) => ({ ...p, star: Math.min(5, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={handleGrantPet} loading={petSubmitting}>
                  {t('发放')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="item">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-accent" />
                {t('发放物品')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('用户 ID')}</label>
                  <Input
                    value={itemForm.user_id}
                    onChange={(e) => setItemForm((p) => ({ ...p, user_id: e.target.value }))}
                    placeholder={t('输入用户 ID')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('物品')}</label>
                  <Select
                    value={itemForm.item_id}
                    onValueChange={(v) => setItemForm((p) => ({ ...p, item_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('选择物品')} />
                    </SelectTrigger>
                    <SelectContent>
                      {itemsList.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">{t('数量')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={handleGrantItem} loading={itemSubmitting}>
                  {t('发放')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
