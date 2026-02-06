import express from 'express';
import fetch from 'node-fetch'; // если Node <18

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
    if (!messaging || messaging.message?.is_echo) return res.sendStatus(200);

    const senderId = messaging.sender.id;

    const text =
      messaging.message.quick_reply?.payload ||
      messaging.message.text?.toUpperCase();

    if (!text) return res.sendStatus(200);

    console.log('📩 Пользователь:', text);

    switch (text) {
      case 'START':
      case 'ПРИВЕТ':
        await sendMainMenu(senderId);
        break;

      case 'CATALOG':
        await sendCategoryMenu(senderId);
        break;

      case 'DRESS':
        await sendProduct(senderId, 0);
        break;

      case 'DRESS2':
        await sendProduct(senderId, 1);
        break;

      case 'DRESS3':
        await sendProduct(senderId, 2);
        break;

      case 'ORDER':
        await sendText(senderId, '📝 Для заказа оставьте имя и номер телефона');
        break;

      case 'DELIVERY':
        await sendText(senderId, '🚚 Доставка по Украине 1–3 дня\nОплата при получении');
        break;

      case 'MANAGER':
        await sendText(senderId, '👩‍💼 Напишите номер телефона — менеджер свяжется с вами');
        break;

      default:
        await sendText(senderId, '❗ Пожалуйста, выберите вариант из меню');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Ошибка:', err);
    res.sendStatus(500);
  }
});

// ===== ФУНКЦИИ ОТПРАВКИ =====
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
        text: 'Привет! Я помогу выбрать одежду 👗',
        quick_replies: [
          { content_type: 'text', title: '👗 Каталог', payload: 'CATALOG' },
          { content_type: 'text', title: '🚚 Доставка', payload: 'DELIVERY' },
          { content_type: 'text', title: '👩‍💼 Менеджер', payload: 'MANAGER' }
        ]
      }
    })
  });
}

// ===== МЕНЮ КАТЕГОРИЙ =====
async function sendCategoryMenu(recipientId) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        text: 'Выберите категорию:',
        quick_replies: [
          { content_type: 'text', title: '👗 Платья', payload: 'DRESS' }
        ]
      }
    })
  });
}

// ===== ПРОДУКТЫ =====
const products = [
  { name: 'Платье «Алиса»', size: 'S–M–L', price: '1100 грн', photo: 'https://...' },
  { name: 'Платье «Луна»', size: 'S–M–L', price: '1200 грн', photo: 'https://...' },
  { name: 'Платье «Солнце»', size: 'S–M–L', price: '1300 грн', photo: 'https://...' }
];

async function sendProduct(recipientId, index) {
  const product = products[index];
  if (!product) return sendText(recipientId, '❗ Товар не найден');

  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        text: `👗 ${product.name}\nРазмеры: ${product.size}\nЦена: ${product.price}`,
        quick_replies: [
          { content_type: 'text', title: '🛒 Заказать', payload: 'ORDER' },
          {
            content_type: 'text',
            title: '➡️ Следующий',
            payload: index + 1 < products.length ? `DRESS${index + 2}` : 'CATALOG'
          }
        ]
      }
    })
  });
}

// ===== СТАРТ =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен: ${PORT}`));
