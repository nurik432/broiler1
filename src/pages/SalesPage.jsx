// src/pages/SalesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function SalesPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // Состояния для формы добавления продажи
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [customer, setCustomer] = useState('');
    const [weight, setWeight] = useState('');
    const [price, setPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Состояния для модального окна платежей
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [modalPayments, setModalPayments] = useState([]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

    // 1. Загрузка данных о продажах с помощью RPC-функции
    const fetchSales = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_sales_with_stats');
        if (error) {
            console.error('Ошибка при загрузке продаж:', error);
            alert('Не удалось загрузить данные о продажах.');
        } else {
            setSales(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    // 2. Функция для открытия модального окна и загрузки платежей
    const openPaymentsModal = async (sale) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
        const { data, error } = await supabase.from('payments').select('*').eq('sale_id', sale.id).order('payment_date', { ascending: false });
        if (error) {
            console.error('Ошибка загрузки платежей:', error);
            setModalPayments([]);
        } else {
            setModalPayments(data);
        }
    };

    // 3. Функция для добавления нового ПЛАТЕЖА
    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || !selectedSale) return;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('payments').insert([{
            sale_id: selectedSale.id,
            payment_date: paymentDate,
            amount: Number(paymentAmount),
            user_id: user.id
        }]);

        if (error) {
            alert(error.message);
        } else {
            setPaymentAmount('');
            // Обновляем всю информацию после добавления платежа
            await fetchSales();

            // Обновляем данные в модальном окне, чтобы не закрывать его
            const { data: updatedPayments } = await supabase.from('payments').select('*').eq('sale_id', selectedSale.id).order('payment_date', { ascending: false });
            setModalPayments(updatedPayments);

            const { data: updatedSales } = await supabase.rpc('get_sales_with_stats');
            const updatedSaleData = updatedSales.find(s => s.id === selectedSale.id);
            setSelectedSale(updatedSaleData);
        }
    };

    // 4. Функция для добавления новой ПРОДАЖИ
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('sales').insert([{
            sale_date: date,
            customer_name: customer,
            weight_kg: Number(weight),
            price_per_kg: Number(price),
            user_id: user.id
        }]);
        if (error) {
            alert(error.message);
        } else {
            setDate(new Date().toISOString().slice(0, 10));
            setCustomer('');
            setWeight('');
            setPrice('');
            await fetchSales();
        }
        setIsSubmitting(false);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет продаж и поступлений</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить продажу</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div><label className="block text-sm font-medium">Дата</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium">Покупатель</label><input type="text" placeholder="Имя или название" value={customer} onChange={e => setCustomer(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Вес (кг)</label><input type="number" step="0.01" placeholder="10.5" value={weight} onChange={e => setWeight(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Цена за кг</label><input type="number" step="0.01" placeholder="300" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 md:col-span-5">{isSubmitting ? 'Добавление...' : 'Добавить'}</button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Дата / Покупатель</th>
                            <th className="px-6 py-3">Сумма продажи</th>
                            <th className="px-6 py-3">Оплачено</th>
                            <th className="px-6 py-3">Статус</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? ( <tr><td colSpan="5" className="text-center py-4">Загрузка данных...</td></tr> ) :
                        sales.map(sale => (
                            <tr key={sale.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900">{new Date(sale.sale_date).toLocaleDateString()}</p>
                                    <p className="text-gray-500">{sale.customer_name || 'Частная продажа'}</p>
                                </td>
                                <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.total_amount)}</td>
                                <td className="px-6 py-4 font-semibold text-green-600">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.total_paid)}</td>
                                <td className="px-6 py-4">
                                    {sale.balance <= 0 ? (
                                        <span className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Выплачено</span>
                                    ) : (
                                        <span className="px-3 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Остаток: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sale.balance)}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => openPaymentsModal(sale)} className="font-medium text-blue-600 hover:underline">Платежи</button>
                                </td>
                            </tr>
                        ))}
                         { !loading && sales.length === 0 && (<tr><td colSpan="5" className="text-center py-4 text-gray-500">Записей о продажах пока нет.</td></tr>) }
                    </tbody>
                </table>
            </div>

            {isModalOpen && selectedSale && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b"><h3 className="text-xl font-semibold">Платежи по продаже</h3><p className="text-sm text-gray-500">от {new Date(selectedSale.sale_date).toLocaleDateString()} (Покупатель: {selectedSale.customer_name || 'Не указан'})</p></div>
                        <div className="p-6 grid grid-cols-3 gap-4 text-center border-b">
                            <div><p className="text-sm text-gray-500">Всего к оплате</p><p className="font-bold text-lg">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(selectedSale.total_amount)}</p></div>
                            <div><p className="text-sm text-gray-500">Оплачено</p><p className="font-bold text-lg text-green-600">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(selectedSale.total_paid)}</p></div>
                            <div><p className="text-sm text-gray-500">Остаток</p><p className="font-bold text-lg text-red-600">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(selectedSale.balance)}</p></div>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
                                <div className="sm:col-span-1"><label className="text-sm">Дата платежа</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">Сумма</label><input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded" placeholder="Введите сумму"/></div>
                                <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700">Добавить платеж</button>
                            </form>
                            <h4 className="font-semibold mt-6 mb-2">История платежей:</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                                {modalPayments.map(p => (
                                    <div key={p.id} className="flex justify-between p-2 bg-gray-50 rounded">
                                        <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                                        <span className="font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(p.amount)}</span>
                                    </div>
                                ))}
                                {modalPayments.length === 0 && <p className="text-gray-500 text-center py-4">Платежей пока нет.</p>}
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