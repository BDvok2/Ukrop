import 'dotenv/config';
import express from 'express';
import { OpenRouter } from '@openrouter/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distPath, 'index.html');

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openRouterApiKey) {
  console.warn('OPENROUTER_API_KEY is not set. /api/analyze-word requests will fail.');
}

const openRouter = openRouterApiKey
  ? new OpenRouter({ apiKey: openRouterApiKey })
  : null;
app.post('/api/analyze-word', async (req, res) => {
  if (!openRouter) {
    return res.status(500).json({ error: 'Missing OpenRouter API key on server' });
  }
  const { sentence, word } = req.body;
  if (!word?.trim()) {
    return res.status(400).json({ error: 'Missing word' });
  }

  try {
    const prompt = createPrompt({ sentence, word });
    const response = await openRouter.chat.send({
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      "reasoning": {

    "effort": "medium", 

    "max_tokens": 1500,

    

    "exclude": true, 



    "enabled": true 

  },
      responseFormat: wordSchema,
      stream: false,
      temperature: 0.9,
    });

    const choice = response.choices?.[0]?.message ?? {};
    const content = choice.content ?? '';
    const analysis = typeof choice.parsed === 'object' && choice.parsed !== null
      ? choice.parsed
      : tryParseJSON(content);

    res.json({ content, analysis });
  } catch (error) {
    console.error('OpenRouter request failed:', error);
    res.status(500).json({ error: 'Failed to analyze word' });
  }
});

app.post('/api/explain-sentence', async (req, res) => {
  if (!openRouter) {
    return res.status(500).json({ error: 'Missing OpenRouter API key on server' });
  }

  const sentence = req.body?.sentence?.trim();
  if (!sentence) {
    return res.status(400).json({ error: 'Missing sentence' });
  }

  try {
    const response = await openRouter.chat.send({
      model:
        process.env.OPENROUTER_MODEL_SENTENCE ||
        process.env.OPENROUTER_MODEL ||
        'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: sentenceSystemPrompt },
        { role: 'user', content: createSentencePrompt(sentence) },
      ],
      stream: false,
      temperature: 0.7,
    });

    const explanation = response.choices?.[0]?.message?.content?.trim?.() ?? '';
    res.json({ explanation });
  } catch (error) {
    console.error('OpenRouter sentence explanation failed:', error);
    res.status(500).json({ error: 'Failed to explain sentence' });
  }
});

const systemPrompt = `Ти — філолог-україніст і лінгвіст. Працюєш лише з українською мовою. Користувач дає одне українське слово. Проаналізуй його за наступним планом. Відповідай українською мовою.

1. Добір синонімів
1.1. Добери до слова синоніми (якщо це можливо).
1.2. Усі синоніми поділи на три групи й подай тільки в такому форматі, кожну групу з нового рядка:

Часто вживані: ...
Застарілі: ...
Авторські (в дужках вказуєш ім'я та прізвище автора): ...

Часто вживані — це ті, які активно використовуються в сучасній українській мові.
Застарілі — архаїзми та історизми, які вийшли із загального вжитку.
Авторські — індивідуально-авторські форми, ужиті в літературних творах конкретних авторів, наприклад: Яблуневоцвітний (П. Тичина).
Якщо до слова взагалі немає синонімів — пункт 1 не подавай.

2. Таблиця відмінків
2.1. Якщо слово належить до частин мови, які відмінюються (іменник, прикметник, займенник, числівник тощо), створи повну таблицю відмінків українською з цим словом.
2.2. Ретельно перевір, чи існує для цього слова форма знахідного відмінка.
Якщо форма знахідного є — обов'язково впиши її в таблицю.
Якщо в конкретному випадку форми знахідного не існує — не пиши рядок Знахідний узагалі.
2.3. Подай таблицю у вигляді:

Називний: ...
Родовий: ...
Давальний: ...
Знахідний: ... (цей рядок подавай тільки тоді, коли форма реально існує)
Орудний: ...
Місцевий: ...
Кличний: ...

У JSON-відповіді заповни поле grammar.cases: це має бути масив рядків формату "Називний — форма", "Родовий — форма" тощо. Частина до тире — назва відмінка, частина після тире — конкретна відмінкова форма слова, яка буде показана в колонці «Форма» таблиці «Морфологія».
Якщо слово не відмінюється або не має парадигми відмінків — пункт 2 не подавай і залишай grammar.cases порожнім масивом.

3. Зміна дієслова за родами
3.1. Перевір, чи слово є дієсловом.
3.2. Якщо це дієслово, створи таблицю зміни форми дієслова залежно від роду (чоловічий, жіночий, середній) у природному для нього часі, зазвичай у минулому часі.
3.3. Подай у форматі:

Чоловічий рід: ...
Жіночий рід: ...
Середній рід: ...

Якщо слово не є дієсловом — пункт 3 не подавай.

4. Будова слова
4.1. Розбери слово за будовою (морфемний аналіз).
4.2. Обов'язково виділи й підпиши: основу, закінчення, корінь, суфікс(и), префікс(и), постфікс(и), інтерфікс(и), конфікс(и).
4.3. Якщо певних елементів немає (наприклад, немає префікса або суфікса), прямо вкажи, що вони відсутні.
4.4. Дотримуйся покрокового алгоритму розбору слова за будовою:
— Крок 1. Визнач, чи слово змінюване. Постав його у різні форми, щоб з’ясувати, чи має закінчення. Якщо слово незмінюване, познач основою все слово й переходь до кроку 3.
— Крок 2. Для змінюваного слова знайди закінчення та основу: та частина, що змінюється при відмінюванні, є закінченням; решта — основа. Графічно познач їх.
— Крок 3. Визнач корінь: добери кілька споріднених слів і знайди в них спільну незмінну частину. Познач корінь дужкою.
— Крок 4. Перевір, чи є префікс. Якщо є — познач; якщо немає, зазнач відсутність.
— Крок 5. Знайди суфікс(и). За потреби користуйся словами зі зменшувальним значенням (наприклад, «маленький», «собачка», «книжечка») як тренувальними прикладами.

5. Етимологія
5.1. Коротко подай етимологію слова сучасною науковою українською.
5.2. Якщо в дослідженнях існує кілька основних версій походження, перелічи головні з них і стисло поясни кожну.
5.3. Якщо походження невідоме або суперечливе, чесно це познач, але все одно подай основні гіпотези, якщо вони існують.

6. Приклади речень і синтаксична роль
6.1. Напиши кілька (2–4) речень з використанням цього слова.
6.2. Якщо слово має кілька різних лексичних значень, подай щонайменше по одному реченню для кожного значення.
6.3. У кожному реченні виділи це слово підкресленням за допомогою символів _ (підкресли лише саме слово). Окремо вкажи, яку синтаксичну роль воно виконує в реченні: підмет, присудок, додаток, означення, обставина тощо.

Формат для кожного речення:
Речення: ... СЛОВО ...
Синтаксична роль: (підмет, присудок, додаток, означення, обставина тощо).

Загальні вимоги:
Відповідай чітко за пунктами 1–6, у цьому самому порядку та з цією самою нумерацією.
Не вигадуй нереалістичних форм і неправдоподібних історичних або етимологічних відомостей. Якщо дані невідомі або сумнівні — прямо це познач.
Якщо якийсь пункт не застосовується до даного слова (немає синонімів, слово не відмінюється, не є дієсловом тощо), просто пропусти цей пункт у відповіді без додаткових пояснень.`;

const wordSchema = {
  type: 'json_schema',
  jsonSchema: {
    name: 'word_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        synonyms: {
          type: 'object',
          additionalProperties: false,
          properties: {
            modern: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            archaic: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
          },
          required: ['modern', 'archaic'],
        },
        grammar: {
          type: 'object',
          additionalProperties: false,
          properties: {
            part_of_speech: { type: 'string' },
            gender: { type: 'string' },
            cases: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            number: { type: 'string' },
          },
          required: ['part_of_speech', 'gender', 'cases', 'number'],
        },
        structure: {
          type: 'object',
          additionalProperties: false,
          properties: {
            prefix: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              default: '',
            },
            root: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              default: '',
            },
            suffix: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              default: '',
            },
            ending: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              default: '',
            },
            base: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
              default: '',
            },
          },
          required: ['prefix', 'root', 'suffix', 'ending', 'base'],
        },
        origin: { type: 'string' },
        meanings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              definition: { type: 'string' },
              examples: {
                type: 'array',
                items: { type: 'string' },
                default: [],
              },
              notes: { type: 'string', default: '' },
            },
            required: ['definition', 'examples', 'notes'],
          },
          default: [],
        }
      },
      required: ['synonyms', 'grammar', 'structure', 'origin', 'meanings'],
    },
  },
};

function createPrompt({ sentence, word }) {
  return `Речення: ${sentence ?? '—'}\nСлово: ${word}\nСформуй структуровану відповідь.`;
}

const sentenceSystemPrompt = `Ти — український мовознавець. Пояснюєш розмовні, діалектні, жартівливі вислови та фразеологізми українською. Пиши коротко (до 4 насичених абзаців), але структуровано у форматі нумерованих пунктів:
1. Стисла перефраза: ...
2. Підтекст і тон: ...
3. Контекст уживання: ...
4. Фразеологізми: ... (переліч та поясни, тільки якщо вони є)
Використовуй лише ті пункти, де маєш що сказати; інші пропускай без згадок. Не вигадуй фактів.
Якщо пишеш ** то завжди закривай таким же **`;

function createSentencePrompt(sentence) {
  return `Речення: «${sentence}»\n\nРозбери його за планом із системного повідомлення. Якщо певний пункт не застосовується, просто пропусти його й не виводь заголовок. Особливо поясни фразеологізми й неформальні звороти, якщо вони присутні.`;
}

function tryParseJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    const match = raw.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(indexHtmlPath);
  });
} else {
  console.warn('No client build found. Run `npm run build` to generate the Vite assets.');
}
