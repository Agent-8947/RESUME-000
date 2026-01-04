// Server-side Telegram Integration Example (Node.js + Express)
// Этот файл показывает, как реализовать безопасную серверную интеграцию

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 3, // максимум 3 запроса
    message: { success: false, message: 'Слишком много запросов. Попробуйте позже.' }
});

// Валидация данных
function validateFormData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 2) {
        errors.push('Имя должно содержать минимум 2 символа');
    }

    if (!data.contact || data.contact.trim().length < 5) {
        errors.push('Контакт должен быть заполнен');
    }

    // Проверка на подозрительный контент
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i
    ];

    const allText = Object.values(data).join(' ');
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

// Форматирование сообщения
function formatMessage(data) {
    const name = escapeHtml(data.name || 'Не указано');
    const contact = escapeHtml(data.contact || 'Не указан');
    const message = escapeHtml(data.message || 'Не указан');

    return `🚀 <b>Новая заявка с сайта</b>

👤 <b>Имя:</b> ${name}
📞 <b>Контакт:</b> ${contact}
📝 <b>Текст:</b> ${message}

⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
🌐 <b>IP:</b> ${data.ip || 'Не определен'}`;
}

// Отправка в Telegram
async function sendToTelegram(message) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Telegram API Error:', error);
        throw error;
    }
}

// Endpoint для отправки формы
app.post('/api/contact', limiter, async (req, res) => {
    try {
        // Валидация
        const errors = validateFormData(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: errors.join('. ')
            });
        }

        // Добавляем IP адрес
        const formData = {
            ...req.body,
            ip: req.ip || req.connection.remoteAddress
        };

        // Форматируем и отправляем
        const message = formatMessage(formData);
        const result = await sendToTelegram(message);

        if (result.ok) {
            // Логирование
            console.log(`[${new Date().toISOString()}] Message sent successfully from ${formData.ip}`);

            res.json({
                success: true,
                message: 'Сообщение успешно отправлено'
            });
        } else {
            throw new Error(result.description || 'Ошибка Telegram API');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера. Попробуйте позже.'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Telegram integration ready`);
});

module.exports = app;
