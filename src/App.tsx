import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './lib/auth/authContext';
import { Navbar } from './components/ui/Navbar';
import { Footer } from './components/ui/Footer';

// Code-split routes so public visitor pages don't load dashboard code
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const PricingPage = lazy(() => import('./pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const AboutPage = lazy(() => import('./pages/public/AboutPage').then(m => ({ default: m.AboutPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardOverviewPage = lazy(() => import('./pages/dashboard/DashboardOverviewPage').then(m => ({ default: m.DashboardOverviewPage })));
const ResourcesListPage = lazy(() => import('./pages/dashboard/ResourcesListPage').then(m => ({ default: m.ResourcesListPage })));
const NewResourcePage = lazy(() => import('./pages/dashboard/NewResourcePage').then(m => ({ default: m.NewResourcePage })));
const EditResourcePage = lazy(() => import('./pages/dashboard/EditResourcePage').then(m => ({ default: m.EditResourcePage })));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CreatorProfilePage = lazy(() => import('./pages/public/CreatorProfilePage').then(m => ({ default: m.CreatorProfilePage })));
const ResourceViewPage = lazy(() => import('./pages/public/ResourceViewPage').then(m => ({ default: m.ResourceViewPage })));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-6 h-6 rounded-md bg-neutral-900 dark:bg-neutral-100 animate-spin" />
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-md bg-neutral-900 dark:bg-neutral-100 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile?.username && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Home Route: redirects authenticated creators to dashboard / onboarding, displays marketing LandingPage for guests
const HomeRoute: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    if (profile && !profile.username) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
};

// Legacy redirect components for backwards compatibility with legacy URL schemes
const LegacyProfileRedirect: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const cleanUsername = (username || '').replace(/^[@%40]+/, '').toLowerCase();
  return <Navigate to={`/${cleanUsername}`} replace />;
};

const LegacyResourceRedirect: React.FC = () => {
  const { username, publicSlug } = useParams<{ username: string; publicSlug: string }>();
  const cleanUsername = (username || '').replace(/^[@%40]+/, '').toLowerCase();
  return <Navigate to={`/${cleanUsername}/resource/${publicSlug || ''}`} replace />;
};

export const App: React.FC = () => {
  const location = useLocation();

  // Non-viewer routes that should show the main creator navbar/footer
  const isMainAppRoute =
    ['/', '/login', '/signup', '/onboarding', '/features', '/how-it-works', '/pricing', '/about'].includes(location.pathname) ||
    location.pathname.startsWith('/dashboard');

  // Standalone public screens (creator profiles and resource views) omit main nav/footer
  const isPublicViewerRoute = !isMainAppRoute;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {!isPublicViewerRoute && <Navbar />}

      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Marketing & Multi-Page Routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Onboarding */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Creator Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <DashboardOverviewPage />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/resources"
              element={
                <ProtectedRoute>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <ResourcesListPage />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/resources/new"
              element={
                <ProtectedRoute>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <NewResourcePage />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/resources/:id/edit"
              element={
                <ProtectedRoute>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <EditResourcePage />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <SettingsPage />
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Clean Public Creator and Resource Routes */}
            <Route path="/:username" element={<CreatorProfilePage />} />
            <Route path="/:username/resource/:publicSlug" element={<ResourceViewPage />} />

            {/* Backwards Compatibility: Redirect Legacy @ and /creator/ Routes to Clean Routes */}
            <Route path="/@:username" element={<LegacyProfileRedirect />} />
            <Route path="/@:username/resource/:publicSlug" element={<LegacyResourceRedirect />} />
            <Route path="/%40:username" element={<LegacyProfileRedirect />} />
            <Route path="/%40:username/resource/:publicSlug" element={<LegacyResourceRedirect />} />
            <Route path="/creator/:username" element={<LegacyProfileRedirect />} />
            <Route path="/creator/:username/resource/:publicSlug" element={<LegacyResourceRedirect />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>

      {!isPublicViewerRoute && <Footer />}
    </div>
  );
};
