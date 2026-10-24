# SSRA Library Management System

Website + admin panel + student portal for **SSRA Library**, Bhrigun Chauraha (Barwa-Kasia Road), Kushinagar.

- **Home page** – offer popup, e-book / physical-book / seat counts, free seats per shift, fee structure, facilities, gallery, contact & map.
- **Admin panel** (`/admin`) – admissions with a live seat map, renewals, fee plans & festival offers, payments with printable receipts, UPI payment confirmation, dues list with one-click WhatsApp reminders, book catalog (PDF e-books + physical books), issue/return, offer popups, site settings.
- **Student portal** (`/student`) – plan validity countdown, quick actions, borrowed books with return countdowns, complaints, pay by UPI QR, payment history & receipts, read/download e-books (active members only), issued books, set password.
- **Login** – mobile + password, or mobile + OTP.

Students can also raise complaints (Admin → Complaints to reply and resolve) and request physical books (Admin → Borrow & return).

Tech: Next.js 15, PostgreSQL + Prisma, Auth.js v5, next-intl, Tailwind CSS v4.

## First-time setup

1. Edit `.env` (copy from `.env.example` if missing):
   - `DATABASE_URL` – put your postgres password in place of `YOUR_PASSWORD` (URL-encode `@ : / ? # % & +`, e.g. `@` → `%40`).
   - `ADMIN_MOBILE` / `ADMIN_PASSWORD` – the admin login created by the seed.
2. Install and create the database:

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
```

3. Start it:

```bash
npm run dev
```

Open http://localhost:3000 and log in at `/login` with the admin mobile and password.

### OTP in development
With `SMS_PROVIDER="console"` the OTP is printed in the terminal running `npm run dev`. For real SMS set `SMS_PROVIDER="msg91"`, `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` (an Indian DLT-approved template with `##OTP##`).

## Day-to-day (admin)
- **New admission:** Admin → Students → New admission → pick plan, shift, start date and a green seat. Booked seats are greyed out; Full-day bookings block Morning and Evening.
- **Renewal:** open the student → "Renew membership" (starts the day after the current one ends).
- **Student paid by UPI from the portal:** Admin → Payments → check the UTR in your UPI app → "Confirm & renew".
- **Reminders:** Admin → Dues → WhatsApp button opens a ready-made reminder message.
- **Offer popup:** Admin → Offer popups → set title, message, badge (e.g. `₹700 / 2 months`), dates and button. The highest-priority active offer shows once per visitor; editing it shows it again.
- **UPI:** Admin → Settings → set your UPI ID (a QR with the exact amount is generated) or upload your shop QR.

## Commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm test` | Unit tests (seat overlap, dates, OTP, receipts, links) |
| `npm run lint` | Lint |

## Hosting
Needs Node.js 20+ and PostgreSQL. Easiest: a small VPS (Hostinger / DigitalOcean) running Postgres, `npm run build`, `npm start` behind nginx with HTTPS, and `pm2` to keep it running. Uploaded files live in `STORAGE_DIR` (default `./storage`) — back it up together with the database. Serverless hosts without a disk (e.g. Vercel) would need an S3/R2 storage adapter in `src/lib/storage`, which isn't built yet.

## Notes
- Only the poster's ₹700 / 2-month Diwali–Chhath offer is seeded as a fee plan; add your regular monthly prices in Admin → Fee plans.
- The site is English only. All text lives in `messages/en.json`.
