// src/pages/ExpensesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBatches, setActiveBatches] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [expenseScope, setExpenseScope] = useState('work');

    const fetchData = async () => {
        setLoading(true);

        // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Правильная сортировка ---
        const { data, error } = await supabase
            .from('expenses')
            .select('*, batch:broiler_batches(batch_name)')
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Ошибка загрузки расходов:', error);
            alert('Не удалось загрузить данные о расходах. Проверьте консоль.');
        } else {
            setExpenses(data);
        }
        setLoading(false);
    };

    const fetchActiveBatches = async () => {
        const { data, error } = await supabase
            .from('broiler_batches')
            .select('id, batch_name')
            .eq('is_active', true)
            .order('start_date', { ascending: false });
        if (error) { console.error("Ошибка загрузки партий:", error); }
        else { setActiveBatches(data); }
    };

    useEffect(() => {
        fetchData();
        fetchActiveBatches();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('expenses').insert([{
            expense_date: date, description, amount: Number(amount), category,
            expense_scope: expenseScope, user_id: user.id,
            batch_id: selectedBatchId || null
        }]);
        if (error) { alert(error.message); }
        else {
            setDescription(''); setAmount(''); setCategory(''); setSelectedBatchId('');
            await fetchData();
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Удалить эту запись о расходе?")) {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) { alert(error.message); }
            else { await fetchData(); }
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет расходов</h1>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить расход</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div><label className="block text-sm font-medium">Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded"/></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium">Описание</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 w-full p-2 border rounded" placeholder="Например, покупка корма"/></div>
                        <div><label className="block text-sm font-medium">Сумма</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full p-2 border rounded" placeholder="1500"/></div>
                        <div><label className="block text-sm font-medium">Категория</label><input type="text" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full p-2 border rounded" placeholder="Корм"/></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium">Привязать к партии (необязательно)</label>
                            <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="mt-1 w-full p-2 border rounded bg-white">
                                <option value="">-- Не привязывать --</option>
                                {activeBatches.map(batch => (<option key={batch.id} value={batch.id}>{batch.batch_name}</option>))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center"><input type="radio" value="work" checked={expenseScope === 'work'} onChange={e=>setExpenseScope(e.target.value)} className="mr-2"/>Рабочий</label>
                            <label className="flex items-center"><input type="radio" value="personal" checked={expenseScope === 'personal'} onChange={e=>setExpenseScope(e.target.value)} className="mr-2"/>Домашний</label>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить'}</button>
                    </div>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата / Время</th><th className="px-6 py-3">Описание / Категория</th><th className="px-6 py-3">Партия</th><th className="px-6 py-3">Тип</th><th className="px-6 py-3">Сумма</th><th className="px-6 py-3 text-right">Действия</th></tr></thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="6" className="text-center py-4">Загрузка...</td></tr>) :
                        expenses.map(exp => (
                            <tr key={exp.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4"><p className="font-medium">{new Date(exp.expense_date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></td>
                                <td className="px-6 py-4"><p className="font-medium text-gray-900">{exp.description}</p><p className="text-xs text-gray-500">{exp.category}</p></td>
                                <td className="px-6 py-4">{exp.batch ? <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">{exp.batch.batch_name}</span> : '–'}</td>
                                <td className="px-6 py-4">{exp.expense_scope === 'work' ? 'Рабочий' : 'Домашний'}</td>
                                <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(exp.amount)}</td>
                                <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(exp.id)} className="font-medium text-red-600 hover:underline">Удалить</button></td>
                            </tr>
                        ))}
                         { !loading && expenses.length === 0 && (<tr><td colSpan="6" className="text-center py-4">Записей о расходах пока нет.</td></tr>) }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ExpensesPage;