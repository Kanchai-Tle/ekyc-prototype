import { Navigate, Route, Routes } from 'react-router';

import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';

import CameraCapture from '@/pages/CapturePage';
import CaptureSeparate from '@/pages/CaptureSeparate';

import SuccessPage from '@/pages/LandingPage/SuccessPage';
import FailurePage from '@/pages/LandingPage/FailurePage';

import { AuthenticationRoute } from './AuthenticationRoute';
import { PublicRoute } from './PublicRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthenticationRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/captures" element={<CaptureSeparate />} />
        <Route path="/capture" element={<CameraCapture />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/failure" element={<FailurePage />} />
      </Route>
      <Route element={<PublicRoute />}>
        <Route path="/example-component" />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>
    </Routes>
  );
}
