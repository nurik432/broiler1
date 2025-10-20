// src/hooks/useSpeechRecognition.js

import { useState, useEffect, useRef } from 'react';

// Получаем конструктор SpeechRecognition, учитывая префиксы для разных браузеров
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Проверяем, поддерживается ли API в текущем браузере.
// !! преобразует значение (объект или undefined) в boolean (true или false).
const IS_SUPPORTED = !!SpeechRecognition;

/**
 * Кастомный хук для работы с Web Speech API (распознавание речи).
 * Обеспечивает стабильную работу с автоматическим перезапуском.
 */
function useSpeechRecognition() {
    // Состояние для отслеживания, идет ли прослушивание в данный момент.
    const [isListening, setIsListening] = useState(false);
    // Состояние для хранения распознанного текста.
    const [text, setText] = useState('');
    // useRef для хранения экземпляра объекта SpeechRecognition между рендерами.
    const recognitionRef = useRef(null);
    // useRef для отслеживания, была ли остановка инициирована пользователем.
    // Используем ref, а не state, чтобы его изменение не вызывало перерисовку компонента.
    const stopListeningRef = useRef(false);

    useEffect(() => {
        // Если API не поддерживается, ничего не делаем.
        if (!IS_SUPPORTED) {
            console.warn("Speech Recognition не поддерживается в этом браузере.");
            return;
        }

        // Создаем экземпляр API
        const recognition = new SpeechRecognition();

        // Настройки распознавания:
        recognition.continuous = true;      // Не прекращать слушать после паузы в речи.
        recognition.lang = 'ru-RU';         // Устанавливаем язык распознавания.
        recognition.interimResults = true;  // Показывать промежуточные, еще не окончательные результаты.

        // Обработчик события, когда API распознает речь.
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setText(transcript);
        };

        // Обработчик события, когда прослушивание завершается.
        recognition.onend = () => {
            // Если остановка не была вызвана вручную пользователем...
            if (!stopListeningRef.current) {
                // ...значит, браузер остановил API сам (по таймауту или другой причине).
                // Мы перезапускаем его с небольшой задержкой, чтобы избежать гонки состояний.
                setTimeout(() => {
                    try {
                        // Дополнительная проверка на случай, если пользователь нажал стоп во время задержки.
                        if (!stopListeningRef.current) {
                            recognition.start();
                        }
                    } catch (error) {
                        console.error("Ошибка при отложенном перезапуске SpeechRecognition:", error);
                        setIsListening(false);
                    }
                }, 100); // Задержка в 100 мс.
            } else {
                // Если остановка была ручной, просто обновляем состояние.
                setIsListening(false);
            }
        };

        // Обработчик ошибок API.
        recognition.onerror = (event) => {
            // Ошибка 'no-speech' возникает, когда пользователь долго молчит.
            // Мы ее игнорируем, чтобы не прерывать сеанс прослушивания.
            if (event.error === 'no-speech') {
                console.warn("Не было распознано речи.");
                return;
            }
            console.error("Ошибка SpeechRecognition:", event.error);
            setIsListening(false);
        };

        // Сохраняем экземпляр в ref для доступа из других функций.
        recognitionRef.current = recognition;

        // Функция очистки: будет вызвана при размонтировании компонента,
        // чтобы остановить прослушивание и избежать утечек памяти.
        return () => {
            recognition.stop();
        };
    }, []); // Пустой массив зависимостей означает, что этот useEffect выполнится только один раз.

    // Функция для запуска прослушивания.
    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setText(''); // Очищаем предыдущий результат.
            stopListeningRef.current = false; // Сбрасываем флаг ручной остановки.
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error("Ошибка при запуске SpeechRecognition:", error);
            }
        }
    };

    // Функция для остановки прослушивания.
    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            stopListeningRef.current = true; // Устанавливаем флаг, что остановка была ручной.
            recognitionRef.current.stop();
            // setIsListening(false) будет вызван автоматически в onend.
        }
    };

    // Возвращаем публичный API нашего хука.
    return {
        text,
        isListening,
        startListening,
        stopListening,
        isSupported: IS_SUPPORTED,
    };
}

export default useSpeechRecognition;