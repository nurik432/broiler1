// src/pages/DebtsPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DebtTab from './employees/DebtTab';

export default function DebtsPage() {
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPersons = async () => {
        const { data, error } = await supabase
            .from('persons')
            .select('id, full_name')
            .order('full_name');
        if (error) console.error('Ошибка загрузки:', error);
        else setPersons(data || []);
    };

    useEffect(() => {
        fetchPersons().then(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">💰 Долги</h1>
            {loading ? (
                <p className="text-gray-500">Загрузка данных…</p>
            ) : (
                <DebtTab persons={persons} />
            )}
        </div>
    );
}
