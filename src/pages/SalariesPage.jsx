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

    // Состояния для добавления сотрудника
    const [newName, setNewName] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);

    // Состояния для редактирования сотрудника
    const [isEditingEmployee, setIsEditingEmployee] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPosition, setEditPosition] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Состояния для добавления выплаты
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
        const { data, error } = await supabase
            .from('broiler_batches')
            .select('id, batch_name, start_date')
            .eq('is_active', true)
            .order('start_date', { ascending: false });
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
                const { data, error } = await supabase
                    .from('salaries')
                    .select(`
                        *,
                        batch_name:broiler_batches(batch_name, is_active)
                    `)
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false });

                if (error) {
                    console.error('Ошибка загрузки выплат:', error);
                    setAllSalaries([]);
                } else {
                    // Преобразуем данные в нужный формат
                    const formattedData = (data || []).map(salary => ({
                        ...salary,
                        batch_name: salary.batch_name?.[0]?.batch_name || null,
                        batch_is_active: salary.batch_name?.[0]?.is_active || false
                    }));
                    setAllSalaries(formattedData);
                }
                setLoadingSalaries(false);
            };
            fetchSalaries();
        } else {
            setAllSalaries([]);
        }
    }, [selectedEmployee]);

    // Фильтрация выплат с учетом даты начала работы
    const filteredSalaries = useMemo(() => {
        return allSalaries.filter(salary => {
            // Фильтр по архивным партиям
            if (!showArchived && salary.batch_id && salary.batch_is_active === false) {
                return false;
            }

            // Фильтр по дате начала работы
            if (selectedEmployee?.start_date) {
                const salaryDate = new Date(salary.payment_date);
                const startDate = new Date(selectedEmployee.start_date);
                if (salaryDate < startDate) {
                    return false;
                }
            }

            return true;
        });
    }, [allSalaries, showArchived, selectedEmployee]);

    // Расчет итогов
    const salaryTotals = useMemo(() => {
        const totals = {
            totalAdvance: 0,
            totalSalary: 0,
            totalAll: 0,
            byBatch: {}
        };

        filteredSalaries.forEach(salary => {
            const amount = Number(salary.amount) || 0;
            totals.totalAll += amount;

            if (salary.payment_type === 'аванс') {
                totals.totalAdvance += amount;
            } else if (salary.payment_type === 'зарплата') {
                totals.totalSalary += amount;
            }

            // Группировка по партиям
            if (salary.batch_id && salary.batch_name) {
                if (!totals.byBatch[salary.batch_id]) {
                    totals.byBatch[salary.batch_id] = {
                        name: salary.batch_name,
                        total: 0,
                        isActive: salary.batch_is_active
                    };
                }
                totals.byBatch[salary.batch_id].total += amount;
            }
        });

        return totals;
    }, [filteredSalaries]);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setIsAddingEmployee(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('employees').insert([{
            full_name: newName,
            position: newPosition,
            start_date: newStartDate,
            user_id: user.id
        }]);
        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            setNewName('');
            setNewPosition('');
            setNewStartDate(new Date().toISOString().slice(0, 10));
            await fetchEmployees();
        }
        setIsAddingEmployee(false);
    };

    const handleStartEdit = () => {
        if (selectedEmployee) {
            setEditName(selectedEmployee.full_name);
            setEditPosition(selectedEmployee.position || '');
            setEditStartDate(selectedEmployee.start_date || new Date().toISOString().slice(0, 10));
            setIsEditingEmployee(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingEmployee(false);
        setEditName('');
        setEditPosition('');
        setEditStartDate('');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setIsSavingEdit(true);
        const { error } = await supabase
            .from('employees')
            .update({
                full_name: editName,
                position: editPosition,
                start_date: editStartDate
            })
            .eq('id', selectedEmployee.id);

        if (error) {
            alert('Ошибка при сохранении: ' + error.message);
        } else {
            await fetchEmployees();
            setSelectedEmployee({
                ...selectedEmployee,
                full_name: editName,
                position: editPosition,
                start_date: editStartDate
            });
            setIsEditingEmployee(false);
        }
        setIsSavingEdit(false);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        // Проверка даты выплаты относительно даты начала работы
        if (selectedEmployee.start_date) {
            const payDate = new Date(paymentDate);
            const startDate = new Date(selectedEmployee.start_date);
            if (payDate < startDate) {
                alert(`Дата выплаты не может быть раньше даты начала работы (${new Date(selectedEmployee.start_date).toLocaleDateString()})`);
                return;
            }
        }

        setIsAddingPayment(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('salaries').insert([{
            employee_id: selectedEmployee.id,
            amount: Number(paymentAmount),
            payment_type: paymentType,
            payment_date: paymentDate,
            user_id: user.id,
            batch_id: selectedBatchId || null
        }]);

        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            setPaymentAmount('');
            setSelectedBatchId('');
            // Перезагружаем выплаты
            const { data } = await supabase
                .from('salaries')
                .select(`
                    *,
                    batch_name:broiler_batches(batch_name, is_active)
                `)
                .eq('employee_id', selectedEmployee.id)
                .order('payment_date', { ascending: false });

            const formattedData = (data || []).map(salary => ({
                ...salary,
                batch_name: salary.batch_name?.[0]?.batch_name || null,
                batch_is_active: salary.batch_name?.[0]?.is_active || false
            }));
            setAllSalaries(formattedData);
        }
        setIsAddingPayment(false);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'TJS'
        }).format(amount);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Сотрудники и зарплаты</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-2xl font-semibold mb-4">Добавить сотрудника</h2>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">ФИО</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    required
                                    className="mt-1 w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Должность</label>
                                <input
                                    type="text"
                                    value={newPosition}
                                    onChange={e => setNewPosition(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Дата начала работы</label>
                                <input
                                    type="date"
                                    value={newStartDate}
                                    onChange={e => setNewStartDate(e.target.value)}
                                    required
                                    className="mt-1 w-full p-2 border rounded-md"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAddingEmployee}
                                className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                            >
                                {isAddingEmployee ? 'Добавление...' : 'Добавить'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">Список сотрудников</h2>
                        {loading ? <p>Загрузка...</p> :
                        <ul className="space-y-2">
                            {employees.map(emp => (
                                <li
                                    key={emp.id}
                                    onClick={() => {
                                        setSelectedEmployee(emp);
                                        setIsEditingEmployee(false);
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                        selectedEmployee?.id === emp.id 
                                            ? 'bg-indigo-100 border-2 border-indigo-500' 
                                            : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <p className="font-bold">{emp.full_name}</p>
                                    <p className="text-sm text-gray-500">{emp.position}</p>
                                    {emp.start_date && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            С {new Date(emp.start_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>}
                    </div>
                </div>

                <div className="md:col-span-2">
                    {selectedEmployee ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                                <div>
                                    <h2 className="text-2xl font-semibold">
                                        Выплаты для: <span className="text-indigo-600">{selectedEmployee.full_name}</span>
                                    </h2>
                                    {selectedEmployee.start_date && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            Дата начала работы: {new Date(selectedEmployee.start_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleStartEdit}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                    >
                                        Редактировать
                                    </button>
                                    <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showArchived}
                                            onChange={() => setShowArchived(!showArchived)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2">Показать архивные</span>
                                    </label>
                                </div>
                            </div>

                            {isEditingEmployee ? (
                                <form onSubmit={handleSaveEdit} className="mb-6 pb-6 border-b bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-3 text-lg">Редактирование сотрудника</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-sm font-medium">ФИО</label>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                required
                                                className="w-full p-2 border rounded mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Должность</label>
                                            <input
                                                type="text"
                                                value={editPosition}
                                                onChange={e => setEditPosition(e.target.value)}
                                                className="w-full p-2 border rounded mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Дата начала работы</label>
                                            <input
                                                type="date"
                                                value={editStartDate}
                                                onChange={e => setEditStartDate(e.target.value)}
                                                required
                                                className="w-full p-2 border rounded mt-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingEdit}
                                            className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                                        >
                                            {isSavingEdit ? 'Сохранение...' : 'Сохранить'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-6 pb-6 border-b">
                                    <div>
                                        <label className="text-sm font-medium">Дата</label>
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={e => setPaymentDate(e.target.value)}
                                            required
                                            className="w-full p-2 border rounded mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Сумма</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            required
                                            className="w-full p-2 border rounded mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Тип</label>
                                        <select
                                            value={paymentType}
                                            onChange={e => setPaymentType(e.target.value)}
                                            className="w-full p-2 border rounded bg-white mt-1"
                                        >
                                            <option value="аванс">Аванс</option>
                                            <option value="зарплата">Зарплата</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-sm font-medium">Привязать к партии (необязательно)</label>
                                        <select
                                            value={selectedBatchId}
                                            onChange={e => setSelectedBatchId(e.target.value)}
                                            className="w-full p-2 border rounded bg-white mt-1"
                                        >
                                            <option value="">-- Не привязывать --</option>
                                            {activeBatches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.batch_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isAddingPayment}
                                        className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {isAddingPayment ? 'Добавление...' : 'Добавить выплату'}
                                    </button>
                                </form>
                            )}

                            {/* Итоги */}
                            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                                <h3 className="font-bold text-lg mb-3 text-gray-800">Итоги по выплатам</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-white p-3 rounded-md shadow-sm">
                                        <p className="text-sm text-gray-600">Авансы</p>
                                        <p className="text-xl font-bold text-blue-600">{formatCurrency(salaryTotals.totalAdvance)}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-md shadow-sm">
                                        <p className="text-sm text-gray-600">Зарплаты</p>
                                        <p className="text-xl font-bold text-green-600">{formatCurrency(salaryTotals.totalSalary)}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-md shadow-sm">
                                        <p className="text-sm text-gray-600">Всего выплачено</p>
                                        <p className="text-xl font-bold text-indigo-600">{formatCurrency(salaryTotals.totalAll)}</p>
                                    </div>
                                </div>

                                {Object.keys(salaryTotals.byBatch).length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">По партиям:</p>
                                        <div className="space-y-2">
                                            {Object.entries(salaryTotals.byBatch).map(([batchId, batch]) => (
                                                <div key={batchId} className="flex justify-between items-center bg-white p-2 rounded-md text-sm">
                                                    <span className={`font-medium ${!batch.isActive ? 'text-gray-500' : 'text-gray-800'}`}>
                                                        {batch.name} {!batch.isActive && '(архив)'}
                                                    </span>
                                                    <span className="font-bold text-indigo-600">{formatCurrency(batch.total)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-gray-500 border-b-2">
                                        <tr>
                                            <th className="py-2">Дата/Время</th>
                                            <th className="py-2">Тип</th>
                                            <th className="py-2">Партия</th>
                                            <th className="py-2 text-right">Сумма</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingSalaries ? (
                                            <tr><td colSpan="4" className="text-center py-4">Загрузка выплат...</td></tr>
                                        ) : filteredSalaries.length > 0 ? (
                                            filteredSalaries.map(sal => (
                                                <tr key={sal.id} className="border-b hover:bg-gray-50">
                                                    <td className="py-3">
                                                        <p className="font-medium">{new Date(sal.payment_date).toLocaleDateString()}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(sal.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </p>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                                            sal.payment_type === 'аванс' 
                                                                ? 'bg-blue-100 text-blue-800' 
                                                                : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {sal.payment_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        {sal.batch_name ? (
                                                            <span className={`text-xs rounded-full px-2 py-1 ${
                                                                sal.batch_is_active 
                                                                    ? 'bg-purple-100 text-purple-800' 
                                                                    : 'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {sal.batch_name}
                                                            </span>
                                                        ) : '–'}
                                                    </td>
                                                    <td className="py-3 font-bold text-right">{formatCurrency(sal.amount)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="4" className="text-center py-4 text-gray-500">Выплат не найдено.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-md h-full min-h-[400px]">
                            <p className="text-gray-500 text-lg">Выберите сотрудника для просмотра выплат</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SalariesPage;