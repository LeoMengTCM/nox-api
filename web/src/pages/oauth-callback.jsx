import { useContext, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API, updateAPI } from '../lib/api';
import { showError, showSuccess, setUserData } from '../lib/utils';
import { UserContext } from '../contexts/user-context';
import { Spinner } from '../components/ui';

const MAX_RETRIES = 3;

const OAuthCallback = ({ type }) => {
  const [searchParams] = useSearchParams();
  const [, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();
  const hasExecuted = useRef(false);

  const sendCode = async (code, state, retry = 0) => {
    try {
      const { data: resData } = await API.get(
        `/api/oauth/${type}?code=${code}&state=${state}`,
      );
      const { success, message, data } = resData;

      if (!success) {
        showError(message || '授权失败');
        return;
      }

      if (message === 'bind') {
        showSuccess('绑定成功！');
        navigate('/console/personal');
      } else {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        setUserData(data);
        updateAPI();
        showSuccess('登录成功！');
        navigate('/console/token');
      }
    } catch (error) {
      if (retry < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, (retry + 1) * 2000));
        return sendCode(code, state, retry + 1);
      }
      showError(error.message || '授权失败');
      navigate('/console/personal');
    }
  };

  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      showError('未获取到授权码');
      navigate('/console/personal');
      return;
    }

    sendCode(code, state);
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-text-secondary">正在处理授权...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
