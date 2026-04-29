// src/pages/SalariesPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { calculateSalary } from '../utils/calculateSalary';

function SalariesPage() {
    const [employees, setEmployees] = useState([]);
    const [allSalaries, setAllSalaries] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingSalaries, setLoadingSalaries] = useState(false);
    const [activeBatches, setActiveBatches] = useState([]);
    const [showArchivedEmployees, setShowArchivedEmployees] = useState(false);
    const [showArchivedPayments, setShowArchivedPayments] = useState(false);

    // Состояния для добавления сотрудника
    const [newName, setNewName] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [newBatchId, setNewBatchId] = useState('');
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);

    // Состояния для редактирования сотрудника
    const [isEditingEmployee, setIsEditingEmployee] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPosition, setEditPosition] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editBatchId, setEditBatchId] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Состояния для удаления сотрудника
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Состояния для редактирования выплаты
    const [editingPayment, setEditingPayment] = useState(null);
    const [editPaymentDate, setEditPaymentDate] = useState('');
    const [editPaymentAmount, setEditPaymentAmount] = useState('');
    const [editPaymentType, setEditPaymentType] = useState('аванс');
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    // Состояния для удаления выплаты
    const [deletingPaymentId, setDeletingPaymentId] = useState(null);

    // Состояния для добавления выплаты
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('аванс');
    const [isAddingPayment, setIsAddingPayment] = useState(false);

    // Загрузка сотрудников вместе с данными о партии
    const fetchEmployees = async () => {
        const { data, error } = await supabase
            .from('employees')
            .select(`
                *,
                broiler_batches (
                    id,
                    batch_name,
                    is_active,
                    batch_end
                )
            `)
            .order('full_name');
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

                const { data: rpcData, error: rpcError } = await supabase.rpc('get_salaries_by_employee', {
                    employee_uuid: selectedEmployee.id
                });

                if (rpcError) {
                    const { data, error } = await supabase
                        .from('salaries')
                        .select(`
                            *,
                            broiler_batches (
                                batch_name,
                                is_active
                            )
                        `)
                        .eq('employee_id', selectedEmployee.id)
                        .order('payment_date', { ascending: false });

                    if (error) {
                        console.error('Ошибка загрузки выплат:', error);
                        setAllSalaries([]);
                    } else {
                        const formattedData = (data || []).map(salary => ({
                            ...salary,
                            batch_name: salary.broiler_batches?.batch_name || null,
                            batch_is_active: salary.broiler_batches?.is_active ?? true
                        }));
                        setAllSalaries(formattedData);
                    }
                } else {
                    setAllSalaries(rpcData || []);
                }
                setLoadingSalaries(false);
            };
            fetchSalaries();
        } else {
            setAllSalaries([]);
        }
    }, [selectedEmployee]);

    // Фильтрация сотрудников: активные = работают в активной партии
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const batchIsActive = emp.broiler_batches?.is_active;
            const empIsActive = emp.is_active !== false; // поддержка поля is_active если есть

            if (showArchivedEmployees) return true;

            // Показываем сотрудника если и он активен, и его партия активна
            return empIsActive && (batchIsActive === true || batchIsActive === undefined);
        });
    }, [employees, showArchivedEmployees]);

    // Фильтрация выплат
    const filteredSalaries = useMemo(() => {
        return allSalaries.filter(salary => {
            if (!showArchivedPayments && salary.batch_id && salary.batch_is_active === false) {
                return false;
            }
            if (selectedEmployee?.start_date) {
                const salaryDate = new Date(salary.payment_date);
                const startDate = new Date(selectedEmployee.start_date);
                if (salaryDate < startDate) return false;
            }
            return true;
        });
    }, [allSalaries, showArchivedPayments, selectedEmployee]);

    // Расчет итогов
    const salaryTotals = useMemo(() => {
        const totals = { totalAdvance: 0, totalSalary: 0, totalAll: 0, byBatch: {} };
        filteredSalaries.forEach(salary => {
            const amount = Number(salary.amount) || 0;
            totals.totalAll += amount;
            if (salary.payment_type === 'аванс') totals.totalAdvance += amount;
            else if (salary.payment_type === 'зарплата') totals.totalSalary += amount;
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
        if (!newBatchId) {
            alert('Выберите партию для привязки сотрудника');
            return;
        }
        setIsAddingEmployee(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('employees').insert([{
            full_name: newName,
            position: newPosition,
            start_date: newStartDate,
            batch_id: newBatchId,
            is_active: true,
            user_id: user.id
        }]);
        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            setNewName('');
            setNewPosition('');
            setNewStartDate(new Date().toISOString().slice(0, 10));
            setNewBatchId('');
            await fetchEmployees();
        }
        setIsAddingEmployee(false);
    };

    // Состояния для полей расчёта зарплаты
    const [editRate, setEditRate] = useState('');
    const [editAbsentDays, setEditAbsentDays] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editSalaryTiers, setEditSalaryTiers] = useState([]);

    const handleStartEdit = () => {
        if (selectedEmployee) {
            setEditName(selectedEmployee.full_name);
            setEditPosition(selectedEmployee.position || '');
            setEditStartDate(selectedEmployee.start_date || new Date().toISOString().slice(0, 10));
            setEditBatchId(selectedEmployee.batch_id || '');
            setEditRate(selectedEmployee.rate ?? '');
            setEditAbsentDays(selectedEmployee.absent_days ?? 0);
            setEditEndDate(selectedEmployee.end_date || '');
            const tiers = Array.isArray(selectedEmployee.salary_tiers) && selectedEmployee.salary_tiers.length > 0
                ? selectedEmployee.salary_tiers
                : (Number(selectedEmployee.first_days_n) > 0 ? [{ days: selectedEmployee.first_days_n, rate: selectedEmployee.fixed_sum || 0 }] : []);
            setEditSalaryTiers(tiers.map(t => ({ days: String(t.days || ''), rate: String(t.rate || '') })));
            setIsEditingEmployee(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingEmployee(false);
        setEditName(''); setEditPosition(''); setEditStartDate(''); setEditBatchId('');
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
                start_date: editStartDate,
                end_date: editEndDate || null,
                batch_id: editBatchId || null,
                rate: Number(editRate) || 0,
                absent_days: Number(editAbsentDays) || 0,
                salary_tiers: editSalaryTiers.filter(t => Number(t.days) > 0).map(t => ({ days: Number(t.days), rate: Number(t.rate) || 0 }))
            })
            .eq('id', selectedEmployee.id);

        if (error) {
            alert('Ошибка при сохранении: ' + error.message);
        } else {
            await fetchEmployees();
            setSelectedEmployee(prev => ({
                ...prev,
                full_name: editName,
                position: editPosition,
                start_date: editStartDate,
                end_date: editEndDate || null,
                batch_id: editBatchId || null,
                rate: Number(editRate) || 0,
                absent_days: Number(editAbsentDays) || 0,
                salary_tiers: editSalaryTiers.filter(t => Number(t.days) > 0).map(t => ({ days: Number(t.days), rate: Number(t.rate) || 0 }))
            }));
            setIsEditingEmployee(false);
        }
        setIsSavingEdit(false);
    };

    const handleDeleteEmployee = async () => {
        if (!selectedEmployee) return;
        setIsDeleting(true);

        const { error: salariesError } = await supabase
            .from('salaries')
            .delete()
            .eq('employee_id', selectedEmployee.id);

        if (salariesError) {
            alert('Ошибка при удалении выплат: ' + salariesError.message);
            setIsDeleting(false);
            return;
        }

        const { error: employeeError } = await supabase
            .from('employees')
            .delete()
            .eq('id', selectedEmployee.id);

        if (employeeError) {
            alert('Ошибка при удалении сотрудника: ' + employeeError.message);
        } else {
            await fetchEmployees();
            setSelectedEmployee(null);
            setShowDeleteConfirm(false);
            setIsEditingEmployee(false);
        }
        setIsDeleting(false);
    };

    const handleStartEditPayment = (payment) => {
        setEditingPayment(payment.id);
        setEditPaymentDate(payment.payment_date);
        setEditPaymentAmount(payment.amount);
        setEditPaymentType(payment.payment_type);
    };

    const handleCancelEditPayment = () => {
        setEditingPayment(null);
        setEditPaymentDate(''); setEditPaymentAmount(''); setEditPaymentType('аванс');
    };

    const handleSavePayment = async (paymentId) => {
        setIsSavingPayment(true);
        const { error } = await supabase
            .from('salaries')
            .update({
                payment_date: editPaymentDate,
                amount: Number(editPaymentAmount),
                payment_type: editPaymentType,
                // batch_id остаётся неизменным при редактировании
            })
            .eq('id', paymentId);

        if (error) {
            alert('Ошибка при сохранении: ' + error.message);
        } else {
            await reloadSalaries();
            setEditingPayment(null);
        }
        setIsSavingPayment(false);
    };

    const handleDeletePayment = async (paymentId) => {
        if (!confirm('Вы уверены, что хотите удалить эту выплату?')) return;
        setDeletingPaymentId(paymentId);
        const { error } = await supabase.from('salaries').delete().eq('id', paymentId);
        if (error) alert('Ошибка при удалении: ' + error.message);
        else await reloadSalaries();
        setDeletingPaymentId(null);
    };

    const reloadSalaries = async () => {
        if (!selectedEmployee) return;
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_salaries_by_employee', {
            employee_uuid: selectedEmployee.id
        });
        if (rpcError) {
            const { data } = await supabase
                .from('salaries')
                .select(`*, broiler_batches(batch_name, is_active)`)
                .eq('employee_id', selectedEmployee.id)
                .order('payment_date', { ascending: false });
            const formattedData = (data || []).map(salary => ({
                ...salary,
                batch_name: salary.broiler_batches?.batch_name || null,
                batch_is_active: salary.broiler_batches?.is_active ?? true
            }));
            setAllSalaries(formattedData);
        } else {
            setAllSalaries(rpcData || []);
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        // Проверка даты
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

        // Автоматически привязываем выплату к партии сотрудника
        const batchId = selectedEmployee.batch_id || null;

        const { error } = await supabase.from('salaries').insert([{
            employee_id: selectedEmployee.id,
            amount: Number(paymentAmount),
            payment_type: paymentType,
            payment_date: paymentDate,
            user_id: user.id,
            batch_id: batchId  // <-- автоматически из партии сотрудника
        }]);

        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            setPaymentAmount('');
            await reloadSalaries();
        }
        setIsAddingPayment(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: 'TJS'
    }).format(amount);

    // Получить партию сотрудника для отображения
    const employeeBatch = selectedEmployee?.broiler_batches;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Сотрудники и зарплаты</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* ===== ЛЕВАЯ КОЛОНКА ===== */}
                <div className="md:col-span-1">
                    {/* Форма добавления сотрудника */}
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-2xl font-semibold mb-4">Принять на работу</h2>
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
                            <div>
                                <label className="block text-sm font-medium text-indigo-700 font-semibold">
                                    Партия *
                                </label>
                                <select
                                    value={newBatchId}
                                    onChange={e => setNewBatchId(e.target.value)}
                                    required
                                    className="mt-1 w-full p-2 border-2 border-indigo-300 rounded-md bg-white focus:border-indigo-500"
                                >
                                    <option value="">— Выберите партию —</option>
                                    {activeBatches.map(b => (
                                        <option key={b.id} value={b.id}>{b.batch_name}</option>
                                    ))}
                                </select>
                                {activeBatches.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">Нет активных партий. Сначала создайте партию.</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isAddingEmployee || !newBatchId}
                                className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                            >
                                {isAddingEmployee ? 'Добавление...' : 'Принять на работу'}
                            </button>
                        </form>
                    </div>

                    {/* Список сотрудников */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold">Сотрудники</h2>
                            <label className="flex items-center text-xs text-gray-500 cursor-pointer gap-1">
                                <input
                                    type="checkbox"
                                    checked={showArchivedEmployees}
                                    onChange={() => setShowArchivedEmployees(!showArchivedEmployees)}
                                    className="rounded border-gray-300"
                                />
                                <span>Уволенные</span>
                            </label>
                        </div>
                        {loading ? <p>Загрузка...</p> : (
                            <ul className="space-y-2">
                                {filteredEmployees.map(emp => {
                                    const batch = emp.broiler_batches;
                                    const isArchived = emp.is_active === false || batch?.is_active === false;
                                    return (
                                        <li
                                            key={emp.id}
                                            onClick={() => {
                                                setSelectedEmployee(emp);
                                                setIsEditingEmployee(false);
                                            }}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                                selectedEmployee?.id === emp.id
                                                    ? 'bg-indigo-100 border-indigo-500 border-2'
                                                    : isArchived
                                                        ? 'bg-gray-50 border-gray-200 opacity-70 hover:bg-gray-100'
                                                        : 'border-transparent hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold">{emp.full_name}</p>
                                                {isArchived && (
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">уволен</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{emp.position}</p>
                                            {batch && (
                                                <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                                                    batch.is_active
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                    {batch.batch_name} {!batch.is_active && '(архив)'}
                                                </p>
                                            )}
                                            {emp.end_date && (
    <p className="text-xs text-red-400">
        По {new Date(emp.end_date).toLocaleDateString()}
    </p>
)}
                                        </li>
                                    );
                                })}
                                {filteredEmployees.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">Нет сотрудников</p>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ===== ПРАВАЯ КОЛОНКА ===== */}
                <div className="md:col-span-2">
                    {selectedEmployee ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            {/* Заголовок */}
                            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                                <div>
                                    <h2 className="text-2xl font-semibold">
                                        <span className="text-indigo-600">{selectedEmployee.full_name}</span>
                                    </h2>
                                    {selectedEmployee.position && (
                                        <p className="text-sm text-gray-500">{selectedEmployee.position}</p>
                                    )}
                                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                        {selectedEmployee.start_date && (
                                            <p>📅 Принят: <span className="font-medium">
            {new Date(selectedEmployee.start_date).toLocaleDateString()}
        </span></p>
                                        )}
                                        {selectedEmployee.end_date && (
                                            <p>🔴 Уволен: <span className="font-medium text-red-600">
            {new Date(selectedEmployee.end_date).toLocaleDateString()}
        </span></p>
                                        )}
                                    </div>
                                    {/* Информация о партии сотрудника */}
                                    {employeeBatch && (
                                        <div
                                            className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                                employeeBatch.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                            <span>{employeeBatch.is_active ? '🟢' : '🔴'}</span>
                                            <span>Партия: {employeeBatch.batch_name}</span>
                                            {!employeeBatch.is_active &&
                                                <span className="text-xs">(архив — сотрудник уволен)</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleStartEdit}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                    >
                                        Редактировать
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                                    >
                                        Удалить
                                    </button>
                                    <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showArchivedPayments}
                                            onChange={() => setShowArchivedPayments(!showArchivedPayments)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                        />
                                        <span className="ml-2">Архивные выплаты</span>
                                    </label>
                                </div>
                            </div>

                            {/* Предупреждение если партия архивирована */}
                            {employeeBatch && !employeeBatch.is_active && (
                                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                    <p className="text-sm text-orange-800">
                                        ⚠️ Партия <strong>{employeeBatch.batch_name}</strong> завершена.
                                        Сотрудник считается уволенным. Добавление новых выплат невозможно.
                                    </p>
                                </div>
                            )}

                            {/* Модальное окно подтверждения удаления */}
                            {showDeleteConfirm && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">Удалить сотрудника?</h3>
                                                <p className="text-sm text-gray-600 mt-1">Это действие необратимо</p>
                                            </div>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                                            <p className="text-sm text-gray-700"><strong>Будут удалены:</strong></p>
                                            <ul className="text-sm text-gray-700 mt-2 ml-4 list-disc">
                                                <li>Сотрудник: <strong>{selectedEmployee.full_name}</strong></li>
                                                <li>Все выплаты ({filteredSalaries.length} записей)</li>
                                                <li>Сумма: <strong>{formatCurrency(salaryTotals.totalAll)}</strong></li>
                                            </ul>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                disabled={isDeleting}
                                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                                            >
                                                Отмена
                                            </button>
                                            <button
                                                onClick={handleDeleteEmployee}
                                                disabled={isDeleting}
                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                                            >
                                                {isDeleting ? 'Удаление...' : 'Удалить'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Форма редактирования сотрудника */}
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
                                        <div>
                                            <label className="text-sm font-medium text-red-600">Дата увольнения</label>
                                            <input
                                                type="date"
                                                value={editEndDate}
                                                onChange={e => setEditEndDate(e.target.value)}
                                                className="w-full p-2 border border-red-200 rounded mt-1"
                                            />
                                            {editEndDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditEndDate('')}
                                                    className="text-xs text-red-500 hover:underline mt-1"
                                                >Очистить дату увольнения</button>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-indigo-700">Партия</label>
                                            <select
                                                value={editBatchId}
                                                onChange={e => setEditBatchId(e.target.value)}
                                                className="w-full p-2 border-2 border-indigo-200 rounded bg-white mt-1"
                                            >
                                                <option value="">— Без партии —</option>
                                                {activeBatches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.batch_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-sm text-gray-600 mt-2 mb-1">Параметры расчёта зарплаты</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="text-sm font-medium">Основная ставка/день</label>
                                            <input type="number" step="0.01" min="0" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-full p-2 border rounded mt-1" placeholder="0" />
                                            <p className="text-xs text-gray-400 mt-0.5">Ставка после всех ступеней</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Дней отсутствия</label>
                                            <input type="number" min="0" value={editAbsentDays} onChange={e => setEditAbsentDays(e.target.value)} className="w-full p-2 border rounded mt-1" placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium text-gray-600">Ступени ставок</label>
                                            <button type="button" onClick={() => setEditSalaryTiers([...editSalaryTiers, { days: '', rate: '' }])} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">+ Добавить ступень</button>
                                        </div>
                                        {editSalaryTiers.length === 0 && <p className="text-xs text-gray-400">Нет ступеней — будет только основная ставка</p>}
                                        {editSalaryTiers.map((tier, i) => (
                                            <div key={i} className="flex gap-2 items-center mb-1">
                                                <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                                                <input type="number" min="1" value={tier.days} onChange={e => { const t = [...editSalaryTiers]; t[i] = { ...t[i], days: e.target.value }; setEditSalaryTiers(t); }} className="w-24 p-1.5 border rounded text-sm" placeholder="Дней" />
                                                <span className="text-xs text-gray-400">дн. по</span>
                                                <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => { const t = [...editSalaryTiers]; t[i] = { ...t[i], rate: e.target.value }; setEditSalaryTiers(t); }} className="w-24 p-1.5 border rounded text-sm" placeholder="Ставка" />
                                                <button type="button" onClick={() => setEditSalaryTiers(editSalaryTiers.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                                            </div>
                                        ))}
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
                                /* Форма добавления выплаты — только если партия активна */
                                employeeBatch?.is_active !== false && (
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
                                        {/* Показываем к какой партии привяжется выплата */}
                                        {employeeBatch && (
                                            <div className="sm:col-span-3">
                                                <p className="text-xs text-gray-500">
                                                    💡 Выплата автоматически привяжется к партии:{' '}
                                                    <span className="font-semibold text-purple-700">{employeeBatch.batch_name}</span>
                                                </p>
                                            </div>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isAddingPayment}
                                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400 sm:col-span-3"
                                        >
                                            {isAddingPayment ? 'Добавление...' : 'Добавить выплату'}
                                        </button>
                                    </form>
                                )
                            )}

                            {/* Расчётный лист */}
                            {selectedEmployee?.rate > 0 || (Array.isArray(selectedEmployee?.salary_tiers) && selectedEmployee.salary_tiers.length > 0) || selectedEmployee?.fixed_sum > 0 ? (() => {
                                const calc = calculateSalary(selectedEmployee, selectedEmployee.broiler_batches || {});
                                const paid = salaryTotals.totalAll;
                                const remaining = calc.salary - paid;
                                const emp = selectedEmployee;
                                const absentDays = Number(emp.absent_days) || 0;

                                return (
                                    <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                                        <h3 className="font-bold text-lg mb-3 text-gray-800">📋 Расчётный лист</h3>

                                        {/* Параметры */}
                                        <div className="bg-white rounded-md p-3 mb-3 text-sm">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-600">
                                                <div>📅 Начало: <span className="font-semibold text-gray-800">{new Date(emp.start_date).toLocaleDateString()}</span></div>
                                                <div>📅 Конец: <span className="font-semibold text-gray-800">
                                                    {emp.end_date ? new Date(emp.end_date).toLocaleDateString() : (emp.broiler_batches?.batch_end ? new Date(emp.broiler_batches.batch_end).toLocaleDateString() : 'сегодня')}
                                                </span></div>
                                                <div>🚫 Пропуски: <span className="font-semibold text-gray-800">{absentDays} дн.</span></div>
                                                <div>📆 Рабочих дней: <span className="font-semibold text-gray-800">{calc.effectiveDays} из {calc.totalDays}</span></div>
                                            </div>
                                        </div>

                                        {/* Детализация расчёта */}
                                        <table className="w-full text-sm mb-3">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b">
                                                    <th className="py-1">Описание</th>
                                                    <th className="py-1 text-center">Дней</th>
                                                    <th className="py-1 text-center">Ставка</th>
                                                    <th className="py-1 text-right">Сумма</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {calc.breakdown.map((row, i) => (
                                                    <tr key={i} className="border-b border-gray-100">
                                                        <td className="py-2">{row.label}</td>
                                                        <td className="py-2 text-center">{row.days}</td>
                                                        <td className="py-2 text-center">{row.rate}</td>
                                                        <td className="py-2 text-right font-medium">{formatCurrency(row.sum)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Итоги */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="bg-white p-3 rounded-md shadow-sm text-center">
                                                <p className="text-xs text-gray-500">Начислено</p>
                                                <p className="text-xl font-bold text-emerald-600">{formatCurrency(calc.salary)}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md shadow-sm text-center">
                                                <p className="text-xs text-gray-500">Выплачено</p>
                                                <p className="text-xl font-bold text-blue-600">{formatCurrency(paid)}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md shadow-sm text-center">
                                                <p className="text-xs text-gray-500">Остаток к выплате</p>
                                                <p className={`text-xl font-bold ${remaining >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                    {formatCurrency(remaining)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })() : null}

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
                                        <p className="text-sm text-gray-600">Всего</p>
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

                            {/* Таблица выплат */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-gray-500 border-b-2">
                                        <tr>
                                            <th className="py-2">Дата</th>
                                            <th className="py-2">Тип</th>
                                            <th className="py-2">Партия</th>
                                            <th className="py-2 text-right">Сумма</th>
                                            <th className="py-2 text-center">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingSalaries ? (
                                            <tr><td colSpan="5" className="text-center py-4">Загрузка...</td></tr>
                                        ) : filteredSalaries.length > 0 ? (
                                            filteredSalaries.map(sal => (
                                                editingPayment === sal.id ? (
                                                    <tr key={sal.id} className="border-b bg-blue-50">
                                                        <td className="py-3">
                                                            <input
                                                                type="date"
                                                                value={editPaymentDate}
                                                                onChange={e => setEditPaymentDate(e.target.value)}
                                                                className="w-full p-1 border rounded text-sm"
                                                            />
                                                        </td>
                                                        <td className="py-3">
                                                            <select
                                                                value={editPaymentType}
                                                                onChange={e => setEditPaymentType(e.target.value)}
                                                                className="w-full p-1 border rounded text-sm bg-white"
                                                            >
                                                                <option value="аванс">Аванс</option>
                                                                <option value="зарплата">Зарплата</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-3 text-xs text-gray-500">
                                                            {sal.batch_name || '–'}<br/>
                                                            <span className="text-gray-400">(не меняется)</span>
                                                        </td>
                                                        <td className="py-3">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={editPaymentAmount}
                                                                onChange={e => setEditPaymentAmount(e.target.value)}
                                                                className="w-full p-1 border rounded text-sm text-right"
                                                            />
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="flex gap-1 justify-center">
                                                                <button
                                                                    onClick={() => handleSavePayment(sal.id)}
                                                                    disabled={isSavingPayment}
                                                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:bg-gray-400"
                                                                    title="Сохранить"
                                                                >✓</button>
                                                                <button
                                                                    onClick={handleCancelEditPayment}
                                                                    disabled={isSavingPayment}
                                                                    className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                                                    title="Отмена"
                                                                >✕</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr key={sal.id} className={`border-b hover:bg-gray-50 ${sal.batch_is_active === false ? 'opacity-60' : ''}`}>
                                                        <td className="py-3">
                                                            <p className="font-medium">{new Date(sal.payment_date).toLocaleDateString()}</p>
                                                            {sal.created_at && (
                                                                <p className="text-xs text-gray-400">
                                                                    {new Date(sal.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                                </p>
                                                            )}
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
                                                                        : 'bg-gray-200 text-gray-500'
                                                                }`}>
                                                                    {sal.batch_name}
                                                                    {sal.batch_is_active === false && ' (архив)'}
                                                                </span>
                                                            ) : '–'}
                                                        </td>
                                                        <td className="py-3 font-bold text-right">{formatCurrency(sal.amount)}</td>
                                                        <td className="py-3">
                                                            <div className="flex gap-1 justify-center">
                                                                <button
                                                                    onClick={() => handleStartEditPayment(sal)}
                                                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                                    title="Редактировать"
                                                                >✎</button>
                                                                <button
                                                                    onClick={() => handleDeletePayment(sal.id)}
                                                                    disabled={deletingPaymentId === sal.id}
                                                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:bg-gray-400"
                                                                    title="Удалить"
                                                                >{deletingPaymentId === sal.id ? '...' : '🗑'}</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            ))
                                        ) : (
                                            <tr><td colSpan="5" className="text-center py-4 text-gray-500">Выплат не найдено.</td></tr>
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