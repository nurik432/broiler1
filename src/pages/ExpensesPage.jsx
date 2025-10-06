// src/pages/ExpensesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ExpensesPage() {
    // Хранит ВСЕ расходы, загруженные из БД
    const [allExpenses, setAllExpenses] = useState([]);
    // Хранит расходы для отображения в таблице (может быть отфильтрован)
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Состояния для формы добавления
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Состояния для редактирования
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Состояния для отчета
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportTotal, setReportTotal] = useState(null);

    // --- ФУНКЦИИ ---

    // 1. Загрузка всех расходов из базы данных
    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (error) {
            console.error('Ошибка при загрузке расходов:', error);
            alert('Не удалось загрузить данные о расходах.');
            setAllExpenses([]);
            setFilteredExpenses([]);
        } else {
            setAllExpenses(data);
            setFilteredExpenses(data); // По умолчанию показываем все
        }
        setLoading(false);
    };

    // 2. Первоначальная загрузка данных и установка дат по умолчанию
    useEffect(() => {
        setLoading(true);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
        setStartDate(firstDayOfMonth);
        setEndDate(lastDayOfMonth);
        fetchExpenses();
    }, []);

    // 3. Формирование отчета
    const handleGenerateReport = () => {
        if (!startDate || !endDate) {
            alert("Пожалуйста, выберите начальную и конечную дату.");
            return;
        }
        const filtered = allExpenses.filter(exp => exp.expense_date >= startDate && exp.expense_date <= endDate);
        setFilteredExpenses(filtered);
        const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
        setReportTotal(total);
    };

    // 4. Сброс фильтра отчета
    const handleResetFilter = () => {
        setFilteredExpenses(allExpenses);
        setReportTotal(null);
    };

    // 5. Добавление нового расхода
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('expenses').insert([{
            expense_date: date, description, amount: Number(amount), category, user_id: user.id
        }]);
        if (error) {
            alert(error.message);
        } else {
            setDate(new Date().toISOString().slice(0, 10));
            setDescription(''); setAmount(''); setCategory('');
            await fetchExpenses();
            setReportTotal(null); // Сбрасываем отчет, так как данные изменились
        }
        setIsSubmitting(false);
    };

    // 6. Удаление расхода
    const handleDelete = async (expenseId) => {
        if (window.confirm("Вы уверены, что хотите удалить эту запись?")) {
            const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
            if (error) {
                alert(error.message);
            } else {
                await fetchExpenses();
                setReportTotal(null);
            }
        }
    };

    // 7. Клик по кнопке "Редактировать"
    const handleEditClick = (expense) => {
        setEditingId(expense.id);
        setEditFormData({
            expense_date: expense.expense_date,
            description: expense.description,
            amount: expense.amount,
            category: expense.category || '',
        });
    };

    // 8. Сохранение изменений
    const handleUpdate = async (expenseId) => {
        const { error } = await supabase.from('expenses')
            .update({ ...editFormData, amount: Number(editFormData.amount) })
            .eq('id', expenseId);
        if (error) {
            alert(error.message);
        } else {
            setEditingId(null);
            await fetchExpenses();
            setReportTotal(null);
        }
    };

    // --- JSX РАЗМЕТКА ---
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет расходов</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Сформировать отчет</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium">С</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">По</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleGenerateReport} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Сформировать</button>
                        <button onClick={handleResetFilter} title="Сбросить фильтр" className="bg-gray-200 text-gray-700 p-2 rounded-md hover:bg-gray-300">✕</button>
                    </div>
                </div>
                {reportTotal !== null && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                        <p className="text-lg font-semibold text-gray-800">
                            Итого расходов за выбранный период:
                            <span className="text-2xl text-indigo-600 ml-2">
                                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(reportTotal)}
                            </span>
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить расход</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="block text-sm font-medium">Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium">Описание</label><input type="text" placeholder="Покупка корма" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Сумма</label><input type="number" step="0.01" placeholder="15000" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div className="md:col-span-3"><label className="block text-sm font-medium">Категория</label><input type="text" placeholder="Корм" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить'}</button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Дата</th><th className="px-6 py-3">Описание</th>
                            <th className="px-6 py-3">Категория</th><th className="px-6 py-3">Сумма</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-4">Загрузка данных...</td></tr>
                        ) : filteredExpenses.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">Записей за выбранный период не найдено.</td></tr>
                        ) : filteredExpenses.map(exp => (
                            <tr key={exp.id} className="border-b hover:bg-gray-50">
                                {editingId === exp.id ? (
                                    <>
                                        <td className="p-2"><input type="date" value={editFormData.expense_date} onChange={e => setEditFormData({...editFormData, expense_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="text" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="text" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} className="p-1 border rounded w-24"/></td>
                                        <td className="px-6 py-4 text-right flex gap-2"><button onClick={() => handleUpdate(exp.id)} className="font-medium text-green-600">Сохранить</button><button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button></td>
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
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ExpensesPage;