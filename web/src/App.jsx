import { lazy, Suspense, useContext, useMemo } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PrivateRoute, AdminRoute, AuthRedirect } from './lib/auth';
import { StatusContext } from './contexts/status-context';
import { Spinner } from './components/ui';
import { ErrorBoundary } from './components/ui/error-boundary';

// Layouts
import ConsoleLayout from './components/layout/console-layout';
import PublicLayout from './components/layout/public-layout';
import SetupCheck from './components/layout/setup-check';

// Auth pages (direct imports - small)
import LoginForm from './pages/login';
import RegisterForm from './pages/register';
import PasswordReset from './pages/password-reset';
import PasswordResetConfirm from './pages/password-reset-confirm';
import OAuthCallback from './pages/oauth-callback';
import TwoFAVerification from './pages/two-fa-verify';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/home'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const About = lazy(() => import('./pages/about'));
const NotFound = lazy(() => import('./pages/not-found'));
const Forbidden = lazy(() => import('./pages/forbidden'));
const UserAgreement = lazy(() => import('./pages/user-agreement'));
const PrivacyPolicy = lazy(() => import('./pages/privacy-policy'));
const Token = lazy(() => import('./pages/token'));
const Channel = lazy(() => import('./pages/channel'));
const Log = lazy(() => import('./pages/log'));
const User = lazy(() => import('./pages/user'));
const Setting = lazy(() => import('./pages/setting'));
const PersonalSetting = lazy(() => import('./pages/personal-setting'));
const TopUp = lazy(() => import('./pages/top-up'));
const Redemption = lazy(() => import('./pages/redemption'));
const Pricing = lazy(() => import('./pages/pricing'));
const Playground = lazy(() => import('./pages/playground'));
const ModelPage = lazy(() => import('./pages/model'));
const ModelDeployment = lazy(() => import('./pages/model-deployment'));
const Subscription = lazy(() => import('./pages/subscription'));
const Midjourney = lazy(() => import('./pages/midjourney'));
const Task = lazy(() => import('./pages/task'));
const Setup = lazy(() => import('./pages/setup'));
const Guide = lazy(() => import('./pages/guide'));
const Ranking = lazy(() => import('./pages/ranking'));
const Checkin = lazy(() => import('./pages/checkin'));
const Community = lazy(() => import('./pages/community'));
const UserProfile = lazy(() => import('./pages/user-profile'));
const Notifications = lazy(() => import('./pages/notifications'));

const Loading = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <Spinner size="lg" />
  </div>
);

const Page = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </Suspense>
  </ErrorBoundary>
);

function DynamicOAuth2Callback() {
  const { provider } = useParams();
  return <OAuthCallback type={provider} />;
}

function App() {
  const location = useLocation();
  const [statusState] = useContext(StatusContext);

  const pricingRequireAuth = useMemo(() => {
    const config = statusState?.status?.HeaderNavModules;
    if (config) {
      try {
        const modules = JSON.parse(config);
        if (typeof modules.pricing === 'boolean') return false;
        return modules.pricing?.requireAuth === true;
      } catch { return false; }
    }
    return false;
  }, [statusState?.status?.HeaderNavModules]);

  return (
    <SetupCheck>
      <Routes>
        {/* Auth pages — no layout wrapper */}
        <Route path="/login" element={<AuthRedirect><LoginForm /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><RegisterForm /></AuthRedirect>} />
        <Route path="/reset" element={<PasswordReset />} />
        <Route path="/user/reset" element={<PasswordResetConfirm />} />

        {/* OAuth callbacks */}
        <Route path="/oauth/github" element={<OAuthCallback type="github" />} />
        <Route path="/oauth/discord" element={<OAuthCallback type="discord" />} />
        <Route path="/oauth/oidc" element={<OAuthCallback type="oidc" />} />
        <Route path="/oauth/linuxdo" element={<OAuthCallback type="linuxdo" />} />
        <Route path="/oauth/:provider" element={<DynamicOAuth2Callback />} />

        {/* Public pages — PublicLayout wrapper */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/about" element={<Page><About /></Page>} />
          <Route path="/pricing" element={
            pricingRequireAuth
              ? <PrivateRoute><Page><Pricing /></Page></PrivateRoute>
              : <Page><Pricing /></Page>
          } />
          <Route path="/user-agreement" element={<Page><UserAgreement /></Page>} />
          <Route path="/privacy-policy" element={<Page><PrivacyPolicy /></Page>} />
          <Route path="/forbidden" element={<Page><Forbidden /></Page>} />
          <Route path="/setup" element={<Page><Setup /></Page>} />
          <Route path="/guide" element={<Page><Guide /></Page>} />
        </Route>

        {/* Console pages — ConsoleLayout wrapper */}
        <Route element={<ConsoleLayout />}>
          <Route path="/console" element={<PrivateRoute><Page><Dashboard /></Page></PrivateRoute>} />
          <Route path="/console/token" element={<PrivateRoute><Page><Token /></Page></PrivateRoute>} />
          <Route path="/console/log" element={<PrivateRoute><Page><Log /></Page></PrivateRoute>} />
          <Route path="/console/personal" element={<PrivateRoute><Page><PersonalSetting /></Page></PrivateRoute>} />
          <Route path="/console/topup" element={<PrivateRoute><Page><TopUp /></Page></PrivateRoute>} />
          <Route path="/console/ranking" element={<PrivateRoute><Page><Ranking /></Page></PrivateRoute>} />
          <Route path="/console/checkin" element={<PrivateRoute><Page><Checkin /></Page></PrivateRoute>} />
          <Route path="/console/community" element={<PrivateRoute><Page><Community /></Page></PrivateRoute>} />
          <Route path="/console/notifications" element={<PrivateRoute><Page><Notifications /></Page></PrivateRoute>} />
          <Route path="/console/user/:id" element={<PrivateRoute><Page><UserProfile /></Page></PrivateRoute>} />
          <Route path="/console/playground" element={<PrivateRoute><Page><Playground /></Page></PrivateRoute>} />
          <Route path="/console/midjourney" element={<PrivateRoute><Page><Midjourney /></Page></PrivateRoute>} />
          <Route path="/console/task" element={<PrivateRoute><Page><Task /></Page></PrivateRoute>} />
          <Route path="/console/channel" element={<AdminRoute><Page><Channel /></Page></AdminRoute>} />
          <Route path="/console/user" element={<AdminRoute><Page><User /></Page></AdminRoute>} />
          <Route path="/console/redemption" element={<AdminRoute><Page><Redemption /></Page></AdminRoute>} />
          <Route path="/console/setting" element={<AdminRoute><Page><Setting /></Page></AdminRoute>} />
          <Route path="/console/models" element={<AdminRoute><Page><ModelPage /></Page></AdminRoute>} />
          <Route path="/console/deployment" element={<AdminRoute><Page><ModelDeployment /></Page></AdminRoute>} />
          <Route path="/console/subscription" element={<AdminRoute><Page><Subscription /></Page></AdminRoute>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Routes>
    </SetupCheck>
  );
}

export default App;
