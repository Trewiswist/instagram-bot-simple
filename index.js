import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'my_verify_token';          // ← должен совпадать с тем, что указал в настройках webhook в Meta
const PAGE_TOKEN = 'EAAW7HPxJmKUBQqWEFdL9sfqxsmoBP4jPZAnzw7CvahZBAls3BaCqSdOCXzddbw0kjBBc73PIIMmuBwNhYbZAtunztGCOroZCoS75PZBWu91on9eud7156RRy1b3fFdazQhZArWLRB2u8Rclg7hvWxGrgpks2XAUUzlXfiX3e6aXyOt7NLv1zbLE9Q7k6IN2YY3FZBV27AZDZD';     // ← ВСТАВЬ СВОЙ РЕАЛЬНЫЙ ТОКЕН СТРАНИЦЫ!!!

// ===== Верификация webhook (обязательно должно работать) =====
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook успешно верифицирован!');
    return res.status(200).send(challenge);
  }
  console.log('Ошибка верификации webhook');
  return res.sendStatus(403);
});

// ===== Основной обработчик сообщений и кнопок =====
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (!body.object || !body.entry) return res.sendStatus(200);

    const messaging = body.entry[0]?.messaging?.[0];
    if (!messaging || messaging.message?.is_echo) return res.sendStatus(200);

    const senderId = messaging.sender.id;
    const payload = 
      messaging.postback?.payload ||
      messaging.message?.quick_reply?.payload ||
      (messaging.message?.text ? 'ANY_TEXT' : null);

    if (!payload) return res.sendStatus(200);

    console.log('Получен payload:', payload);

    // Любой текст → главное меню
    if (payload === 'ANY_TEXT') {
      await sendMainMenu(senderId);
      return res.sendStatus(200);
    }

    // Главные кнопки меню
    if (payload === 'CATALOG')    return sendCategoryMenu(senderId);
    if (payload === 'DELIVERY')   return sendDelivery(senderId);
    if (payload === 'MANAGER')    return sendManager(senderId);

    // Навигация
    if (payload === 'MENU')       return sendMainMenu(senderId);
    if (payload === 'ORDER')      return sendOrder(senderId);

    // Категории
    if (payload === 'CAT_DRESS')     return sendProduct(senderId, 'DRESS', 0);
    if (payload === 'CAT_SUIT')      return sendProduct(senderId, 'SUIT', 0);
    if (payload === 'CAT_OUTER')     return sendProduct(senderId, 'OUTER', 0);
    if (payload === 'CAT_UNDERWEAR') return sendProduct(senderId, 'UNDERWEAR', 0);

    // Переход к следующему товару
    const match = payload.match(/(DRESS|SUIT|OUTER|UNDERWEAR)_(\d+)/);
    if (match) {
      const [, category, index] = match;
      return sendProduct(senderId, category, Number(index));
    }

    // Если неизвестный payload — возвращаем в меню
    await sendMainMenu(senderId);
    res.sendStatus(200);
  } catch (err) {
    console.error('Ошибка в webhook:', err);
    res.sendStatus(500);
  }
});

// ===== ОДИН ТОВАР (пока одинаковый везде) =====
const PRODUCT = {
  title: 'Стильный зимний must-have 💜',
  subtitle: '❄️ Съёмный капюшон\n🧣 Тепло до -20°C\n\n📏 Размеры: 42–46, 48–50',
  image_url: 'https://images.prom.ua/6383632495_w640_h640_zhenskaya-zimnyaya-kurtka.jpg'
};

const PRODUCTS_PER_CATEGORY = 3;

// ===== Главное меню — вертикальные кнопки =====
async function sendMainMenu(id) {
  await sendTemplate(id, [{
    title: 'Добро пожаловать в магазин! ✨',
    subtitle: 'Выберите действие:',
    buttons: [
      { title: '👗 Каталог',        payload: 'CATALOG' },
      { title: '📦 Доставка и оплата', payload: 'DELIVERY' },
      { title: '🙋 Связь с менеджером', payload: 'MANAGER' }
    ]
  }]);
}

// ===== Категории =====
async function sendCategoryMenu(id) {
  await sendTemplate(id, [{
    title: 'Каталог',
    subtitle: 'Выберите категорию:',
    buttons: [
      { title: '👗 Платья',           payload: 'CAT_DRESS' },
      { title: '🧥 Костюмы',          payload: 'CAT_SUIT' },
      { title: '🧥 Верхняя одежда',   payload: 'CAT_OUTER' },
      { title: '🩲 Нижнее бельё',     payload: 'CAT_UNDERWEAR' },
      { title: '🔙 Назад в меню',     payload: 'MENU' }
    ]
  }]);
}

// ===== Товар =====
async function sendProduct(id, category, index) {
  if (index >= PRODUCTS_PER_CATEGORY) {
    return sendTemplate(id, [{
      title: 'Товары в этой категории закончились 😊',
      subtitle: 'Посмотрите другие разделы?',
      buttons: [
        { title: '👗 В каталог', payload: 'CATALOG' },
        { title: '🔙 Главное меню', payload: 'MENU' }
      ]
    }]);
  }

  await sendTemplate(id, [{
    title: PRODUCT.title,
    subtitle: PRODUCT.subtitle,
    image_url: PRODUCT.image_url,
    buttons: [
      { title: '🛒 Заказать',              payload: 'ORDER' },
      { title: '➡️ Следующий товар',       payload: `${category}_${index + 1}` },
      { title: '🔙 В меню',                payload: 'MENU' }
    ]
  }]);
}

// ===== Доставка =====
async function sendDelivery(id) {
  await sendTemplate(id, [{
    title: 'Доставка и оплата',
    subtitle: '📦 Новая Почта\n💳 Наложенный платёж / на карту\n\nМенеджер уточнит детали после заказа.',
    buttons: [
      { title: '👗 Перейти в каталог', payload: 'CATALOG' },
      { title: '🙋 Написать менеджеру', payload: 'MANAGER' },
      { title: '🔙 Главное меню',       payload: 'MENU' }
    ]
  }]);
}

// ===== Заказ =====
async function sendOrder(id) {
  await sendText(id,
    'Отлично! Чтобы оформить заказ, напишите:\n\n' +
    '1. Ваше имя\n' +
    '2. Номер телефона\n' +
    '3. Что хотите заказать (название / артикул / категорию)\n\n' +
    'Менеджер свяжется с вами в ближайшее время 💜'
  );
}

// ===== Связь с менеджером =====
async function sendManager(id) {
  await sendText(id,
    'Мы на связи 😊\n\nНапишите:\n• Имя\n• Телефон\n• Ваш вопрос или пожелание\n\nОтветим максимально быстро!'
  );
}

// ===== Отправка карусели (generic template) =====
async function sendTemplate(id, elements) {
  const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
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

  const result = await response.json();
  if (result.error) {
    console.error('Ошибка отправки template:', result.error);
  }
}

// ===== Отправка текста =====
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

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Бот запущен на порту ${PORT}`);
});