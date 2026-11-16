# Pharma Cosmos — ORBIT

Dorixonalar tarmog‘i uchun o‘zbekcha landing page. React/Vinext, moslashuvchan sahifa, WebGL orbital animatsiya va Telegramga tayyor server formasi.

## Ishga tushirish

Node.js 22.13 yoki yangiroq talab qilinadi.

```sh
npm run install:ci
npm run dev
```

Mahalliy manzil odatda http://127.0.0.1:5173/.

Cloudflare mahalliy runtime kompyuter resurslari sabab ochilmasa, Node asosidagi muqobil ko‘rish rejimi:

```sh
node node_modules/vite/bin/vite.js --config vite.local.config.ts
```

Bu rejim server qiymatlarini process.env orqali oladi; .dev.vars faylini avtomatik yuklamaydi. Nashr qilish uchun asosiy vite.config.ts va Sites integratsiyasi saqlanadi.

## Yig‘ish va tekshirish

```sh
npm run build
node node_modules/typescript/bin/tsc --noEmit
node --test tests/feedback.test.mjs
```

Nashr Sites vositalari orqali bajariladi. .openai/hosting.json mavjud loyiha identifikatorini saqlaydi; yangi loyiha yaratish shart emas.

## Telegramni keyin ulash

Foydalanuvchi botni keyin ulashni tanlagan. Hozir bot siri berilmagan; sahifa «tez orada» holati va telefon orqali aloqa imkoniyatini ko‘rsatadi. Xabar yuborildi degan soxta natija yo‘q.

Server sozlamalari:

- TELEGRAM_BOT_TOKEN — bot tokeni, maxfiy qiymat.
- TELEGRAM_CHAT_ID — mas’ul administrator yoki admin guruhi IDsi.
- TELEGRAM_MESSAGE_THREAD_ID — ixtiyoriy, guruhdagi mavzu IDsi.

Mahalliy Cloudflare ko‘rish rejimi uchun .env.example nusxasini .dev.vars deb saqlang va qiymatlarni faqat o‘z kompyuteringizda kiriting. Jonli sayt uchun qiymatlar Sites runtime secrets sifatida kiritiladi va sayt qayta nashr qilinadi. Tokenni frontend kodiga, NEXT_PUBLIC_ o‘zgaruvchisiga yoki Gitga qo‘shmang.

Forma → server tekshiruvi → Telegram sendMessage → tasdiqlangan muvaffaqiyat. Telegram xatosida yozilgan matn yo‘qolmaydi. Bir xil murojaat qayta yuborilganda submissionId saqlanadi; matn o‘zgarsa yangi ID olinadi. Yuborish paytida maydonlar vaqtincha qulflanadi.

Spam cheklovi va takroriy so‘rov nazorati Worker isolate xotirasida ishlaydi. Bu butun tizim bo‘ylab doimiy kafolat emas; katta ommaviy trafik uchun mustaqil doimiy saqlash yoki platforma rate limit kerak.

## Ma’lumot manbasi

Kompaniya ma’lumotlari foydalanuvchi bergan pharmacosmos.html faylidan olindi. 140+ filial, telefon va ijtimoiy tarmoq kontaktlari tashqi manbalarda tasdiqlanmagan. Aniq filial manzillari berilmagan; sahifa Telegram yoki call-markazga yo‘naltiradi. Dekorativ orbital tasvir haqiqiy geografik xarita emas.

## Tekshiruv holati

- Feedback serveri uchun 13 avtomatlashtirilgan test muvaffaqiyatli o‘tdi; haqiqiy Telegram xabarlari yuborilmadi.
- TypeScript tekshiruvi (tsc --noEmit) muvaffaqiyatli o‘tdi.
- Mahalliy server avval HTTP 200, /api/feedback esa configured:false qaytargan.
- Jonli bot bilan end-to-end tekshiruv token va admin guruhi sozlangandan keyin bajariladi.
- Brauzerda vizual tekshiruv va nashr natijasini faqat amalda kuzatilganidan keyin tasdiqlash kerak.

