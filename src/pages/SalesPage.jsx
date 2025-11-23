// src/pages/SalesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function SalesPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // Состояния для формы добавления
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [customer, setCustomer] = useState('');
    const [weight, setWeight] = useState('');
    const [price, setPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Состояния для редактирования
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Загрузка данных
    const fetchSales = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('sales').select('*').order('sale_date', { ascending: false });
        if (error) { console.error('Ошибка при загрузке продаж:', error); }
        else { setSales(data); }
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    // Добавление новой продажи
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
        if (error) { alert(error.message); }
        else {
            setDate(new Date().toISOString().slice(0, 10));
            setCustomer(''); setWeight(''); setPrice('');
            await fetchSales();
        }
        setIsSubmitting(false);
    };

    // Удаление продажи
    const handleDelete = async (saleId) => {
        if (window.confirm("Удалить эту запись о продаже?")) {
            const { error } = await supabase.from('sales').delete().eq('id', saleId);
            if (error) { alert(error.message); }
            else { await fetchSales(); }
        }
    };

    // Начало редактирования
    const handleEditClick = (sale) => {
        setEditingId(sale.id);
        setEditFormData({
            sale_date: sale.sale_date,
            customer_name: sale.customer_name || '',
            weight_kg: sale.weight_kg,
            price_per_kg: sale.price_per_kg,
        });
    };

    // Сохранение изменений
    const handleUpdate = async (saleId) => {
        const { error } = await supabase.from('sales').update({
            ...editFormData,
            weight_kg: Number(editFormData.weight_kg),
            price_per_kg: Number(editFormData.price_per_kg)
        }).eq('id', saleId);
        if (error) { alert(error.message); }
        else { setEditingId(null); await fetchSales(); }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Учет продаж</h1>

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
                            <th className="px-6 py-3">Дата</th><th className="px-6 py-3">Покупатель</th>
                            <th className="px-6 py-3">Вес (кг)</th><th className="px-6 py-3">Цена за кг</th>
                            <th className="px-6 py-3">Итоговая сумма</th><th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? ( <tr><td colSpan="6" className="text-center py-4">Загрузка...</td></tr> ) :
                        sales.map(sale => {
                            const total = sale.weight_kg * sale.price_per_kg;
                            return (
                                <tr key={sale.id} className="border-b hover:bg-gray-50">
                                    {editingId === sale.id ? (
                                        <>
                                            <td className="p-2"><input type="date" value={editFormData.sale_date} onChange={e => setEditFormData({...editFormData, sale_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                            <td className="p-2"><input type="text" value={editFormData.customer_name} onChange={e => setEditFormData({...editFormData, customer_name: e.target.value})} className="p-1 border rounded w-full"/></td>
                                            <td className="p-2"><input type="number" step="0.01" value={editFormData.weight_kg} onChange={e => setEditFormData({...editFormData, weight_kg: e.target.value})} className="p-1 border rounded w-24"/></td>
                                            <td className="p-2"><input type="number" step="0.01" value={editFormData.price_per_kg} onChange={e => setEditFormData({...editFormData, price_per_kg: e.target.value})} className="p-1 border rounded w-24"/></td>
                                            <td className="px-6 py-4 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(editFormData.weight_kg * editFormData.price_per_kg)}</td>
                                            <td className="px-6 py-4 text-right flex gap-2"><button onClick={() => handleUpdate(sale.id)} className="font-medium text-green-600">Сохранить</button><button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button></td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4">{new Date(sale.sale_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{sale.customer_name || '–'}</td>
                                            <td className="px-6 py-4">{sale.weight_kg} кг</td>
                                            <td className="px-6 py-4">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(sale.price_per_kg)}</td>
                                            <td className="px-6 py-4 font-semibold text-green-600">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(total)}</td>
                                            <td className="px-6 py-4 text-right flex gap-4 justify-end"><button onClick={() => handleEditClick(sale)} className="font-medium text-blue-600">Редактировать</button><button onClick={() => handleDelete(sale.id)} className="font-medium text-red-600">Удалить</button></td>
                                        </>
                                    )}
                                </tr>
                            )
                        })}
                         { !loading && sales.length === 0 && (<tr><td colSpan="6" className="text-center py-4 text-gray-500">Записей о продажах пока нет.</td></tr>) }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default SalesPage;