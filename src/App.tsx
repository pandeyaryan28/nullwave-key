import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth/authContext';
import { Navbar } from './components/ui/Navbar';
import { Footer } from './components/ui/Footer';

// Code-split routes so public visitor pages don't load dashboard code
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
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

export const App: React.FC = () => {
  const location = useLocation();

  // Public standalone screens that don't need the main creator navbar/footer
  const isPublicViewerRoute =
    location.pathname.startsWith('/@') ||
    location.pathname.startsWith('/%40') ||
    location.pathname.startsWith('/creator/');

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {!isPublicViewerRoute && <Navbar />}

      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Home & Auth */}
            <Route path="/" element={<LandingPage />} />
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

            {/* Public Creator and Resource Routes */}
            <Route path="/@:username" element={<CreatorProfilePage />} />
            <Route path="/@:username/resource/:publicSlug" element={<ResourceViewPage />} />
            
            {/* Handling URL-encoded @ (%40) and friendly /creator/ alias */}
            <Route path="/%40:username" element={<CreatorProfilePage />} />
            <Route path="/%40:username/resource/:publicSlug" element={<ResourceViewPage />} />
            <Route path="/creator/:username" element={<CreatorProfilePage />} />
            <Route path="/creator/:username/resource/:publicSlug" element={<ResourceViewPage />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>

      {!isPublicViewerRoute && <Footer />}
    </div>
  );
};
