// src/layouts/MainLayout.jsx

import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';

function MainLayout() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Состояние для меню
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="relative flex min-h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white border-b">
          {/* --- КНОПКА-ГАМБУРГЕР (видна до lg) --- */}
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-500 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Пустой div, чтобы сместить правую часть */}
          <div className="lg:hidden"></div>

          <div className="flex items-center">
            {user && (
              <span className="text-gray-700 mr-4 hidden sm:inline">{user.email}</span>
            )}
            <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">
              Выйти
            </button>
          </div>
        </header>

        {/* Уменьшаем отступы на мобильных */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;