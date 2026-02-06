// src/pages/BatchesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';


function BatchesPage() {
    // Состояние для переключения между "active" и "archived"
    const [view, setView] = useState('active');

    const [batches, setBatches] = useState([]);
    const [isFetching, setIsFetching] = useState(true);

    // Состояния для формы добавления новой партии
    const [batchName, setBatchName] = useState('');
    const [initialQuantity, setInitialQuantity] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Функция загрузки партий в зависимости от активной вкладки
    const fetchBatches = async () => {
        setIsFetching(true);
        const rpc_function = view === 'active'
            ? 'get_batches_with_stats'
            : 'get_archived_batches_with_stats';

        const { data, error } = await supabase.rpc(rpc_function);

        if (error) {
            console.error(`Ошибка при загрузке партий (${view}):`, error);
            alert('Не удалось загрузить список партий.');
            setBatches([]);
        } else {
            setBatches(data);
        }
        setIsFetching(false);
    };

    // Перезагружаем данные каждый раз, когда пользователь переключает вкладку
    useEffect(() => {
        fetchBatches();
    }, [view]);

/**
 * Export ALL information about a batch (journal, expenses, sales, feed,
 * salaries) to an .xlsx file – each logical block goes to its own sheet.
 *
 * @param {string} batchId  UUID партии, которую нужно выгрузить
 */
const exportBatchToXLSX = async (batchId) => {
  try {
    // ---------- 1️⃣ Получаем всё, что уже показывается на странице журнала ----------
    const [
      batchRes,
      logsRes,
      medicinesRes,
      expensesRes,
      salesRes,
      feedRes,
      salariesRes,
    ] = await Promise.all([
      supabase.from('broiler_batches').select('*').eq('id', batchId).single(),
      supabase
        .from('daily_logs')
        .select('*, medicine:medicines(name)')
        .eq('batch_id', batchId)
        .order('log_date', { ascending: false }),
      supabase.from('medicines').select('id, name'),
      supabase.rpc('get_expenses_by_batch', { batch_uuid: batchId }),
      supabase.rpc('get_sales_by_batch', { batch_uuid: batchId }),
      supabase.rpc('get_feed_by_batch', { batch_uuid: batchId }),
      supabase.rpc('get_salaries_by_batch', { batch_uuid: batchId }),
    ]);

    // ---------- 2️⃣ Проверяем ошибки ----------
    if (batchRes.error)   throw batchRes.error;
    if (logsRes.error)    throw logsRes.error;
    if (expensesRes.error) throw expensesRes.error;
    if (salesRes.error)   throw salesRes.error;
    if (feedRes.error)    throw feedRes.error;
    if (salariesRes.error) throw salariesRes.error;

    // ---------- 3️⃣ Формируем данные для листов ----------
    const wb = XLSX.utils.book_new();   // новая рабочая книга

    // 3.1 Партия
    const batchData = [
      ['batch_name', 'start_date', 'initial_quantity', 'is_active'],
      [
        batchRes.data.batch_name,
        batchRes.data.start_date,
        batchRes.data.initial_quantity,
        batchRes.data.is_active,
      ],
    ];
    const wsBatch = XLSX.utils.aoa_to_sheet(batchData);
    XLSX.utils.book_append_sheet(wb, wsBatch, 'Партия');

    // 3.2 Журнал (daily_logs)
    const logsHeader = [
      'log_date',
      'age',
      'mortality',
      'medicine',
      'dosage',
      'water_consumption',
    ];
    const logsBody = logsRes.data.map((l) => [
      l.log_date,
      l.age,
      l.mortality,
      l.medicine?.name ?? '',
      l.dosage ?? '',
      l.water_consumption ?? '',
    ]);
    const wsLogs = XLSX.utils.aoa_to_sheet([logsHeader, ...logsBody]);
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Журнал');

    // 3.3 Расходы
    const expHeader = ['expense_date', 'description', 'amount'];
    const expBody = expensesRes.data.map((e) => [
      e.expense_date,
      e.description,
      e.amount,
    ]);
    const wsExp = XLSX.utils.aoa_to_sheet([expHeader, ...expBody]);
    XLSX.utils.book_append_sheet(wb, wsExp, 'Расходы');

    // 3.4 Продажи
    const salesHeader = [
      'sale_date',
      'customer_name',
      'weight_kg',
      'price_per_kg',
    ];
    const salesBody = salesRes.data.map((s) => [
      s.sale_date,
      s.customer_name,
      s.weight_kg,
      s.price_per_kg,
    ]);
    const wsSales = XLSX.utils.aoa_to_sheet([salesHeader, ...salesBody]);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Продажи');

    // 3.5 Корм
    const feedHeader = ['delivery_date', 'feed_type', 'quantity_kg'];
    const feedBody = feedRes.data.map((f) => [
      f.delivery_date,
      f.feed_type,
      f.quantity_kg,
    ]);
    const wsFeed = XLSX.utils.aoa_to_sheet([feedHeader, ...feedBody]);
    XLSX.utils.book_append_sheet(wb, wsFeed, 'Корм');

    // 3.6 Зарплаты
    const salHeader = [
      'payment_date',
      'employee_name',
      'payment_type',
      'amount',
    ];
    const salBody = salariesRes.data.map((s) => [
      s.payment_date,
      s.employee_name,
      s.payment_type,
      s.amount,
    ]);
    const wsSal = XLSX.utils.aoa_to_sheet([salHeader, ...salBody]);
    XLSX.utils.book_append_sheet(wb, wsSal, 'Зарплаты');

    // ---------- 4️⃣ Генерируем бинарный файл ----------
    const wbout = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',   // получаем Uint8Array
    });

    // ---------- 5️⃣ Скачиваем ----------
    const blob = new Blob([wbout], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `batch_${batchId}_data.xlsx`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('❌ Ошибка экспорта в XLSX', err);
    alert('Не удалось экспортировать данные. Смотрите консоль браузера.');
  }
};


    // Функция для изменения статуса партии (архивация/восстановление)
    const handleToggleBatchStatus = async (batchId, newStatus) => {
        const confirmMessage = newStatus
            ? "Вы уверены, что хотите восстановить эту партию?"
            : "Вы уверены, что хотите завершить эту партию? Вы не сможете добавлять в нее новые записи.";

        if (window.confirm(confirmMessage)) {
            const { error } = await supabase
                .from('broiler_batches')
                .update({ is_active: newStatus })
                .eq('id', batchId);

            if (error) {
                alert(error.message);
            } else {
                await fetchBatches(); // Обновляем список, чтобы партия переместилась
            }
        }
    };

    // Функция добавления новой партии
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('broiler_batches').insert([{
            batch_name: batchName,
            initial_quantity: Number(initialQuantity),
            start_date: startDate,
            user_id: user.id
        }]);

        if (error) {
            alert(error.message);
        } else {
            setBatchName('');
            setInitialQuantity('');
            await fetchBatches();
        }
        setIsSubmitting(false);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Партии бройлеров</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-semibold mb-4">Добавить новую партию</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div><label className="block text-sm font-medium text-gray-700">Название партии</label><input type="text" placeholder="Партия #1" value={batchName} onChange={(e) => setBatchName(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Начальное поголовье</label><input type="number" placeholder="500" value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Дата начала</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md"/></div>
                    <div className="md:col-span-3"><button type="submit" disabled={isSubmitting} className="w-full justify-center py-2 px-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-gray-400">{isSubmitting ? 'Добавление...' : 'Добавить партию'}</button></div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex border-b mb-4">
                    <button onClick={() => setView('active')} className={`py-2 px-4 font-semibold ${view === 'active' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Активные</button>
                    <button onClick={() => setView('archived')} className={`py-2 px-4 font-semibold ${view === 'archived' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Архивные</button>

                </div>
                {isFetching ? (
                    <p className="text-center text-gray-500 py-4">Загрузка партий...</p>
                ) : batches.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">Здесь пока нет партий.</p>
                ) : (
                    <div className="space-y-4">
                        {batches.map(batch => (
                            <div key={batch.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <p className="font-bold text-lg text-gray-800">{batch.batch_name}</p>
                                    <p className="text-sm text-gray-500">Начало: {new Date(batch.start_date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <div className="text-center"><span className="text-xs sm:text-sm text-gray-500">Итоговое поголовье</span><p className="font-bold text-xl sm:text-2xl text-green-600">{batch.current_quantity}</p></div>
                                    <div className="text-center"><span className="text-xs sm:text-sm text-gray-500">Общий падеж</span><p className="font-bold text-xl sm:text-2xl text-red-600">{batch.total_mortality}</p></div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Link to={`/batch/${batch.id}`} className="px-4 py-2 text-sm text-center font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600">Журнал</Link>

                                        {/* --- БЛОК С УСЛОВНЫМИ КНОПКАМИ --- */}
                                        {view === 'active' ? (
                                            <button onClick={() => handleToggleBatchStatus(batch.id, false)} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">Завершить</button>
                                        ) : (
                                            <>
                                                {/* --- ВОТ НОВАЯ КНОПКА "ОТЧЕТ" --- */}
                                                <Link to={`/batch/${batch.id}/report`}
                                                      className="px-4 py-2 text-sm text-center font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">
                                                    Отчет
                                                </Link>
                                                <button onClick={() => handleToggleBatchStatus(batch.id, true)}
                                                        className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600">
                                                    Восстановить
                                                </button>
                                                {/* 👇 Новая кнопка «Экспортировать» */}
                                                <button
                                                    onClick={() => exportBatchToXLSX(batch.id)}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800">
                                                    Экспортировать (XLSX)
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default BatchesPage;