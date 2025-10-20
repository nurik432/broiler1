// src/hooks/useSpeechRecognition.js

import { useState, useEffect, useRef } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const IS_SUPPORTED = !!SpeechRecognition;

function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [text, setText] = useState('');
    const recognitionRef = useRef(null);
    // --- НОВЫЙ ФЛАГ ---
    // Этот флаг будет отслеживать, остановили ли мы прослушивание вручную.
    const stopListeningRef = useRef(false);

    useEffect(() => {
        if (!IS_SUPPORTED) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'ru-RU';
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setText(transcript);
        };

        // --- ОБНОВЛЕННАЯ ЛОГИКА `onend` ---
        recognition.onend = () => {
            // Если прослушивание закончилось, но мы НЕ нажимали кнопку "Стоп" вручную,
            // значит, браузер отключил его сам. В этом случае мы просто перезапускаем его.
            if (!stopListeningRef.current) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error("Ошибка при автоматическом перезапуске:", error);
                    setIsListening(false);
                }
            } else {
                // Если мы нажали "Стоп" вручную, то просто меняем состояние.
                setIsListening(false);
            }
        };

        // Обработка ошибок (например, если нет доступа к микрофону)
        recognition.onerror = (event) => {
            console.error("Ошибка SpeechRecognition:", event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setText('');
            // Перед стартом говорим, что мы НЕ собираемся останавливаться вручную.
            stopListeningRef.current = false;
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            // Перед остановкой говорим, что это было сделано вручную.
            stopListeningRef.current = true;
            recognitionRef.current.stop();
            // setIsListening(false) будет вызван автоматически в onend
        }
    };

    return {
        text,
        isListening,
        startListening,
        stopListening,
        isSupported: IS_SUPPORTED,
    };
}

export default useSpeechRecognition;