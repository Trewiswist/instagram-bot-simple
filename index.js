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
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== ПРИЁМ СООБЩЕНИЙ =====
app.post('/webhook', async (req, res) => {
  try {
    const messaging = req.body.entry?.[0]?.messaging?.[0];
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

      case 'DELIVERY':
        await sendDelivery(senderId);
        break;

      case 'MANAGER':
        await sendManager(senderId);
        break;

      case 'ORDER':
        await sendText(
          senderId,
          `Отлично 👍\n\nНапишите, пожалуйста:\n1️⃣ Ваше имя\n2️⃣ Номер телефона\n\nМенеджер свяжется с вами, уточнит размер и адрес доставки.`
        );
        break;

      default:
        await sendText(senderId, '❗ Пожалуйста, выберите вариант из меню');
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// ===== ОБЩИЕ ФУНКЦИИ =====
async function sendText(id, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id },
      message: { text }
    })
  });
}

async function sendQuickReplies(id, text, buttons) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id },
      message: {
        text,
        quick_replies: buttons.map(b => ({
          content_type: 'text',
          title: b.title,
          payload: b.payload
        }))
      }
    })
  });
}

// ===== ГЛАВНОЕ МЕНЮ =====
async function sendMainMenu(id) {
  await sendQuickReplies(id, '123', [
    { title: '👗 Каталог', payload: 'CATALOG' },
    { title: '📦 Доставка и оплата', payload: 'DELIVERY' },
    { title: '🙋 Менеджер', payload: 'MANAGER' }
  ]);
}

// ===== КАТЕГОРИИ =====
async function sendCategoryMenu(id) {
  await sendQuickReplies(id, '123', [
    { title: '👗 Платья', payload: 'DRESS' },
    { title: '🧥 Костюмы', payload: 'DRESS' },
    { title: '🧥 Верхняя одежда', payload: 'DRESS' },
    { title: '🩲 Нижнее бельё', payload: 'DRESS' }
  ]);
}

// ===== ПРОДУКТЫ =====
const products = [1, 2, 3];

async function sendProduct(id, index) {
  if (index >= products.length) {
    return sendQuickReplies(
      id,
      'Это все модели из этой категории 😊\nХотите выбрать что-то ещё?',
      [
        { title: '🔙 В каталог', payload: 'CATALOG' },
        { title: '🙋 Менеджер', payload: 'MANAGER' }
      ]
    );
  }

  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: '123',
                subtitle: '123\n123\n123',
                image_url: '123',
                buttons: [
                  { type: 'postback', title: '🛒 Заказать', payload: 'ORDER' },
                  {
                    type: 'postback',
                    title: '➡️ Другой товар',
                    payload: `DRESS${index + 2}`
                  }
                ]
              }
            ]
          }
        }
      }
    })
  });
}

// ===== ДОСТАВКА =====
async function sendDelivery(id) {
  await sendQuickReplies(
    id,
    `📦 Доставка — Новая Почта\n💳 Оплата — наложенный платёж при получении\n\nВсе детали уточняет менеджер после оформления заказа.`,
    [
      { title: '📦 В каталог', payload: 'CATALOG' },
      { title: '🙋 Менеджер', payload: 'MANAGER' }
    ]
  );
}

// ===== МЕНЕДЖЕР =====
async function sendManager(id) {
  await sendText(
    id,
    `Если у вас есть вопросы — мы с радостью поможем 😊\n\nНапишите, пожалуйста, как с вами связаться\n(имя + телефон)`
  );
}

// ===== СТАРТ =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен: ${PORT}`));
