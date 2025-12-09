// src/pages/BatchLogPage.jsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- КОМПОНЕНТЫ-ТАБЛИЦЫ (объявлены вверху для чистоты) ---

const JournalTable = ({ logs, batch, medicines, fetchData }) => {
    // Здесь мы переносим всю логику, связанную с журналом
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const calculateAge = (startDate, currentDate) => {
        const start = new Date(startDate);
        const current = new Date(currentDate);
        const diffTime = Math.abs(current - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const handleEditClick = (log) => { setEditingId(log.id); setEditFormData({ log_date: log.log_date, mortality: log.mortality, water_consumption: log.water_consumption || '', medicine_id: log.medicine_id || '', dosage: log.dosage || '' }); };
    const handleUpdate = async (logId) => {
        const age = calculateAge(batch.start_date, editFormData.log_date);
        const { error } = await supabase.from('daily_logs').update({ ...editFormData, age, mortality: Number(editFormData.mortality) || 0, water_consumption: Number(editFormData.water_consumption) || null }).eq('id', logId);
        if (error) { alert(error.message); }
        else { setEditingId(null); await fetchData(); }
    };
    const handleDelete = async (logId) => { if (window.confirm("Удалить запись?")) { const { error } = await supabase.from('daily_logs').delete().eq('id', logId); if (error) { alert(error.message); } else { await fetchData(); } } };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 min-w-[700px]">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">Дата / Время</th><th className="px-6 py-3">Возраст</th><th className="px-6 py-3">Падеж</th>
                        <th className="px-6 py-3">Лекарство</th><th className="px-6 py-3">Доза</th><th className="px-6 py-3">Вода, л</th>
                        <th className="px-6 py-3 text-right">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                            {editingId === log.id && batch.is_active ? (
                                <>
                                    <td className="p-2"><input type="date" value={editFormData.log_date} onChange={e => setEditFormData({...editFormData, log_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                    <td className="px-6 py-4">{calculateAge(batch.start_date, editFormData.log_date)}</td>
                                    <td className="p-2"><input type="number" value={editFormData.mortality} onChange={e => setEditFormData({...editFormData, mortality: e.target.value})} className="p-1 border rounded w-20"/></td>
                                    <td className="p-2"><select value={editFormData.medicine_id} onChange={e => setEditFormData({...editFormData, medicine_id: e.target.value})} className="p-1 border rounded w-full bg-white"><option value="">-- Не выбрано --</option>{medicines.map(med => <option key={med.id} value={med.id}>{med.name}</option>)}</select></td>
                                    <td className="p-2"><input type="text" value={editFormData.dosage} onChange={e => setEditFormData({...editFormData, dosage: e.target.value})} className="p-1 border rounded w-24"/></td>
                                    <td className="p-2"><input type="number" step="0.1" value={editFormData.water_consumption} onChange={e => setEditFormData({...editFormData, water_consumption: e.target.value})} className="p-1 border rounded w-20"/></td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end"><button onClick={() => handleUpdate(log.id)} className="font-medium text-green-600">Сохранить</button><button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button></td>
                                </>
                            ) : (
                                <>
                                    <td className="px-6 py-4"><p className="font-medium">{new Date(log.log_date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></td>
                                    <td className="px-6 py-4">{log.age}</td>
                                    <td className="px-6 py-4 text-red-600 font-semibold">{log.mortality}</td>
                                    <td className="px-6 py-4">{log.medicine ? log.medicine.name : '–'}</td>
                                    <td className="px-6 py-4">{log.dosage || '–'}</td>
                                    <td className="px-6 py-4">{log.water_consumption || '–'}</td>
                                    <td className="px-6 py-4 text-right">
                                        {batch.is_active && (
                                            <div className="flex gap-4 justify-end">
                                                <button onClick={() => handleEditClick(log)} className="font-medium text-blue-600 hover:underline">Редактировать</button>
                                                <button onClick={() => handleDelete(log.id)} className="font-medium text-red-600 hover:underline">Удалить</button>
                                            </div>
                                        )}
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                    {logs.length === 0 && (<tr><td colSpan="7" className="text-center py-4">Записей в журнале пока нет.</td></tr>)}
                </tbody>
            </table>
        </div>
    );
};

const ExpensesTable = ({ items }) => (
    <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-left bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата</th><th className="px-6 py-3">Описание</th><th className="px-6 py-3">Сумма</th></tr></thead>
        <tbody>{items.map(item => (<tr key={item.id} className="border-b"><td className="px-6 py-2">{new Date(item.expense_date).toLocaleDateString()}</td><td className="px-6 py-2">{item.description}</td><td className="px-6 py-2 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(item.amount)}</td></tr>))}</tbody>
    </table></div>
);
const SalesTable = ({ items }) => (
    <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-left bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата</th><th className="px-6 py-3">Покупатель</th><th className="px-6 py-3">Вес</th><th className="px-6 py-3">Цена/кг</th><th className="px-6 py-3">Сумма</th></tr></thead>
        <tbody>{items.map(item => (<tr key={item.id} className="border-b"><td className="px-6 py-2">{new Date(item.sale_date).toLocaleDateString()}</td><td className="px-6 py-2">{item.customer_name}</td><td className="px-6 py-2">{item.weight_kg} кг</td><td className="px-6 py-2">{item.price_per_kg}</td><td className="px-6 py-2 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(item.weight_kg * item.price_per_kg)}</td></tr>))}</tbody>
    </table></div>
);
const FeedTable = ({ items }) => (
    <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-left bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата</th><th className="px-6 py-3">Тип</th><th className="px-6 py-3">Количество</th></tr></thead>
        <tbody>{items.map(item => (<tr key={item.id} className="border-b"><td className="px-6 py-2">{new Date(item.delivery_date).toLocaleDateString()}</td><td className="px-6 py-2 capitalize">{item.feed_type}</td><td className="px-6 py-2 font-semibold">{item.quantity_kg} кг</td></tr>))}</tbody>
    </table></div>
);
const SalariesTable = ({ items }) => (
    <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-left bg-gray-50 text-xs uppercase"><tr><th className="px-6 py-3">Дата</th><th className="px-6 py-3">Сотрудник</th><th className="px-6 py-3">Тип</th><th className="px-6 py-3">Сумма</th></tr></thead>
        <tbody>{items.map(item => (<tr key={item.id} className="border-b"><td className="px-6 py-2">{new Date(item.payment_date).toLocaleDateString()}</td><td className="px-6 py-2">{item.employee_name}</td><td className="px-6 py-2 capitalize">{item.payment_type}</td><td className="px-6 py-2 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(item.amount)}</td></tr>))}</tbody>
    </table></div>
);

function BatchLogPage() {
    const { batchId } = useParams();
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('journal');
    const [logs, setLogs] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [sales, setSales] = useState([]);
    const [feed, setFeed] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
    const [mortality, setMortality] = useState('');
    const [medicineId, setMedicineId] = useState('');
    const [dosage, setDosage] = useState('');
    const [water, setWater] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const calculateAge = (startDate, currentDate) => {
        const start = new Date(startDate);
        const current = new Date(currentDate);
        const diffTime = Math.abs(current - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const fetchAllBatchData = async () => {
        try {
            const [batchRes, logsRes, medicinesRes, expensesRes, salesRes, feedRes, salariesRes] = await Promise.all([
                supabase.from('broiler_batches').select('*').eq('id', batchId).single(),
                supabase.from('daily_logs').select('*, medicine:medicines(name)').eq('batch_id', batchId).order('log_date', { ascending: false }),
                supabase.from('medicines').select('id, name'),
                supabase.rpc('get_expenses_by_batch', { batch_uuid: batchId }),
                supabase.rpc('get_sales_by_batch', { batch_uuid: batchId }),
                supabase.rpc('get_feed_by_batch', { batch_uuid: batchId }),
                supabase.rpc('get_salaries_by_batch', { batch_uuid: batchId })
            ]);

            if (batchRes.error) throw batchRes.error;
            setBatch(batchRes.data);
            if (logsRes.error) throw logsRes.error;
            setLogs(logsRes.data);
            if (medicinesRes.error) throw medicinesRes.error;
            setMedicines(medicinesRes.data);
            if (expensesRes.error) throw expensesRes.error;
            setExpenses(expensesRes.data);
            if (salesRes.error) throw salesRes.error;
            setSales(salesRes.data);
            if (feedRes.error) throw feedRes.error;
            setFeed(feedRes.data);
            if (salariesRes.error) throw salariesRes.error;
            setSalaries(salariesRes.data);

        } catch (error) {
            console.error("Ошибка при загрузке данных партии:", error);
            alert("Не удалось загрузить все данные по партии.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (batchId) {
            setLoading(true);
            fetchAllBatchData();
        }
    }, [batchId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const age = calculateAge(batch.start_date, logDate);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('daily_logs').insert([
            { batch_id: batchId, log_date: logDate, age: age, mortality: Number(mortality) || 0, medicine_id: medicineId || null, dosage: dosage, water_consumption: Number(water) || null, user_id: user.id }
        ]);
        if (error) { alert(error.message); }
        else {
            setMortality(''); setMedicineId(''); setDosage(''); setWater('');
            await fetchAllBatchData(); // Перезагружаем все данные
        }
        setIsSubmitting(false);
    };

    if (loading) { return <div className="text-center p-8">Загрузка данных по партии...</div>; }
    if (!batch) { return <div className="text-center p-8 text-red-600">Партия не найдена.</div>; }

    const totalMortality = logs.reduce((sum, log) => sum + log.mortality, 0);
    const currentQuantity = batch.initial_quantity - totalMortality;

    const TabButton = ({ tabName, label, count }) => (
        <button onClick={() => setActiveTab(tabName)} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeTab === tabName ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
            {label} <span className="text-xs bg-gray-200 rounded-full px-2 py-0.5">{count}</span>
        </button>
    );

    return (
        <div>
            <Link to="/" className="text-indigo-600 hover:underline mb-4 inline-block">&larr; Назад ко всем партиям</Link>
            <div className="flex flex-wrap items-center gap-x-4 mb-2">
                <h2 className="text-3xl font-bold text-gray-800">Журнал партии: "{batch.batch_name}"</h2>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${batch.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{batch.is_active ? 'Активна' : 'Завершена'}</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 mb-6">
                <span>Начало: {new Date(batch.start_date).toLocaleDateString()}</span><span>Начальное поголовье: {batch.initial_quantity}</span>
                <span className="font-bold text-red-600">Общий падеж: {totalMortality}</span><span className="font-bold text-green-600">Текущее поголовье: {currentQuantity}</span>
            </div>

            <div className="bg-white rounded-lg shadow-md mt-8">
                <div className="flex border-b overflow-x-auto">
                    <TabButton tabName="journal" label="Журнал" count={logs.length} />
                    <TabButton tabName="expenses" label="Расходы" count={expenses.length} />
                    <TabButton tabName="sales" label="Продажи" count={sales.length} />
                    <TabButton tabName="feed" label="Корм" count={feed.length} />
                    <TabButton tabName="salaries" label="Зарплаты" count={salaries.length} />
                </div>

                <div className="p-4 md:p-6">
                    {activeTab === 'journal' && (
                        <>
                            {batch.is_active && (
                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <h3 className="text-xl font-semibold mb-4">Добавить запись в журнал</h3>
                                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><label className="block text-sm font-medium">Дата</label><input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                                        <div><label className="block text-sm font-medium">Падеж (шт.)</label><input type="number" value={mortality} onChange={e => setMortality(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                                        <div><label className="block text-sm font-medium">Вода (л)</label><input type="number" step="0.1" value={water} onChange={e => setWater(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                                        <div className="md:col-span-2"><label className="block text-sm font-medium">Лекарство</label><select value={medicineId} onChange={e => setMedicineId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white"><option value="">-- Не выбрано --</option>{medicines.map(med => <option key={med.id} value={med.id}>{med.name}</option>)}</select></div>
                                        <div><label className="block text-sm font-medium">Доза</label><input type="text" value={dosage} onChange={e => setDosage(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                                        <button type="submit" disabled={isSubmitting} className="md:col-span-3 w-full py-2 px-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить запись'}</button>
                                    </form>
                                </div>
                            )}
                            <JournalTable logs={logs} batch={batch} medicines={medicines} fetchData={fetchAllBatchData} />
                        </>
                    )}
                    {activeTab === 'expenses' && <ExpensesTable items={expenses} />}
                    {activeTab === 'sales' && <SalesTable items={sales} />}
                    {activeTab === 'feed' && <FeedTable items={feed} />}
                    {activeTab === 'salaries' && <SalariesTable items={salaries} />}
                </div>
            </div>
        </div>
    );
}

export default BatchLogPage;