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

    if (!messaging || !messaging.message || messaging.message.is_echo) {
      return res.sendStatus(200);
    }

    const senderId = messaging.sender.id;
    const text = messaging.message.text || messaging.message.quick_reply?.payload;

    if (!text) return res.sendStatus(200);

    console.log('📩 Пользователь:', text);

    // ===== ЛОГИКА =====
    switch (text) {
      case 'привет':
      case 'START':
        await sendMainMenu(senderId);
        break;

      // ===== КАТАЛОГ =====
      case 'CATALOG':
        await sendCategoryMenu(senderId);
        break;

      case 'DRESSES':
        await sendProduct(senderId, 'Платья');
        break;

      case 'SUITS':
        await sendProduct(senderId, 'Костюмы');
        break;

      case 'OUTER':
        await sendProduct(senderId, 'Верхняя одежда');
        break;

      case 'UNDER':
        await sendProduct(senderId, 'Нижнее белье');
        break;

      case 'NEXT_PRODUCT':
        await sendNextProduct(senderId);
        break;

      case 'ORDER':
        await sendText(senderId, '📝 Для заказа оставьте свои контакты (Имя + телефон), менеджер свяжется с вами.');
        break;

      case 'DELIVERY':
        await sendText(senderId, '🚚 Доставка по Украине 1–3 дня. Оплата при получении.');
        break;

      case 'MANAGER':
        await sendText(senderId, '👩‍💼 Напишите, как с вами связаться, и менеджер свяжется с вами.');
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

// ===== ФУНКЦИИ =====
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
          { content_type: 'text', title: 'Платья', payload: 'DRESSES' },
          { content_type: 'text', title: 'Костюмы', payload: 'SUITS' },
          { content_type: 'text', title: 'Верхняя одежда', payload: 'OUTER' },
          { content_type: 'text', title: 'Нижнее белье', payload: 'UNDER' }
        ]
      }
    })
  });
}

// ===== ТОВАРЫ =====
const products = {
  'Платья': [
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' }
  ],
  'Костюмы': [
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' }
  ],
  'Верхняя одежда': [
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' }
  ],
  'Нижнее белье': [
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' },
    { name: '123', size: '123', price: '123' }
  ]
};

let productIndex = 0;
let currentCategory = 'Платья';

async function sendProduct(recipientId, category) {
  currentCategory = category;
  productIndex = 0;
  const product = products[category][productIndex];

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
          { content_type: 'text', title: '➡️ Другой товар', payload: 'NEXT_PRODUCT' }
        ]
      }
    })
  });
}

async function sendNextProduct(recipientId) {
  productIndex++;
  const categoryProducts = products[currentCategory];

  if (productIndex >= categoryProducts.length) productIndex = 0;

  const product = categoryProducts[productIndex];

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
          { content_type: 'text', title: '➡️ Другой товар', payload: 'NEXT_PRODUCT' }
        ]
      }
    })
  });
}

// ===== СТАРТ СЕРВЕРА =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
