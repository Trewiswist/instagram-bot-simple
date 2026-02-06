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

    if (!messaging || !messaging.message) return res.sendStatus(200);
    if (messaging.message.is_echo) return res.sendStatus(200);

    const senderId = messaging.sender.id;

    // текст или payload кнопки
    const text = (messaging.message.text || messaging.message.quick_reply?.payload || '').trim().toLowerCase();

    console.log('📩 Пользователь:', text);

    // ===== ЛОГИКА =====
    switch (text) {
      case 'привет':
      case 'start':
        await sendMainMenu(senderId);
        break;

      case 'catalog':
        await sendProduct(senderId, 0); // первый товар
        break;

      case 'delivery':
        await sendText(senderId, '🚚 Доставка по Украине 1–3 дня.\nОплата при получении.');
        break;

      case 'manager':
        await sendText(senderId, '👩‍💼 Напишите номер телефона — менеджер свяжется с вами.');
        break;

      case 'next_product':
        await sendNextProduct(senderId);
        break;

      case 'order':
        await sendText(senderId, '📝 Для заказа напишите:\nИмя + телефон');
        break;

      default:
        await sendText(senderId, '❗ Не понимаю команду. Пожалуйста, выберите из меню.');
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
        text: 'Привет! Я помогу выбрать одежду 👗\nВыберите, что вас интересует ⬇️',
        quick_replies: [
          { content_type: 'text', title: '👗 Каталог', payload: 'catalog' },
          { content_type: 'text', title: '🚚 Доставка', payload: 'delivery' },
          { content_type: 'text', title: '👩‍💼 Менеджер', payload: 'manager' }
        ]
      }
    })
  });
}

// ===== ТОВАРЫ =====
const products = [
  { name: 'Платье «Алиса»', size: 'S–M–L', price: '1100 грн' },
  { name: 'Платье «Луна»', size: 'M–L', price: '1200 грн' },
  { name: 'Платье «Звезда»', size: 'S–L', price: '1300 грн' }
];

async function sendProduct(recipientId, index) {
  const product = products[index] || products[0];
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: {
        text: `👗 ${product.name}\nРазмеры: ${product.size}\nЦена: ${product.price}`,
        quick_replies: [
          { content_type: 'text', title: '🛒 Заказать', payload: 'order' },
          { content_type: 'text', title: '➡️ Другой товар', payload: 'next_product' }
        ]
      }
    })
  });
}

// ===== СЛЕДУЮЩИЙ ТОВАР =====
let productIndexMap = {}; // хранили индекс последнего товара для каждого пользователя

async function sendNextProduct(recipientId) {
  const currentIndex = productIndexMap[recipientId] || 0;
  const nextIndex = (currentIndex + 1) % products.length;
  productIndexMap[recipientId] = nextIndex;

  await sendProduct(recipientId, nextIndex);
}

// ===== СТАРТ СЕРВЕРА =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
