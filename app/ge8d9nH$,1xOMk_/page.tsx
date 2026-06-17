"use client";

import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import SelectionScreen from "./components/SelectionScreen";
import CryptoView from "./components/CryptoView";
import TodoView from "./components/TodoView";
import CalendarView from "./components/CalendarView";

type View = "login" | "selection" | "crypto" | "todos" | "calendar";

export default function PrivatePage() {
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>("login");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing valid cookie on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();

        if (data.valid && data.token) {
          console.log("✅ Valid auth cookie found, skipping login");
          setToken(data.token);
          setCurrentView("todos");
        } else {
          console.log("❌ No valid auth cookie found, showing login");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    setCurrentView("todos");
  };

  const handleSelectCrypto = () => {
    setCurrentView("crypto");
  };

  const handleSelectTodos = () => {
    setCurrentView("todos");
  };

  const handleSelectCalendar = () => {
    setCurrentView("calendar");
  };

  const handleBackToSelection = () => {
    setCurrentView("selection");
  };

  // Show loading while checking for existing auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if no token
  if (!token || currentView === "login") {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  // Show current view
  if (currentView === "selection") {
    return (
      <SelectionScreen
        onSelectCrypto={handleSelectCrypto}
        onSelectTodos={handleSelectTodos}
        onSelectCalendar={handleSelectCalendar}
      />
    );
  }

  if (currentView === "crypto") {
    return <CryptoView token={token} onBack={handleBackToSelection} />;
  }

  if (currentView === "todos") {
    return <TodoView token={token} onBack={handleBackToSelection} />;
  }

  if (currentView === "calendar") {
    return <CalendarView token={token} onBack={handleBackToSelection} />;
  }

  return null;
}
