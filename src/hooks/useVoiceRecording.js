// src/hooks/useVoiceRecording.js

import { useState, useRef, useCallback, useEffect } from 'react';

function useVoiceRecording() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [error, setError] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [permissionStatus, setPermissionStatus] = useState('prompt'); // prompt, granted, denied

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    // Проверка поддержки API
    const isSupported = !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.MediaRecorder
    );

    // Проверка HTTPS
    const isSecureContext = window.isSecureContext ||
                           window.location.protocol === 'https:' ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

    // Проверка разрешений при монтировании
    useEffect(() => {
        const checkPermission = async () => {
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const result = await navigator.permissions.query({ name: 'microphone' });
                    setPermissionStatus(result.state);

                    result.addEventListener('change', () => {
                        setPermissionStatus(result.state);
                    });
                }
            } catch (err) {
                console.log('Permission API not supported:', err);
            }
        };

        checkPermission();
    }, []);

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
                console.log('Using MIME type:', type);
                return type;
            }
        }
        console.error('No supported MIME type found');
        return null;
    }, []);

    // Запуск записи
    const startRecording = useCallback(async () => {
        console.log('=== Starting Recording ===');
        setError(null);
        chunksRef.current = [];
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);

        try {
            // 1. Проверка поддержки API
            if (!isSupported) {
                throw new Error('Ваш браузер не поддерживает запись аудио. Попробуйте Chrome или Safari.');
            }
            console.log('✓ API supported');

            // 2. Проверка безопасного контекста
            if (!isSecureContext) {
                throw new Error('Микрофон работает только на HTTPS или localhost. Текущий протокол: ' + window.location.protocol);
            }
            console.log('✓ Secure context');

            // 3. Проверка MIME типа
            const mimeType = getSupportedMimeType();
            if (!mimeType) {
                throw new Error('Не найден поддерживаемый формат аудио для вашего браузера');
            }
            console.log('✓ MIME type:', mimeType);

            // 4. Запрос доступа к микрофону
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });
            console.log('✓ Microphone access granted');

            // Информация о треке
            const audioTrack = stream.getAudioTracks()[0];
            console.log('Audio track:', {
                label: audioTrack.label,
                enabled: audioTrack.enabled,
                muted: audioTrack.muted,
                readyState: audioTrack.readyState
            });

            streamRef.current = stream;

            // 5. Создание MediaRecorder
            console.log('Creating MediaRecorder...');
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000
            });
            console.log('MediaRecorder state:', mediaRecorder.state);

            mediaRecorderRef.current = mediaRecorder;

            // Обработчики событий
            mediaRecorder.ondataavailable = (event) => {
                console.log('Data available:', event.data.size, 'bytes');
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstart = () => {
                console.log('MediaRecorder started');
            };

            mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped');
                console.log('Total chunks:', chunksRef.current.length);

                if (chunksRef.current.length === 0) {
                    console.error('No audio data captured!');
                    setError('Не удалось записать аудио. Попробуйте еще раз.');
                    return;
                }

                const blob = new Blob(chunksRef.current, { type: mimeType });
                console.log('Created blob:', blob.size, 'bytes');

                const url = URL.createObjectURL(blob);
                console.log('Created URL:', url);

                setAudioBlob(blob);
                setAudioUrl(url);

                // Остановка всех треков
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => {
                        console.log('Stopping track:', track.label);
                        track.stop();
                    });
                    streamRef.current = null;
                }

                // Очистка таймера
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                setError('Ошибка при записи аудио: ' + (event.error?.message || 'неизвестная ошибка'));
                stopRecording();
            };

            // 6. Запуск записи
            console.log('Starting recording...');
            mediaRecorder.start(100); // Собираем данные каждые 100мс
            setIsRecording(true);
            setPermissionStatus('granted');
            console.log('✓ Recording started successfully');

            // 7. Запуск таймера
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error starting recording:', err);
            console.error('Error name:', err.name);
            console.error('Error message:', err.message);

            // Детальная обработка ошибок
            let errorMessage = '';

            switch(err.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    errorMessage = 'Доступ к микрофону запрещен. Нажмите на иконку замка в адресной строке и разрешите доступ к микрофону.';
                    setPermissionStatus('denied');
                    break;

                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    errorMessage = 'Микрофон не найден. Убедитесь, что микрофон подключен к устройству.';
                    break;

                case 'NotReadableError':
                case 'TrackStartError':
                    errorMessage = 'Микрофон занят другим приложением. Закройте другие программы и попробуйте снова.';
                    break;

                case 'OverconstrainedError':
                    errorMessage = 'Микрофон не поддерживает запрошенные параметры. Попробуйте другой микрофон.';
                    break;

                case 'TypeError':
                    errorMessage = 'Ошибка браузера. Попробуйте перезагрузить страницу или использовать другой браузер.';
                    break;

                case 'SecurityError':
                    errorMessage = 'Ошибка безопасности. Убедитесь, что сайт использует HTTPS.';
                    break;

                default:
                    errorMessage = err.message || 'Не удалось начать запись. Попробуйте перезагрузить страницу.';
            }

            setError(errorMessage);
            setIsRecording(false);
        }
    }, [isSupported, isSecureContext, getSupportedMimeType]);

    // Остановка записи
    const stopRecording = useCallback(() => {
        console.log('=== Stopping Recording ===');

        if (mediaRecorderRef.current) {
            console.log('MediaRecorder state before stop:', mediaRecorderRef.current.state);

            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                console.log('MediaRecorder.stop() called');
            }
        }

        setIsRecording(false);

        // Остановка таймера
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            console.log('Timer cleared');
        }

        // Остановка потока
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                console.log('Stopping track:', track.label, track.readyState);
                track.stop();
            });
            streamRef.current = null;
            console.log('Stream stopped');
        }
    }, []);

    // Сброс записи
    const resetRecording = useCallback(() => {
        console.log('=== Resetting Recording ===');

        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            console.log('URL revoked');
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
        isSecureContext,
        permissionStatus,
        startRecording,
        stopRecording,
        resetRecording,
        formatTime
    };
}

export default useVoiceRecording;