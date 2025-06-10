import { Navigate, Route, Routes } from 'react-router';

import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';

import CaptureSeparatePage from '@/pages/CaptureSeparatePage';

import { AuthenticationRoute } from './AuthenticationRoute';
import { PublicRoute } from './PublicRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthenticationRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/captures" element={<CaptureSeparatePage />} />
      </Route>
      <Route element={<PublicRoute />}>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>
    </Routes>
  );
}
