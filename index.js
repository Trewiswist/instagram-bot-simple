import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'my_verify_token';
const PAGE_TOKEN = 'EAAW7HPxJmKUBQmXPP1yCrwRzeYoZBgQ8vudSxI7y9q9hBZAH1BmsS6ZCEk8EN9y45b8zqIGLYmKJ5ljFoAhT7mdW8DDvRr6wnk8TV7oLx6Qmie4LZCpVC8nLIZBCzags0Leic6gFSu5zJNZCGC7VndAKHVuM7rOKZAJUPzqDRyFwFWqZA2kZCehuveEQsogtktGwXcbg0sgZDZD'; // ← ОБЯЗАТЕЛЬНО ЗАМЕНИ

// ====================== ПАМЯТЬ ЗАКАЗОВ ======================
const userState = {}; // senderId → { product, step }

// ====================== ТОВАРЫ ======================
const PRODUCTS = {
  DRESS: [
    {
      name: 'Платье из двухсторонней ангоры с вышивкой ✨ 7560',
      title: 'Платье из двухсторонней ангоры с вышивкой ✨ 7560',
      subtitle: '1165 ₴\n\nМягчайшая двухсторонняя ангора 🤍\nВысокий уютный гольф + роскошная вышивка\nСвободный крой • Длина миди\nРазмеры: S–M (42–44), L–XL (46–48), 2XL–3XL (50–52)',
      image_url: 'https://images.prom.ua/6878199359_w640_h640_plate-iz-dvustoronnego.jpg'
    },
    {
      name: 'Базовое тёплое платье с акцентом на талии 🖤✨ Мод. 368',
      title: 'Базовое тёплое платье с акцентом на талии 🖤✨ Мод. 368',
      subtitle: '742 ₴\n\nОчень мягкая ангора • Съёмный пояс\nМини-длина • Круглый вырез\nЦвета: чёрный, малина, зелёный, синий, красный, молочный\nРазмеры: 42-44, 46-48, 50-52',
      image_url: 'https://images.prom.ua/7025587121_w640_h640_bazovoe-teploe-plate.jpg'
    },
    {
      name: 'Чёрное платье миди с открытыми плечами 🖤👗',
      title: 'Чёрное платье миди с открытыми плечами 🖤👗',
      subtitle: '800 ₴\n\nГлубокий чёрный • Открытые плечи\nПриталенный силуэт • Турецкий трикотаж\nРазмеры: S, M, L, XL\nДлина ≈ 129 см',
      image_url: 'https://images.prom.ua/7006727327_w640_h640_zhenskoe-trikotazhnoe-plate.jpg'
    }
  ],

  SUIT: [
    {
      name: 'Женский летний костюм ХАКИ (SM | L-XL)',
      title: 'Женский летний костюм ХАКИ (SM | L-XL)',
      subtitle: '1197 ₴\n\nРубашка + брюки клёш\nАмериканский креп-жатка\nРазмеры: SM (42-46) | L-XL (48-50)',
      image_url: 'https://images.prom.ua/4521912170_w640_h640_zhenskij-letnij-kostyum.jpg'
    },
    {
      name: 'Нарядный темно-синий костюм 50-60 с блузой-сеткой ✨',
      title: 'Нарядный темно-синий костюм 50-60 с блузой-сеткой ✨',
      subtitle: '1656 ₴\n\nБлуза-сетка + брюки\nГлубокий темно-синий\nРазмеры: 50-52, 54-56, 58-60\nИдеально для праздника',
      image_url: 'https://images.prom.ua/6887251372_w640_h640_zhenskij-bryuchnyj-kostyum.jpg'
    },
    {
      name: 'Женский летний костюм ХАКИ (SM | L-XL)',
      title: 'Женский летний костюм ХАКИ (SM | L-XL)',
      subtitle: '1197 ₴\n\nРубашка + брюки клёш\nАмериканский креп-жатка\nРазмеры: SM (42-46) | L-XL (48-50)',
      image_url: 'https://images.prom.ua/4521912170_w640_h640_zhenskij-letnij-kostyum.jpg'
    }
  ],

  OUTER: [
    {
      name: 'Тёплая двухсторонняя шубка-тедди Шоколад 🧸🍫',
      title: 'Тёплая двухсторонняя шубка-тедди Шоколад 🧸🍫',
      subtitle: '2099 ₴\n\nДвухсторонняя: тедди + плащевка\nДлина 105 см • Силикон 250\nРазмеры: 42-44, 46-48',
      image_url: 'https://images.prom.ua/6938046667_w640_h640_zhenskaya-zimnyaya-dvuhstoronnyaya.jpg'
    },
    {
      name: 'Женский зимний пуховик эко-кожа «Зефирка Люкс» — БЕЖЕВЫЙ',
      title: 'Женский зимний пуховик эко-кожа «Зефирка Люкс» — БЕЖЕВЫЙ',
      subtitle: '1462 ₴\n\nЭко-кожа • Силикон 250 г/м²\nДлина 88 см • Вшитый капюшон\nРазмеры: S (42), M (44), L (46)',
      image_url: 'https://images.prom.ua/3934994526_w640_h640_zhenskaya-zimnij-puhovik.jpg'
    },
    {
      name: 'Женская зимняя куртка оверсайз короткая 6260_4086 ❄️',
      title: 'Женская зимняя куртка оверсайз короткая 6260_4086 ❄️',
      subtitle: '1244 ₴\n\nМатовая плащевка • Синтепон 250 г\nСъёмный капюшон • До -20°C\nРазмеры: 42–46, 48–50',
      image_url: 'https://images.prom.ua/6383632495_w640_h640_zhenskaya-zimnyaya-kurtka.jpg'
    }
  ],

  UNDERWEAR: [] // пока пусто — добавь товары когда нужно
};

// ====================== WEBHOOK ======================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  try {
    const messaging = req.body.entry?.[0]?.messaging?.[0];
    if (!messaging || messaging.message?.is_echo) return res.sendStatus(200);

    const senderId = messaging.sender.id;
    const text = messaging.message?.text;
    const payload =
      messaging.postback?.payload ||
      messaging.message?.quick_reply?.payload ||
      'ANY_TEXT';

    // ===== ОБРАБОТКА ВВОДА ПОСЛЕ ЗАКАЗА =====
    if (userState[senderId]?.step === 'WAIT_CONTACT' && text) {
      await sendText(
        senderId,
        `✅ Заявка отправлена менеджеру!\n\nВаш заказ:\n🛍 ${userState[senderId].product}\n\nМенеджер скоро с вами свяжется ❤️`
      );
      // можно раскомментировать, если нужно отправлять менеджеру в чат страницы
      // await sendText('5591234567890123', `📩 НОВЫЙ ЗАКАЗ\n\n🛍 ${userState[senderId].product}\n👤 ${text}`);
      delete userState[senderId];
      return res.sendStatus(200);
    }

    // ===== МЕНЮ =====
    if (payload === 'ANY_TEXT') return sendMainMenu(senderId);
    if (payload === 'CATALOG') return sendCategoryMenu(senderId);
    if (payload === 'DELIVERY') return sendDelivery(senderId);
    if (payload === 'MANAGER') return sendManager(senderId);
    if (payload === 'MENU') return sendMainMenu(senderId);

    // ===== КАТЕГОРИИ =====
    if (payload === 'CAT_DRESS') return sendProduct(senderId, 'DRESS', 0);
    if (payload === 'CAT_SUIT') return sendProduct(senderId, 'SUIT', 0);
    if (payload === 'CAT_OUTER') return sendProduct(senderId, 'OUTER', 0);
    if (payload === 'CAT_UNDERWEAR') return sendProduct(senderId, 'UNDERWEAR', 0);

    // ===== СЛЕДУЮЩИЙ ТОВАР =====
    const match = payload.match(/(DRESS|SUIT|OUTER|UNDERWEAR)_(\d+)/);
    if (match) {
      const [, cat, idx] = match;
      return sendProduct(senderId, cat, Number(idx));
    }

    // ===== ЗАКАЗ =====
    if (payload.startsWith('ORDER_')) {
      const productName = payload.replace('ORDER_', '');
      userState[senderId] = { product: productName, step: 'WAIT_CONTACT' };
      return sendText(
        senderId,
        '🛒 Отлично!\n\nНапишите одним сообщением:\n👤 Имя\n📞 Телефон'
      );
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// ====================== МЕНЮ ======================
async function sendMainMenu(id) {
  await sendTemplate(id, [{
    title: 'Добро пожаловать ✨',
    subtitle: 'Выберите действие:',
    buttons: [
      { title: '👗 Каталог', payload: 'CATALOG' },
      { title: '📦 Доставка', payload: 'DELIVERY' },
      { title: '🙋 Менеджер', payload: 'MANAGER' }
    ]
  }]);
}

async function sendCategoryMenu(id) {
  await sendTemplate(id, [
    {
      title: 'Каталог',
      subtitle: 'Выберите категорию:',
      buttons: [
        { title: '👗 Платья', payload: 'CAT_DRESS' },
        { title: '🧥 Костюмы', payload: 'CAT_SUIT' },
        { title: '🧥 Верхняя одежда', payload: 'CAT_OUTER' }
      ]
    },
    {
      title: 'Каталог (продолжение)',
      subtitle: 'Ещё есть:',
      buttons: [
        { title: '🩲 Нижнее бельё', payload: 'CAT_UNDERWEAR' },
        { title: '🔙 Главное меню', payload: 'MENU' }
      ]
    }
  ]);
}

// ====================== ТОВАР ======================
async function sendProduct(id, category, index) {
  const items = PRODUCTS[category] || [];
  if (index >= items.length) {
    await sendText(id, 'Это все товары в категории 😊');
    return sendMainMenu(id);
  }

  const p = items[index];
  await sendTemplate(id, [{
    title: p.title,
    subtitle: p.subtitle,
    image_url: p.image_url,
    buttons: [
      { title: '🛒 Заказать', payload: `ORDER_${p.name}` },
      { title: '➡️ Следующий товар', payload: `${category}_${index + 1}` },
      { title: '🔙 Меню', payload: 'MENU' }
    ]
  }]);
}

// ====================== ДОП. ФУНКЦИИ ======================
async function sendDelivery(id) {
  await sendText(id, '📦 Доставка: Новая Почта\n💳 Оплата: наложенный платёж / на карту\n\nМенеджер уточнит детали после оформления заказа');
}

async function sendManager(id) {
  await sendText(id, '🙋 Напишите ваш вопрос или пожелание — менеджер ответит в ближайшее время');
}

// ====================== ОТПРАВКА СООБЩЕНИЙ ======================
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
          payload: { template_type: 'generic', elements }
        }
      }
    })
  });
}

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

// ====================== ЗАПУСК ======================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Бот запущен на порту ${PORT}`));