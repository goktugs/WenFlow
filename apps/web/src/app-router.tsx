import { Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./features/auth/auth-layout";
import { AuthenticatedShell } from "./features/auth/authenticated-shell";
import { LoginPage } from "./features/auth/login-page";
import { RegisterPage } from "./features/auth/register-page";
import { RequireAuth } from "./features/auth/require-auth";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AuthenticatedShell />} />
      </Route>

      <Route path="*" element={<Navigate replace to="/app" />} />
    </Routes>
  );
}

