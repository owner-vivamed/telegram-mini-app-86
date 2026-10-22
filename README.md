# Shaxsiy Messenger (Telegram Mini App)

Telegram ichida ishlaydigan shaxsiy messenjer: foydalanuvchilar `@username` yoki Telegram ID bo'yicha topiladi, real vaqtda yozishadi, o'qilgan xabarlar `✓✓` bilan belgilanadi.

## Tuzilma
| Fayl | Vazifasi |
|---|---|
| `index.html` | Butun interfeys va mantiq (backend sozlanmasa — demo rejim) |
| `config.js` | Supabase URL va anon key |
| `supabase/schema.sql` | Jadvallar va RLS qoidalari |
| `supabase/functions/telegram-auth/index.ts` | Telegram `initData` ni tekshirib, JWT beradi |

## Demo rejim (sozlamasiz)
`index.html` ni oching. Ikkinchi foydalanuvchi uchun boshqa tabda `?as=Ali`, `?as=Vali` qo'shing — ular o'rtasida yozishib ko'ring. Xabarlar faqat shu brauzerda saqlanadi.

## Haqiqiy rejim (Supabase)
1. **supabase.com** da loyiha yarating.
2. **SQL Editor** → `supabase/schema.sql` mazmunini qo'yib **Run** bosing.
3. **Edge Functions** → `telegram-auth` nomi bilan funksiya yarating, `index.ts` mazmunini qo'ying, **Verify JWT** ni o'chiring (funksiya `initData` ni o'zi tekshiradi).
4. **Edge Functions → Secrets**: `BOT_TOKEN` (@BotFather dan), `JWT_SECRET` (Project Settings → API → JWT Secret).
5. `config.js` ga `SUPABASE_URL` va `SUPABASE_ANON_KEY` ni yozing.
6. Faylni HTTPS hostingga joylang (GitHub Pages / Cloudflare Pages) va @BotFather → Menu Button yoki `/newapp` orqali URL ni ulang.

Xavfsizlik: har bir foydalanuvchi faqat o'z xabarlarini ko'ra oladi (RLS), yuboruvchi nomini soxtalashtirib bo'lmaydi, `initData` imzosi serverda tekshiriladi.

## Cheklovlar
- Xabarlar serverda shifrlanmagan (oddiy matn), end-to-end shifrlash yo'q.
- Faqat matn; rasm/fayl/guruh hali yo'q.
- JWT 12 soat amal qiladi; ilova qayta ochilganda yangilanadi.
- Supabase rejimi haqiqiy loyihada hali sinab ko'rilmagan (faqat demo rejim tekshirilgan).
