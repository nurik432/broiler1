// src/pages/employees/CreateEmployeeTab.jsx

import { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function CreateEmployeeTab({ activeBatches, fetchEmployees }) {
    const [newName, setNewName] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [newBatchId, setNewBatchId] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newBatchId) {
            alert('Выберите партию для привязки сотрудника');
            return;
        }
        setIsAdding(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('employees').insert([{
            full_name: newName,
            position: newPosition,
            start_date: newStartDate,
            batch_id: newBatchId,
            is_active: true,
            user_id: user.id
        }]);
        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            setNewName('');
            setNewPosition('');
            setNewStartDate(new Date().toISOString().slice(0, 10));
            setNewBatchId('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            await fetchEmployees();
        }
        setIsAdding(false);
    };

    return (
        <div className="max-w-xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">👤</div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Новый сотрудник</h2>
                        <p className="text-sm text-gray-500">Заполните данные для приёма на работу</p>
                    </div>
                </div>

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                            <p className="font-semibold text-green-800">Сотрудник добавлен!</p>
                            <p className="text-sm text-green-600">Можете перейти на вкладку «Начисление зарплаты» для настройки ставок</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">ФИО</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            required
                            placeholder="Введите полное имя"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Должность</label>
                        <input
                            type="text"
                            value={newPosition}
                            onChange={e => setNewPosition(e.target.value)}
                            placeholder="Например: рабочий, сторож, водитель"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Дата начала работы</label>
                        <input
                            type="date"
                            value={newStartDate}
                            onChange={e => setNewStartDate(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-indigo-700 mb-1.5">
                            Партия <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={newBatchId}
                            onChange={e => setNewBatchId(e.target.value)}
                            required
                            className="w-full p-3 border-2 border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        >
                            <option value="">— Выберите партию —</option>
                            {activeBatches.map(b => (
                                <option key={b.id} value={b.id}>{b.batch_name}</option>
                            ))}
                        </select>
                        {activeBatches.length === 0 && (
                            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                <span>⚠️</span> Нет активных партий. Сначала создайте партию.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isAdding || !newBatchId}
                        className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
                    >
                        {isAdding ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Добавление...
                            </span>
                        ) : '✨ Принять на работу'}
                    </button>
                </form>
            </div>
        </div>
    );
}
