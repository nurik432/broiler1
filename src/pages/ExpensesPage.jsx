// src/pages/ExpensesPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

function ExpensesPage() {
    // Хранит ВСЕ расходы, загруженные из БД
    const [allExpenses, setAllExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Состояние для переключения между вкладками "Рабочие" и "Домашние"
    const [activeTab, setActiveTab] = useState('work'); // 'work' или 'personal'

    // Состояния для формы добавления
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [newExpenseScope, setNewExpenseScope] = useState('work'); // Тип для нового расхода
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Состояния для редактирования
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Состояния для отчета
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportTotal, setReportTotal] = useState(null);

    // 1. Загрузка всех расходов из базы данных
    const fetchExpenses = async () => {
        const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
        if (error) {
            console.error('Ошибка при загрузке расходов:', error);
            alert('Не удалось загрузить данные.');
            setAllExpenses([]);
        } else {
            setAllExpenses(data);
        }
        setLoading(false);
    };

    // 2. Первоначальная загрузка и установка дат
    useEffect(() => {
        setLoading(true);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
        setStartDate(firstDayOfMonth);
        setEndDate(lastDayOfMonth);
        fetchExpenses();
    }, []);

    // 3. Фильтрация расходов для отображения в таблице.
    // useMemo кэширует результат и пересчитывает его только при изменении зависимостей.
    const filteredExpenses = useMemo(() => {
        // Сначала фильтруем по активной вкладке (work/personal)
        const tabFiltered = allExpenses.filter(exp => exp.expense_scope === activeTab);

        // Затем, если отчет сформирован (reportTotal не null), фильтруем по дате
        if (reportTotal !== null) {
            return tabFiltered.filter(exp => {
                return exp.expense_date >= startDate && exp.expense_date <= endDate;
            });
        }

        // Если отчет не сформирован, возвращаем все расходы для текущей вкладки
        return tabFiltered;
    }, [allExpenses, activeTab, startDate, endDate, reportTotal]);

    // 4. Формирование отчета
    const handleGenerateReport = () => {
        const expensesForReport = allExpenses.filter(exp =>
            exp.expense_scope === activeTab &&
            exp.expense_date >= startDate &&
            exp.expense_date <= endDate
        );
        const total = expensesForReport.reduce((sum, exp) => sum + exp.amount, 0);
        setReportTotal(total);
    };

    // 5. Сброс фильтра отчета (но не вкладки)
    const handleResetFilter = () => {
        setReportTotal(null);
    };

    // 6. Добавление нового расхода
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('expenses').insert([{
            expense_date: date, description, amount: Number(amount), category,
            expense_scope: newExpenseScope, user_id: user.id
        }]);
        if (error) { alert(error.message); } else {
            setDescription(''); setAmount(''); setCategory('');
            await fetchExpenses();
        }
        setIsSubmitting(false);
    };

    // 7. Обновление расхода
    const handleUpdate = async (expenseId) => {
        const { error } = await supabase.from('expenses')
            .update({ ...editFormData, amount: Number(editFormData.amount) })
            .eq('id', expenseId);
        if (error) { alert(error.message); } else {
            setEditingId(null);
            await fetchExpenses();
        }
    };

    // 8. Остальные функции
    const handleDelete = async (expenseId) => { if (window.confirm("Удалить?")) { const { error } = await supabase.from('expenses').delete().eq('id', expenseId); if (!error) await fetchExpenses(); } };
    const handleEditClick = (expense) => { setEditingId(expense.id); setEditFormData({ expense_date: expense.expense_date, description: expense.description, amount: expense.amount, category: expense.category || '', expense_scope: expense.expense_scope }); };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет расходов</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Сформировать отчет</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="block text-sm font-medium">С</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">По</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div className="flex gap-2"><button onClick={handleGenerateReport} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Сформировать</button><button onClick={handleResetFilter} title="Сбросить фильтр" className="bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300">✕</button></div>
                </div>
                {reportTotal !== null && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg"><p className="text-lg font-semibold text-gray-800">Итого расходов за период: <span className="text-2xl text-indigo-600 ml-2">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(reportTotal)}</span></p></div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить расход</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4"><label className="flex items-center"><input type="radio" name="expense_scope" value="work" checked={newExpenseScope === 'work'} onChange={e => setNewExpenseScope(e.target.value)} className="mr-2"/>Рабочий</label><label className="flex items-center"><input type="radio" name="expense_scope" value="personal" checked={newExpenseScope === 'personal'} onChange={e => setNewExpenseScope(e.target.value)} className="mr-2"/>Домашний</label></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div><label className="block text-sm font-medium">Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium">Описание</label><input type="text" placeholder="Покупка корма" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2"><label className="block text-sm font-medium">Категория</label><input type="text" placeholder="Корм" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium">Сумма</label><input type="number" step="0.01" placeholder="15000" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить'}</button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <div className="flex border-b">
                    <button onClick={() => { setActiveTab('work'); setReportTotal(null); }} className={`py-2 px-4 font-semibold ${activeTab === 'work' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Рабочие расходы</button>
                    <button onClick={() => { setActiveTab('personal'); setReportTotal(null); }} className={`py-2 px-4 font-semibold ${activeTab === 'personal' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Домашние расходы</button>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Дата</th><th className="px-6 py-3">Описание</th>
                            <th className="px-6 py-3">Категория</th><th className="px-6 py-3">Сумма</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? ( <tr><td colSpan="5" className="text-center py-4">Загрузка...</td></tr> ) :
                        filteredExpenses.map(exp => (
                            <tr key={exp.id} className="border-b hover:bg-gray-50">
                                {editingId === exp.id ? (
                                    <>
                                        <td className="p-2"><input type="date" value={editFormData.expense_date} onChange={e => setEditFormData({...editFormData, expense_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="text" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="text" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} className="p-1 border rounded w-24"/></td>
                                        <td className="px-6 py-4 text-right flex flex-col sm:flex-row gap-2">
                                            <div className="flex gap-2 items-center">
                                                <label className="text-xs"><input type="radio" value="work" checked={editFormData.expense_scope === 'work'} onChange={e => setEditFormData({...editFormData, expense_scope: e.target.value})}/>Р</label>
                                                <label className="text-xs"><input type="radio" value="personal" checked={editFormData.expense_scope === 'personal'} onChange={e => setEditFormData({...editFormData, expense_scope: e.target.value})}/>Д</label>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUpdate(exp.id)} className="font-medium text-green-600">Сохранить</button>
                                                <button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4">{new Date(exp.expense_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                                        <td className="px-6 py-4">{exp.category || '–'}</td>
                                        <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('ru-RU').format(exp.amount)}</td>
                                        <td className="px-6 py-4 text-right flex gap-4 justify-end"><button onClick={() => handleEditClick(exp)} className="font-medium text-blue-600">Редактировать</button><button onClick={() => handleDelete(exp.id)} className="font-medium text-red-600">Удалить</button></td>
                                    </>
                                )}
                            </tr>
                        ))}
                         { !loading && filteredExpenses.length === 0 && (<tr><td colSpan="5" className="text-center py-4 text-gray-500">Записей не найдено.</td></tr>) }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ExpensesPage;