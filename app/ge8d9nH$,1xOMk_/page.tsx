"use client";

import { useState } from "react";
import LoginForm from "./components/LoginForm";
import SelectionScreen from "./components/SelectionScreen";
import CryptoView from "./components/CryptoView";
import TodoView from "./components/TodoView";

type View = "login" | "selection" | "crypto" | "todos";

export default function PrivatePage() {
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>("login");

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    setCurrentView("selection");
  };

  const handleSelectCrypto = () => {
    setCurrentView("crypto");
  };

  const handleSelectTodos = () => {
    setCurrentView("todos");
  };

  const handleBackToSelection = () => {
    setCurrentView("selection");
  };

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
      />
    );
  }

  if (currentView === "crypto") {
    return <CryptoView token={token} onBack={handleBackToSelection} />;
  }

  if (currentView === "todos") {
    return <TodoView token={token} onBack={handleBackToSelection} />;
  }

  return null;
}
