-- Contract completion (N15/05/2026-1): price calculator, availability,
-- e-signature on the public site, workflow automation, admin-managed motion
-- and captions. See docs/superpowers/specs/2026-09-24-contract-completion-design.md.
--
-- Additive and idempotent. New tables have RLS on and no anon policies: the
-- public site reads them through its service-role api/*.ts functions.

-- Calculator inputs ---------------------------------------------------------

alter table public.packages
  add column if not exists extra_hour_cents integer not null default 0,
  add column if not exists max_extra_hours integer not null default 0;

comment on column public.packages.extra_hour_cents is
  'Price of one hour beyond duration_hours. 0 = extra hours not offered.';
comment on column public.packages.max_extra_hours is
  'How many extra hours the calculator lets a client add.';

alter table public.addons
  add column if not exists name_ru text,
  add column if not exists description_ru text;

alter table public.bookings
  add column if not exists extra_hours numeric not null default 0;

-- Contracts ------------------------------------------------------------------

alter table public.contracts
  add column if not exists body_ru text,
  add column if not exists signed_locale text;

create table if not exists public.contract_templates (
  id smallint primary key default 1 check (id = 1),
  body_en text not null default '',
  body_ka text not null default '',
  body_ru text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.contract_templates enable row level security;

-- Deliveries / photos --------------------------------------------------------

alter table public.deliveries
  add column if not exists notified_at timestamptz;

alter table public.project_images
  add column if not exists width integer,
  add column if not exists height integer;

-- Automation -----------------------------------------------------------------

create table if not exists public.automation_rules (
  key text primary key,
  enabled boolean not null default true,
  delay_days integer not null default 0,
  notify_studio boolean not null default false,
  subject_en text not null default '',
  subject_ka text not null default '',
  subject_ru text not null default '',
  body_en text not null default '',
  body_ka text not null default '',
  body_ru text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.automation_rules enable row level security;

create table if not exists public.automation_log (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  entity_id uuid not null,
  recipient text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now(),
  unique (rule_key, entity_id)
);
alter table public.automation_log enable row level security;

-- Site settings --------------------------------------------------------------

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  page_transitions boolean not null default true,
  reveal_animations boolean not null default true,
  caption_mode text not null default 'cursor'
    check (caption_mode in ('cursor', 'bottom', 'off')),
  lightbox_captions boolean not null default true,
  calculator_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- Album for the /couple category page, which had none.
insert into public.portfolio_albums (slug, name_en, name_ka, name_ru, sort_order)
select 'couple', 'Couple', 'წყვილი', 'Пара', 15
where not exists (select 1 from public.portfolio_albums where slug = 'couple');

-- Seeds ----------------------------------------------------------------------

insert into public.contract_templates (id, body_en, body_ka, body_ru) values (1,
$en$PHOTOGRAPHY SERVICE AGREEMENT

Date: {{today}}

This agreement is made between GOGA Photography ("the Studio") and {{client_name}} ("the Client"), email {{client_email}}, phone {{client_phone}}.

1. SERVICE
The Studio will photograph the Client's event on {{shoot_date}} {{shoot_time}} at {{location}}.
Package: {{package}} ({{duration_hours}} hours)
Additional hours: {{extra_hours}}
Add-ons: {{addons}}

2. PRICE AND PAYMENT
Total: {{total}}
Deposit: {{deposit}}, payable on signing; it secures the date.
Balance: {{balance}}, payable no later than the day of the shoot.

3. DELIVERY
Edited photographs are delivered through a private online gallery within 8 weeks of the shoot.

4. CANCELLATION
The deposit is non-refundable. If the Client cancels more than 60 days before the shoot, the deposit is credited toward a new date within 12 months. If the Studio cannot perform because of illness or force majeure, the deposit is refunded in full.

5. COPYRIGHT AND USE
The Studio keeps the copyright. The Client receives a licence for personal use and may share the photographs on social media with credit to GOGA Photography. The Studio may use the photographs in its portfolio and publications.

By signing, both parties accept these terms.$en$,
$ka$ფოტომომსახურების ხელშეკრულება

თარიღი: {{today}}

ხელშეკრულება იდება GOGA Photography-ს (შემდგომში „სტუდია") და {{client_name}}-ს (შემდგომში „დამკვეთი") შორის. ელ-ფოსტა: {{client_email}}, ტელეფონი: {{client_phone}}.

1. მომსახურება
სტუდია გადაიღებს დამკვეთის ღონისძიებას {{shoot_date}} {{shoot_time}}, მისამართზე: {{location}}.
პაკეტი: {{package}} ({{duration_hours}} საათი)
დამატებითი საათები: {{extra_hours}}
დამატებითი სერვისები: {{addons}}

2. ღირებულება და ანგარიშსწორება
ჯამური ღირებულება: {{total}}
ავანსი: {{deposit}}, გადაიხდება ხელმოწერისას და აჯავშნის თარიღს.
დარჩენილი თანხა: {{balance}}, გადაიხდება არაუგვიანეს გადაღების დღისა.

3. ფოტოების ჩაბარება
დამუშავებული ფოტოები ჩაბარდება პირად ონლაინ გალერეაში გადაღებიდან 8 კვირის განმავლობაში.

4. გაუქმება
ავანსი არ ბრუნდება. თუ დამკვეთი გადაღებამდე 60 დღით ადრე გააუქმებს ჯავშანს, ავანსი ჩაეთვლება ახალ თარიღს 12 თვის განმავლობაში. თუ სტუდია ავადმყოფობის ან ფორს-მაჟორის გამო ვერ შეასრულებს მომსახურებას, ავანსი სრულად დაბრუნდება.

5. საავტორო უფლება და გამოყენება
საავტორო უფლება რჩება სტუდიას. დამკვეთი იღებს ფოტოების პირადი გამოყენების უფლებას და შეუძლია გააზიაროს ისინი სოციალურ ქსელებში GOGA Photography-ს მითითებით. სტუდიას შეუძლია ფოტოების გამოყენება პორტფოლიოსა და პუბლიკაციებში.

ხელმოწერით მხარეები ეთანხმებიან ამ პირობებს.$ka$,
$ru$ДОГОВОР НА ФОТОУСЛУГИ

Дата: {{today}}

Договор заключён между GOGA Photography («Студия») и {{client_name}} («Клиент»), e-mail {{client_email}}, телефон {{client_phone}}.

1. УСЛУГА
Студия проводит съёмку мероприятия Клиента {{shoot_date}} {{shoot_time}} по адресу: {{location}}.
Пакет: {{package}} ({{duration_hours}} ч)
Дополнительные часы: {{extra_hours}}
Дополнительные услуги: {{addons}}

2. СТОИМОСТЬ И ОПЛАТА
Итого: {{total}}
Задаток: {{deposit}}, оплачивается при подписании и закрепляет дату.
Остаток: {{balance}}, оплачивается не позднее дня съёмки.

3. ПЕРЕДАЧА ФОТОГРАФИЙ
Обработанные фотографии передаются через личную онлайн-галерею в течение 8 недель после съёмки.

4. ОТМЕНА
Задаток не возвращается. Если Клиент отменяет съёмку более чем за 60 дней, задаток засчитывается в новую дату в течение 12 месяцев. Если Студия не может провести съёмку из-за болезни или форс-мажора, задаток возвращается полностью.

5. АВТОРСКОЕ ПРАВО И ИСПОЛЬЗОВАНИЕ
Авторское право остаётся за Студией. Клиент получает право личного использования и может публиковать фотографии в соцсетях с указанием GOGA Photography. Студия может использовать фотографии в портфолио и публикациях.

Подписывая договор, стороны принимают эти условия.$ru$)
on conflict (id) do nothing;

insert into public.automation_rules
  (key, enabled, delay_days, notify_studio, subject_en, subject_ka, subject_ru, body_en, body_ka, body_ru)
values
('booking_received', true, 0, true,
 'We received your booking request',
 'თქვენი ჯავშნის მოთხოვნა მივიღეთ',
 'Мы получили вашу заявку',
$b$Hello {{client_name}},

Thank you for your request. We received it and will get back to you within one working day to confirm the details.

Package: {{package}}
Date: {{shoot_date}}
Estimated total: {{total}} (deposit {{deposit}})

GOGA Photography
{{studio_phone}} · {{studio_email}}$b$,
$b$გამარჯობა {{client_name}},

მადლობა მოთხოვნისთვის. მივიღეთ და ერთი სამუშაო დღის განმავლობაში დაგიკავშირდებით დეტალების დასაზუსტებლად.

პაკეტი: {{package}}
თარიღი: {{shoot_date}}
სავარაუდო ღირებულება: {{total}} (ავანსი {{deposit}})

GOGA Photography
{{studio_phone}} · {{studio_email}}$b$,
$b$Здравствуйте, {{client_name}}!

Спасибо за заявку. Мы её получили и свяжемся с вами в течение одного рабочего дня, чтобы уточнить детали.

Пакет: {{package}}
Дата: {{shoot_date}}
Предварительная стоимость: {{total}} (задаток {{deposit}})

GOGA Photography
{{studio_phone}} · {{studio_email}}$b$),
('contract_sent', true, 0, false,
 'Your contract is ready to sign',
 'ხელშეკრულება მზადაა ხელმოსაწერად',
 'Ваш договор готов к подписанию',
$b$Hello {{client_name}},

Your contract with GOGA Photography is ready. Please read it and sign online:

{{sign_url}}

If anything needs changing, just reply to this email.

GOGA Photography$b$,
$b$გამარჯობა {{client_name}},

GOGA Photography-სთან ხელშეკრულება მზადაა. გთხოვთ, გაეცნოთ და ხელი მოაწეროთ ონლაინ:

{{sign_url}}

თუ რამის შეცვლაა საჭირო, უბრალოდ უპასუხეთ ამ წერილს.

GOGA Photography$b$,
$b$Здравствуйте, {{client_name}}!

Ваш договор с GOGA Photography готов. Пожалуйста, прочитайте его и подпишите онлайн:

{{sign_url}}

Если что-то нужно изменить, просто ответьте на это письмо.

GOGA Photography$b$),
('contract_signed', true, 0, true,
 'Contract signed — your date is reserved',
 'ხელშეკრულება ხელმოწერილია — თარიღი დაჯავშნილია',
 'Договор подписан — дата закреплена',
$b$Hello {{client_name}},

Thank you, your contract is signed. You can view and print your copy here:

{{contract_url}}

We look forward to {{shoot_date}}.

GOGA Photography$b$,
$b$გამარჯობა {{client_name}},

მადლობა, ხელშეკრულება ხელმოწერილია. თქვენი ასლის ნახვა და ამობეჭდვა შეგიძლიათ აქ:

{{contract_url}}

გელოდებით {{shoot_date}}.

GOGA Photography$b$,
$b$Здравствуйте, {{client_name}}!

Спасибо, договор подписан. Посмотреть и распечатать вашу копию можно здесь:

{{contract_url}}

Ждём встречи {{shoot_date}}.

GOGA Photography$b$),
('shoot_reminder', true, 2, false,
 'See you soon — shoot reminder',
 'მალე შევხვდებით — შეხსენება გადაღებაზე',
 'Скоро увидимся — напоминание о съёмке',
$b$Hello {{client_name}},

A reminder that your shoot is on {{shoot_date}} {{shoot_time}} at {{location}}.

If anything has changed, call us at {{studio_phone}}.

GOGA Photography$b$,
$b$გამარჯობა {{client_name}},

შეგახსენებთ, რომ გადაღება გვაქვს {{shoot_date}} {{shoot_time}}, მისამართზე: {{location}}.

თუ რამე შეიცვალა, დაგვირეკეთ: {{studio_phone}}.

GOGA Photography$b$,
$b$Здравствуйте, {{client_name}}!

Напоминаем: съёмка {{shoot_date}} {{shoot_time}}, место: {{location}}.

Если что-то изменилось, позвоните нам: {{studio_phone}}.

GOGA Photography$b$),
('delivery_ready', true, 0, false,
 'Your photographs are ready',
 'თქვენი ფოტოები მზადაა',
 'Ваши фотографии готовы',
$b$Hello {{client_name}},

Your photographs are ready. Open your private gallery here:

{{gallery_url}}

You can mark favourites and download the photos from the gallery.

GOGA Photography$b$,
$b$გამარჯობა {{client_name}},

თქვენი ფოტოები მზადაა. პირადი გალერეა გახსენით აქ:

{{gallery_url}}

გალერეაში შეგიძლიათ მონიშნოთ რჩეული ფოტოები და ჩამოტვირთოთ ისინი.

GOGA Photography$b$,
$b$Здравствуйте, {{client_name}}!

Ваши фотографии готовы. Откройте личную галерею:

{{gallery_url}}

В галерее можно отметить избранные фотографии и скачать их.

GOGA Photography$b$),
('upsell', true, 14, false,
 'Keep your photographs in print',
 'შეინახეთ ფოტოები ბეჭდურად',
 'Сохраните фотографии в печати',
$b$Hello {{client_name}},

We hope you are enjoying your photographs. Many couples turn their favourites into a printed album or wall prints, and we would be glad to design one for you.

Albums, prints and presets: {{store_url}}

Reply to this email and we will prepare an offer.

GOGA Photography$b$,
$b$გამარჯობა {{client_name}},

ვიმედოვნებთ, ფოტოები მოგეწონათ. ბევრი წყვილი რჩეულ ფოტოებს ბეჭდურ ალბომად ან კედლის ფოტოებად აქცევს და სიამოვნებით შეგიქმნით თქვენსასაც.

ალბომები, ბეჭდვა და პრესეტები: {{store_url}}

უპასუხეთ ამ წერილს და მოგიმზადებთ შეთავაზებას.

GOGA Photography$b$,
$b$Здравствуйте, {{client_name}}!

Надеемся, фотографии вам понравились. Многие пары превращают любимые кадры в печатный альбом или фотографии на стену, и мы с радостью сделаем такой для вас.

Альбомы, печать и пресеты: {{store_url}}

Ответьте на это письмо, и мы подготовим предложение.

GOGA Photography$b$)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
