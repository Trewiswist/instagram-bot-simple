import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ===== НАСТРОЙКИ =====
const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'EAAW7HPxJmKUBQqWEFdL9sfqxsmoBP4jPZAnzw7CvahZBAls3BaCqSdOCXzddbw0kjBBc73PIIMmuBwNhYbZAtunztGCOroZCoS75PZBWu91on9eud7156RRy1b3fFdazQhZArWLRB2u8Rclg7hvWxGrgpks2XAUUzlXfiX3e6aXyOt7NLv1zbLE9Q7k6IN2YY3FZBV27AZDZD';

// ===== ТОВАРЫ (демо) =====
const products = [
  {
    image: 'https://via.placeholder.com/500x600.png?text=Dress+1',
    text: '👗 Платье Classic\n\n▫️ Размеры: S / M / L\n▫️ Ткань: хлопок\n▫️ Цена: 1200 грн'
  },
  {
    image: 'https://via.placeholder.com/500x600.png?text=Dress+2',
    text: '👗 Платье Elegant\n\n▫️ Размеры: M / L\n▫️ Ткань: вискоза\n▫️ Цена: 1450 грн'
  }
];

// простая память
const userState = {};

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

// ===== ПОЛУЧЕНИЕ СООБЩЕНИЙ =====
app.post('/webhook', async (req, res) => {
  try {
    const messaging = req.body.entry?.[0]?.messaging?.[0];
    if (!messaging?.sender?.id) return res.sendStatus(200);

    const senderId = messaging.sender.id;
    const text = messaging.message?.text;

    console.log('📩 Сообщение:', text);

    if (!text || text.toLowerCase() === 'привет') {
      userState[senderId] = { productIndex: 0 };
      await sendMainMenu(senderId);
    }

    if (text === '👗 Товары') {
      userState[senderId] = { productIndex: 0 };
      await sendProduct(senderId);
    }

    if (text === '➡️ Другой товар') {
      userState[senderId].productIndex =
        (userState[senderId].productIndex + 1) % products.length;
      await sendProduct(senderId);
    }

    if (text === '🛒 Заказать') {
      await sendText(senderId, '✍️ Напишите ваш номер телефона, и менеджер свяжется с вами.');
    }

    if (text === '📏 Размеры') {
      await sendText(senderId, '📏 Размеры: S / M / L\nЕсли нужен совет — напишите менеджеру 👩‍💼');
    }

    if (text === '🚚 Доставка') {
      await sendText(senderId, '🚚 Доставка по Украине\nНовой Почтой 1–3 дня');
    }

    if (text === '👩‍💼 Менеджер') {
      await sendText(senderId, '👩‍💼 Менеджер скоро свяжется с вами');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Ошибка:', err);
    res.sendStatus(500);
  }
});

// ===== ФУНКЦИИ ОТПРАВКИ =====
async function sendMainMenu(id) {
  await sendQuickReplies(id,
    'Привет! Я помогу выбрать одежду 👗\nВыберите, что вас интересует ⬇️',
    ['👗 Товары', '📏 Размеры', '🚚 Доставка', '👩‍💼 Менеджер']
  );
}

async function sendProduct(id) {
  const product = products[userState[id].productIndex];

  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id },
      message: {
        attachment: {
          type: 'image',
          payload: { url: product.image }
        }
      }
    })
  });

  await sendQuickReplies(id, product.text, ['🛒 Заказать', '➡️ Другой товар']);
}

async function sendText(id, text) {
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
      recipient: { id },
      message: {
        text,
        quick_replies: buttons.map(b => ({
          content_type: 'text',
          title: b,
          payload: b
        }))
      }
    })
  });
}

// ===== ЗАПУСК =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
