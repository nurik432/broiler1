// src/pages/employees/SalaryTab.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { calculateSalary } from '../../utils/calculateSalary';

export default function SalaryTab({ selectedEmployee, activeBatches }) {
    // UI state
    const [showArchivedPayments, setShowArchivedPayments] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editPaymentDate, setEditPaymentDate] = useState('');
    const [editPaymentAmount, setEditPaymentAmount] = useState('');
    const [editPaymentType, setEditPaymentType] = useState('аванс');
    const [isSavingPayment, setIsSavingPayment] = useState(false);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('аванс');
    const [allSalaries, setAllSalaries] = useState([]);

    // Load salaries for the selected employee
    useEffect(() => {
        const load = async () => {
            if (!selectedEmployee) {
                setAllSalaries([]);
                return;
            }
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_salaries_by_employee', {
                employee_uuid: selectedEmployee.id,
            });
            if (rpcError) {
                const { data, error } = await supabase
                    .from('salaries')
                    .select(`*, broiler_batches (batch_name, is_active)`)
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false });
                if (error) {
                    console.error('Ошибка загрузки выплат:', error);
                    setAllSalaries([]);
                } else {
                    const formatted = (data || []).map(s => ({
                        ...s,
                        batch_name: s.broiler_batches?.batch_name || null,
                        batch_is_active: s.broiler_batches?.is_active ?? true,
                    }));
                    setAllSalaries(formatted);
                }
            } else {
                setAllSalaries(rpcData || []);
            }
        };
        load();
    }, [selectedEmployee]);

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
                        isActive: salary.batch_is_active,
                    };
                }
                totals.byBatch[salary.batch_id].total += amount;
            }
        });
        return totals;
    }, [filteredSalaries]);

    const handleAddPayment = async e => {
        e.preventDefault();
        if (!selectedEmployee) return;
        // Date validation
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
        const batchId = selectedEmployee.batch_id || null;
        const { error } = await supabase.from('salaries').insert([
            {
                employee_id: selectedEmployee.id,
                amount: Number(paymentAmount),
                payment_type: paymentType,
                payment_date: paymentDate,
                user_id: user.id,
                batch_id: batchId,
            },
        ]);
        if (error) alert('Ошибка: ' + error.message);
        else {
            setPaymentAmount('');
            // reload salaries
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_salaries_by_employee', {
                employee_uuid: selectedEmployee.id,
            });
            if (rpcError) {
                const { data, error } = await supabase
                    .from('salaries')
                    .select(`*, broiler_batches (batch_name, is_active)`)
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false });
                if (!error) {
                    const formatted = (data || []).map(s => ({
                        ...s,
                        batch_name: s.broiler_batches?.batch_name || null,
                        batch_is_active: s.broiler_batches?.is_active ?? true,
                    }));
                    setAllSalaries(formatted);
                }
            } else {
                setAllSalaries(rpcData || []);
            }
        }
        setIsAddingPayment(false);
    };

    const handleStartEditPayment = payment => {
        setEditingPayment(payment.id);
        setEditPaymentDate(payment.payment_date);
        setEditPaymentAmount(payment.amount);
        setEditPaymentType(payment.payment_type);
    };

    const handleCancelEditPayment = () => {
        setEditingPayment(null);
        setEditPaymentDate('');
        setEditPaymentAmount('');
        setEditPaymentType('аванс');
    };

    const handleSavePayment = async paymentId => {
        setIsSavingPayment(true);
        const { error } = await supabase
            .from('salaries')
            .update({
                payment_date: editPaymentDate,
                amount: Number(editPaymentAmount),
                payment_type: editPaymentType,
            })
            .eq('id', paymentId);
        if (error) {
            alert('Ошибка при сохранении: ' + error.message);
        } else {
            // reload salaries
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_salaries_by_employee', {
                employee_uuid: selectedEmployee.id,
            });
            if (rpcError) {
                const { data, error } = await supabase
                    .from('salaries')
                    .select(`*, broiler_batches (batch_name, is_active)`)
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false });
                if (!error) {
                    const formatted = (data || []).map(s => ({
                        ...s,
                        batch_name: s.broiler_batches?.batch_name || null,
                        batch_is_active: s.broiler_batches?.is_active ?? true,
                    }));
                    setAllSalaries(formatted);
                }
            } else {
                setAllSalaries(rpcData || []);
            }
            setEditingPayment(null);
        }
        setIsSavingPayment(false);
    };

    const handleDeletePayment = async paymentId => {
        if (!window.confirm('Вы уверены, что хотите удалить эту выплату?')) return;
        const { error } = await supabase.from('salaries').delete().eq('id', paymentId);
        if (error) alert('Ошибка при удалении: ' + error.message);
        else {
            // reload salaries
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_salaries_by_employee', {
                employee_uuid: selectedEmployee.id,
            });
            if (rpcError) {
                const { data, error } = await supabase
                    .from('salaries')
                    .select(`*, broiler_batches (batch_name, is_active)`)
                    .eq('employee_id', selectedEmployee.id)
                    .order('payment_date', { ascending: false });
                if (!error) {
                    const formatted = (data || []).map(s => ({
                        ...s,
                        batch_name: s.broiler_batches?.batch_name || null,
                        batch_is_active: s.broiler_batches?.is_active ?? true,
                    }));
                    setAllSalaries(formatted);
                }
            } else {
                setAllSalaries(rpcData || []);
            }
        }
    };

    const employeeBatch = selectedEmployee?.broiler_batches;

    const formatCurrency = amount => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(amount);

    // Render
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-semibold">{selectedEmployee?.full_name}</h2>
                    {selectedEmployee?.position && <p className="text-sm text-gray-500">{selectedEmployee.position}</p>}
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        {selectedEmployee?.start_date && (
                            <p>📅 Принят: <span className="font-medium">{new Date(selectedEmployee.start_date).toLocaleDateString()}</span></p>
                        )}
                        {selectedEmployee?.end_date && (
                            <p>🔴 Уволен: <span className="font-medium text-red-600">{new Date(selectedEmployee.end_date).toLocaleDateString()}</span></p>
                        )}
                    </div>
                    {employeeBatch && (
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${employeeBatch.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                            <span>{employeeBatch.is_active ? '🟢' : '🔴'}</span>
                            <span>Партия: {employeeBatch.batch_name}</span>
                            {!employeeBatch.is_active && <span className="text-xs">(архив — сотрудник уволен)</span>}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* edit and delete of employee are handled in HireFireTab, so only archive toggle here */}
                    <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={showArchivedPayments} onChange={() => setShowArchivedPayments(!showArchivedPayments)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                        <span className="ml-2">Архивные выплаты</span>
                    </label>
                </div>
            </div>

            {/* Warning if batch archived */}
            {employeeBatch && !employeeBatch.is_active && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                        ⚠️ Партия <strong>{employeeBatch.batch_name}</strong> завершена. Сотрудник считается уволенным. Добавление новых выплат невозможно.
                    </p>
                </div>
            )}

            {/* Payments table */}
            <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-left border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Дата</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Тип</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Сумма</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Партия</th>
                            <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSalaries.map(pay => (
                            <tr key={pay.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{new Date(pay.payment_date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-sm capitalize">{pay.payment_type}</td>
                                <td className="px-4 py-2 text-sm font-medium">{formatCurrency(pay.amount)}</td>
                                <td className="px-4 py-2 text-sm">{pay.batch_name || '—'}</td>
                                <td className="px-4 py-2 flex gap-2 text-sm">
                                    <button onClick={() => handleStartEditPayment(pay)} className="text-indigo-600 hover:underline">Ред.</button>
                                    <button onClick={() => handleDeletePayment(pay.id)} className="text-red-600 hover:underline">Уд.</button>
                                </td>
                            </tr>
                        ))}
                        {filteredSalaries.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-2 text-center text-gray-400">Нет выплат</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit payment form */}
            {editingPayment && (
                <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" onSubmit={e => { e.preventDefault(); handleSavePayment(editingPayment); }}>
                    <div>
                        <label className="block text-sm font-medium">Дата</label>
                        <input type="date" value={editPaymentDate} onChange={e => setEditPaymentDate(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Сумма</label>
                        <input type="number" step="0.01" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Тип</label>
                        <select value={editPaymentType} onChange={e => setEditPaymentType(e.target.value)} className="mt-1 w-full p-2 border rounded">
                            <option value="аванс">аванс</option>
                            <option value="зарплата">зарплата</option>
                        </select>
                    </div>
                    <div className="md:col-span-3 flex gap-2 mt-2">
                        <button type="submit" disabled={isSavingPayment} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">{isSavingPayment ? 'Сохранение...' : 'Сохранить'}</button>
                        <button type="button" onClick={handleCancelEditPayment} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Отмена</button>
                    </div>
                </form>
            )}

            {/* Add payment form (only if batch active) */}
            {employeeBatch?.is_active !== false && (
                <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium">Дата</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Сумма</label>
                        <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Тип</label>
                        <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="mt-1 w-full p-2 border rounded">
                            <option value="аванс">аванс</option>
                            <option value="зарплата">зарплата</option>
                        </select>
                    </div>
                    <div className="md:col-span-3 flex gap-2 mt-2">
                        <button type="submit" disabled={isAddingPayment} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400">{isAddingPayment ? 'Добавление...' : 'Добавить выплату'}</button>
                    </div>
                </form>
            )}

            {/* Summary cards (per‑batch as requested) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border">
                    <p className="text-xs text-gray-500">Всего аванс</p>
                    <p className="font-bold text-lg text-gray-800">{formatCurrency(salaryTotals.totalAdvance)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border">
                    <p className="text-xs text-gray-500">Всего зарплата</p>
                    <p className="font-bold text-lg text-gray-800">{formatCurrency(salaryTotals.totalSalary)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border">
                    <p className="text-xs text-gray-500">Итого</p>
                    <p className="font-bold text-lg text-gray-800">{formatCurrency(salaryTotals.totalAll)}</p>
                </div>
                {/* Per‑batch breakdown */}
                {Object.entries(salaryTotals.byBatch).map(([batchId, info]) => (
                    <div key={batchId} className={`bg-gray-50 p-4 rounded-xl border ${info.isActive ? 'border-green-300' : 'border-gray-300'}`}>
                        <p className="text-xs text-gray-500">{info.name} {info.isActive ? '' : '(архив)'} </p>
                        <p className="font-bold text-lg text-gray-800">{formatCurrency(info.total)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
