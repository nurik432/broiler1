// src/pages/employees/HireFireTab.jsx

import { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

export default function HireFireTab({ employees, activeBatches, fetchEmployees }) {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showArchived, setShowArchived] = useState(false);

    // Состояния для редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPosition, setEditPosition] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editBatchId, setEditBatchId] = useState('');
    const [editRate, setEditRate] = useState('');
    const [editAbsentDays, setEditAbsentDays] = useState('');
    const [editSalaryTiers, setEditSalaryTiers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Удаление
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const batchIsActive = emp.broiler_batches?.is_active;
            const empIsActive = emp.is_active !== false;
            if (showArchived) return true;
            return empIsActive && (batchIsActive === true || batchIsActive === undefined);
        });
    }, [employees, showArchived]);

    const handleStartEdit = () => {
        if (selectedEmployee) {
            setEditName(selectedEmployee.full_name);
            setEditPosition(selectedEmployee.position || '');
            setEditStartDate(selectedEmployee.start_date || new Date().toISOString().slice(0, 10));
            setEditEndDate(selectedEmployee.end_date || '');
            setEditBatchId(selectedEmployee.batch_id || '');
            setEditRate(selectedEmployee.rate ?? '');
            setEditAbsentDays(selectedEmployee.absent_days ?? 0);
            const tiers = Array.isArray(selectedEmployee.salary_tiers) && selectedEmployee.salary_tiers.length > 0
                ? selectedEmployee.salary_tiers
                : (Number(selectedEmployee.first_days_n) > 0 ? [{ days: selectedEmployee.first_days_n, rate: selectedEmployee.fixed_sum || 0 }] : []);
            setEditSalaryTiers(tiers.map(t => ({ days: String(t.days || ''), rate: String(t.rate || '') })));
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        setIsSaving(true);
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
            setIsEditing(false);
        }
        setIsSaving(false);
    };

    const handleFireEmployee = async () => {
        if (!selectedEmployee) return;
        const today = new Date().toISOString().slice(0, 10);
        setIsSaving(true);
        const { error } = await supabase
            .from('employees')
            .update({ end_date: today, is_active: false })
            .eq('id', selectedEmployee.id);

        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            await fetchEmployees();
            setSelectedEmployee(prev => ({ ...prev, end_date: today, is_active: false }));
        }
        setIsSaving(false);
    };

    const handleRehireEmployee = async () => {
        if (!selectedEmployee) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('employees')
            .update({ end_date: null, is_active: true })
            .eq('id', selectedEmployee.id);

        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            await fetchEmployees();
            setSelectedEmployee(prev => ({ ...prev, end_date: null, is_active: true }));
        }
        setIsSaving(false);
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
            setIsEditing(false);
        }
        setIsDeleting(false);
    };

    const isEmployeeFired = selectedEmployee?.is_active === false || selectedEmployee?.end_date;
    const employeeBatch = selectedEmployee?.broiler_batches;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* === ЛЕВАЯ КОЛОНКА: Список сотрудников === */}
            <div className="md:col-span-1">
                <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Сотрудники</h2>
                        <label className="flex items-center text-xs text-gray-500 cursor-pointer gap-1.5 select-none">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={() => setShowArchived(!showArchived)}
                                className="rounded border-gray-300 text-indigo-600"
                            />
                            <span>Уволенные</span>
                        </label>
                    </div>
                    <ul className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                        {filteredEmployees.map(emp => {
                            const batch = emp.broiler_batches;
                            const isArchived = emp.is_active === false || batch?.is_active === false;
                            return (
                                <li
                                    key={emp.id}
                                    onClick={() => {
                                        setSelectedEmployee(emp);
                                        setIsEditing(false);
                                        setShowDeleteConfirm(false);
                                    }}
                                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                        selectedEmployee?.id === emp.id
                                            ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                                            : isArchived
                                                ? 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80 hover:bg-gray-100'
                                                : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-sm">{emp.full_name}</p>
                                        {isArchived && (
                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">уволен</span>
                                        )}
                                    </div>
                                    {emp.position && <p className="text-xs text-gray-500 mt-0.5">{emp.position}</p>}
                                    {batch && (
                                        <p className={`text-xs mt-1.5 px-2 py-0.5 rounded-full inline-block ${
                                            batch.is_active
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-gray-200 text-gray-500'
                                        }`}>
                                            {batch.batch_name} {!batch.is_active && '(архив)'}
                                        </p>
                                    )}
                                    {emp.end_date && (
                                        <p className="text-xs text-red-400 mt-1">
                                            По {new Date(emp.end_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                        {filteredEmployees.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-8">Нет сотрудников</p>
                        )}
                    </ul>
                </div>
            </div>

            {/* === ПРАВАЯ КОЛОНКА: Детали и управление === */}
            <div className="md:col-span-2">
                {selectedEmployee ? (
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        {/* Заголовок */}
                        <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    <span className="text-indigo-600">{selectedEmployee.full_name}</span>
                                </h2>
                                {selectedEmployee.position && (
                                    <p className="text-sm text-gray-500 mt-0.5">{selectedEmployee.position}</p>
                                )}
                                <div className="flex gap-4 text-sm text-gray-500 mt-2">
                                    {selectedEmployee.start_date && (
                                        <p>📅 Принят: <span className="font-medium text-gray-700">
                                            {new Date(selectedEmployee.start_date).toLocaleDateString()}
                                        </span></p>
                                    )}
                                    {selectedEmployee.end_date && (
                                        <p>🔴 Уволен: <span className="font-medium text-red-600">
                                            {new Date(selectedEmployee.end_date).toLocaleDateString()}
                                        </span></p>
                                    )}
                                </div>
                                {employeeBatch && (
                                    <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                                        employeeBatch.is_active
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                        <span>{employeeBatch.is_active ? '🟢' : '🔴'}</span>
                                        <span>Партия: {employeeBatch.batch_name}</span>
                                        {!employeeBatch.is_active &&
                                            <span className="text-xs opacity-75">(завершена)</span>}
                                    </div>
                                )}
                            </div>

                            {/* Кнопки действий */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleStartEdit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                                >
                                    ✏️ Редактировать
                                </button>
                                {isEmployeeFired ? (
                                    <button
                                        onClick={handleRehireEmployee}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition-colors shadow-sm disabled:bg-gray-300"
                                    >
                                        🔄 Восстановить
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (confirm('Вы уверены, что хотите уволить сотрудника ' + selectedEmployee.full_name + '?')) {
                                                handleFireEmployee();
                                            }
                                        }}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 text-sm font-medium transition-colors shadow-sm disabled:bg-gray-300"
                                    >
                                        📤 Уволить
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition-colors shadow-sm"
                                >
                                    🗑 Удалить
                                </button>
                            </div>
                        </div>

                        {/* Предупреждение если уволен */}
                        {isEmployeeFired && (
                            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                                <p className="text-sm text-orange-800">
                                    ⚠️ Сотрудник <strong>{selectedEmployee.full_name}</strong> уволен
                                    {selectedEmployee.end_date && ` с ${new Date(selectedEmployee.end_date).toLocaleDateString()}`}.
                                    Используйте кнопку «Восстановить» для повторного приёма на работу.
                                </p>
                            </div>
                        )}

                        {/* Модальное окно подтверждения удаления */}
                        {showDeleteConfirm && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
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
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                                        <p className="text-sm text-gray-700"><strong>Будут удалены:</strong></p>
                                        <ul className="text-sm text-gray-700 mt-2 ml-4 list-disc">
                                            <li>Сотрудник: <strong>{selectedEmployee.full_name}</strong></li>
                                            <li>Все выплаты сотрудника</li>
                                        </ul>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={isDeleting}
                                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            onClick={handleDeleteEmployee}
                                            disabled={isDeleting}
                                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:bg-gray-400 transition-colors"
                                        >
                                            {isDeleting ? 'Удаление...' : 'Удалить навсегда'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Форма редактирования */}
                        {isEditing && (
                            <form onSubmit={handleSaveEdit} className="mb-6 pb-6 border-b bg-blue-50 p-5 rounded-xl">
                                <h3 className="font-bold mb-4 text-lg text-gray-800">✏️ Редактирование сотрудника</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">ФИО</label>
                                        <input
                                            type="text" value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            required
                                            className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Должность</label>
                                        <input
                                            type="text" value={editPosition}
                                            onChange={e => setEditPosition(e.target.value)}
                                            className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Дата начала работы</label>
                                        <input
                                            type="date" value={editStartDate}
                                            onChange={e => setEditStartDate(e.target.value)}
                                            required
                                            className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-red-600">Дата увольнения</label>
                                        <input
                                            type="date" value={editEndDate}
                                            onChange={e => setEditEndDate(e.target.value)}
                                            className="w-full p-2.5 border border-red-200 rounded-xl mt-1 focus:ring-2 focus:ring-red-400 focus:border-red-400"
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
                                        <label className="text-sm font-semibold text-indigo-700">Партия</label>
                                        <select
                                            value={editBatchId}
                                            onChange={e => setEditBatchId(e.target.value)}
                                            className="w-full p-2.5 border-2 border-indigo-200 rounded-xl bg-white mt-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">— Без партии —</option>
                                            {activeBatches.map(b => (
                                                <option key={b.id} value={b.id}>{b.batch_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <h4 className="font-semibold text-sm text-gray-600 mt-4 mb-2">📊 Параметры расчёта зарплаты</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Основная ставка/день</label>
                                        <input type="number" step="0.01" min="0" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1" placeholder="0" />
                                        <p className="text-xs text-gray-400 mt-0.5">Ставка после всех ступеней</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Дней отсутствия</label>
                                        <input type="number" min="0" value={editAbsentDays} onChange={e => setEditAbsentDays(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1" placeholder="0" />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-600">Ступени ставок</label>
                                        <button type="button" onClick={() => setEditSalaryTiers([...editSalaryTiers, { days: '', rate: '' }])} className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium transition-colors">
                                            + Добавить ступень
                                        </button>
                                    </div>
                                    {editSalaryTiers.length === 0 && <p className="text-xs text-gray-400">Нет ступеней — будет только основная ставка</p>}
                                    {editSalaryTiers.map((tier, i) => (
                                        <div key={i} className="flex gap-2 items-center mb-2">
                                            <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                                            <input type="number" min="1" value={tier.days} onChange={e => { const t = [...editSalaryTiers]; t[i] = { ...t[i], days: e.target.value }; setEditSalaryTiers(t); }} className="w-24 p-2 border border-gray-200 rounded-lg text-sm" placeholder="Дней" />
                                            <span className="text-xs text-gray-400">дн. по</span>
                                            <input type="number" step="0.01" min="0" value={tier.rate} onChange={e => { const t = [...editSalaryTiers]; t[i] = { ...t[i], rate: e.target.value }; setEditSalaryTiers(t); }} className="w-24 p-2 border border-gray-200 rounded-lg text-sm" placeholder="Ставка" />
                                            <button type="button" onClick={() => setEditSalaryTiers(editSalaryTiers.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm transition-colors">✕</button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:bg-gray-400 hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        {isSaving ? 'Сохранение...' : '✅ Сохранить'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Информационные карточки */}
                        {!isEditing && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Статус</p>
                                    <p className={`font-bold text-lg ${isEmployeeFired ? 'text-red-600' : 'text-green-600'}`}>
                                        {isEmployeeFired ? '🔴 Уволен' : '🟢 Работает'}
                                    </p>
                                </div>
                                {selectedEmployee.start_date && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Дата начала</p>
                                        <p className="font-bold text-lg text-gray-800">
                                            {new Date(selectedEmployee.start_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                                {selectedEmployee.rate > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Ставка/день</p>
                                        <p className="font-bold text-lg text-gray-800">{selectedEmployee.rate}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center bg-white p-12 rounded-2xl shadow-lg border border-gray-100 min-h-[400px]">
                        <div className="text-6xl mb-4">👈</div>
                        <p className="text-gray-500 text-lg font-medium">Выберите сотрудника</p>
                        <p className="text-gray-400 text-sm mt-1">для управления приёмом и увольнением</p>
                    </div>
                )}
            </div>
        </div>
    );
}
