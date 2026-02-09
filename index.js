import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'EAAW7HPxJmKUBQqWEFdL9sfqxsmoBP4jPZAnzw7CvahZBAls3BaCqSdOCXzddbw0kjBBc73PIIMmuBwNhYbZAtunztGCOroZCoS75PZBWu91on9eud7156RRy1b3fFdazQhZArWLRB2u8Rclg7hvWxGrgpks2XAUUzlXfiX3e6aXyOt7NLv1zbLE9Q7k6IN2YY3FZBV27AZDZD';

// ===== WEBHOOK VERIFY =====
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== WEBHOOK =====
app.post('/webhook', async (req, res) => {
  try {
    const messaging = req.body.entry?.[0]?.messaging?.[0];
    if (!messaging || messaging.message?.is_echo) return res.sendStatus(200);

    const senderId = messaging.sender.id;
    const payload =
      messaging.message.quick_reply?.payload ||
      messaging.postback?.payload ||
      'ANY_TEXT';

    console.log('📩 Payload:', payload);

    switch (payload) {
      case 'CATALOG':
        await sendCategoryMenu(senderId);
        break;

      case 'DELIVERY':
        await sendDelivery(senderId);
        break;

      case 'MANAGER':
        await sendManager(senderId);
        break;

      case 'CAT_DRESS':
        await sendProduct(senderId, 'DRESS', 0);
        break;

      case 'CAT_SUIT':
        await sendProduct(senderId, 'SUIT', 0);
        break;

      case 'CAT_OUTER':
        await sendProduct(senderId, 'OUTER', 0);
        break;

      case 'CAT_UNDERWEAR':
        await sendProduct(senderId, 'UNDERWEAR', 0);
        break;

      default:
        // 🔥 ЛЮБОЙ ТЕКСТ → МЕНЮ
        await sendMainMenu(senderId);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// ===== ДАННЫЕ ТОВАРА =====
const demoProduct = {
  title: '123',
  subtitle:
    'Стильный зимний must-have 💜\n\n' +
    '❄️ Съёмный капюшон\n' +
    '🧣 Тепло до -20°C\n\n' +
    '📏 Размеры: 42–46, 48–50',
  image:
    'https://images.prom.ua/6383632495_w640_h640_zhenskaya-zimnyaya-kurtka.jpg'
};

const PRODUCTS_COUNT = 3;

// ===== ГЛАВНОЕ МЕНЮ (ВЕРТИКАЛЬНО) =====
async function sendMainMenu(id) {
  await sendTemplate(id, [
    {
      title: 'Добро пожаловать 👋',
      subtitle: 'Я помогу выбрать одежду',
      buttons: [
        { title: '👗 Каталог', payload: 'CATALOG' },
        { title: '📦 Доставка и оплата', payload: 'DELIVERY' },
        { title: '🙋 Менеджер', payload: 'MANAGER' }
      ]
    }
  ]);
}

// ===== КАТЕГОРИИ =====
async function sendCategoryMenu(id) {
  await sendTemplate(id, [
    {
      title: 'Категории',
      subtitle: 'Выберите категорию',
      buttons: [
        { title: '👗 Платья', payload: 'CAT_DRESS' },
        { title: '🧥 Костюмы', payload: 'CAT_SUIT' },
        { title: '🧥 Верхняя одежда', payload: 'CAT_OUTER' },
        { title: '🩲 Нижнее бельё', payload: 'CAT_UNDERWEAR' }
      ]
    }
  ]);
}

// ===== ТОВАР =====
async function sendProduct(id, category, index) {
  if (index >= PRODUCTS_COUNT) {
    return sendTemplate(id, [
      {
        title: 'Это все модели 😊',
        subtitle: 'Хотите выбрать что-то ещё?',
        buttons: [
          { title: '🔙 В каталог', payload: 'CATALOG' },
          { title: '🙋 Менеджер', payload: 'MANAGER' }
        ]
      }
    ]);
  }

  await sendTemplate(id, [
    {
      title: demoProduct.title,
      subtitle: demoProduct.subtitle,
      image_url: demoProduct.image,
      buttons: [
        { title: '🛒 Заказать', payload: 'ORDER' },
        {
          title: '➡️ Другой товар',
          payload: `${category}_${index + 1}`
        }
      ]
    }
  ]);
}

// ===== ДОСТАВКА =====
async function sendDelivery(id) {
  await sendTemplate(id, [
    {
      title: 'Доставка и оплата',
      subtitle:
        '📦 Новая Почта\n💳 Наложенный платёж\n\nВсе детали уточняет менеджер',
      buttons: [
        { title: '📦 В каталог', payload: 'CATALOG' },
        { title: '🙋 Менеджер', payload: 'MANAGER' }
      ]
    }
  ]);
}

// ===== МЕНЕДЖЕР =====
async function sendManager(id) {
  await sendText(
    id,
    'Если у вас есть вопросы — мы с радостью поможем 😊\n\nНапишите имя и номер телефона'
  );
}

// ===== TEMPLATE =====
async function sendTemplate(id, elements) {
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
            elements: elements.map(el => ({
              title: el.title,
              subtitle: el.subtitle,
              image_url: el.image_url,
              buttons: el.buttons.map(b => ({
                type: 'postback',
                title: b.title,
                payload: b.payload
              }))
            }))
          }
        }
      }
    })
  });
}

// ===== TEXT =====
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

// ===== START =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен: ${PORT}`));
