import express from 'express';
import fetch from 'node-fetch'; // убедись, что пакет установлен через npm install node-fetch

const app = express();
app.use(express.json());

// Настройки
const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'IGAAM33qWrI19BZAFpWUzVLYmJlY01ZAUy1oc3VodmtpUEljM09YOEFlZAzJiV2hWajBncUNvNnlsblI5SEh0OS03NkJXV2ZAGX0pJRmZAQdWkzRW9BNmRqd0lINFFORFo2UWtCOTBUa1pPbl81Y3FyVUowOVZAJVExpaFFhaGt4X0RJTQZDZD';

// Endpoint для проверки Webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Endpoint для получения сообщений
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        body.entry.forEach(async (entry) => {
            const messaging = entry.messaging || [];
            messaging.forEach(async (event) => {
                if (event.message && event.sender) {
                    const senderId = event.sender.id;
                    console.log('Получено сообщение от:', senderId);

                    // Отправляем первый ответ
                    await sendMessage(senderId, 'Привет! Это первый ответ от тестового бота.');
                }
            });
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Функция отправки сообщения через Instagram Graph API
async function sendMessage(recipientId, messageText) {
    const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_TOKEN}`;
    const payload = {
        recipient: { id: recipientId },
        message: { text: messageText }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log('Ответ отправлен:', data);
    } catch (err) {
        console.error('Ошибка при отправке сообщения:', err);
    }
}

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
