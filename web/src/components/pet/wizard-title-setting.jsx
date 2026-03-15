import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import { useWizardTitle } from '../../hooks/use-wizard-title';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../ui/dropdown-menu';
import { Button } from '../ui';

export function WizardTitleSetting() {
  const { t } = useTranslation();
  const { title, setTitle } = useWizardTitle();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-text-tertiary hover:text-text-primary"
          title={t('称呼设置')}
        >
          <Settings2 size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup value={title} onValueChange={setTitle}>
          <DropdownMenuRadioItem value="wizard">
            {t('巫师')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="witch">
            {t('女巫')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
