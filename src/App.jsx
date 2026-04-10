import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { TenantProvider } from "./contexts/TenantContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Landing from "./pages/Landing";
import CreateTenant from "./pages/CreateTenant";
import WagmiProviderSetup from "./components/WagmiProviderSetup";
import TokenDetails from "./pages/TokenDetails";

export default function App() {
  return (
    <WagmiProviderSetup>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Landing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-tenant"
              element={
                <ProtectedRoute>
                  <CreateTenant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/token/:tokenId"
              element={
                <ProtectedRoute>
                  <TokenDetails />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </WagmiProviderSetup>
  );
}
