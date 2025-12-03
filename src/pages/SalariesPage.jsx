// src/pages/SalariesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function SalariesPage() {
    const [employees, setEmployees] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeBatches, setActiveBatches] = useState([]);
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
                const { data, error } = await supabase.from('salaries')
                    .select('*, batch:broiler_batches(batch_name)')
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false })
                    .order('created_at', { ascending: false });
                if (error) console.error('Ошибка загрузки выплат:', error); else setSalaries(data);
            };
            fetchSalaries();
        } else { setSalaries([]); }
    }, [selectedEmployee]);

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
        if (error) alert(error.message);
        else {
            setPaymentAmount(''); setSelectedBatchId('');
            const { data } = await supabase.from('salaries').select('*, batch:broiler_batches(batch_name)').eq('employee_id', selectedEmployee.id).order('payment_date', { ascending: false });
            setSalaries(data);
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
                            <div><label>ФИО</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="w-full p-2 border rounded"/></div>
                            <div><label>Должность</label><input type="text" value={newPosition} onChange={e => setNewPosition(e.target.value)} className="w-full p-2 border rounded"/></div>
                            <button type="submit" disabled={isAddingEmployee} className="w-full bg-indigo-600 text-white p-2 rounded disabled:bg-gray-400">{isAddingEmployee ? 'Добавление...' : 'Добавить'}</button>
                        </form>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">Список сотрудников</h2>
                        {loading ? <p>Загрузка...</p> :
                        <ul className="space-y-2">
                            {employees.map(emp => (
                                <li key={emp.id} onClick={() => setSelectedEmployee(emp)} className={`p-3 rounded cursor-pointer transition-colors ${selectedEmployee?.id === emp.id ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                                    <p className="font-bold">{emp.full_name}</p><p className="text-sm text-gray-500">{emp.position}</p>
                                </li>
                            ))}
                        </ul>}
                    </div>
                </div>
                <div className="md:col-span-2">
                    {selectedEmployee ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-2xl font-semibold mb-4">Выплаты для: <span className="text-indigo-600">{selectedEmployee.full_name}</span></h2>
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
                            <table className="w-full text-sm">
                                <thead className="text-left text-gray-500"><tr><th className="py-2">Дата/Время</th><th className="py-2">Тип</th><th className="py-2">Партия</th><th className="py-2">Сумма</th></tr></thead>
                                <tbody>
                                    {salaries.map(sal => (
                                        <tr key={sal.id} className="border-b">
                                            <td className="py-2"><p>{new Date(sal.payment_date).toLocaleDateString()}</p><p className="text-xs text-gray-400">{new Date(sal.created_at).toLocaleTimeString()}</p></td>
                                            <td className="py-2 font-semibold capitalize">{sal.payment_type}</td>
                                            <td className="py-2">{sal.batch ? <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">{sal.batch.batch_name}</span> : '–'}</td>
                                            <td className="py-2 font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(sal.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-md h-full min-h-[200px]"><p className="text-gray-500">Выберите сотрудника</p></div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SalariesPage;