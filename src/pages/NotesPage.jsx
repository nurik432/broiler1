// src/pages/NotesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import useVoiceRecording from '../hooks/useVoiceRecording';

function NotesPage() {
    const [notes, setNotes] = useState([]);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAudioPlayer, setShowAudioPlayer] = useState(false);

    // Используем улучшенный хук записи
    const {
        isRecording,
        audioBlob,
        audioUrl,
        error: recordingError,
        recordingTime,
        isSupported,
        startRecording,
        stopRecording,
        resetRecording,
        formatTime
    } = useVoiceRecording();

    // Загрузка заметок
    const fetchNotes = async () => {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Ошибка:", error);
        else setNotes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    // Показать проигрыватель после записи
    useEffect(() => {
        if (audioUrl) {
            setShowAudioPlayer(true);
        }
    }, [audioUrl]);

    // Добавление новой заметки (текстовой)
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNoteContent.trim()) return;

        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('notes')
            .insert([{
                content: newNoteContent,
                user_id: user.id,
                type: 'text'
            }]);

        if (error) {
            alert(error.message);
        } else {
            setNewNoteContent('');
            await fetchNotes();
        }
        setIsSubmitting(false);
    };

    // Сохранение голосовой заметки
    const handleSaveVoiceNote = async () => {
        if (!audioBlob) return;

        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            // 1. Загружаем аудио файл в Supabase Storage
            const fileName = `voice_note_${Date.now()}.webm`;
            const { error: uploadError } = await supabase.storage
                .from('voice-notes') // Убедитесь, что bucket создан в Supabase
                .upload(`${user.id}/${fileName}`, audioBlob, {
                    contentType: audioBlob.type,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Получаем публичный URL
            const { data: urlData } = supabase.storage
                .from('voice-notes')
                .getPublicUrl(`${user.id}/${fileName}`);

            // 3. Сохраняем запись в БД
            const { error: insertError } = await supabase
                .from('notes')
                .insert([{
                    content: `🎤 Голосовая заметка (${formatTime(recordingTime)})`,
                    audio_url: urlData.publicUrl,
                    user_id: user.id,
                    type: 'voice'
                }]);

            if (insertError) throw insertError;

            // Успех
            resetRecording();
            setShowAudioPlayer(false);
            await fetchNotes();

        } catch (err) {
            console.error('Error saving voice note:', err);
            alert('Ошибка при сохранении голосовой заметки: ' + err.message);
        }

        setIsSubmitting(false);
    };

    // Удаление заметки
    const handleDeleteNote = async (noteId, audioUrl) => {
        if (!window.confirm("Удалить эту заметку?")) return;

        // Если это голосовая заметка, удаляем и файл
        if (audioUrl) {
            const filePath = audioUrl.split('/voice-notes/')[1];
            if (filePath) {
                await supabase.storage
                    .from('voice-notes')
                    .remove([filePath]);
            }
        }

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (error) {
            alert(error.message);
        } else {
            await fetchNotes();
        }
    };

    // Переключение записи
    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Заметки</h1>

            {/* Форма добавления заметки */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <form onSubmit={handleAddNote}>
                    <label htmlFor="note-content" className="block text-lg font-semibold mb-2">
                        Новая заметка
                    </label>
                    <textarea
                        id="note-content"
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Введите текст или используйте голосовой ввод..."
                        className="w-full h-28 p-3 border rounded-md focus:ring-2 focus:ring-indigo-500 transition resize-none"
                        disabled={isRecording || showAudioPlayer}
                    />

                    <div className="flex items-center gap-4 mt-4 flex-wrap">
                        {/* Кнопка сохранения текста */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !newNoteContent.trim() || isRecording || showAudioPlayer}
                            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                            {isSubmitting ? 'Сохранение...' : 'Сохранить текст'}
                        </button>

                        {/* Разделитель */}
                        <span className="text-gray-400">или</span>

                        {/* Голосовой ввод */}
                        {isSupported ? (
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleToggleRecording}
                                    disabled={showAudioPlayer || isSubmitting}
                                    className={`p-3 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isRecording 
                                            ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                    title={isRecording ? "Остановить запись" : "Начать голосовую запись"}
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                {isRecording && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm text-red-600 font-medium">
                                            Запись: {formatTime(recordingTime)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md">
                                ⚠️ Голосовой ввод не поддерживается в вашем браузере
                            </p>
                        )}
                    </div>

                    {/* Ошибка записи */}
                    {recordingError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">❌ {recordingError}</p>
                        </div>
                    )}

                    {/* Проигрыватель после записи */}
                    {showAudioPlayer && audioUrl && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm font-semibold text-green-700 mb-2">
                                ✅ Запись завершена ({formatTime(recordingTime)})
                            </p>
                            <audio
                                src={audioUrl}
                                controls
                                className="w-full mb-3"
                                style={{ height: '40px' }}
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleSaveVoiceNote}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition text-sm"
                                >
                                    {isSubmitting ? 'Сохранение...' : 'Сохранить голосовую заметку'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetRecording();
                                        setShowAudioPlayer(false);
                                    }}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 transition text-sm"
                                >
                                    Отменить
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* Список заметок */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-500">Загрузка заметок...</p>
                ) : notes.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-8">
                        У вас пока нет заметок. Создайте первую!
                    </p>
                ) : (
                    notes.map(note => (
                        <div
                            key={note.id}
                            className="bg-yellow-100 p-4 rounded-lg shadow-sm relative group hover:shadow-md transition"
                        >
                            {/* Кнопка удаления */}
                            <button
                                onClick={() => handleDeleteNote(note.id, note.audio_url)}
                                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                title="Удалить заметку"
                            >
                                ✕
                            </button>

                            {/* Контент заметки */}
                            <p className="text-gray-800 whitespace-pre-wrap mb-3">
                                {note.content}
                            </p>

                            {/* Аудио плеер для голосовых заметок */}
                            {note.audio_url && (
                                <audio
                                    src={note.audio_url}
                                    controls
                                    className="w-full mb-2"
                                    style={{ height: '35px' }}
                                />
                            )}

                            {/* Дата создания */}
                            <p className="text-xs text-gray-500 text-right">
                                {new Date(note.created_at).toLocaleString('ru-RU')}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default NotesPage;