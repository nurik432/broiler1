// src/pages/NotesPage.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

function NotesPage() {
    const [notes, setNotes] = useState([]);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Используем наш кастомный хук
    const { text, isListening, startListening, stopListening, isSupported } = useSpeechRecognition();

    // Синхронизируем распознанный текст с полем ввода
    useEffect(() => {
        if (text) {
            setNewNoteContent(text);
        }
    }, [text]);

    // Загрузка заметок
    const fetchNotes = async () => {
        const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
        if (error) console.error("Ошибка:", error);
        else setNotes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    // Добавление новой заметки
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNoteContent.trim()) return;
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('notes').insert([{ content: newNoteContent, user_id: user.id }]);
        if (error) alert(error.message);
        else {
            setNewNoteContent(''); // Очищаем поле
            await fetchNotes(); // Обновляем список
        }
        setIsSubmitting(false);
    };

    // Удаление заметки
    const handleDeleteNote = async (noteId) => {
        if (window.confirm("Удалить эту заметку?")) {
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) alert(error.message);
            else await fetchNotes();
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Заметки</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <form onSubmit={handleAddNote}>
                    <label htmlFor="note-content" className="block text-lg font-semibold mb-2">Новая заметка</label>
                    <textarea
                        id="note-content"
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Введите текст или используйте голосовой ввод..."
                        className="w-full h-28 p-3 border rounded-md focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <div className="flex items-center gap-4 mt-4">
                        <button type="submit" disabled={isSubmitting || !newNoteContent.trim()} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        {/* Кнопка для голосового ввода */}
                        {isSupported ? (
                            <button
                                type="button"
                                onClick={isListening ? stopListening : startListening}
                                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                title={isListening ? "Остановить запись" : "Начать голосовой ввод"}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7v1h6v-1h-2v-2.07z" clipRule="evenodd"></path></svg>
                            </button>
                        ) : (
                             <p className="text-sm text-gray-500">Голосовой ввод не поддерживается в вашем браузере.</p>
                        )}
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <p>Загрузка заметок...</p> : notes.map(note => (
                    <div key={note.id} className="bg-yellow-100 p-4 rounded-lg shadow-sm relative group">
                        <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-4 text-right">
                            {new Date(note.created_at).toLocaleString('ru-RU')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default NotesPage;