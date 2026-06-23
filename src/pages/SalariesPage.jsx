// src/pages/SalariesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CreateEmployeeTab from '../pages/employees/CreateEmployeeTab';
import HireFireTab from '../pages/employees/HireFireTab';
import SalaryTab from '../pages/employees/SalaryTab';

export default function SalariesPage() {
    // Global data
    const [employees, setEmployees] = useState([]);
    const [activeBatches, setActiveBatches] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showArchivedEmployees, setShowArchivedEmployees] = useState(false);
    const [loading, setLoading] = useState(true);

    // Tab state
    const [activeTab, setActiveTab] = useState('create'); // 'create' | 'hire' | 'salary'

    // Fetch helpers
    const fetchEmployees = async () => {
        const { data, error } = await supabase
            .from('employees')
            .select(`*, broiler_batches (id, batch_name, is_active, batch_end)`)
            .order('full_name');
        if (error) console.error('Ошибка загрузки сотрудников:', error);
        else setEmployees(data);
    };

    const fetchActiveBatches = async () => {
        const { data, error } = await supabase
            .from('broiler_batches')
            .select('id, batch_name, start_date, is_active')
            .order('start_date', { ascending: false });
        if (error) console.error('Ошибка загрузки партий:', error);
        else setActiveBatches(data);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchEmployees(), fetchActiveBatches()]).then(() => setLoading(false));
    }, []);

    // Tab navigation UI – premium glassmorphism style
    const TabButton = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-xl transition-all font-medium ${
                activeTab === id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Сотрудники и зарплаты</h1>
            <div className="flex gap-4 mb-8">
                <TabButton id="create" label="Создание сотрудника" />
                <TabButton id="hire" label="Принятие и увольнение" />
                <TabButton id="salary" label="Начисление зарплаты" />
            </div>

            {loading && <p className="text-gray-500">Загрузка данных…</p>}

            {!loading && (
                <div>
                    {activeTab === 'create' && (
                        <CreateEmployeeTab
                            activeBatches={activeBatches}
                            fetchEmployees={fetchEmployees}
                        />
                    )}
                    {activeTab === 'hire' && (
                        <HireFireTab
                            employees={employees}
                            activeBatches={activeBatches}
                            fetchEmployees={fetchEmployees}
                            showArchivedEmployees={showArchivedEmployees}
                            setShowArchivedEmployees={setShowArchivedEmployees}
                            selectedEmployee={selectedEmployee}
                            setSelectedEmployee={setSelectedEmployee}
                        />
                    )}
                    {activeTab === 'salary' && (
                        <SalaryTab
                            selectedEmployee={selectedEmployee}
                            setSelectedEmployee={setSelectedEmployee}
                            activeBatches={activeBatches}
                        />
                    )}
                </div>
            )}
        </div>
    );
}