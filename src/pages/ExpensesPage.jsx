// src/pages/ExpensesPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

function ExpensesPage() {
    // --- ОСНОВНЫЕ СОСТОЯНИЯ ---
    const [allExpenses, setAllExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBatches, setActiveBatches] = useState([]);

    // --- Состояние для управления вкладками ---
    const [activeTab, setActiveTab] = useState('work'); // 'work' или 'personal'

    // --- Состояния для формы добавления ---
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState('');

    // --- Состояния для редактирования ---
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // --- Состояния для фильтра и отчета ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState(null);

    // --- ФУНКЦИИ ---

    const fetchData = async () => {
        setLoading(true);
        const [expensesRes, batchesRes] = await Promise.all([
            supabase.rpc('get_expenses'),
            supabase.from('broiler_batches').select('id, batch_name').eq('is_active', true)
        ]);
        if (expensesRes.error) { console.error('Ошибка:', expensesRes.error); }
        else { setAllExpenses(expensesRes.data); }
        if (batchesRes.error) { console.error("Ошибка:", batchesRes.error); }
        else { setActiveBatches(batchesRes.data); }
        setLoading(false);
    };

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
        setStartDate(firstDay);
        setEndDate(lastDay);
        fetchData();
    }, []);

    // --- Логика фильтрации и отчетов ---
    const expensesForCurrentTab = useMemo(() => {
        return allExpenses.filter(exp => exp.expense_scope === activeTab);
    }, [allExpenses, activeTab]);

    const handleGenerateReport = () => {
        if (!startDate || !endDate) { alert("Выберите даты."); return; }
        const filtered = expensesForCurrentTab.filter(exp => exp.expense_date >= startDate && exp.expense_date <= endDate);
        const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
        setReportData({ total });
    };

    const handleResetFilter = () => {
        setReportData(null);
    };

    // Переключение вкладок со сбросом отчета
    const switchTab = (tab) => {
        setActiveTab(tab);
        handleResetFilter();
    };

    // --- CRUD Функции ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('expenses').insert([{
            expense_date: date, description, amount: Number(amount), category,
            expense_scope: activeTab, user_id: user.id, // Тип берется из активной вкладки
            batch_id: selectedBatchId || null
        }]);
        if (error) { alert(error.message); }
        else {
            setDescription(''); setAmount(''); setCategory(''); setSelectedBatchId('');
            await fetchData();
        }
        setIsSubmitting(false);
    };
    const handleDelete = async (id) => { if (window.confirm("Удалить?")) { await supabase.from('expenses').delete().eq('id', id); fetchData(); }};
    const handleEditClick = (expense) => { setEditingId(expense.id); setEditFormData({ expense_date: expense.expense_date, description: expense.description, amount: expense.amount, category: expense.category || '', expense_scope: expense.expense_scope, batch_id: expense.batch_id || '' }); };
    const handleUpdate = async (expenseId) => {
        const { error } = await supabase.from('expenses').update({ ...editFormData, amount: Number(editFormData.amount), batch_id: editFormData.batch_id || null }).eq('id', expenseId);
        if (error) { alert(error.message); } else { setEditingId(null); await fetchData(); }
    };

    // Компонент таблицы для переиспользования
    const ExpensesTable = ({ expensesList }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата/Время</th><th className="px-6 py-3">Описание/Категория</th><th className="px-6 py-3">Партия</th><th className="px-6 py-3">Сумма</th><th className="px-6 py-3 text-right">Действия</th></tr></thead>
                <tbody>
                    {loading ? (<tr><td colSpan="5">Загрузка...</td></tr>) :
                    expensesList.map(exp => (
                        <tr key={exp.id} className="border-b">
                            {editingId === exp.id ? (
                                <>
                                    <td className="p-2"><input type="date" value={editFormData.expense_date} onChange={e => setEditFormData({...editFormData, expense_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                    <td className="p-2"><input type="text" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="p-1 border rounded w-full mb-1"/><input type="text" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="p-1 border rounded w-full"/></td>
                                    <td className="p-2"><select value={editFormData.batch_id} onChange={e => setEditFormData({...editFormData, batch_id: e.target.value})} className="p-1 border rounded w-full bg-white"><option value="">-- Не привязывать --</option>{activeBatches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}</select></td>
                                    <td className="p-2"><input type="number" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} className="p-1 border rounded w-24"/></td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end"><button onClick={() => handleUpdate(exp.id)} className="font-medium text-green-600">Сохранить</button><button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button></td>
                                </>
                            ) : (
                                <>
                                    <td className="px-6 py-4"><p>{new Date(exp.expense_date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{new Date(exp.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></td>
                                    <td className="px-6 py-4"><p>{exp.description}</p><p className="text-xs text-gray-500">{exp.category}</p></td>
                                    <td className="px-6 py-4">{exp.batch_name ? <span className="px-2 py-1 text-xs bg-blue-100 rounded-full">{exp.batch_name}</span> : '–'}</td>
                                    <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(exp.amount)}</td>
                                    <td className="px-6 py-4 text-right flex gap-4 justify-end"><button onClick={() => handleEditClick(exp)} className="font-medium text-blue-600">Редактировать</button><button onClick={() => handleDelete(exp.id)} className="font-medium text-red-600">Удалить</button></td>
                                </>
                            )}
                        </tr>
                    ))}
                    {!loading && expensesList.length === 0 && (<tr><td colSpan="5" className="text-center py-4">Записей не найдено.</td></tr>)}
                </tbody>
            </table>
        </div>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет расходов</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Отчет по расходам ({activeTab === 'work' ? 'Рабочим' : 'Домашним'})</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="block text-sm">С</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded"/></div>
                    <div><label className="block text-sm">По</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded"/></div>
                    <div className="flex gap-2"><button onClick={handleGenerateReport} className="w-full bg-blue-600 text-white p-2 rounded">Сформировать</button><button onClick={handleResetFilter} title="Сбросить" className="bg-gray-200 p-2 rounded">✕</button></div>
                </div>
                {reportData && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg"><p>Итого за период: <strong className="text-xl ml-2">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(reportData.total)}</strong></p></div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить расход</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div><label className="block text-sm">Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded"/></div>
                        <div className="md:col-span-3"><label className="block text-sm">Описание</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 w-full p-2 border rounded"/></div>
                        <div><label className="block text-sm">Сумма</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full p-2 border rounded"/></div>
                        <div><label className="block text-sm">Категория</label><input type="text" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full p-2 border rounded"/></div>
                        <div className="md:col-span-2"><label className="block text-sm">Привязать к партии</label>
                            <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="mt-1 w-full p-2 border rounded bg-white">
                                <option value="">-- Не привязывать --</option>
                                {activeBatches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded">{isSubmitting ? '...' : 'Добавить'}</button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md">
                <div className="flex border-b">
                    <button onClick={() => switchTab('work')} className={`py-2 px-4 font-semibold ${activeTab === 'work' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Рабочие расходы</button>
                    <button onClick={() => switchTab('personal')} className={`py-2 px-4 font-semibold ${activeTab === 'personal' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Домашние расходы</button>
                </div>
                {/* Условный рендеринг таблицы в зависимости от вкладки */}
                {activeTab === 'work' && <ExpensesTable expensesList={expensesForCurrentTab} />}
                {activeTab === 'personal' && <ExpensesTable expensesList={expensesForCurrentTab} />}
            </div>
        </div>
    );
}

export default ExpensesPage;