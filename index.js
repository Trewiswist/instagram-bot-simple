import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// === НАСТРОЙКИ ===
const VERIFY_TOKEN = 'my_verify_token'; // сюда твой verify token
const PAGE_TOKEN = 'EAAW7HPxJmKUBQqWEFdL9sfqxsmoBP4jPZAnzw7CvahZBAls3BaCqSdOCXzddbw0kjBBc73PIIMmuBwNhYbZAtunztGCOroZCoS75PZBWu91on9eud7156RRy1b3fFdazQhZArWLRB2u8Rclg7hvWxGrgpks2XAUUzlXfiX3e6aXyOt7NLv1zbLE9Q7k6IN2YY3FZBV27AZDZD'; // сюда Page Access Token

// === ПРОВЕРКА WEBHOOK (Meta) ===
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

        if (!messaging) return res.sendStatus(200);

        const senderId = messaging.sender.id;
        const text = messaging.message?.text;

        console.log('📩 Сообщение:', text);

        if (text?.toLowerCase() === 'привет') {
            // Отправляем приветствие с кнопками Quick Replies
            await sendQuickReplies(senderId);
        } else if (messaging.message?.quick_reply?.payload) {
            // Пользователь нажал на кнопку
            const payload = messaging.message.quick_reply.payload;
            console.log('📤 Payload кнопки:', payload);

            // Пример реакции на кнопки
            if (payload === 'PRODUCTS') {
                await sendMessage(senderId, 'Вот наши товары 👗');
            } else if (payload === 'SIZES') {
                await sendMessage(senderId, 'Размеры: S, M, L, XL 📏');
            } else if (payload === 'DELIVERY') {
                await sendMessage(senderId, 'Доставка: курьер или самовывоз 🚚');
            } else if (payload === 'MANAGER') {
                await sendMessage(senderId, 'Связь с менеджером 👩‍💼: +380XXXXXXXXX');
            } else {
                await sendMessage(senderId, 'Вы выбрали: ' + payload);
            }
        } else {
            await sendMessage(senderId, 'Я помогу выбрать одежду 👗\nНапиши "Привет", чтобы начать.');
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.sendStatus(500);
    }
});

// === ФУНКЦИЯ ОТПРАВКИ QUICK REPLIES ===
async function sendQuickReplies(recipientId) {
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`;

    const body = {
        recipient: { id: recipientId },
        message: {
            text: 'Привет! Я помогу выбрать одежду 👗\nВыберите, что вас интересует ⬇️',
            quick_replies: [
                { content_type: 'text', title: '👗 Товары', payload: 'PRODUCTS' },
                { content_type: 'text', title: '📏 Размеры', payload: 'SIZES' },
                { content_type: 'text', title: '🚚 Доставка', payload: 'DELIVERY' },
                { content_type: 'text', title: '👩‍💼 Менеджер', payload: 'MANAGER' },
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

// === ПРОСТАЯ ОТПРАВКА СООБЩЕНИЯ ===
async function sendMessage(recipientId, text) {
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text }
        })
    });

    const data = await response.json();
    console.log('📤 Ответ Meta:', data);
}

// === ЗАПУСК СЕРВЕРА ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
