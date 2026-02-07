import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ===== НАСТРОЙКИ =====
const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'ТВОЙ_PAGE_ACCESS_TOKEN';

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

    switch (text) {
      case 'START':
      case 'ПРИВЕТ':
        await sendMainMenu(senderId);
        break;

      case 'CATALOG':
        await sendCategoryMenu(senderId);
        break;

      case 'DRESS':
        await sendProduct(senderId);
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
  await sendQuickReplies(id, 'Выберите раздел 👇', [
    { title: '👗 Каталог', payload: 'CATALOG' },
    { title: '📦 Доставка и оплата', payload: 'DELIVERY' },
    { title: '🙋 Менеджер', payload: 'MANAGER' }
  ]);
}

// ===== КАТЕГОРИИ =====
async function sendCategoryMenu(id) {
  await sendQuickReplies(id, 'Выберите категорию 👇', [
    { title: '👗 Платья', payload: 'DRESS' },
    { title: '🧥 Костюмы', payload: 'DRESS' },
    { title: '🧥 Верхняя одежда', payload: 'DRESS' },
    { title: '🩲 Нижнее бельё', payload: 'DRESS' }
  ]);
}

// ===== ОДИН ТОВАР (ПЛАТЬЯ) =====
async function sendProduct(id) {
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
                title: "Короткий оверсайз дутик с съёмным капюшоном ❄️",
                subtitle:
                  "1244 ₴\n\n" +
                  "Стильный зимний must-have 💜\n\n" +
                  "❄️ Съёмный капюшон\n" +
                  "🧣 Тепло до -20°C\n\n" +
                  "📏 Размеры: 42–46, 48–50",
                image_url:
                  "https://images.prom.ua/6383632495_w640_h640_zhenskaya-zimnyaya-kurtka.jpg",
                buttons: [
                  {
                    type: 'postback',
                    title: '🛒 Заказать',
                    payload: 'ORDER'
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
    `📦 Доставка — Новая Почта\n💳 Оплата — наложенный платёж при получении\n\nВсе детали уточняет менеджер.`,
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
