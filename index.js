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

    // Сначала берём payload от кнопки, если нет — текст
    const text = (messaging.message.quick_reply?.payload || messaging.message.text || '').trim().toLowerCase();

    console.log('📩 Пользователь:', text);

    // ===== ЛОГИКА БОТА =====
    switch (text) {
      case 'start':
      case 'привет':
        await sendMainMenu(senderId);
        break;

      case 'catalog':
        await sendCategoryMenu(senderId);
        break;

      case 'dresses':
        await sendProduct(senderId, 0); // первый товар платья
        break;

      case 'next_product':
        await sendProduct(senderId, 1); // следующий товар
        break;

      case 'order':
        await sendText(senderId, '📝 Для заказа напишите: Имя + телефон');
        break;

      case 'delivery':
        await sendText(senderId, '🚚 Доставка по Украине 1–3 дня.\nОплата при получении.');
        break;

      case 'manager':
        await sendText(senderId, '👩‍💼 Напишите номер телефона — менеджер свяжется с вами.');
        break;

      default:
        await sendText(senderId, '❗ Не понимаю команду. Пожалуйста, выберите из меню.');
        await sendMainMenu(senderId);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error('❌ Ошибка:', err);
    res.sendStatus(500);
  }
});

// ===== ФУНКЦИИ СООБЩЕНИЙ =====
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
          { content_type: 'text',
