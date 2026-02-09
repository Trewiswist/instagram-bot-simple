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
      messaging.postback?.payload ||
      messaging.message.quick_reply?.payload ||
      'ANY_TEXT';

    console.log('📩 Payload:', payload);

    // Любой текст от пользователя → главное меню
    if (payload === 'ANY_TEXT') {
      await sendMainMenu(senderId);
      return res.sendStatus(200);
    }

    // Роутер
    if (payload === 'CATALOG')    return sendCategoryMenu(senderId);
    if (payload === 'DELIVERY')   return sendDelivery(senderId);
    if (payload === 'MANAGER')    return sendManager(senderId);
    if (payload === 'ORDER')      return sendOrder(senderId);
    if (payload === 'MENU')       return sendMainMenu(senderId);

    // Категории
    if (payload === 'CAT_DRESS')     return sendProduct(senderId, 'DRESS', 0);
    if (payload === 'CAT_SUIT')      return sendProduct(senderId, 'SUIT', 0);
    if (payload === 'CAT_OUTER')     return sendProduct(senderId, 'OUTER', 0);
    if (payload === 'CAT_UNDERWEAR') return sendProduct(senderId, 'UNDERWEAR', 0);

    // Конкретный товар
    const match = payload.match(/(DRESS|SUIT|OUTER|UNDERWEAR)_(\d+)/);
    if (match) {
      const [, category, index] = match;
      return sendProduct(senderId, category, Number(index));
    }

    // На всякий случай — если неизвестный payload
    await sendMainMenu(senderId);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// ===== ДАННЫЕ ТОВАРА (один на все категории пока) =====
const PRODUCT = {
  title: 'Стильный зимний must-have 💜',
  subtitle:
    '❄️ Съёмный капюшон\n' +
    '🧣 Тепло до -20°C\n\n' +
    '📏 Размеры: 42–46, 48–50',
  image_url: 'https://images.prom.ua/6383632495_w640_h640_zhenskaya-zimnyaya-kurtka.jpg'
};

const PRODUCTS_PER_CATEGORY = 3;

// ===== ГЛАВНОЕ МЕНЮ (вертикальные кнопки) =====
async function sendMainMenu(id) {
  await sendTemplate(id, [
    {
      title: 'Добро пожаловать! ✨',
      subtitle: 'Чем могу помочь?',
      buttons: [
        { title: '👗 Каталог', payload: 'CATALOG' },
        { title: '📦 Доставка и оплата', payload: 'DELIVERY' },
        { title: '🙋 Связь с менеджером', payload: 'MANAGER' }
      ]
    }
  ]);
}

// ===== МЕНЮ КАТЕГОРИЙ (вертикально) =====
async function sendCategoryMenu(id) {
  await sendTemplate(id, [
    {
      title: 'Каталог',
      subtitle: 'Выберите категорию:',
      buttons: [
        { title: '👗 Платья', payload: 'CAT_DRESS' },
        { title: '🧥 Костюмы', payload: 'CAT_SUIT' },
        { title: '🧥 Верхняя одежда', payload: 'CAT_OUTER' },
        { title: '🩲 Нижнее бельё', payload: 'CAT_UNDERWEAR' },
        { title: '🔙 В меню', payload: 'MENU' }
      ]
    }
  ]);
}

// ===== ОТПРАВКА ТОВАРА =====
async function sendProduct(id, category, index) {
  if (index >= PRODUCTS_PER_CATEGORY) {
    await sendTemplate(id, [
      {
        title: 'Это все модели в категории 😊',
        subtitle: 'Хотите посмотреть ещё?',
        buttons: [
          { title: '🔙 В каталог', payload: 'CATALOG' },
          { title: '🔙 Главное меню', payload: 'MENU' }
        ]
      }
    ]);
    return;
  }

  await sendTemplate(id, [
    {
      title: PRODUCT.title,
      subtitle: PRODUCT.subtitle,
      image_url: PRODUCT.image_url,
      buttons: [
        { title: '🛒 Заказать', payload: 'ORDER' },
        { title: '➡️ Следующий товар', payload: `${category}_${index + 1}` },
        { title: '🔙 Меню', payload: 'MENU' }
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
        '📦 Новая Почта\n' +
        '💳 Наложенный платёж / Оплата на карту\n\n' +
        'Все детали и точную стоимость уточняет менеджер после заказа.',
      buttons: [
        { title: '👗 В каталог', payload: 'CATALOG' },
        { title: '🙋 Менеджер', payload: 'MANAGER' },
        { title: '🔙 Главное меню', payload: 'MENU' }
      ]
    }
  ]);
}

// ===== ЗАКАЗ =====
async function sendOrder(id) {
  await sendText(
    id,
    'Отлично! 👍\n\nНапишите, пожалуйста:\n' +
    '1️⃣ Ваше имя\n' +
    '2️⃣ Номер телефона\n' +
    '3️⃣ Что именно хотите заказать (можно скопировать название или категорию)\n\n' +
    'Менеджер свяжется с вами в ближайшее время ❤️'
  );
}

// ===== МЕНЕДЖЕР =====
async function sendManager(id) {
  await sendText(
    id,
    'Мы на связи! 😊\n\nНапишите, пожалуйста:\n' +
    '• Ваше имя\n' +
    '• Номер телефона\n' +
    '• Ваш вопрос или пожелание\n\n' +
    'Ответим максимально быстро!'
  );
}

// ===== ОТПРАВКА КАРУСЕЛИ (generic template) =====
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
              subtitle: el.subtitle || '',
              image_url: el.image_url || undefined,
              buttons: (el.buttons || []).map(b => ({
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

// ===== ПРОСТО ТЕКСТ =====
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

// ===== ЗАПУСК СЕРВЕРА =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));