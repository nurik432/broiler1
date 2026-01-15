// src/pages/CoalPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function CoalPage() {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    // Состояния для форм
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [description, setDescription] = useState('');

    // Загрузка всех данных
    const fetchData = async () => {
        setLoading(true);
        const [summaryRes, transactionsRes] = await Promise.all([
            supabase.rpc('get_coal_summary').single(),
            supabase.from('coal_transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
        ]);

        if (summaryRes.error) { console.error('Ошибка сводки:', summaryRes.error); }
        else { setSummary(summaryRes.data); }

        if (transactionsRes.error) { console.error('Ошибка транзакций:', transactionsRes.error); }
        else { setTransactions(transactionsRes.data); }

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // Добавление ПОКУПКИ
    const handleAddPurchase = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('coal_transactions').insert([{
            transaction_date: date, transaction_type: 'purchase',
            quantity_kg: Number(quantity), price_per_kg: Number(price),
            amount: Number(quantity) * Number(price), // Считаем общую сумму
            description: description || null, user_id: user.id
        }]);
        setQuantity(''); setPrice(''); setDescription('');
        fetchData();
    };

    // Добавление ПЛАТЕЖА с проверкой
    const handleAddPayment = async (e) => {
        e.preventDefault();
        const amountToPay = Number(paymentAmount);
        if (amountToPay <= 0) {
            alert("Сумма платежа должна быть больше нуля.");
            return;
        }
        // Проверка на переплату
        if (summary && amountToPay > summary.current_balance) {
            alert(`Сумма платежа (${amountToPay}) не может превышать остаток долга (${summary.current_balance}).`);
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('coal_transactions').insert([{
            transaction_date: date, transaction_type: 'payment',
            quantity_kg: null, price_per_kg: null,
            amount: amountToPay,
            description: description || 'Платеж за уголь', user_id: user.id
        }]);
        setPaymentAmount(''); setDescription('');
        fetchData();
    };

    // Удаление любой транзакции
    const handleDelete = async (id) => {
        if (window.confirm("Удалить эту запись? Это действие может повлиять на общий баланс.")) {
            await supabase.from('coal_transactions').delete().eq('id', id);
            fetchData();
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(value);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет угля</h1>

            {summary && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Общая сводка</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><p>Всего куплено (кг)</p><p className="font-bold text-2xl">{summary.total_kg || 0} кг</p></div>
                        <div><p>Общая стоимость</p><p className="font-bold text-2xl">{formatCurrency(summary.total_debt || 0)}</p></div>
                        <div><p>Всего выплачено</p><p className="font-bold text-2xl text-green-600">{formatCurrency(summary.total_paid || 0)}</p></div>
                        <div className="bg-red-50 p-2 rounded-lg"><p className="font-semibold text-red-700">Остаток долга</p><p className="font-bold text-2xl text-red-600">{formatCurrency(summary.current_balance || 0)}</p></div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Добавить покупку</h2>
                    <form onSubmit={handleAddPurchase} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div><label>Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                            <div><label>Кол-во (кг)</label><input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} required className="w-full p-2 border rounded"/></div>
                            <div><label>Цена за кг</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="w-full p-2 border rounded"/></div>
                        </div>
                        <div><label>Описание</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="(необязательно)" className="w-full p-2 border rounded"/></div>
                        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Записать покупку</button>
                    </form>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Добавить платеж</h2>
                    <form onSubmit={handleAddPayment} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label>Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                            <div><label>Сумма платежа</label><input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded"/></div>
                        </div>
                        <div><label>Описание</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Например, платеж за уголь" className="w-full p-2 border rounded"/></div>
                        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">Записать платеж</button>
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <h2 className="text-2xl font-semibold p-6">История операций</h2>
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-50"><tr><th className="px-6 py-3">Дата</th><th className="px-6 py-3">Операция</th><th className="px-6 py-3">Описание</th><th className="px-6 py-3">Кол-во/Цена</th><th className="px-6 py-3">Сумма</th><th></th></tr></thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="6" className="text-center py-4">Загрузка...</td></tr>) :
                        transactions.map(t => (
                            <tr key={t.id} className="border-b">
                                <td className="px-6 py-4">{new Date(t.transaction_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    {t.transaction_type === 'purchase' ?
                                        <span className="font-semibold text-blue-600">Покупка</span> :
                                        <span className="font-semibold text-green-600">Платеж</span>
                                    }
                                </td>
                                <td className="px-6 py-4">{t.description || '–'}</td>
                                <td className="px-6 py-4">
                                    {t.quantity_kg ? (
                                        <p>{t.quantity_kg} кг <span className="text-gray-500">@ {t.price_per_kg}</span></p>
                                    ) : '–'}
                                </td>
                                <td className={`px-6 py-4 font-semibold ${t.transaction_type === 'purchase' ? 'text-red-600' : 'text-green-600'}`}>
                                    {t.transaction_type === 'purchase' ? '+' : '-'} {formatCurrency(t.amount)}
                                </td>
                                <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline">Удалить</button></td>
                            </tr>
                        ))}
                        {!loading && transactions.length === 0 && (<tr><td colSpan="6" className="text-center py-4">Операций пока нет.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CoalPage;