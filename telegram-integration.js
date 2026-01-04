// Telegram Bot Integration Script (Enhanced Version)
// Конфигурация
const TELEGRAM_CONFIG = {
    BOT_TOKEN: '8027049517:AAFF3XdvDk7epuTXXpgjYXWRKYV69xMIz4M',
    CHAT_ID: '771386337',
    API_URL: 'https://api.telegram.org/bot'
};

// Rate limiting
const RATE_LIMIT = {
    maxRequests: 3,
    timeWindow: 60000, // 1 минута
    requests: []
};

// Проверка rate limit
function checkRateLimit() {
    const now = Date.now();
    RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.timeWindow);

    if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
        return false;
    }

    RATE_LIMIT.requests.push(now);
    return true;
}

// Валидация данных
function validateFormData(formData) {
    const errors = [];

    // Проверка имени
    if (!formData.name || formData.name.trim().length < 2) {
        errors.push('Имя должно содержать минимум 2 символа');
    }

    // Проверка контакта
    if (!formData.contact || formData.contact.trim().length < 5) {
        errors.push('Контакт должен быть заполнен');
    }

    // Проверка на подозрительный контент
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i
    ];

    const allText = Object.values(formData).join(' ');
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(allText)) {
            errors.push('Обнаружен подозрительный контент');
            break;
        }
    }

    return errors;
}

// Экранирование HTML
function escapeHtml(text) {
    const map = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;'
    };
    return text.replace(/[<>&]/g, m => map[m]);
}

// Функция отправки сообщения в Telegram
async function sendToTelegram(formData) {
    // Проверка rate limit
    if (!checkRateLimit()) {
        return {
            success: false,
            message: 'Слишком много запросов. Пожалуйста, подождите минуту.'
        };
    }

    // Валидация данных
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
        return {
            success: false,
            message: validationErrors.join('. ')
        };
    }

    const message = formatMessage(formData);
    const url = `${TELEGRAM_CONFIG.API_URL}${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CONFIG.CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();

        if (data.ok) {
            // Логирование успешной отправки
            console.log('Message sent successfully:', new Date().toISOString());
            return { success: true, message: 'Сообщение отправлено' };
        } else {
            throw new Error(data.description || 'Ошибка отправки');
        }
    } catch (error) {
        console.error('Telegram send error:', error);
        return {
            success: false,
            message: 'Не удалось отправить сообщение. Проверьте подключение к интернету.'
        };
    }
}

// Форматирование сообщения с экранированием
function formatMessage(formData) {
    const name = escapeHtml(formData.name || 'Не указано');
    const contact = escapeHtml(formData.contact || 'Не указан');
    const message = escapeHtml(formData.message || 'Не указан');

    return `🚀 <b>Новая заявка с сайта</b>

👤 <b>Имя:</b> ${name}
📞 <b>Контакт:</b> ${contact}
📝 <b>Текст:</b> ${message}

⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}`;
}

// Функция для обработки отправки формы
function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');

    // Блокируем кнопку отправки
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent || submitButton.value;
        if (submitButton.textContent) {
            submitButton.textContent = 'Отправка...';
        } else {
            submitButton.value = 'Отправка...';
        }
    }

    // Собираем данные формы
    const formData = {
        name: form.querySelector('[name="name"], [placeholder*="Имя"], [placeholder*="Name"], input[type="text"]')?.value || '',
        contact: form.querySelector('[name="contact"], [name="email"], [name="phone"], [type="email"], [type="tel"]')?.value || '',
        message: form.querySelector('[name="message"], textarea')?.value || ''
    };

    // Отправка в Telegram
    sendToTelegram(formData).then(result => {
        // Разблокируем кнопку
        if (submitButton) {
            submitButton.disabled = false;
            if (submitButton.textContent) {
                submitButton.textContent = submitButton.dataset.originalText;
            } else {
                submitButton.value = submitButton.dataset.originalText;
            }
        }

        if (result.success) {
            // Показываем уведомление об успехе
            showNotification('✅ Сообщение успешно отправлено!', 'success');

            // Очищаем форму
            form.reset();

            // Отправляем событие для аналитики (если есть)
            if (window.gtag) {
                gtag('event', 'form_submit', {
                    'event_category': 'contact',
                    'event_label': 'telegram_integration'
                });
            }
        } else {
            // Показываем ошибку
            showNotification('❌ ' + result.message, 'error');
        }
    }).catch(error => {
        // Разблокируем кнопку в случае ошибки
        if (submitButton) {
            submitButton.disabled = false;
            if (submitButton.textContent) {
                submitButton.textContent = submitButton.dataset.originalText;
            } else {
                submitButton.value = submitButton.dataset.originalText;
            }
        }

        showNotification('❌ Произошла ошибка. Попробуйте позже.', 'error');
        console.error('Form submit error:', error);
    });
}

// Функция показа уведомлений
function showNotification(message, type = 'success') {
    // Удаляем предыдущие уведомления
    const existingNotifications = document.querySelectorAll('.telegram-notification');
    existingNotifications.forEach(n => n.remove());

    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'telegram-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        max-width: 350px;
        word-wrap: break-word;
    `;

    // Добавляем стили анимации если их еще нет
    if (!document.getElementById('telegram-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'telegram-notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Удаляем уведомление через 4 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Инициализация при загрузке страницы
function initTelegramIntegration() {
    console.log('🚀 Telegram Integration: Initializing...');

    // Ждем, пока React отрендерит формы
    const observer = new MutationObserver((mutations, obs) => {
        const forms = document.querySelectorAll('form');

        if (forms.length > 0) {
            forms.forEach(form => {
                // Проверяем, не добавлен ли уже обработчик
                if (!form.dataset.telegramIntegrated) {
                    form.dataset.telegramIntegrated = 'true';

                    // Добавляем обработчик submit
                    form.addEventListener('submit', handleFormSubmit);

                    console.log('✅ Telegram Integration: Form integrated');
                }
            });
        }
    });

    // Начинаем наблюдение за изменениями в DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Также пытаемся найти формы сразу
    setTimeout(() => {
        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
            forms.forEach(form => {
                if (!form.dataset.telegramIntegrated) {
                    form.dataset.telegramIntegrated = 'true';
                    form.addEventListener('submit', handleFormSubmit);
                    console.log('✅ Telegram Integration: Form integrated (immediate)');
                }
            });
        } else {
            console.log('⚠️ Telegram Integration: No forms found yet, waiting...');
        }
    }, 1000);

    console.log('✅ Telegram Integration: Ready');
}

// Запускаем инициализацию после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegramIntegration);
} else {
    initTelegramIntegration();
}
