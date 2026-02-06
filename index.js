import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// === НАСТРОЙКИ ===
const VERIFY_TOKEN = 'my_verify_token'; // сюда твой verify token
const PAGE_TOKEN = 'EAAW7HPxJmKUBQqWEFdL9sfqxsmoBP4jPZAnzw7CvahZBAls3BaCqSdOCXzddbw0kjBBc73PIIMmuBwNhYbZAtunztGCOroZCoS75PZBWu91on9eud7156RRy1b3fFdazQhZArWLRB2u8Rclg7hvWxGrgpks2XAUUzlXfiX3e6aXyOt7NLv1zbLE9Q7k6IN2YY3FZBV27AZDZD'; // сюда Page Access Token

// === ПРОВЕРКА WEBHOOK ===
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified');
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

// === ПРИЁМ СООБЩЕНИЙ ===
app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const messaging = entry?.messaging?.[0];

        if (!messaging || !messaging.message?.text) {
            return res.sendStatus(200);
        }

        const senderId = messaging.sender.id;
        const text = messaging.message.text.toLowerCase();

        console.log('📩 Сообщение:', text);

        // === ЭТАП 1: каркас с кнопками ===
        if (text.includes('привет')) {
            await sendQuickReplies(senderId, 'Привет! Я помогу выбрать одежду 👗\nВыберите, что вас интересует ⬇️');
        } else {
            await sendQuickReplies(senderId, 'Выберите опцию ⬇️');
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.sendStatus(500);
    }
});

// === ОТПРАВКА КНОПОК QUICK REPLIES ===
async function sendQuickReplies(recipientId, text) {
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`;

    const body = {
        recipient: { id: recipientId },
        message: {
            text: text,
            quick_replies: [
                { content_type: "text", title: "👗 Товары", payload: "PRODUCTS" },
                { content_type: "text", title: "📏 Размеры", payload: "SIZES" },
                { content_type: "text", title: "🚚 Доставка", payload: "DELIVERY" },
                { content_type: "text", title: "👩‍💼 Менеджер", payload: "MANAGER" }
            ]
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('📤 Ответ Meta:', data);
}

// === ЗАПУСК СЕРВЕРА ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
