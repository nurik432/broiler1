// src/pages/SalariesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function SalariesPage() {
    // --- Состояния ---
    const [employees, setEmployees] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    // Состояния для формы добавления сотрудника
    const [newName, setNewName] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);

    // Состояния для формы добавления выплаты
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('аванс');
    const [isAddingPayment, setIsAddingPayment] = useState(false);

    // --- Функции ---

    // 1. Загрузка списка сотрудников
    const fetchEmployees = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('employees').select('*').order('full_name');
        if (error) console.error('Ошибка загрузки сотрудников:', error);
        else setEmployees(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // 2. Загрузка выплат для выбранного сотрудника
    useEffect(() => {
        if (selectedEmployee) {
            const fetchSalaries = async () => {
                const { data, error } = await supabase
                    .from('salaries')
                    .select('*')
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false });

                if (error) console.error('Ошибка загрузки выплат:', error);
                else setSalaries(data);
            };
            fetchSalaries();
        } else {
            setSalaries([]); // Очищаем список, если сотрудник не выбран
        }
    }, [selectedEmployee]);

    // 3. Добавление нового сотрудника
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setIsAddingEmployee(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('employees').insert([{
            full_name: newName,
            position: newPosition,
            user_id: user.id
        }]);
        if (error) alert(error.message);
        else {
            setNewName(''); setNewPosition('');
            await fetchEmployees();
        }
        setIsAddingEmployee(false);
    };

    // 4. Добавление новой выплаты
    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        setIsAddingPayment(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('salaries').insert([{
            employee_id: selectedEmployee.id,
            amount: Number(paymentAmount),
            payment_type: paymentType,
            payment_date: paymentDate,
            user_id: user.id // Дублируем для RLS
        }]);
        if (error) alert(error.message);
        else {
            setPaymentAmount('');
            // Обновляем список выплат для текущего сотрудника
            const { data } = await supabase.from('salaries').select('*').eq('employee_id', selectedEmployee.id).order('payment_date', { ascending: false });
            setSalaries(data);
        }
        setIsAddingPayment(false);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Сотрудники и зарплаты</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* --- ЛЕВАЯ КОЛОНКА: СОТРУДНИКИ --- */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-2xl font-semibold mb-4">Добавить сотрудника</h2>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div><label>ФИО</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="w-full p-2 border rounded"/></div>
                            <div><label>Должность</label><input type="text" value={newPosition} onChange={e => setNewPosition(e.target.value)} className="w-full p-2 border rounded"/></div>
                            <button type="submit" disabled={isAddingEmployee} className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:bg-gray-400">{isAddingEmployee ? '...' : 'Добавить'}</button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">Список сотрудников</h2>
                        <ul className="space-y-2">
                            {loading ? <p>Загрузка...</p> : employees.map(emp => (
                                <li key={emp.id} onClick={() => setSelectedEmployee(emp)}
                                    className={`p-3 rounded cursor-pointer transition-colors ${selectedEmployee?.id === emp.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100'}`}>
                                    <p className="font-bold">{emp.full_name}</p>
                                    <p className="text-sm text-gray-500">{emp.position}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* --- ПРАВАЯ КОЛОНКА: ВЫПЛАТЫ --- */}
                <div className="md:col-span-2">
                    {selectedEmployee ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-2xl font-semibold mb-4">Выплаты для: <span className="text-indigo-600">{selectedEmployee.full_name}</span></h2>

                            {/* Форма добавления выплаты */}
                            <form onSubmit={handleAddPayment} className="grid grid-cols-4 gap-4 items-end mb-6 pb-6 border-b">
                                <div><label>Дата</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label>Сумма</label><input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full p-2 border rounded"/></div>
                                <div><label>Тип</label><select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full p-2 border rounded bg-white"><option value="аванс">Аванс</option><option value="зарплата">Зарплата</option></select></div>
                                <button type="submit" disabled={isAddingPayment} className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400">{isAddingPayment ? '...' : 'Добавить'}</button>
                            </form>

                            {/* Таблица выплат */}
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-gray-500"><th>Дата</th><th>Тип</th><th>Сумма</th></tr></thead>
                                <tbody>
                                    {salaries.map(sal => (
                                        <tr key={sal.id} className="border-b">
                                            <td className="py-2">{new Date(sal.payment_date).toLocaleDateString()}</td>
                                            <td className={`py-2 font-semibold ${sal.payment_type === 'зарплата' ? 'text-green-600' : 'text-blue-600'}`}>{sal.payment_type}</td>
                                            <td className="py-2">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(sal.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-md h-full">
                            <p className="text-gray-500">Выберите сотрудника, чтобы просмотреть его выплаты</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SalariesPage;