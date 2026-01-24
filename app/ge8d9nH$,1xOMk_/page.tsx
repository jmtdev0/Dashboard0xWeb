"use client";

import { useState } from "react";
import LoginForm from "./components/LoginForm";
import PrivateDashboard from "./components/PrivateDashboard";

export default function PrivatePage() {
  const [token, setToken] = useState<string | null>(null);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

  // Show login form if no token, otherwise show dashboard
  if (!token) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return <PrivateDashboard token={token} onLogout={handleLogout} />;
}
