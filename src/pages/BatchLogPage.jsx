// src/pages/BatchLogPage.jsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function BatchLogPage() {
    const { batchId } = useParams();
    const [batch, setBatch] = useState(null);
    const [logs, setLogs] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalMortality, setTotalMortality] = useState(0);

    const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
    const [mortality, setMortality] = useState('');
    const [medicineId, setMedicineId] = useState('');
    const [dosage, setDosage] = useState('');
    const [water, setWater] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const calculateAge = (startDate, currentDate) => {
        const start = new Date(startDate);
        const current = new Date(currentDate);
        const diffTime = Math.abs(current - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const fetchData = async () => {
        try {
            const { data: batchData, error: batchError } = await supabase.from('broiler_batches').select('*').eq('id', batchId).single();
            const { data: logsData, error: logsError } = await supabase.from('daily_logs').select('*, medicine:medicines(name)').eq('batch_id', batchId).order('log_date', { ascending: false });
            const { data: medicinesData, error: medicinesError } = await supabase.from('medicines').select('id, name');
            if (batchError) throw batchError;
            if (logsError) throw logsError;
            if (medicinesError) throw medicinesError;
            setBatch(batchData);
            setLogs(logsData);
            setMedicines(medicinesData);
            setTotalMortality(logsData.reduce((sum, log) => sum + log.mortality, 0));
        } catch (error) {
            console.error("Ошибка при загрузке данных:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [batchId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const age = calculateAge(batch.start_date, logDate);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('daily_logs').insert([
            { batch_id: batchId, log_date: logDate, age: age, mortality: Number(mortality) || 0, medicine_id: medicineId || null, dosage: dosage, water_consumption: Number(water) || null, user_id: user.id }
        ]);
        if (error) { alert(error.message); } else {
            setMortality(''); setMedicineId(''); setDosage(''); setWater('');
            await fetchData();
        }
        setIsSubmitting(false);
    };

    const handleEditClick = (log) => { setEditingId(log.id); setEditFormData({ log_date: log.log_date, mortality: log.mortality, water_consumption: log.water_consumption || '', medicine_id: log.medicine_id || '', dosage: log.dosage || '' }); };
    const handleUpdate = async (logId) => {
        const { error } = await supabase.from('daily_logs').update({ ...editFormData, mortality: Number(editFormData.mortality) || 0, water_consumption: Number(editFormData.water_consumption) || null }).eq('id', logId);
        if (error) { alert(error.message); } else { setEditingId(null); await fetchData(); }
    };
    const handleDelete = async (logId) => { if (window.confirm("Удалить запись?")) { const { error } = await supabase.from('daily_logs').delete().eq('id', logId); if (error) { alert(error.message); } else { await fetchData(); } } };

    if (loading) { return <div className="text-center p-8">Загрузка журнала...</div>; }
    if (!batch) { return <div className="text-center p-8 text-red-600">Партия не найдена.</div>; }

    const currentQuantity = batch.initial_quantity - totalMortality;

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

            {batch.is_active ? (
                <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                    <h3 className="text-2xl font-semibold mb-4">Добавить запись в журнал</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">Дата</label><input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Падеж (шт.)</label><input type="number" value={mortality} onChange={e => setMortality(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Вода (л)</label><input type="number" step="0.1" value={water} onChange={e => setWater(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Лекарство</label><select value={medicineId} onChange={e => setMedicineId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white"><option value="">-- Не выбрано --</option>{medicines.map(med => <option key={med.id} value={med.id}>{med.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700">Доза</label><input type="text" value={dosage} onChange={e => setDosage(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                        <button type="submit" disabled={isSubmitting} className="md:col-span-3 w-full py-2 px-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить запись'}</button>
                    </form>
                </div>
            ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg"><p className="font-bold text-yellow-800">Партия завершена</p><p className="text-yellow-700">Добавление новых записей в архивную партию невозможно.</p></div>
            )}

            <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 min-w-[700px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Дата</th><th className="px-6 py-3">Возраст</th><th className="px-6 py-3">Падеж</th>
                            <th className="px-6 py-3">Лекарство</th><th className="px-6 py-3">Доза</th><th className="px-6 py-3">Вода, л</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                {editingId === log.id ? (
                                    <>
                                        <td className="p-2"><input type="date" value={editFormData.log_date} onChange={e => setEditFormData({...editFormData, log_date: e.target.value})} className="p-1 border rounded w-full"/></td>
                                        <td className="px-6 py-4">{log.age}</td>
                                        <td className="p-2"><input type="number" value={editFormData.mortality} onChange={e => setEditFormData({...editFormData, mortality: e.target.value})} className="p-1 border rounded w-20"/></td>
                                        <td className="p-2"><select value={editFormData.medicine_id} onChange={e => setEditFormData({...editFormData, medicine_id: e.target.value})} className="p-1 border rounded w-full bg-white"><option value="">-- Не выбрано --</option>{medicines.map(med => <option key={med.id} value={med.id}>{med.name}</option>)}</select></td>
                                        <td className="p-2"><input type="text" value={editFormData.dosage} onChange={e => setEditFormData({...editFormData, dosage: e.target.value})} className="p-1 border rounded w-24"/></td>
                                        <td className="p-2"><input type="number" step="0.1" value={editFormData.water_consumption} onChange={e => setEditFormData({...editFormData, water_consumption: e.target.value})} className="p-1 border rounded w-20"/></td>
                                        <td className="px-6 py-4 text-right flex gap-2"><button onClick={() => handleUpdate(log.id)} className="font-medium text-green-600">Сохранить</button><button onClick={() => setEditingId(null)} className="font-medium text-gray-500">Отмена</button></td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4 font-medium text-gray-900">{new Date(log.log_date).toLocaleDateString()}</td><td className="px-6 py-4">{log.age}</td>
                                        <td className="px-6 py-4 text-red-600 font-semibold">{log.mortality}</td><td className="px-6 py-4">{log.medicine ? log.medicine.name : '–'}</td>
                                        <td className="px-6 py-4">{log.dosage || '–'}</td><td className="px-6 py-4">{log.water_consumption || '–'}</td>
                                        <td className="px-6 py-4 text-right flex gap-4 justify-end"><button onClick={() => handleEditClick(log)} className="font-medium text-blue-600">Редактировать</button><button onClick={() => handleDelete(log.id)} className="font-medium text-red-600">Удалить</button></td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {logs.length === 0 && (<tr><td colSpan="7" className="text-center py-4 text-gray-500">Записей в журнале пока нет.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default BatchLogPage;