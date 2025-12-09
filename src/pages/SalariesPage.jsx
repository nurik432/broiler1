// src/pages/SalariesPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

function SalariesPage() {
    const [employees, setEmployees] = useState([]);
    const [allSalaries, setAllSalaries] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingSalaries, setLoadingSalaries] = useState(false);
    const [activeBatches, setActiveBatches] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('аванс');
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [isAddingPayment, setIsAddingPayment] = useState(false);

    const fetchEmployees = async () => {
        const { data, error } = await supabase.from('employees').select('*').order('full_name');
        if (error) console.error('Ошибка загрузки сотрудников:', error);
        else setEmployees(data);
    };

    const fetchActiveBatches = async () => {
        const { data, error } = await supabase.from('broiler_batches').select('id, batch_name').eq('is_active', true).order('start_date', { ascending: false });
        if (error) console.error("Ошибка загрузки партий:", error);
        else setActiveBatches(data);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchEmployees(), fetchActiveBatches()]).then(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            const fetchSalaries = async () => {
                setLoadingSalaries(true);
                const { data, error } = await supabase.rpc('get_salaries_by_employee', {
                    employee_uuid: selectedEmployee.id
                });
                if (error) {
                    console.error('Ошибка загрузки выплат:', error);
                    setAllSalaries([]);
                } else {
                    setAllSalaries(data || []);
                }
                setLoadingSalaries(false);
            };
            fetchSalaries();
        } else {
            setAllSalaries([]);
        }
    }, [selectedEmployee]);

    const filteredSalaries = useMemo(() => {
        return allSalaries.filter(salary => {
            if (showArchived) return true;
            return !salary.batch_id || salary.batch_is_active === true;
        });
    }, [allSalaries, showArchived]);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setIsAddingEmployee(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('employees').insert([{ full_name: newName, position: newPosition, user_id: user.id }]);
        if (error) alert(error.message);
        else { setNewName(''); setNewPosition(''); await fetchEmployees(); }
        setIsAddingEmployee(false);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        setIsAddingPayment(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('salaries').insert([{
            employee_id: selectedEmployee.id, amount: Number(paymentAmount),
            payment_type: paymentType, payment_date: paymentDate,
            user_id: user.id, batch_id: selectedBatchId || null
        }]);
        if (error) {
            alert(error.message);
        } else {
            setPaymentAmount('');
            setSelectedBatchId('');
            const { data } = await supabase.rpc('get_salaries_by_employee', {
                employee_uuid: selectedEmployee.id
            });
            setAllSalaries(data || []);
        }
        setIsAddingPayment(false);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Сотрудники и зарплаты</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-2xl font-semibold mb-4">Добавить сотрудника</h2>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div><label className="block text-sm font-medium">ФИО</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Должность</label><input type="text" value={newPosition} onChange={e => setNewPosition(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <button type="submit" disabled={isAddingEmployee} className="w-full bg-indigo-600 text-white p-2 rounded-md disabled:bg-gray-400">{isAddingEmployee ? 'Добавление...' : 'Добавить'}</button>
                        </form>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">Список сотрудников</h2>
                        {loading ? <p>Загрузка...</p> :
                        <ul className="space-y-2">
                            {employees.map(emp => (
                                <li key={emp.id} onClick={() => setSelectedEmployee(emp)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedEmployee?.id === emp.id ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                                    <p className="font-bold">{emp.full_name}</p><p className="text-sm text-gray-500">{emp.position}</p>
                                </li>
                            ))}
                        </ul>}
                    </div>
                </div>
                <div className="md:col-span-2">
                    {selectedEmployee ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                                <h2 className="text-2xl font-semibold">Выплаты для: <span className="text-indigo-600">{selectedEmployee.full_name}</span></h2>
                                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                    <span className="ml-2">Показать архивные</span>
                                </label>
                            </div>

                            <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-6 pb-6 border-b">
                                <div><label className="text-sm">Дата</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">Сумма</label><input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label className="text-sm">Тип</label><select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full p-2 border rounded bg-white"><option value="аванс">Аванс</option><option value="зарплата">Зарплата</option></select></div>
                                <div className="sm:col-span-2"><label className="text-sm">Привязать к партии (необязательно)</label>
                                    <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="w-full p-2 border rounded bg-white">
                                        <option value="">-- Не привязывать --</option>
                                        {activeBatches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                                    </select>
                                </div>
                                <button type="submit" disabled={isAddingPayment} className="bg-green-600 text-white p-2 rounded disabled:bg-gray-400">{isAddingPayment ? 'Добавление...' : 'Добавить'}</button>
                            </form>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-gray-500"><tr><th className="py-2">Дата/Время</th><th className="py-2">Тип</th><th className="py-2">Партия</th><th className="py-2">Сумма</th></tr></thead>
                                    <tbody>
                                        {loadingSalaries ? (<tr><td colSpan="4" className="text-center py-4">Загрузка выплат...</td></tr>) :
                                        filteredSalaries.map(sal => (
                                            <tr key={sal.id} className="border-b">
                                                <td className="py-2"><p>{new Date(sal.payment_date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{new Date(sal.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></td>
                                                <td className="py-2 font-semibold capitalize">{sal.payment_type}</td>
                                                <td className="py-2">{sal.batch_name ? <span className={`text-xs rounded-full px-2 py-1 ${sal.batch_is_active ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>{sal.batch_name}</span> : '–'}</td>
                                                <td className="py-2 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sal.amount)}</td>
                                            </tr>
                                        ))}
                                        {!loadingSalaries && filteredSalaries.length === 0 && (<tr><td colSpan="4" className="text-center py-4 text-gray-500">Выплат не найдено.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-md h-full min-h-[200px]"><p className="text-gray-500">Выберите сотрудника для просмотра выплат</p></div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SalariesPage;