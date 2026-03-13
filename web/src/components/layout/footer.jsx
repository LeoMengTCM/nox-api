import React, { useEffect, useState, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { getFooterHTML, getLogo, getSystemName } from '../../lib/utils';
import { StatusContext } from '../../contexts/status-context';

const FooterBar = () => {
  const { t } = useTranslation();
  const [footer, setFooter] = useState(getFooterHTML());
  const systemName = getSystemName();
  const logo = getLogo();
  const [statusState] = useContext(StatusContext);
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;

  const loadFooter = () => {
    let footer_html = localStorage.getItem('footer_html');
    if (footer_html) {
      setFooter(footer_html);
    }
  };

  const currentYear = new Date().getFullYear();

  const customFooter = useMemo(
    () => (
      <footer className="relative h-auto py-16 px-6 md:px-24 w-full flex flex-col items-center justify-between overflow-hidden">
        <div className="absolute hidden md:block top-[204px] left-[-100px] w-[151px] h-[151px] rounded-full bg-accent/30" />
        <div className="absolute md:hidden bottom-[20px] left-[-50px] w-[80px] h-[80px] rounded-full bg-accent/20" />

        {isDemoSiteMode && (
          <div className="flex flex-col md:flex-row justify-between w-full max-w-[1110px] mb-10 gap-8">
            <div className="flex-shrink-0">
              <img
                src={logo}
                alt={systemName}
                className="w-16 h-16 rounded-full bg-surface-active p-1.5 object-contain"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-[1110px] gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-secondary">
              &copy; {currentYear} {systemName}. {t('版权所有')}
            </span>
          </div>

          <div className="text-sm">
            <span className="text-text-secondary">
              Nox API
            </span>
          </div>
        </div>
      </footer>
    ),
    [logo, systemName, t, currentYear, isDemoSiteMode],
  );

  useEffect(() => {
    loadFooter();
  }, []);

  return (
    <div className="w-full">
      {footer ? (
        <div className="relative">
          <div
            className="custom-footer"
            dangerouslySetInnerHTML={{ __html: footer }}
          />
          <div className="absolute bottom-2 right-4 text-xs text-text-tertiary opacity-70">
            <span>Nox API</span>
          </div>
        </div>
      ) : (
        customFooter
      )}
    </div>
  );
};

export default FooterBar;
