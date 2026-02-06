import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// === НАСТРОЙКИ ===
const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'ТВОЙ_PAGE_ACCESS_TOKEN';

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

        if (!messaging || !messaging.message?.text) {
            return res.sendStatus(200);
        }

        const senderId = messaging.sender.id;
        const text = messaging.message.text;

        console.log('📩 Сообщение:', text);

        // ОТВЕТ
        await sendMessage(senderId, 'Привет! Я бот 👋');

        res.sendStatus(200);
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.sendStatus(500);
    }
});

// === ОТПРАВКА СООБЩЕНИЯ ===
async function sendMessage(recipientId, text) {
    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text }
        })
    });
}

// === ЗАПУСК ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
