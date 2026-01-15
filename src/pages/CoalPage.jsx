// src/pages/CoalPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

function CoalPage() {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [modalPayments, setModalPayments] = useState([]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

    const summary = useMemo(() => purchases.reduce((acc, p) => {
        acc.totalKg += p.quantity_kg;
        acc.totalCost += p.total_cost;
        acc.totalDebt += p.balance;
        return acc;
    }, { totalKg: 0, totalCost: 0, totalDebt: 0 }), [purchases]);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_coal_purchases_with_stats');
        if (error) { console.error('Ошибка:', error); }
        else { setPurchases(data || []); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('coal_purchases').insert([{ purchase_date: date, quantity_kg: Number(quantity), price_per_kg: Number(price), user_id: user.id }]);
        setQuantity(''); setPrice('');
        await fetchData();
        setIsSubmitting(false);
    };

    const openPaymentsModal = async (purchase) => {
        setSelectedPurchase(purchase);
        setIsModalOpen(true);
        const { data, error } = await supabase.from('coal_payments').select('*').eq('purchase_id', purchase.id).order('payment_date', { ascending: false });
        if (error) { setModalPayments([]); } else { setModalPayments(data); }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || !selectedPurchase) return;
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('coal_payments').insert([{ purchase_id: selectedPurchase.id, payment_date: paymentDate, amount: Number(paymentAmount), user_id: user.id }]);
        setPaymentAmount('');
        await fetchData();
        const { data: updatedPayments } = await supabase.from('coal_payments').select('*').eq('purchase_id', selectedPurchase.id).order('payment_date', { ascending: false });
        setModalPayments(updatedPayments);
        const { data: updatedPurchases } = await supabase.rpc('get_coal_purchases_with_stats');
        setSelectedPurchase(updatedPurchases.find(p => p.id === selectedPurchase.id));
    };

    const handleDeletePurchase = async (id) => { if (window.confirm("Удалить покупку и все платежи?")) { await supabase.from('coal_purchases').delete().eq('id', id); await fetchData(); }};
    const handleDeletePayment = async (id) => { if (window.confirm("Удалить платеж?")) { await supabase.from('coal_payments').delete().eq('id', id); /* Логика обновления в handleAddPayment */ const e = { preventDefault: () => {} }; await handleAddPayment(e); }};

    const formatCurrency = (value) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(value);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет угля</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Общая сводка</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div><p>Всего куплено</p><p className="font-bold text-2xl">{summary.totalKg.toFixed(2)} кг</p></div>
                    <div><p>Общая стоимость</p><p className="font-bold text-2xl">{formatCurrency(summary.totalCost)}</p></div>
                    <div className="bg-red-50 p-2 rounded-lg"><p className="font-semibold text-red-700">Общий долг</p><p className="font-bold text-2xl text-red-600">{formatCurrency(summary.totalDebt)}</p></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить покупку угля (в кредит)</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="block text-sm">Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm">Кол-во (кг)</label><input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm">Цена за кг</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-2 rounded-md">{isSubmitting ? '...' : 'Добавить'}</button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата</th><th className="px-6 py-3">Кол-во</th><th className="px-6 py-3">Цена/кг</th><th className="px-6 py-3">Стоимость</th><th className="px-6 py-3">Оплачено</th><th className="px-6 py-3">Статус</th><th className="px-6 py-3 text-right">Действия</th></tr></thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="7">Загрузка...</td></tr>) :
                        purchases.map(p => (
                            <tr key={p.id} className="border-b">
                                <td className="py-2 px-6">{new Date(p.purchase_date).toLocaleDateString()}</td>
                                <td className="py-2 px-6">{p.quantity_kg} кг</td>
                                <td className="py-2 px-6">{formatCurrency(p.price_per_kg)}</td>
                                <td className="py-2 px-6 font-semibold">{formatCurrency(p.total_cost)}</td>
                                <td className="py-2 px-6 font-semibold text-green-600">{formatCurrency(p.total_paid)}</td>
                                <td className="py-2 px-6">{p.balance <= 0 ? (<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Оплачено</span>) : (<span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Долг: {formatCurrency(p.balance)}</span>)}</td>
                                <td className="py-2 px-6 text-right flex gap-4 justify-end">
                                    <button onClick={() => openPaymentsModal(p)} className="font-medium text-blue-600 hover:underline">Платежи</button>
                                    <button onClick={() => handleDeletePurchase(p.id)} className="font-medium text-red-600 hover:underline">Удалить</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                   <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b"><h3 className="text-xl font-semibold">Платежи за уголь</h3><p className="text-sm text-gray-500">Покупка от {new Date(selectedPurchase.purchase_date).toLocaleDateString()}</p></div>
                        <div className="p-6 grid grid-cols-3 gap-4 text-center border-b">
                            <div><p>Общая стоимость</p><p className="font-bold text-lg">{formatCurrency(selectedPurchase.total_cost)}</p></div>
                            <div><p>Оплачено</p><p className="font-bold text-lg text-green-600">{formatCurrency(selectedPurchase.total_paid)}</p></div>
                            <div><p>Остаток долга</p><p className="font-bold text-lg text-red-600">{formatCurrency(selectedPurchase.balance)}</p></div>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
                                <div><label className="text-sm">Дата платежа</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">Сумма</label><input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700">Добавить</button>
                            </form>
                            {selectedPurchase.balance > 0 && (<div className="text-right -mt-2 mb-4"><button onClick={() => setPaymentAmount(selectedPurchase.balance)} className="text-xs text-blue-600 hover:underline">внести остаток</button></div>)}
                            <h4 className="font-semibold mt-6 mb-2">История платежей:</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                                {modalPayments.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                                        <button onClick={() => handleDeletePayment(p.id)} className="text-xs text-red-500 hover:underline">Удалить</button>
                                    </div>
                                ))}
                                {modalPayments.length === 0 && <p className="text-gray-500 text-center py-4">Платежей пока нет.</p>}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 text-right rounded-b-lg"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Закрыть</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CoalPage;