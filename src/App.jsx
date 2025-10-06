// src/App.jsx

import { useState, useEffect } from 'react';
// УДАЛЕН useNavigate отсюда
import { Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';

import Auth from './components/Auth';
import MainLayout from './layouts/MainLayout';
import BatchesPage from './pages/BatchesPage';
import MedicinesPage from './pages/MedicinesPage';
import BatchLogPage from './pages/BatchLogPage';
import ExpensesPage from './pages/ExpensesPage';
import SalariesPage from './pages/SalariesPage';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<BatchesPage />} />
        <Route path="/medicines" element={<MedicinesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/salaries" element={<SalariesPage />} />
        {/* Страница журнала партии теперь тоже внутри MainLayout, чтобы у нее была навигация */}
        <Route path="/batch/:batchId" element={<BatchLogPage />} />
      </Route>
    </Routes>
  );
}

export default App;