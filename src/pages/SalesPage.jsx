// src/pages/SalesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function SalesPage() {
    // --- ОСНОВНЫЕ СОСТОЯНИЯ ---
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Состояния для формы ДОБАВЛЕНИЯ ПРОДАЖИ ---
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [customer, setCustomer] = useState('');
    const [weight, setWeight] = useState('');
    const [price, setPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Состояния для РЕДАКТИРОВАНИЯ ПРОДАЖИ ---
    const [editingSaleId, setEditingSaleId] = useState(null);
    const [editSaleFormData, setEditSaleFormData] = useState({});

    // --- Состояния для МОДАЛЬНОГО ОКНА ПЛАТЕЖЕЙ ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [modalPayments, setModalPayments] = useState([]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

    // --- Состояния для РЕДАКТИРОВАНИЯ ПЛАТЕЖА ---
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [editPaymentFormData, setEditPaymentFormData] = useState({});

    // --- ФУНКЦИИ ---

    // 1. Загрузка данных
    const fetchSales = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_sales_with_stats');
        if (error) { console.error('Ошибка:', error); }
        else { setSales(data); }
        setLoading(false);
    };

    useEffect(() => { fetchSales(); }, []);

    // 2. Функции для управления ПРОДАЖАМИ (CRUD)
    const handleSubmitSale = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('sales').insert([{ sale_date: date, customer_name: customer, weight_kg: Number(weight), price_per_kg: Number(price), user_id: user.id }]);
        if (error) { alert(error.message); }
        else { setDate(new Date().toISOString().slice(0, 10)); setCustomer(''); setWeight(''); setPrice(''); await fetchSales(); }
        setIsSubmitting(false);
    };

    const handleEditSaleClick = (sale) => {
        setEditingSaleId(sale.id);
        setEditSaleFormData({ sale_date: sale.sale_date, customer_name: sale.customer_name || '', weight_kg: sale.weight_kg, price_per_kg: sale.price_per_kg });
    };

    const handleUpdateSale = async (saleId) => {
        const { error } = await supabase.from('sales').update({ ...editSaleFormData, weight_kg: Number(editSaleFormData.weight_kg), price_per_kg: Number(editSaleFormData.price_per_kg) }).eq('id', saleId);
        if (error) { alert(error.message); }
        else { setEditingSaleId(null); await fetchSales(); }
    };

    const handleDeleteSale = async (saleId) => {
        if (window.confirm("Вы уверены, что хотите удалить всю продажу и ВСЕ связанные с ней платежи? Это действие необратимо.")) {
            const { error } = await supabase.from('sales').delete().eq('id', saleId);
            if (error) { alert(error.message); }
            else { await fetchSales(); }
        }
    };

    // 3. Функции для управления ПЛАТЕЖАМИ (в модальном окне)
    const openPaymentsModal = async (sale) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
        const { data, error } = await supabase.from('payments').select('*').eq('sale_id', sale.id).order('payment_date', { ascending: false });
        if (error) { setModalPayments([]); } else { setModalPayments(data); }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || !selectedSale) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('payments').insert([{ sale_id: selectedSale.id, payment_date: paymentDate, amount: Number(paymentAmount), user_id: user.id }]);
        if (error) { alert(error.message); }
        else {
            setPaymentAmount('');
            await fetchSales();
            const { data: updatedPayments } = await supabase.from('payments').select('*').eq('sale_id', selectedSale.id).order('payment_date', { ascending: false });
            setModalPayments(updatedPayments);
            const { data: updatedSales } = await supabase.rpc('get_sales_with_stats');
            setSelectedSale(updatedSales.find(s => s.id === selectedSale.id));
        }
    };

    const handleEditPaymentClick = (payment) => {
        setEditingPaymentId(payment.id);
        setEditPaymentFormData({ payment_date: payment.payment_date, amount: payment.amount });
    };

    const handleUpdatePayment = async (paymentId) => {
        const { error } = await supabase.from('payments').update({ ...editPaymentFormData, amount: Number(editPaymentFormData.amount) }).eq('id', paymentId);
        if (error) { alert(error.message); }
        else {
            setEditingPaymentId(null);
            await fetchSales();
            const { data: updatedPayments } = await supabase.from('payments').select('*').eq('sale_id', selectedSale.id).order('payment_date', { ascending: false });
            setModalPayments(updatedPayments);
            const { data: updatedSales } = await supabase.rpc('get_sales_with_stats');
            setSelectedSale(updatedSales.find(s => s.id === selectedSale.id));
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (window.confirm("Удалить этот платеж?")) {
            const { error } = await supabase.from('payments').delete().eq('id', paymentId);
            if (error) { alert(error.message); }
            else {
                await fetchSales();
                const { data: updatedPayments } = await supabase.from('payments').select('*').eq('sale_id', selectedSale.id).order('payment_date', { ascending: false });
                setModalPayments(updatedPayments);
                const { data: updatedSales } = await supabase.rpc('get_sales_with_stats');
                setSelectedSale(updatedSales.find(s => s.id === selectedSale.id));
            }
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет продаж и поступлений</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить продажу</h2>
                <form onSubmit={handleSubmitSale} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    {/* ... форма добавления ... */}
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Дата / Покупатель</th>
                            {/* --- ИЗМЕНЕНИЕ: Вернули колонки --- */}
                            <th className="px-6 py-3">Вес (кг)</th>
                            <th className="px-6 py-3">Цена за кг</th>
                            <th className="px-6 py-3">Сумма продажи</th>
                            <th className="px-6 py-3">Оплачено</th>
                            <th className="px-6 py-3">Статус</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? ( <tr><td colSpan="7">Загрузка...</td></tr> ) :
                        sales.map(sale => (
                            <tr key={sale.id} className="border-b hover:bg-gray-50">
                                {editingSaleId === sale.id ? (
                                    <>
                                        <td className="p-2"><input type="date" value={editSaleFormData.sale_date} onChange={e => setEditSaleFormData({...editSaleFormData, sale_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2" colSpan="2"><input type="text" value={editSaleFormData.customer_name} onChange={e => setEditSaleFormData({...editSaleFormData, customer_name: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><input type="number" step="0.01" value={editSaleFormData.weight_kg} onChange={e => setEditSaleFormData({...editSaleFormData, weight_kg: e.target.value})} className="p-1 border rounded w-24"/></td>
                                        <td className="p-2"><input type="number" step="0.01" value={editSaleFormData.price_per_kg} onChange={e => setEditSaleFormData({...editSaleFormData, price_per_kg: e.target.value})} className="p-1 border rounded w-24"/></td>
                                        <td className="px-6 py-4" colSpan="2" >
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => handleUpdateSale(sale.id)} className="font-medium text-green-600">Сохранить</button>
                                                <button onClick={() => setEditingSaleId(null)} className="font-medium text-gray-500">Отмена</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4"><p className="font-medium">{new Date(sale.sale_date).toLocaleDateString()}</p><p className="text-gray-500">{sale.customer_name || '–'}</p></td>
                                        {/* --- ИЗМЕНЕНИЕ: Вернули ячейки --- */}
                                        <td className="px-6 py-4">{sale.weight_kg} кг</td>
                                        <td className="px-6 py-4">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.price_per_kg)}</td>
                                        <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.total_amount)}</td>
                                        <td className="px-6 py-4 font-semibold text-green-600">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.total_paid)}</td>
                                        <td className="px-6 py-4">{sale.balance <= 0 ? (<span className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Выплачено</span>) : (<span className="px-3 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Остаток: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.balance)}</span>)}</td>
                                        <td className="px-6 py-4 text-right flex gap-4 justify-end">
                                            <button onClick={() => openPaymentsModal(sale)} className="font-medium text-blue-600 hover:underline">Платежи</button>
                                            <button onClick={() => handleEditSaleClick(sale)} className="font-medium text-yellow-600 hover:underline">Изменить</button>
                                            <button onClick={() => handleDeleteSale(sale.id)} className="font-medium text-red-600 hover:underline">Удалить</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedSale && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        {/* ... заголовок модального окна и сводка ... */}
                        <div className="p-6">
                            <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
                                <div className="sm:col-span-1"><label className="text-sm">Дата</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">Сумма</label><input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700">Добавить</button>
                            </form>
                            {/* --- НОВОЕ: Кнопка "Всю сумму" --- */}
                            {selectedSale.balance > 0 && (
                                <div className="text-right -mt-2 mb-4">
                                    <button onClick={() => setPaymentAmount(selectedSale.balance)} className="text-xs text-blue-600 hover:underline">внести остаток ({selectedSale.balance} TJS)</button>
                                </div>
                            )}

                            <h4 className="font-semibold mt-6 mb-2">История платежей:</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                                {modalPayments.map(p => (
                                    <div key={p.id} className="p-2 bg-gray-50 rounded">
                                        {editingPaymentId === p.id ? (
                                            <div className="flex items-center gap-2">
                                                <input type="date" value={editPaymentFormData.payment_date} onChange={e => setEditPaymentFormData({...editPaymentFormData, payment_date: e.target.value})} className="p-1 border rounded w-full"/>
                                                <input type="number" step="0.01" value={editPaymentFormData.amount} onChange={e => setEditPaymentFormData({...editPaymentFormData, amount: e.target.value})} className="p-1 border rounded w-full"/>
                                                <button onClick={() => handleUpdatePayment(p.id)} className="text-green-600">✓</button>
                                                <button onClick={() => setEditingPaymentId(null)} className="text-gray-500">✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                                                    <span className="font-semibold ml-4">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(p.amount)}</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => handleEditPaymentClick(p)} className="text-xs text-yellow-600 hover:underline">Изм.</button>
                                                    <button onClick={() => handleDeletePayment(p.id)} className="text-xs text-red-600 hover:underline">Удал.</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 text-right rounded-b-lg">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Закрыть</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalesPage;