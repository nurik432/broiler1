// src/pages/FeedPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

function FeedPage() {
    const [allDeliveries, setAllDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBatches, setActiveBatches] = useState([]);

    // Состояние для фильтра архивных
    const [showArchived, setShowArchived] = useState(false);

    const [feedTotals, setFeedTotals] = useState({ start: 0, growth: 0, finish: 0 });
    const [totalFeed, setTotalFeed] = useState(0);

    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [feedType, setFeedType] = useState('старт');
    const [quantity, setQuantity] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // 1. Загрузка данных
    const fetchData = async () => {
        setLoading(true);
        const [deliveriesRes, batchesRes] = await Promise.all([
            supabase.rpc('get_feed_deliveries'),
            supabase.from('broiler_batches').select('id, batch_name').eq('is_active', true)
        ]);

        if (deliveriesRes.error) {
            console.error('Ошибка:', deliveriesRes.error);
            alert('Не удалось загрузить данные о корме.');
        } else {
            setAllDeliveries(deliveriesRes.data);
        }

        if (batchesRes.error) {
            console.error("Ошибка:", batchesRes.error);
        } else {
            setActiveBatches(batchesRes.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Логика фильтрации и расчетов
    const filteredDeliveries = useMemo(() => {
        return allDeliveries.filter(delivery => {
            if (showArchived) return true;
            return !delivery.batch_id || delivery.batch_is_active === true;
        });
    }, [allDeliveries, showArchived]);

    useEffect(() => {
        // Пересчитываем сводку на основе отфильтрованных данных
        const totals = filteredDeliveries.reduce((acc, delivery) => {
            if (delivery.feed_type === 'старт') acc.start += delivery.quantity_kg;
            else if (delivery.feed_type === 'рост') acc.growth += delivery.quantity_kg;
            else if (delivery.feed_type === 'финиш') acc.finish += delivery.quantity_kg;
            return acc;
        }, { start: 0, growth: 0, finish: 0 });
        setFeedTotals(totals);
        setTotalFeed(totals.start + totals.growth + totals.finish);
    }, [filteredDeliveries]);


    // 3. CRUD функции
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('feed_deliveries').insert([{
            delivery_date: date, feed_type: feedType, quantity_kg: Number(quantity),
            user_id: user.id, batch_id: selectedBatchId || null
        }]);
        if (error) { alert(error.message); }
        else {
            setQuantity(''); setSelectedBatchId('');
            await fetchData();
        }
        setIsSubmitting(false);
    };

    const handleEditClick = (delivery) => { setEditingId(delivery.id); setEditFormData({ delivery_date: delivery.delivery_date, feed_type: delivery.feed_type, quantity_kg: delivery.quantity_kg, batch_id: delivery.batch_id || '' }); };
    const handleUpdate = async (deliveryId) => {
        const { error } = await supabase.from('feed_deliveries').update({ ...editFormData, quantity_kg: Number(editFormData.quantity_kg), batch_id: editFormData.batch_id || null }).eq('id', deliveryId);
        if (error) { alert(error.message); }
        else { setEditingId(null); await fetchData(); }
    };
    const handleDelete = async (deliveryId) => { if (window.confirm("Удалить запись?")) { await supabase.from('feed_deliveries').delete().eq('id', deliveryId); await fetchData(); } };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Учет корма</h1>
                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                    <span className="ml-2">Показать поставки для архивных партий</span>
                </label>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Сводка по корму (с учетом фильтра)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><p className="text-sm text-gray-500">Старт</p><p className="font-bold text-xl md:text-2xl text-blue-600">{feedTotals.start} кг</p></div>
                    <div><p className="text-sm text-gray-500">Рост</p><p className="font-bold text-xl md:text-2xl text-green-600">{feedTotals.growth} кг</p></div>
                    <div><p className="text-sm text-gray-500">Финиш</p><p className="font-bold text-xl md:text-2xl text-yellow-600">{feedTotals.finish} кг</p></div>
                    <div className="bg-gray-100 p-2 rounded-lg"><p className="text-sm font-semibold text-gray-700">Всего</p><p className="font-bold text-xl md:text-2xl text-gray-900">{totalFeed} кг</p></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить приход корма</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div><label className="block text-sm font-medium">Дата прихода</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Тип корма</label><select value={feedType} onChange={e => setFeedType(e.target.value)} required className="mt-1 w-full p-2 border rounded-md bg-white"><option value="старт">Старт</option><option value="рост">Рост</option><option value="финиш">Финиш</option></select></div>
                    <div><label className="block text-sm font-medium">Количество (кг)</label><input type="number" step="0.1" placeholder="500" value={quantity} onChange={e => setQuantity(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div className="md:col-span-1"><label className="block text-sm font-medium">Привязать к партии</label>
                        <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                            <option value="">-- Не привязывать --</option>
                            {activeBatches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить'}</button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Дата / Время</th><th className="px-6 py-3">Тип корма</th>
                            <th className="px-6 py-3">Количество (кг)</th><th className="px-6 py-3">Партия</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? ( <tr><td colSpan="5" className="text-center py-4">Загрузка...</td></tr> ) :
                        filteredDeliveries.map(d => (
                            <tr key={d.id} className="border-b hover:bg-gray-50">
                                {editingId === d.id ? (
                                    <>
                                        <td className="p-2"><input type="date" value={editFormData.delivery_date} onChange={e => setEditFormData({...editFormData, delivery_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="p-2"><select value={editFormData.feed_type} onChange={e => setEditFormData({...editFormData, feed_type: e.target.value})} className="p-1 border rounded w-full bg-white"><option value="старт">Старт</option><option value="рост">Рост</option><option value="финиш">Финиш</option></select></td>
                                        <td className="p-2"><input type="number" step="0.1" value={editFormData.quantity_kg} onChange={e => setEditFormData({...editFormData, quantity_kg: e.target.value})} className="p-1 border rounded w-32"/></td>
                                        <td className="p-2"><select value={editFormData.batch_id} onChange={e => setEditFormData({...editFormData, batch_id: e.target.value})} className="p-1 border rounded w-full bg-white"><option value="">-- Не привязывать --</option>{activeBatches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}</select></td>
                                        <td className="px-6 py-4 text-right flex gap-2 justify-end"><button onClick={() => handleUpdate(d.id)} className="font-medium text-green-600">Сохранить</button><button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4"><p className="font-medium">{new Date(d.delivery_date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p></td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{d.feed_type.charAt(0).toUpperCase() + d.feed_type.slice(1)}</td>
                                        <td className="px-6 py-4 font-semibold">{d.quantity_kg} кг</td>
                                        <td className="px-6 py-4">{d.batch_name ? <span className={`text-xs rounded-full px-2 py-1 ${d.batch_is_active ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>{d.batch_name}</span> : '–'}</td>
                                        <td className="px-6 py-4 text-right flex gap-4 justify-end"><button onClick={() => handleEditClick(d)} className="font-medium text-blue-600 hover:underline">Редактировать</button><button onClick={() => handleDelete(d.id)} className="font-medium text-red-600 hover:underline">Удалить</button></td>
                                    </>
                                )}
                            </tr>
                        ))}
                         { !loading && filteredDeliveries.length === 0 && (<tr><td colSpan="5" className="text-center py-4 text-gray-500">Записей о приходе корма не найдено.</td></tr>) }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default FeedPage;