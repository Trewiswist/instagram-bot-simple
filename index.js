import express from 'express';

const app = express();
app.use(express.json());

// Настройки
const VERIFY_TOKEN = 'my_verify_token'; // сюда твой verify token
const PAGE_TOKEN = 'IGAAM33qWrI19BZAFpWUzVLYmJlY01ZAUy1oc3VodmtpUEljM09YOEFlZAzJiV2hWajBncUNvNnlsblI5SEh0OS03NkJXV2ZAGX0pJRmZAQdWkzRW9BNmRqd0lINFFORFo2UWtCOTBUa1pPbl81Y3FyVUowOVZAJVExpaFFhaGt4X0RJTQZDZD';    // сюда Page Access Token

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

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
