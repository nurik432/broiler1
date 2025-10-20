// src/hooks/useSpeechRecognition.js

import { useState, useEffect, useRef } from 'react';

// Проверяем, существует ли API в текущем браузере
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const IS_SUPPORTED = !!SpeechRecognition;

function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [text, setText] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!IS_SUPPORTED) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Продолжать слушать, даже если есть пауза
        recognition.lang = 'ru-RU';     // Распознавать русскую речь
        recognition.interimResults = true; // Показывать промежуточные результаты

        // Когда API распознает речь
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setText(transcript);
        };

        // Когда прослушивание заканчивается (например, по таймауту)
        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        // Очистка при размонтировании компонента
        return () => {
            recognition.stop();
        };
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setText(''); // Очищаем текст перед началом
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
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