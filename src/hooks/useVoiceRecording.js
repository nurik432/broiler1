// src/hooks/useVoiceRecording.js

import { useState, useRef, useCallback } from 'react';

/**
 * Универсальный хук для записи голоса с MediaRecorder API
 * Работает на всех устройствах: iOS, Android, Desktop
 */
function useVoiceRecording() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [error, setError] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    // Проверка поддержки API
    const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    // Определение поддерживаемого MIME типа
    const getSupportedMimeType = useCallback(() => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/wav'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return null;
    }, []);

    // Запуск записи
    const startRecording = useCallback(async () => {
        setError(null);
        chunksRef.current = [];
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);

        try {
            // Проверка поддержки
            if (!isSupported) {
                throw new Error('Ваш браузер не поддерживает запись аудио');
            }

            // Запрос доступа к микрофону
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });

            streamRef.current = stream;

            // Получение MIME типа
            const mimeType = getSupportedMimeType();
            if (!mimeType) {
                throw new Error('Не найден поддерживаемый формат аудио');
            }

            // Создание MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000
            });

            mediaRecorderRef.current = mediaRecorder;

            // Обработчик данных
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Обработчик остановки
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);

                setAudioBlob(blob);
                setAudioUrl(url);

                // Остановка всех треков
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // Очистка таймера
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            // Обработчик ошибок
            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                setError('Ошибка при записи аудио');
                stopRecording();
            };

            // Запуск записи
            mediaRecorder.start(100); // Собираем данные каждые 100мс
            setIsRecording(true);

            // Запуск таймера
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error starting recording:', err);

            // Обработка различных ошибок
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('Микрофон не найден. Подключите микрофон и попробуйте снова');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError('Микрофон занят другим приложением');
            } else {
                setError(err.message || 'Не удалось начать запись');
            }

            setIsRecording(false);
        }
    }, [isSupported, getSupportedMimeType]);

    // Остановка записи
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }

        // Остановка таймера
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Остановка потока
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Сброс записи
    const resetRecording = useCallback(() => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setError(null);
    }, [audioUrl]);

    // Форматирование времени
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        isRecording,
        audioBlob,
        audioUrl,
        error,
        recordingTime,
        isSupported,
        startRecording,
        stopRecording,
        resetRecording,
        formatTime
    };
}

export default useVoiceRecording;