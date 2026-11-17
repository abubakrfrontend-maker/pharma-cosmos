# Pharma Cosmos — ORBIT

O‘zbek tilidagi dorixonalar tarmog‘i landing page’i. Next.js 16 App Router, React 19, moslashuvchan sahifa, jonli WebGL orbit animatsiyasi va Telegramga yuboriladigan mijoz fikri formasi.

## Lokal ishga tushirish

Node.js 22.x kerak. Loyiha papkasida:

```sh
npm ci
npm run dev
```

Sayt: http://127.0.0.1:5173/

Server `.env.local` faylini avtomatik o‘qiydi. Sozlamalarni o‘zgartirgandan keyin serverni qayta ishga tushiring.

## Yig‘ish va tekshirish

```sh
npm test
npm run typecheck
npm run build
npm start
```

- `npm test` — Telegramga haqiqiy xabar yubormaydigan 17 ta server testi.
- `npm run typecheck` — Next.js turlarini yaratish va TypeScript tekshiruvi.
- `npm run build` — Webpack orqali production yig‘ish.
- `npm start` — yig‘ilgan saytni lokal 5173-portda ochish.

Lokal kompyuter xotirasini tejash uchun build bitta worker va Webpack xotira optimizatsiyasi bilan sozlangan.

## GitHub → Vercel

1. Kodni tanlangan GitHub repozitoriyga commit va push qiling. Maxfiy fayllarni qo‘shmang.
2. Vercelda **Add New → Project → Import Git Repository** orqali shu repozitoriyni tanlang.
3. Loyiha ildiz papkasini tanlang. `vercel.json` frameworkni **Next.js** deb belgilaydi.
4. Node.js versiyasi **22.x**, build buyrug‘i **npm run build** bo‘lsin. Output Directory uchun Next.js standart sozlamasini qoldiring.
5. Quyidagi server sozlamalarini Vercel **Project Settings → Environment Variables** bo‘limiga kiriting.
6. Deploy qiling. Keyingi production branch pushlari Vercelda yangi deployment yaratadi.

Custom domen ulanganda `SITE_URL`ni to‘liq `https://...` manzilga sozlash mumkin. Aks holda metadata uchun Vercelning production domeni avtomatik olinadi.

## Telegram sozlamalari

`.env.example` faylidan lokal `.env.local` nusxa yarating. Qiymatlarni faqat shu lokal faylga yoki Vercelning maxfiy environment sozlamalariga kiriting.

| O‘zgaruvchi | Vazifasi |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Fikrlarni yuboradigan bot tokeni; server uchun maxfiy. |
| `TELEGRAM_CHAT_ID` | Mas’ul administrator yoki admin guruhi IDsi. |
| `TELEGRAM_MESSAGE_THREAD_ID` | Ixtiyoriy: admin guruhidagi forum mavzusi IDsi. |
| `SITE_URL` | Ixtiyoriy: saytning to‘liq production manzili. |

Administrator avval bot bilan suhbatni boshlashi yoki bot tegishli guruhga qo‘shilishi kerak. Botda shu chatga xabar yuborish huquqi bo‘lishi lozim. Fikrlarni qabul qiladigan bot va saytdagi buyurtma/filial ma’lumoti uchun Telegram havolasi alohida vazifalarni bajaradi.

Tokenni Gitga, READMEga, brauzer kodiga yoki `NEXT_PUBLIC_` nomli o‘zgaruvchiga yozmang. `.env.local`, `.env*` maxfiy fayllari va `.vercel/` Gitdan chiqarilgan; faqat bo‘sh `.env.example` kuzatiladi. Vercel environment o‘zgargach yangi deploy kerak. Preview muhitida haqiqiy adminlarga test xabarlari ketmasligi uchun alohida bot/chat yoki bo‘sh sozlamalardan foydalaning.

## Fikr yuborish oqimi

Forma → `/api/feedback` → server tekshiruvi → Telegram `sendMessage` → tasdiqlangan natija.

Admin xabarida quyidagilar tartibli, ikonka va yulduzlar bilan keladi:

- Murojaat raqami va Toshkent vaqti.
- Murojaat turi, filial va 1–5 yulduzli baho.
- Mijozning izohi.
- Ism, telefon va javob olish istagi.
- Murojaat manbasi.

Muvaffaqiyat faqat Telegram javobida xabar IDsi tasdiqlangandan keyin ko‘rsatiladi. Xatoda yozilgan matn saqlanadi. Yuborish davomida forma qulflanadi. Bir xil murojaat qayta yuborilsa bir xil ID saqlanadi; matn o‘zgarsa yangi ID ishlatiladi.

`GET /api/feedback` faqat `configured` holatini qaytaradi. Bu sozlamalar shakli borligini bildiradi, botning amalda yetkazishini isbotlamaydi. Token yoki chat ID yetishmasa forma telefon orqali aloqa variantini ko‘rsatadi.

## Tekshiruv va cheklovlar

17 ta avtomatlashtirilgan test server tekshiruvlari, xatoliklar, takroriy yuborish, vaqt cheklovi va Vercel mijozlari uchun alohida limitni qamrab oladi. Ular Telegram tarmog‘ini taqlid qiladi; haqiqiy botga yetkazish alohida end-to-end sinov bilan tekshiriladi.

Spam va takroriy so‘rov nazorati har bir server instance xotirasida ishlaydi. Instance qayta ishga tushganda holat yangilanadi; bu butun tizim bo‘ylab doimiy limit emas. Katta ommaviy trafikda doimiy saqlash yoki Vercel Firewall qoidalari qo‘shilishi mumkin.

Kompaniya ma’lumotlari foydalanuvchi taqdim etgan `pharmacosmos.html` faylidan olingan. Filiallar soni va kontaktlar kompaniya tomonidan tasdiqlanishi kerak. Dekorativ orbitlar haqiqiy geografik xarita emas.

Avvalgi Sites/Vinext/Cloudflare yordamchi fayllari saqlanib qolgan bo‘lishi mumkin. Joriy `package.json`, Next.js konfiguratsiyasi va Vercel deployment ulardan foydalanmaydi.
