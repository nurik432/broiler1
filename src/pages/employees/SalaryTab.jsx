// src/pages/employees/SalaryTab.jsx

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { calculateSalary } from '../../utils/calculateSalary';

export default function SalaryTab({ selectedPerson, setSelectedPerson, activeBatches, persons }) {
    const [showArchivedPayments, setShowArchivedPayments] = useState(false);
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

    const loadSalaries = async () => {
        if (!selectedPerson) {
            setAllSalaries([]);
            return;
        }
        
        const { data, error } = await supabase
            .from('salaries')
            .select(`*`) 
            .eq('person_id', selectedPerson.id)
            .order('payment_date', { ascending: false });
        
        if (error) {
            console.error('Ошибка загрузки выплат:', error);
            setAllSalaries([]);
        } else {
            const formatted = (data || []).map(s => {
                let batchName = null;
                let batchIsActive = true;
                if (s.batch_id) {
                    const batch = activeBatches.find(b => b.id === s.batch_id);
                    if (batch) {
                        batchName = batch.batch_name;
                        batchIsActive = true;
                    } else {
                        selectedPerson.employees?.forEach(emp => {
                            if (emp.broiler_batches?.id === s.batch_id) {
                                batchName = emp.broiler_batches.batch_name;
                                batchIsActive = emp.broiler_batches.is_active;
                            }
                        });
                    }
                }
                return {
                    ...s,
                    batch_name: batchName,
                    batch_is_active: batchIsActive,
                };
            });
            setAllSalaries(formatted);
        }
    };

    useEffect(() => {
        loadSalaries();
    }, [selectedPerson]);

    const filteredSalaries = useMemo(() => {
        return allSalaries.filter(salary => {
            if (!showArchivedPayments && salary.batch_id && salary.batch_is_active === false) {
                return false;
            }
            return true;
        });
    }, [allSalaries, showArchivedPayments]);

    // Calculate accrued salary logic across all employments
    const accruedData = useMemo(() => {
        if (!selectedPerson || !selectedPerson.employees) return { salary: 0, totalDays: 0, effectiveDays: 0, breakdownAgg: [] };
        
        let totalAccrued = 0;
        let totalEffectiveDays = 0;
        let breakdownAgg = [];

        selectedPerson.employees.forEach((emp) => {
            const batch = emp.broiler_batches || {};
            const res = calculateSalary(emp, batch);
            totalAccrued += res.salary;
            totalEffectiveDays += res.effectiveDays;
            
            if (res.breakdown.length > 0) {
                breakdownAgg.push({
                    periodLabel: `Период: ${new Date(emp.start_date).toLocaleDateString()} — ${emp.end_date ? new Date(emp.end_date).toLocaleDateString() : 'По н.в.'}`,
                    breakdown: res.breakdown,
                    salary: res.salary
                });
            } else if (res.effectiveDays > 0) {
                 breakdownAgg.push({
                    periodLabel: `Период: ${new Date(emp.start_date).toLocaleDateString()} — ${emp.end_date ? new Date(emp.end_date).toLocaleDateString() : 'По н.в.'}`,
                    breakdown: [{ label: 'Без начислений', sum: 0 }],
                    salary: 0
                });
            }
        });

        return { salary: totalAccrued, effectiveDays: totalEffectiveDays, breakdownAgg };
    }, [selectedPerson, allSalaries]);

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
        if (!selectedPerson) return;
        
        setIsAddingPayment(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            const recentEmployment = selectedPerson.employees?.[0];
            const batchId = recentEmployment?.batch_id || null;
            
            const insertData = {
                person_id: selectedPerson.id,
                employee_id: recentEmployment?.id || null, 
                amount: Number(paymentAmount),
                payment_type: paymentType,
                payment_date: paymentDate,
                batch_id: batchId,
            };
            if (user?.id) {
                insertData.user_id = user.id;
            }
            
            const { error } = await supabase.from('salaries').insert([insertData]);
            
            if (error) {
                console.error('Insert error:', error);
                alert('Ошибка: ' + error.message);
            } else {
                setPaymentAmount('');
                await loadSalaries();
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            alert('Произошла непредвиденная ошибка: ' + err.message);
        } finally {
            setIsAddingPayment(false);
        }
    };

    const handleStartEditPayment = payment => {
        setEditingPayment(payment.id);
        setEditPaymentDate(payment.payment_date);
        setEditPaymentAmount(payment.amount);
        setEditPaymentType(payment.payment_type);
    };

    const handleCancelEditPayment = () => {
        setEditingPayment(null);
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
            
        if (error) alert('Ошибка при сохранении: ' + error.message);
        else {
            await loadSalaries();
            setEditingPayment(null);
        }
        setIsSavingPayment(false);
    };

    const handleDeletePayment = async paymentId => {
        if (!window.confirm('Удалить эту выплату?')) return;
        const { error } = await supabase.from('salaries').delete().eq('id', paymentId);
        if (error) alert('Ошибка при удалении: ' + error.message);
        else await loadSalaries();
    };

    const formatCurrency = amount => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS' }).format(amount);

    if (!selectedPerson) {
        return (
            <div className="bg-white p-12 rounded-lg shadow-md text-center border border-gray-100">
                <div className="text-4xl mb-4">👤</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Сотрудник не выбран</h2>
                <p className="text-gray-500 mb-6">Пожалуйста, выберите сотрудника для начисления зарплаты.</p>
                <div className="max-w-md mx-auto">
                    <select
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        onChange={e => {
                            const p = persons.find(p => p.id === e.target.value);
                            setSelectedPerson(p || null);
                        }}
                        value=""
                    >
                        <option value="" disabled>-- Выберите сотрудника --</option>
                        {persons && persons.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.full_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    const remainingToPay = Math.max(accruedData.salary - salaryTotals.totalAll, 0);
    const recentEmployment = selectedPerson.employees?.[0];
    const isEmployeeFired = !recentEmployment || recentEmployment.is_active === false || !!recentEmployment.end_date;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Сотрудник:</label>
                <select
                    className="w-full md:w-1/2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={selectedPerson.id}
                    onChange={e => {
                        const p = persons.find(p => p.id === e.target.value);
                        setSelectedPerson(p || null);
                    }}
                >
                    {persons && persons.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.full_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-semibold">{selectedPerson.full_name}</h2>
                    {isEmployeeFired ? (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">🔴 Уволен</div>
                    ) : (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">🟢 Работает</div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                    <label className="flex items-center text-sm text-gray-600 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100">
                        <input type="checkbox" checked={showArchivedPayments} onChange={() => setShowArchivedPayments(!showArchivedPayments)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                        <span className="ml-2 font-medium">Архивные выплаты</span>
                    </label>
                </div>
            </div>

            {/* ACCRUED SALARY WIDGET */}
            <div className="mb-8 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">Актуальное начисление (по всем периодам работы)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                        <p className="text-xs text-gray-500 mb-1">Отработано дней (всего)</p>
                        <p className="font-bold text-xl text-gray-800">{accruedData.effectiveDays} дн.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                        <p className="text-xs text-gray-500 mb-1">Начислено по ставкам</p>
                        <p className="font-bold text-xl text-indigo-600">{formatCurrency(accruedData.salary)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                        <p className="text-xs text-gray-500 mb-1">Выплачено всего</p>
                        <p className="font-bold text-xl text-green-600">{formatCurrency(salaryTotals.totalAll)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                        <p className="text-xs text-gray-500 mb-1">Остаток к выплате</p>
                        <p className={`font-bold text-xl ${remainingToPay > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {formatCurrency(remainingToPay)}
                        </p>
                    </div>
                </div>

                {accruedData.breakdownAgg.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-indigo-100/50">
                        <p className="text-xs font-semibold text-indigo-800 mb-2 uppercase tracking-wider">Детализация расчета:</p>
                        <div className="space-y-3">
                            {accruedData.breakdownAgg.map((period, pIdx) => (
                                <div key={pIdx} className="text-sm bg-white/50 p-2 rounded-lg">
                                    <p className="font-semibold text-gray-700 mb-1">{period.periodLabel}</p>
                                    <ul className="text-gray-600 space-y-1 ml-2">
                                        {period.breakdown.map((item, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>
                                                <span>{item.label} = <strong>{formatCurrency(item.sum)}</strong></span>
                                            </li>
                                        ))}
                                        {period.breakdown.length > 1 && (
                                            <li className="flex items-center gap-2 pt-1 border-t border-gray-200 mt-1 font-medium">
                                                <span>Итого за период: <strong>{formatCurrency(period.salary)}</strong></span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Всего авансов</p>
                    <p className="font-bold text-lg text-gray-800">{formatCurrency(salaryTotals.totalAdvance)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Всего зарплат (оконч.)</p>
                    <p className="font-bold text-lg text-gray-800">{formatCurrency(salaryTotals.totalSalary)}</p>
                </div>
                {Object.entries(salaryTotals.byBatch).map(([batchId, info]) => (
                    <div key={batchId} className={`p-4 rounded-xl border shadow-sm ${info.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Партия: {info.name} {info.isActive ? '' : '(архив)'} </p>
                        <p className="font-bold text-lg text-gray-800">{formatCurrency(info.total)}</p>
                    </div>
                ))}
            </div>

            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">История выплат</h3>
            </div>

            <form onSubmit={handleAddPayment} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Дата</label>
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Сумма</label>
                    <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Тип</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="аванс">Аванс</option>
                        <option value="зарплата">Зарплата (остаток)</option>
                    </select>
                </div>
                <div className="w-full md:w-auto mt-2 md:mt-0">
                    <button type="submit" disabled={isAddingPayment} className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        {isAddingPayment ? 'Добавление...' : '+ Выплатить'}
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Сумма</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Партия</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSalaries.map(pay => (
                            <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-800">
                                    {editingPayment === pay.id ? (
                                        <input type="date" value={editPaymentDate} onChange={e => setEditPaymentDate(e.target.value)} className="w-full p-1 border rounded text-sm" required />
                                    ) : new Date(pay.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                                    {editingPayment === pay.id ? (
                                        <select value={editPaymentType} onChange={e => setEditPaymentType(e.target.value)} className="w-full p-1 border rounded text-sm">
                                            <option value="аванс">аванс</option>
                                            <option value="зарплата">зарплата</option>
                                        </select>
                                    ) : pay.payment_type}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                    {editingPayment === pay.id ? (
                                        <input type="number" step="0.01" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} className="w-24 p-1 border rounded text-sm" required />
                                    ) : formatCurrency(pay.amount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{pay.batch_name || 'Без партии'}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                    {editingPayment === pay.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleSavePayment(pay.id)} disabled={isSavingPayment} className="text-green-600 hover:text-green-800 font-medium">Сохранить</button>
                                            <button onClick={handleCancelEditPayment} className="text-gray-500 hover:text-gray-700">Отмена</button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => handleStartEditPayment(pay)} className="text-indigo-600 font-medium">Изменить</button>
                                            <button onClick={() => handleDeletePayment(pay.id)} className="text-red-500 font-medium">Удалить</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredSalaries.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 bg-gray-50/50">В этом списке пока нет выплат</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
