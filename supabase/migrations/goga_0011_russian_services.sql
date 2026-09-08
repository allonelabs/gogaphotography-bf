-- Russian copy for the twelve service packages.
--
-- Depends on goga_0010_russian.sql, which adds the _ru columns. Run that first
-- or every statement here fails on an unknown column.
--
-- Only the services table is filled in. These twelve rows are factual package
-- specs - durations, photo counts, deliverables - so they translate exactly,
-- with no wording judgement to get wrong. The other _ru columns (blog_posts has
-- 65 published rows, plus pages, projects, packages, hero) are prose and
-- pricing voice; those are Goga's to write in the Studio admin rather than
-- something to machine-translate into a client's live site.
--
-- Matched on id, not on title: titles are what this migration edits, so keying
-- on them would break the moment it is re-run. Every statement is idempotent -
-- re-running overwrites with the same value.
--
-- Rows are addressed one by one rather than in a single update ... from (values)
-- so that a typo in one row cannot silently shift the others' values.

-- Wedding
update public.services set
  title_ru = 'Свадебная фотосъёмка — Базовый пакет',
  description_ru = E'Съёмка 2 часа (церемония и банкет)\n150–200 обработанных фотографий\nОнлайн-галерея (ссылка)\nБыстрая и качественная работа'
where id = '5d4258dd-7745-4946-a8ae-26611c061357';

update public.services set
  title_ru = 'Свадебная фотосъёмка — Стандартный пакет',
  description_ru = E'Съёмка 8 часов (церемония и банкет)\n700–800 обработанных фотографий (минимум 500)\nОнлайн-галерея\nПечатный фотоальбом'
where id = 'b3fd3885-84f5-45e4-8730-c51b7f1d7d70';

update public.services set
  title_ru = 'Свадебная фотосъёмка — Премиум пакет',
  description_ru = E'Съёмка полного дня (от сборов до разрезания торта)\n1000 профессионально обработанных фотографий (минимум 800)\nСвадебный фотоальбом\nПерсональная онлайн-галерея'
where id = 'b8967a93-9ff7-4156-9616-30c82136dbea';

-- Portrait / individual & family
update public.services set
  title_ru = 'Портрет / Индивидуальная и семейная — Базовый',
  description_ru = E'Студийная фотосессия 1 час\n1 человек\n50 профессионально обработанных фотографий (минимум 30)\nЦветокоррекция и ретушь\nИдеально для портретов и фото на профиль'
where id = 'd7643a6d-4195-4388-89b8-e3c457fcd5bd';

update public.services set
  title_ru = 'Портрет / Индивидуальная и семейная — Стандартный',
  description_ru = E'Студийная фотосессия 1,5 часа\nОт 2 до 3 человек (семья/группа)\n50 профессионально обработанных фотографий\nГлубокая цветокоррекция и ретушь'
where id = '94139e83-ac09-4123-9038-959e349cbe93';

update public.services set
  title_ru = 'Портрет / Индивидуальная и семейная — Премиум',
  description_ru = E'Коммерческая фотосессия 2 часа\nНеограниченное количество участников\n80 обработанных фотографий\nПолная постобработка и ретушь\nПомощь в разработке концепции'
where id = '1b08a7a2-d2eb-4aee-9130-edea64ce646a';

-- Corporate
update public.services set
  title_ru = 'Корпоративная фотосъёмка — Базовый пакет',
  description_ru = E'Съёмка до 1 часа (открытие офиса, презентация)\nДо 100 обработанных фотографий\nПередача по онлайн-ссылке\nБыстрая сдача в течение 3 рабочих дней'
where id = '6a3ae043-e941-4de9-beae-237ac53d03ce';

update public.services set
  title_ru = 'Корпоративная фотосъёмка — Стандартный пакет',
  description_ru = E'Съёмка 3–4 часа (семинары, вечеринки)\n250–300 обработанных фотографий (300 фотографий в онлайн-галерее)\nПрофессиональная цветокоррекция\nОнлайн-галерея и печать избранных фотографий'
where id = '2b5059b1-f0c3-40e5-b9ec-2a5c668d5cbc';

update public.services set
  title_ru = 'Корпоративная фотосъёмка — Премиум пакет',
  description_ru = E'Съёмка полного дня (крупные мероприятия, презентации)\nДо 800 обработанных фотографий (800 фотографий в онлайн-галерее)\nИндивидуальная концепция съёмки\nVIP-обслуживание, персональная онлайн-ссылка'
where id = 'c1ad3e07-688d-4ee4-ae35-0d161a22e052';

-- Baptism
update public.services set
  title_ru = 'Фотосъёмка крещения — Базовый пакет',
  description_ru = E'Фотосъёмка в церкви (1 час)\nДо 100 обработанных фотографий\nОнлайн-галерея'
where id = '5b1b4f06-33e2-4dbe-8c2a-e0e94e10233f';

update public.services set
  title_ru = 'Фотосъёмка крещения — Стандартный пакет',
  description_ru = E'Фотосъёмка 2 часа (обряд крещения и семейная съёмка)\nДо 200 обработанных фотографий\nПерсональная онлайн-галерея\nБонус: 5 специально отобранных фотографий в печати формата A4'
where id = '80040d4f-54b1-4274-913f-519377374d7a';

update public.services set
  title_ru = 'Фотосъёмка крещения — Премиум пакет',
  description_ru = E'Съёмка полного дня (сборы, церковь, празднование)\n300+ обработанных фотографий\nПерсональный фотоальбом\nОнлайн-галерея с бессрочным доступом'
where id = 'fe21e95d-c0c5-44ce-9a0e-5f6843b941eb';
