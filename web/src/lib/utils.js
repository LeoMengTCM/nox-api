import { toast } from '../components/ui/toast';

// --- Role checks ---

export function isAdmin() {
  let user = localStorage.getItem('user');
  if (!user) return false;
  try {
    user = JSON.parse(user);
    return user.role >= 10;
  } catch {
    return false;
  }
}

export function isRoot() {
  let user = localStorage.getItem('user');
  if (!user) return false;
  try {
    user = JSON.parse(user);
    return user.role >= 100;
  } catch {
    return false;
  }
}

// --- User helpers ---

export function getUserIdFromLocalStorage() {
  let user = localStorage.getItem('user');
  if (!user) return -1;
  try {
    user = JSON.parse(user);
    return user.id;
  } catch {
    return -1;
  }
}

// --- localStorage getters ---

export function getSystemName() {
  let system_name = localStorage.getItem('system_name');
  if (!system_name || system_name === 'New API') return 'Nox API';
  return system_name;
}

export function getLogo() {
  let logo = localStorage.getItem('logo');
  if (!logo || logo === '/logo.png') return '/favicon.svg';
  return logo;
}

export function getFooterHTML() {
  return localStorage.getItem('footer_html');
}

export function getQuotaPerUnit() {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  return quotaPerUnit ? parseFloat(quotaPerUnit) : 500000;
}

// --- Data persistence ---

export function setUserData(data) {
  localStorage.setItem('user', JSON.stringify(data));
  // Reset the 401 redirect guard — user just logged in successfully
  _redirecting401 = false;
}

export function setStatusData(data) {
  localStorage.setItem('status', JSON.stringify(data));
  localStorage.setItem('system_name', data.system_name);
  localStorage.setItem('logo', data.logo);
  localStorage.setItem('footer_html', data.footer_html);
  localStorage.setItem('quota_per_unit', data.quota_per_unit);
  localStorage.setItem('display_in_currency', data.display_in_currency);
  localStorage.setItem('quota_display_type', data.quota_display_type || 'USD');
  localStorage.setItem('enable_drawing', data.enable_drawing);
  localStorage.setItem('enable_task', data.enable_task);
  localStorage.setItem('enable_data_export', data.enable_data_export);
  localStorage.setItem('chats', JSON.stringify(data.chats));
  localStorage.setItem(
    'data_export_default_time',
    data.data_export_default_time,
  );
  localStorage.setItem(
    'default_collapse_sidebar',
    data.default_collapse_sidebar,
  );
  localStorage.setItem('mj_notify_enabled', data.mj_notify_enabled);
  if (data.chat_link) {
    // reserved
  } else {
    localStorage.removeItem('chat_link');
  }
  if (data.chat_link2) {
    // reserved
  } else {
    localStorage.removeItem('chat_link2');
  }
  if (data.docs_link) {
    localStorage.setItem('docs_link', data.docs_link);
  } else {
    localStorage.removeItem('docs_link');
  }
}

// --- Toast notifications ---

let _redirecting401 = false;

export function showError(error) {
  console.error(error);
  if (error.message) {
    if (error.name === 'AxiosError') {
      switch (error.response?.status) {
        case 401:
          // Avoid duplicate 401 redirects and don't redirect if already on login
          if (_redirecting401 || window.location.pathname === '/login') return;
          _redirecting401 = true;
          localStorage.removeItem('user');
          sessionStorage.removeItem('avatar_prompted');
          // Use a short delay so current render cycle completes before redirect
          setTimeout(() => {
            window.location.href = '/login?expired=true';
          }, 0);
          return;
        case 429:
          toast({
            variant: 'danger',
            title: 'Error',
            description: 'Too many requests. Please try again later.',
          });
          return;
        case 500:
          toast({
            variant: 'danger',
            title: 'Error',
            description: 'Internal server error. Please contact the administrator.',
          });
          return;
        case 405:
          toast({
            variant: 'info',
            title: 'Notice',
            description: 'This site is for demonstration purposes only.',
          });
          return;
        default:
          toast({
            variant: 'danger',
            title: 'Error',
            description: error.message,
          });
          return;
      }
    }
    toast({
      variant: 'danger',
      title: 'Error',
      description: error.message,
    });
  } else {
    toast({
      variant: 'danger',
      title: 'Error',
      description: String(error),
    });
  }
}

export function showWarning(message) {
  toast({
    variant: 'warning',
    title: 'Warning',
    description: message,
  });
}

export function showSuccess(message) {
  toast({
    variant: 'success',
    title: 'Success',
    description: message,
  });
}

export function showInfo(message) {
  toast({
    variant: 'info',
    title: 'Info',
    description: message,
  });
}

export function showNotice(message) {
  toast({
    variant: 'default',
    title: 'Notice',
    description: message,
    duration: 20000,
  });
}

// --- Avatar color ---

const AVATAR_COLORS = ['#D97757', '#7C6F64', '#4A7C6F', '#8B7355', '#6B7D8C', '#9B6B6B', '#5B7553', '#7B6B8C'];

export function stringToColor(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// --- Misc utilities ---

export function openPage(url) {
  window.open(url);
}

export function removeTrailingSlash(url) {
  if (!url) return '';
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}

export async function copy(text) {
  let okay = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    try {
      const textarea = window.document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      window.document.body.appendChild(textarea);
      textarea.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(textarea);
    } catch {
      okay = false;
    }
  }
  return okay;
}

export function getTodayStartTimestamp() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

export function timestamp2string(timestamp) {
  let date = new Date(timestamp * 1000);
  let year = date.getFullYear().toString();
  let month = (date.getMonth() + 1).toString().padStart(2, '0');
  let day = date.getDate().toString().padStart(2, '0');
  let hour = date.getHours().toString().padStart(2, '0');
  let minute = date.getMinutes().toString().padStart(2, '0');
  let second = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function downloadTextAsFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const verifyJSON = (str) => {
  try {
    JSON.parse(str);
  } catch {
    return false;
  }
  return true;
};

export function shouldShowPrompt(id) {
  return !localStorage.getItem(`prompt-${id}`);
}

export function setPromptShown(id) {
  localStorage.setItem(`prompt-${id}`, 'true');
}

// --- Quota / number formatting ---

export function renderNumber(num) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 10000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num;
  }
}

export function renderQuota(quota, digits = 2) {
  let quotaPerUnit = localStorage.getItem('quota_per_unit');
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  quotaPerUnit = parseFloat(quotaPerUnit);
  if (quotaDisplayType === 'TOKENS') {
    return renderNumber(quota);
  }
  const resultUSD = quota / quotaPerUnit;
  let symbol = '$';
  let value = resultUSD;
  if (quotaDisplayType === 'CNY') {
    const statusStr = localStorage.getItem('status');
    let usdRate = 1;
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        usdRate = s?.usd_exchange_rate || 1;
      }
    } catch (e) {}
    value = resultUSD * usdRate;
    symbol = '¥';
  } else if (quotaDisplayType === 'CUSTOM') {
    const statusStr = localStorage.getItem('status');
    let symbolCustom = '¤';
    let rate = 1;
    try {
      if (statusStr) {
        const s = JSON.parse(statusStr);
        symbolCustom = s?.custom_currency_symbol || symbolCustom;
        rate = s?.custom_currency_exchange_rate || rate;
      }
    } catch (e) {}
    value = resultUSD * rate;
    symbol = symbolCustom;
  }
  const fixedResult = value.toFixed(digits);
  if (parseFloat(fixedResult) === 0 && quota > 0 && value > 0) {
    const minValue = Math.pow(10, -digits);
    return symbol + minValue.toFixed(digits);
  }
  return symbol + fixedResult;
}

export function compareObjects(oldObject, newObject) {
  const changedProperties = [];
  for (const key in oldObject) {
    if (
      oldObject.hasOwnProperty(key) &&
      newObject.hasOwnProperty(key) &&
      oldObject[key] !== newObject[key]
    ) {
      changedProperties.push({
        key,
        oldValue: oldObject[key],
        newValue: newObject[key],
      });
    }
  }
  return changedProperties;
}
