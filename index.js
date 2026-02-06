import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ===== НАСТРОЙКИ =====
const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'EAAW7HPxJmKUBQqWEFdL9sfqxsmoBP4jPZAnzw7CvahZBAls3BaCqSdOCXzddbw0kjBBc73PIIMmuBwNhYbZAtunztGCOroZCoS75PZBWu91on9eud7156RRy1b3fFdazQhZArWLRB2u8Rclg7hvWxGrgpks2XAUUzlXfiX3e6aXyOt7NLv1zbLE9Q7k6IN2YY3FZBV27AZDZD';

// ===== ПРОВЕРКА WEBHOOK =====
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

// ===== ПРИЁМ СООБЩЕНИЙ =====
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    // ❌ нет сообщения
    if (!messaging || !messaging.message) {
      return res.sendStatus(200);
    }

    // ❌ echo (бот не отвечает сам себе)
    if (messaging.message.is_echo) {
      return res.sendStatus(200);
    }

    const senderId = messaging.sender.id;

    // текст или payload кнопки
    const text =
      messaging.message.text ||
      messaging.message.quick_reply?.payload;

    if (!text) {
      return res.sendStatus(200);
    }

    console.log('📩 Пользователь:', text);

    // ===== ЛОГИКА =====
    if (text.toLowerCase() === 'привет' || text === 'START') {
      await sendMainMenu(senderId);
    }

    else if (text === 'CATALOG') {
      await sendProduct(senderId);
    }

    else if (text === 'DELIVERY') {
      await sendText(senderId, '🚚 Доставка по Украине 1–3 дня.\nОплата при получении.');
    }

    else if (text === 'MANAGER') {
      await sendText(senderId, '👩‍💼 Напишите номер телефона — менеджер свяжется с вами.');
    }

    else if (text === 'NEXT_PRODUCT') {
      await sendText(senderId, '👗 Другой товар:\nПлатье «Луна»\nЦена: 1200 грн');
    }

    else if (text === 'ORDER') {
      await sendText(senderId, '📝 Для заказа напишите:\nИмя + телефон');
    }

    res.sendStatus(200);

  } catch (err) {
    console.error('❌ Ошибка:', err);
    res.sendStatus(500);
  }
});

// ===== СООБЩЕНИЯ =====
async function sendText(recipientId, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text }
    })
  });
}

// ===== ГЛАВНОЕ МЕНЮ =====
async function sendMainMenu(recipientId) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        text: 'Привет! Я помогу выбрать одежду 👗\nВыберите, что вас интересует ⬇️',
        quick_replies: [
          { content_type: 'text', title: '👗 Товары', payload: 'CATALOG' },
          { content_type: 'text', title: '🚚 Доставка', payload: 'DELIVERY' },
          { content_type: 'text', title: '👩‍💼 Менеджер', payload: 'MANAGER' }
        ]
      }
    })
  });
}

// ===== ТОВАР =====
async function sendProduct(recipientId) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        text: '👗 Платье «Алиса»\nРазмеры: S–M–L\nЦена: 1100 грн',
        quick_replies: [
          { content_type: 'text', title: '🛒 Заказать', payload: 'ORDER' },
          { content_type: 'text', title: '➡️ Другой', payload: 'NEXT_PRODUCT' }
        ]
      }
    })
  });
}

// ===== СТАРТ =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
