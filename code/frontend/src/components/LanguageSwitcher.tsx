import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language?.startsWith('si') ? 'si' : 'en';

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4 h-4 text-gray-600 hidden sm:block" />
      <label htmlFor="farmer-language-select" className="sr-only">
        {t('common.language')}
      </label>
      <select
        id="farmer-language-select"
        value={currentLanguage}
        onChange={(event) => handleLanguageChange(event.target.value)}
        className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs md:text-sm bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="en">{t('common.english')}</option>
        <option value="si">{t('common.sinhala')}</option>
      </select>
    </div>
  );
}
