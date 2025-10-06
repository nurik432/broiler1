// src/components/BroilerManager.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

function BroilerManager() {
    const [batches, setBatches] = useState([]);
    const [isFetching, setIsFetching] = useState(true);

    // Состояния для формы
    const [batchName, setBatchName] = useState('');
    const [initialQuantity, setInitialQuantity] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    // --- Функция для получения партий с посчитанной статистикой ---
    const fetchBatches = async () => {
        setIsFetching(true);
        // Вызываем нашу "умную" функцию из базы данных
        const { data, error } = await supabase.rpc('get_batches_with_stats');

        if (error) {
            console.error('Ошибка при загрузке партий:', error);
            alert('Не удалось загрузить список партий.');
        } else {
            setBatches(data);
        }
        setIsFetching(false);
    };

    // --- Функция для добавления новой партии ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('broiler_batches')
            .insert([{
                batch_name: batchName,
                initial_quantity: Number(initialQuantity),
                start_date: startDate,
                user_id: user.id
            }]);

        if (error) {
            alert(error.message);
        } else {
            // Сбрасываем форму и обновляем список
            setBatchName('');
            setInitialQuantity('');
            setStartDate(new Date().toISOString().slice(0, 10));
            await fetchBatches();
        }
        setIsSubmitting(false);
    };

    return (
        <div className="mt-10">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Партии бройлеров</h2>

            {/* --- Форма добавления новой партии --- */}
            <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                <h3 className="text-2xl font-semibold mb-4 text-gray-700">Добавить новую партию</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="batchName" className="block text-sm font-medium text-gray-700">Название партии</label>
                        <input id="batchName" type="text" placeholder="Например, 'Партия #1'" value={batchName} onChange={(e) => setBatchName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Начальное поголовье</label>
                        <input id="quantity" type="number" placeholder="500" value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Дата начала</label>
                        <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-3">
                         <button type="submit" disabled={isSubmitting} className="w-full justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                            {isSubmitting ? 'Добавление...' : 'Добавить партию'}
                        </button>
                    </div>
                </form>
            </div>

            {/* --- Список активных партий --- */}
            <div className="bg-white shadow-lg rounded-lg p-6">
                <h3 className="text-2xl font-semibold mb-4 text-gray-700">Активные партии</h3>
                {isFetching ? (
                    <p className="text-center text-gray-500">Загрузка партий...</p>
                ) : batches.length === 0 ? (
                    <p className="text-center text-gray-500">Активных партий пока нет. Добавьте первую!</p>
                ) : (
                    <div className="space-y-4">
                        {batches.map(batch => (
                            <div key={batch.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <p className="font-bold text-lg text-gray-800">{batch.batch_name}</p>
                                    <p className="text-sm text-gray-500">Начало: {new Date(batch.start_date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <div className="text-center">
                                        <span className="text-xs sm:text-sm text-gray-500">Текущее поголовье</span>
                                        <p className="font-bold text-xl sm:text-2xl text-green-600">{batch.current_quantity}</p>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xs sm:text-sm text-gray-500">Общий падеж</span>
                                        <p className="font-bold text-xl sm:text-2xl text-red-600">{batch.total_mortality}</p>
                                    </div>
                                    <Link to={`/batch/${batch.id}`} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 self-center">
                                        Журнал
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default BroilerManager;