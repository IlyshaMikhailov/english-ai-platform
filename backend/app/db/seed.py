"""Idempotent database seeding and synchronization for demo user, topics, and tasks."""

import asyncio
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.enums import EnglishLevel, TaskType
from app.models.task import Task
from app.models.topic import Topic
from app.models.user import User

DEMO_USER_USERNAME = "demo_student"
DEMO_USER_EMAIL = "demo@example.com"
DEMO_USER_PASSWORD = "demo12345"

ADMIN_USER_USERNAME = "admin"
ADMIN_USER_EMAIL = "admin@example.com"
ADMIN_USER_PASSWORD = "admin12345"

SEED_CURRICULUM: list[dict[str, Any]] = [
    {
        "title": "Внешность и характер",
        "legacy_titles": [
            "Appearance, Character Traits & Wh-Questions",
            "Внешность, черты характера",
            "Внешность, черты характера и Wh-вопросы",
        ],
        "description": (
            "Изучите лексику для описания внешности и характера: телосложение, "
            "причёски, черты лица и особенности личности."
        ),
        "video_url": "/static/lessons/video_appearance_character.mp4",
        "presentation_url": "/static/lessons/presentation_appearance_character.pptx",
        "level": EnglishLevel.A2,
        "tasks": [
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 1,
                    "mode": "matching",
                    "title": "Задание 1. Соедините картинки со словами",
                    "instruction": (
                        "Перетащите каждое английское слово на подходящую карточку с "
                        "иллюстрацией (или нажмите на слово, а затем на карточку)."
                    ),
                    "pairs": [
                        {
                            "id": "pair-1",
                            "word": "Clever",
                            "description": "Мальчик в очках, читающий книгу",
                            "image_key": "clever",
                        },
                        {
                            "id": "pair-2",
                            "word": "Shy",
                            "description": "Девочка, которая стеснительно смотрит вниз и прикрывает лицо руками",
                            "image_key": "shy",
                        },
                        {
                            "id": "pair-3",
                            "word": "Polite",
                            "description": "Мальчик, который придерживает дверь для другого человека",
                            "image_key": "polite",
                        },
                        {
                            "id": "pair-4",
                            "word": "Stubborn",
                            "description": "Ребёнок, который скрестил руки и сердито смотрит в сторону",
                            "image_key": "stubborn",
                        },
                        {
                            "id": "pair-5",
                            "word": "Curious",
                            "description": "Девочка с увеличительным стеклом, рассматривающая бабочку",
                            "image_key": "curious",
                        },
                        {
                            "id": "pair-6",
                            "word": "Patient",
                            "description": "Мальчик, спокойно ожидающий своей очереди",
                            "image_key": "patient",
                        },
                        {
                            "id": "pair-7",
                            "word": "Spiky",
                            "description": "Мальчик с короткими торчащими волосами",
                            "image_key": "spiky",
                        },
                        {
                            "id": "pair-8",
                            "word": "Well-built",
                            "description": "Спортивный мужчина с широкими плечами",
                            "image_key": "well_built",
                        },
                        {
                            "id": "pair-9",
                            "word": "Pigtails",
                            "description": "Девочка с двумя заплетёнными хвостиками",
                            "image_key": "pigtails",
                        },
                        {
                            "id": "pair-10",
                            "word": "Moustache",
                            "description": "Мужчина с заметными усами",
                            "image_key": "moustache",
                        },
                        {
                            "id": "pair-11",
                            "word": "Curly",
                            "description": "Девочка с кудрявыми волосами",
                            "image_key": "curly",
                        },
                        {
                            "id": "pair-12",
                            "word": "Freckles",
                            "description": "Ребёнок с веснушками на лице",
                            "image_key": "freckles",
                        },
                    ],
                    "hint": "Обратите внимание на детали внешности (волосы, усы, веснушки) и действия персонажей на картинках.",
                },
            },
            {
                "type": TaskType.test,
                "content": {
                    "order": 2,
                    "display_mode": "choice",
                    "title": "Задание 2. Прочитайте ситуацию и выберите правильный ответ",
                    "instruction": "В каждом предложении опирайтесь на описание поведения героя и выберите подходящую черту характера.",
                    "questions": [
                        {
                            "id": "q1",
                            "question": "1. Tom always helps his friends and waits for them. He is very...",
                            "options": ["Stubborn", "Patient", "Shy"],
                            "correct_answer": "Patient",
                            "explanation": "Patient — терпеливый: тот, кто спокойно ждёт и помогает без раздражения.",
                        },
                        {
                            "id": "q2",
                            "question": "2. Anna doesn’t like talking to new people. She is...",
                            "options": ["Shy", "Clever", "Polite"],
                            "correct_answer": "Shy",
                            "explanation": "Shy — застенчивый: человек, который стесняется незнакомых людей.",
                        },
                        {
                            "id": "q3",
                            "question": "3. Ben always asks many questions because he wants to know everything. He is...",
                            "options": ["Stubborn", "Curious", "Patient"],
                            "correct_answer": "Curious",
                            "explanation": "Curious — любознательный: тот, кто задаёт много вопросов и хочет всё знать.",
                        },
                        {
                            "id": "q4",
                            "question": "4. Lisa always says «please» and «thank you». She is...",
                            "options": ["Polite", "Shy", "Stubborn"],
                            "correct_answer": "Polite",
                            "explanation": "Polite — вежливый: тот, кто соблюдает манеры и говорит «пожалуйста» и «спасибо».",
                        },
                        {
                            "id": "q5",
                            "question": "5. Jack learns new things very quickly and solves difficult problems. He is...",
                            "options": ["Patient", "Clever", "Shy"],
                            "correct_answer": "Clever",
                            "explanation": "Clever — умный: быстро учится новому и решает сложные задачи.",
                        },
                        {
                            "id": "q6",
                            "question": "6. Peter never changes his mind. He always wants to do things his way. He is...",
                            "options": ["Curious", "Polite", "Stubborn"],
                            "correct_answer": "Stubborn",
                            "explanation": "Stubborn — упрямый: человек, который никогда не меняет своего мнения.",
                        },
                        {
                            "id": "q7",
                            "question": "7. Mary waits calmly for her turn and doesn’t get angry. She is...",
                            "options": ["Patient", "Clever", "Stubborn"],
                            "correct_answer": "Patient",
                            "explanation": "Patient — терпеливый: спокойно ждёт своей очереди и не злится.",
                        },
                        {
                            "id": "q8",
                            "question": "8. Kate is afraid to speak in front of the class. She doesn’t like being the centre of attention. She is...",
                            "options": ["Polite", "Shy", "Curious"],
                            "correct_answer": "Shy",
                            "explanation": "Shy — застенчивый: не любит выступать перед аудиторией и быть в центре внимания.",
                        },
                        {
                            "id": "q9",
                            "question": "9. Alex always wants to learn new things. He asks questions about everything around him. He is...",
                            "options": ["Stubborn", "Patient", "Curious"],
                            "correct_answer": "Curious",
                            "explanation": "Curious — любознательный: интересуется всем вокруг и постоянно задаёт вопросы.",
                        },
                        {
                            "id": "q10",
                            "question": "10. Sophie respects other people, listens carefully and always says kind words. She is...",
                            "options": ["Clever", "Polite", "Stubborn"],
                            "correct_answer": "Polite",
                            "explanation": "Polite — вежливый: уважает людей, внимательно слушает и говорит добрые слова.",
                        },
                    ],
                },
            },
            {
                "type": TaskType.test,
                "content": {
                    "order": 3,
                    "display_mode": "underline",
                    "title": "Задание 3. Подчеркните правильный ответ",
                    "instruction": "Нажмите на верное вопросительное слово в скобках в каждом предложении, чтобы подчеркнуть его.",
                    "questions": [
                        {
                            "id": "w1",
                            "question": "1. (Who / Where / When) is the clever boy with spiky hair?",
                            "options": ["Who", "Where", "When"],
                            "correct_answer": "Who",
                            "explanation": "Who («кто») используется, когда мы спрашиваем о человеке.",
                        },
                        {
                            "id": "w2",
                            "question": "2. (Why / Whose / Who) is Emma so shy?",
                            "options": ["Why", "Whose", "Who"],
                            "correct_answer": "Why",
                            "explanation": "Why («почему») спрашивает о причине качества или состояния.",
                        },
                        {
                            "id": "w3",
                            "question": "3. (Where / When / Whose) does the girl with pigtails live?",
                            "options": ["Where", "When", "Whose"],
                            "correct_answer": "Where",
                            "explanation": "Where («где») спрашивает о месте проживания.",
                        },
                        {
                            "id": "w4",
                            "question": "4. (Who / Whose / Why) moustache is this?",
                            "options": ["Who", "Whose", "Why"],
                            "correct_answer": "Whose",
                            "explanation": "Whose («чей / чьи») ставится перед существительным, чтобы узнать о принадлежности.",
                        },
                        {
                            "id": "w5",
                            "question": "5. (When / Where / Who) is the birthday of the polite boy?",
                            "options": ["When", "Where", "Who"],
                            "correct_answer": "When",
                            "explanation": "When («когда») спрашивает о дате или времени события.",
                        },
                        {
                            "id": "w6",
                            "question": "6. (Why / When / Whose) is the curious girl asking so many questions?",
                            "options": ["Why", "When", "Whose"],
                            "correct_answer": "Why",
                            "explanation": "Why («почему») спрашивает о причине действия.",
                        },
                        {
                            "id": "w7",
                            "question": "7. (Where / Who / When) does the well-built man work?",
                            "options": ["Where", "Who", "When"],
                            "correct_answer": "Where",
                            "explanation": "Where («где») спрашивает о месте работы.",
                        },
                        {
                            "id": "w8",
                            "question": "8. (Whose / Why / Where) curly hair is this?",
                            "options": ["Whose", "Why", "Where"],
                            "correct_answer": "Whose",
                            "explanation": "Whose + существительное (curly hair) спрашивает «чьи это кудрявые волосы?».",
                        },
                        {
                            "id": "w9",
                            "question": "9. (Who / When / Why) is the patient boy waiting?",
                            "options": ["Who", "When", "Why"],
                            "correct_answer": "Why",
                            "explanation": "Why («почему / зачем») уточняет причину ожидания.",
                        },
                        {
                            "id": "w10",
                            "question": "10. (When / Whose / Who) does the clever girl go to school?",
                            "options": ["When", "Whose", "Who"],
                            "correct_answer": "When",
                            "explanation": "When («когда») спрашивает о времени, в которое она ходит в школу.",
                        },
                    ],
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 4,
                    "title": "Задание 4. Творческое эссе: описание друга или близкого человека",
                    "prompt": (
                        "Напишите короткое эссе на английском языке (60–120 слов), описав вашего друга "
                        "или члена семьи: расскажите о его внешности (например, hair, freckles, moustache, "
                        "well-built, pigtails) и чертах характера (clever, polite, patient, curious, shy, stubborn) "
                        "с примерами из жизни."
                    ),
                    "min_words": 40,
                    "max_words": 200,
                    "rubric": [
                        "Использовать минимум 4 слова из темы (внешность и характер)",
                        "Соблюдать грамматику Present Simple",
                        "Привести конкретные примеры поведения",
                    ],
                },
            },
        ],
    },
    {
        "title": "Present Simple",
        "legacy_titles": [
            "Present Simple & Daily Routines",
            "Present Simple и повседневные привычки",
        ],
        "description": (
            "Научитесь описывать регулярные действия, расписание и привычки в Present Simple, "
            "включая окончания -s/-es в 3-м лице единственного числа и отрицания."
        ),
        "video_url": "https://example.org/lessons/a2-present-simple/video",
        "presentation_url": "https://example.org/lessons/a2-present-simple/slides",
        "level": EnglishLevel.A2,
        "tasks": [
            {
                "type": TaskType.test,
                "content": {
                    "order": 1,
                    "title": "Согласование глагола в 3-м лице ед. числа",
                    "question": "My sister usually ___ coffee before going to the office.",
                    "options": ["drink", "drinks", "is drinking", "drank"],
                    "correct_answer": "drinks",
                    "explanation": "С подлежащими he/she/it (my sister) в Present Simple к глаголу добавляется окончание -s.",
                },
            },
            {
                "type": TaskType.test,
                "content": {
                    "order": 2,
                    "title": "Отрицания в Present Simple",
                    "question": "They ___ work on Sundays because the shop is closed.",
                    "options": ["doesn't", "don't", "aren't", "not"],
                    "correct_answer": "don't",
                    "explanation": "С местоимением they и множественным числом используется вспомогательный глагол do not (don't) + начальная форма глагола.",
                },
            },
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 3,
                    "title": "Конструктор предложения: утренняя привычка",
                    "instruction": "Расставьте слова в правильном порядке, чтобы описать ежедневную утреннюю привычку.",
                    "correct_sentence": "She always catches the early train to work.",
                    "words": ["train", "She", "early", "work.", "always", "the", "catches", "to"],
                    "hint": "Наречия частоты (always, usually) ставятся перед основным смысловым глаголом.",
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 4,
                    "title": "Мой обычный будний день",
                    "prompt": (
                        "Напишите небольшой рассказ на английском языке (60–120 слов) о вашем обычном "
                        "утре и вечере в будний день, используя Present Simple и маркеры времени."
                    ),
                    "min_words": 40,
                    "max_words": 200,
                    "rubric": [
                        "Корректное употребление глаголов в Present Simple",
                        "Использование слов-маркеров частоты (usually, always, at 8 a.m.)",
                        "Логичная структура абзаца",
                    ],
                },
            },
        ],
    },
    {
        "title": "Past Simple",
        "legacy_titles": [
            "Past Simple & Travel Stories",
            "Past Simple и истории о путешествиях",
        ],
        "description": (
            "Потренируйтесь рассказывать о прошлых поездках и событиях с помощью "
            "правильных и неправильных глаголов в Past Simple."
        ),
        "video_url": "https://example.org/lessons/a2-past-simple/video",
        "presentation_url": "https://example.org/lessons/a2-past-simple/slides",
        "level": EnglishLevel.A2,
        "tasks": [
            {
                "type": TaskType.test,
                "content": {
                    "order": 1,
                    "title": "Неправильные глаголы в прошедшем времени",
                    "question": "Last summer, we ___ to Lisbon and stayed near the river.",
                    "options": ["fly", "flied", "flew", "flying"],
                    "correct_answer": "flew",
                    "explanation": "Fly — неправильный глагол; его вторая форма (Past Simple) — flew.",
                },
            },
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 2,
                    "title": "Конструктор вопроса о поездке",
                    "instruction": "Соберите вопросительное предложение в Past Simple из предложенных слов.",
                    "correct_sentence": "Did you visit the museum yesterday?",
                    "words": ["yesterday?", "visit", "you", "Did", "museum", "the"],
                    "hint": "Вопросы в Past Simple начинаются со схемы: Did + подлежащее + начальная форма глагола.",
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 3,
                    "title": "Запоминающееся путешествие",
                    "prompt": (
                        "Напишите короткую историю на английском языке (60–140 слов) о поездке "
                        "или выходных из вашего прошлого, используя Past Simple."
                    ),
                    "min_words": 40,
                    "max_words": 220,
                    "rubric": [
                        "Последовательное употребление Past Simple",
                        "Минимум два неправильных глагола в верной форме",
                        "Хронологическая связность текста",
                    ],
                },
            },
        ],
    },
    {
        "title": "Present Perfect",
        "legacy_titles": [
            "Present Perfect vs Past Simple",
            "Present Perfect и Past Simple: сравнение",
        ],
        "description": (
            "Разберитесь, когда прошлый опыт связан с настоящим (Present Perfect), "
            "а когда речь идёт о завершённом времени в прошлом (Past Simple)."
        ),
        "video_url": "https://example.org/lessons/b1-present-perfect/video",
        "presentation_url": "https://example.org/lessons/b1-present-perfect/slides",
        "level": EnglishLevel.B1,
        "tasks": [
            {
                "type": TaskType.test,
                "content": {
                    "order": 1,
                    "title": "Незавершённый период времени или конкретный момент в прошлом",
                    "question": "I ___ in three different countries so far, and I love traveling.",
                    "options": ["lived", "have lived", "am living", "was living"],
                    "correct_answer": "have lived",
                    "explanation": "Маркер «so far» («на данный момент») указывает на незавершённый период, поэтому требуется Present Perfect.",
                },
            },
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 2,
                    "title": "Конструктор вопроса о жизненном опыте",
                    "instruction": "Составьте корректный вопрос в Present Perfect из данных слов.",
                    "correct_sentence": "Have you ever tried speaking English with a tutor?",
                    "words": ["with", "tried", "ever", "you", "Have", "a", "English", "speaking", "tutor?"],
                    "hint": "Слово «ever» в вопросах ставится между подлежащим и третьей формой глагола (V3).",
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 3,
                    "title": "Навыки, которым я научился",
                    "prompt": (
                        "Напишите эссе на английском языке (100–180 слов) о навыках, которые вы освоили "
                        "за последние годы (Present Perfect), и о том, когда начали их изучать (Past Simple)."
                    ),
                    "min_words": 60,
                    "max_words": 260,
                    "rubric": [
                        "Чёткое разграничение Present Perfect и Past Simple",
                        "Использование связок и маркеров времени (since, for, ago)",
                        "Связное изложение",
                    ],
                },
            },
        ],
    },
    {
        "title": "Условные предложения",
        "legacy_titles": [
            "First & Second Conditionals",
            "Условные предложения 1-го и 2-го типа",
        ],
        "description": (
            "Научитесь выражать реальные условия будущего (First Conditional) "
            "и воображаемые ситуации (Second Conditional)."
        ),
        "video_url": "https://example.org/lessons/b1-conditionals/video",
        "presentation_url": "https://example.org/lessons/b1-conditionals/slides",
        "level": EnglishLevel.B1,
        "tasks": [
            {
                "type": TaskType.test,
                "content": {
                    "order": 1,
                    "title": "Структура Second Conditional",
                    "question": "If I ___ more free time, I would learn to play the cello.",
                    "options": ["have", "had", "will have", "would have"],
                    "correct_answer": "had",
                    "explanation": "Во 2-м типе условных предложений используется схема: If + Past Simple, ... would + начальная форма глагола.",
                },
            },
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 2,
                    "title": "Конструктор условного предложения",
                    "instruction": "Соберите предложение 1-го типа условного наклонения (First Conditional).",
                    "correct_sentence": "If it rains tomorrow, we will stay inside.",
                    "words": ["stay", "tomorrow,", "will", "it", "If", "inside.", "we", "rains"],
                    "hint": "После «If» для будущего времени используется Present Simple, а в главной части — «will».",
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 3,
                    "title": "Если бы я мог изменить свой город",
                    "prompt": (
                        "Напишите эссе на английском языке (100–180 слов) о том, что бы вы изменили "
                        "в своём городе при неограниченном бюджете, используя Second Conditional."
                    ),
                    "min_words": 60,
                    "max_words": 260,
                    "rubric": [
                        "Точное построение придаточных с If + Past Simple и would",
                        "Разнообразная лексика для описания городской среды",
                        "Логичная аргументация",
                    ],
                },
            },
        ],
    },
    {
        "title": "Пассивный залог",
        "legacy_titles": [
            "Passive Voice & Academic Style",
            "Пассивный залог и академический стиль",
        ],
        "description": (
            "Освойте конструкции страдательного залога в разных временах для написания "
            "официальных отчётов, описаний процессов и эссе."
        ),
        "video_url": "https://example.org/lessons/b2-passive-voice/video",
        "presentation_url": "https://example.org/lessons/b2-passive-voice/slides",
        "level": EnglishLevel.B2,
        "tasks": [
            {
                "type": TaskType.test,
                "content": {
                    "order": 1,
                    "title": "Present Perfect в пассивном залоге",
                    "question": "Several new renewable energy plants ___ in this region since 2022.",
                    "options": [
                        "have built",
                        "have been built",
                        "were building",
                        "are built",
                    ],
                    "correct_answer": "have been built",
                    "explanation": "Предлог since 2022 требует Present Perfect, а подлежащее (plants) испытывает действие на себе — нужен пассив have been built.",
                },
            },
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 2,
                    "title": "Конструктор делового пассива",
                    "instruction": "Соберите формальное предложение в пассивном залоге будущего времени.",
                    "correct_sentence": "The final report will be reviewed by the committee.",
                    "words": ["committee.", "be", "final", "by", "The", "reviewed", "will", "the", "report"],
                    "hint": "Будущее время в пассивном залоге строится по схеме: will be + V3 (past participle).",
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 3,
                    "title": "Технологии в современном образовании",
                    "prompt": (
                        "Напишите короткое академическое эссе на английском языке (140–220 слов) о том, "
                        "как ИИ-инструменты применяются в изучении языков."
                    ),
                    "min_words": 80,
                    "max_words": 320,
                    "rubric": [
                        "Уместное использование пассивного залога",
                        "Формальный регистр и вводные конструкции",
                        "Взвешенные аргументы и чёткий вывод",
                    ],
                },
            },
        ],
    },
    {
        "title": "Модальные глаголы",
        "legacy_titles": [
            "Modals of Deduction & Reported Speech",
            "Модальные глаголы предположения и косвенная речь",
        ],
        "description": (
            "Выражайте уверенность или сомнение о событиях в настоящем и прошлом, "
            "а также переводите прямую речь в косвенную с согласованием времён."
        ),
        "video_url": "https://example.org/lessons/b2-modals-reported/video",
        "presentation_url": "https://example.org/lessons/b2-modals-reported/slides",
        "level": EnglishLevel.B2,
        "tasks": [
            {
                "type": TaskType.test,
                "content": {
                    "order": 1,
                    "title": "Предположения о прошлом с модальными глаголами",
                    "question": "Her umbrella is completely dry; it ___ heavily when she walked home.",
                    "options": [
                        "mustn't rain",
                        "can't have rained",
                        "shouldn't rain",
                        "wouldn't have rained",
                    ],
                    "correct_answer": "can't have rained",
                    "explanation": "Конструкция «can't have + V3» выражает уверенность в том, что действие в прошлом было невозможно.",
                },
            },
            {
                "type": TaskType.gamified,
                "content": {
                    "order": 2,
                    "title": "Конструктор косвенной речи",
                    "instruction": "Соберите предложение в косвенной речи с соблюдением согласования времён.",
                    "correct_sentence": "She mentioned that she had already finished the draft.",
                    "words": ["had", "finished", "that", "already", "She", "the", "she", "mentioned", "draft."],
                    "hint": "При глаголе говорения в прошлом (mentioned) Past Simple сдвигается в Past Perfect (had finished).",
                },
            },
            {
                "type": TaskType.essay,
                "content": {
                    "order": 3,
                    "title": "Разбор загадочной ситуации",
                    "prompt": (
                        "Напишите текст на английском языке (120–200 слов), проанализировав возможные "
                        "причины задержки авиарейса с использованием модальных глаголов предположения "
                        "(must have, might have, can't have)."
                    ),
                    "min_words": 80,
                    "max_words": 300,
                    "rubric": [
                        "Корректное употребление модальных конструкций о прошлом",
                        "Разные степени уверенности",
                        "Связный текст и точная лексика",
                    ],
                },
            },
        ],
    },
]


async def ensure_demo_user(db: AsyncSession) -> User:
    """Return existing demo learner or create one idempotently."""
    result = await db.execute(select(User).where(User.email == DEMO_USER_EMAIL))
    demo_user = result.scalar_one_or_none()
    if demo_user is not None:
        return demo_user

    demo_user = User(
        username=DEMO_USER_USERNAME,
        email=DEMO_USER_EMAIL,
        hashed_password=hash_password(DEMO_USER_PASSWORD),
        level=EnglishLevel.A2,
        is_first_login=True,
        is_admin=False,
    )
    db.add(demo_user)
    await db.commit()
    await db.refresh(demo_user)
    return demo_user


async def ensure_admin_user(db: AsyncSession) -> User:
    """Return existing admin user or create one idempotently."""
    result = await db.execute(select(User).where(User.email == ADMIN_USER_EMAIL))
    admin_user = result.scalar_one_or_none()
    if admin_user is not None:
        if not admin_user.is_admin:
            admin_user.is_admin = True
            await db.commit()
            await db.refresh(admin_user)
        return admin_user

    admin_user = User(
        username=ADMIN_USER_USERNAME,
        email=ADMIN_USER_EMAIL,
        hashed_password=hash_password(ADMIN_USER_PASSWORD),
        level=EnglishLevel.B2,
        is_first_login=False,
        is_admin=True,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(admin_user)
    return admin_user


async def seed_topics_and_tasks(db: AsyncSession) -> None:
    """Insert or synchronize curriculum topics and tasks without breaking existing IDs."""
    existing_topics = list((await db.execute(select(Topic))).scalars().all())
    by_title = {topic.title: topic for topic in existing_topics}

    changed = False
    for topic_spec in SEED_CURRICULUM:
        topic = by_title.get(topic_spec["title"])
        if topic is None:
            for legacy_title in topic_spec.get("legacy_titles", []):
                if legacy_title in by_title:
                    topic = by_title[legacy_title]
                    break

        if topic is None:
            topic = Topic(
                title=topic_spec["title"],
                description=topic_spec["description"],
                video_url=topic_spec["video_url"],
                presentation_url=topic_spec["presentation_url"],
                level=topic_spec["level"],
            )
            db.add(topic)
            await db.flush()
            for task_spec in topic_spec["tasks"]:
                db.add(
                    Task(
                        topic_id=topic.id,
                        type=task_spec["type"],
                        content=task_spec["content"],
                    )
                )
            changed = True
            continue

        if (
            topic.title != topic_spec["title"]
            or topic.description != topic_spec["description"]
            or topic.video_url != topic_spec.get("video_url")
            or topic.presentation_url != topic_spec.get("presentation_url")
            or topic.level != topic_spec["level"]
        ):
            topic.title = topic_spec["title"]
            topic.description = topic_spec["description"]
            topic.video_url = topic_spec.get("video_url")
            topic.presentation_url = topic_spec.get("presentation_url")
            topic.level = topic_spec["level"]
            changed = True

        existing_tasks = list(
            (await db.execute(select(Task).where(Task.topic_id == topic.id)))
            .scalars()
            .all()
        )
        existing_tasks.sort(
            key=lambda t: (int((t.content or {}).get("order", 999)), str(t.id))
        )

        for idx, task_spec in enumerate(topic_spec["tasks"]):
            if idx < len(existing_tasks) and existing_tasks[idx].type == task_spec["type"]:
                if existing_tasks[idx].content != task_spec["content"]:
                    existing_tasks[idx].content = task_spec["content"]
                    flag_modified(existing_tasks[idx], "content")
                    changed = True
            else:
                db.add(
                    Task(
                        topic_id=topic.id,
                        type=task_spec["type"],
                        content=task_spec["content"],
                    )
                )
                changed = True

    if changed:
        await db.commit()


async def seed_database(db: AsyncSession) -> None:
    """Seed demo user, admin user, and curriculum topics/tasks idempotently."""
    await ensure_demo_user(db)
    await ensure_admin_user(db)
    await seed_topics_and_tasks(db)


async def _run_cli_seed() -> None:
    async with AsyncSessionLocal() as session:
        await seed_database(session)


if __name__ == "__main__":
    asyncio.run(_run_cli_seed())
