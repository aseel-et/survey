# استبيان نظام التفتيش الرقمي

استبيان بسيط يعمل على **GitHub Pages**، وتُحفظ إجاباته في **Supabase**.

| الملف | الوظيفة |
|---|---|
| `index.html` | صفحة الاستبيان للمشاركين |
| `admin.html` | صفحة الإجابات (بتسجيل دخول): ملخص النتائج، جدول الإجابات، تصدير Excel، حذف |
| `assets/config.js` | رابط Supabase والمفتاح العام والعنوان |
| `assets/questions.js` | الأسئلة والخيارات |
| `supabase.sql` | إنشاء الجدول وقواعد الحماية |

## الحماية

- الزائر يستطيع **إرسال** إجابة فقط، ولا يستطيع قراءة أي إجابة ولا تعديلها.
- القراءة والحذف للحسابات المضافة إلى جدول `admins` فقط (Row Level Security).
- المفتاح الموجود في `config.js` مفتاح عام مصمم ليكون ظاهرًا، والحماية الفعلية في قواعد قاعدة البيانات.
  **لا تضع مفتاح `secret` أو `service_role` في أي ملف.**

## الإعداد

### 1) Supabase
1. أنشئ حسابًا ومشروعًا في [supabase.com](https://supabase.com).
2. من **SQL Editor** الصق محتوى `supabase.sql` واضغط Run.
3. من **Authentication → Users → Add user** أنشئ حسابك (بريد وكلمة مرور)، وفعّل *Auto Confirm*.
4. ارجع إلى **SQL Editor** وشغّل (بعد وضع بريدك):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'بريدك';
   ```
5. يُنصح بإيقاف التسجيل العام: **Authentication → Sign In / Providers → Allow new users to sign up**.
6. من **Project Settings → API Keys** انسخ *Project URL* والمفتاح *publishable* (أو *anon*)
   وضعهما في `assets/config.js`.

### 2) GitHub Pages
1. ارفع الملفات إلى مستودع عام.
2. **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. بعد دقيقة يصبح الاستبيان على `https://اسمك.github.io/اسم-المستودع/`
   وصفحة الإجابات على `.../admin.html`.

## تعديل الأسئلة

عدّل `assets/questions.js`. لا تغيّر قيمة `id` لأي سؤال بعد بدء جمع الإجابات.
