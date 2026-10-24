# SSRA Library

Website and management system for **SSRA Library**, a fully AC self-study library at Bhrigun Chauraha (Barwa–Kasia Road), Kushinagar.

**Live site:** https://ssra-library.vercel.app

It has three parts:

| Part | Address | Who uses it |
| --- | --- | --- |
| Public website | `/`, `/books` | Anyone looking for a seat |
| Student portal | `/student` (log in at `/login`) | Members |
| Admin panel | `/admin` (log in at `/admin/login`) | Library staff |

## Features

### Public website
- **Live seat board** of the reading hall: free desks light up, switchable by shift (Morning, Evening, Full day). Shows seat numbers only, never names.
- **Open now / Closed** status and an **A day at SSRA** timeline of the opening hours (6 AM – 9 PM by default) and shifts.
- **Fees** from the fee plans (e.g. Monthly ₹500, festival offers), **facilities**, **books on the shelves**, **About us**, photo **gallery** and **map**.
- **Contact us** form: messages arrive in Admin → Enquiries.
- **Offer popup** for festivals and fee discounts, managed by the admin.
- **Book catalog** (`/books`): search every printed book and e-book and see copies on the shelf. Reading and borrowing need a student login.

### Student portal
- Plan validity with a live countdown and progress bar, and seat and shift details.
- **Pay fees by UPI** (QR with the exact amount), then submit the UTR for the library to confirm.
- **Fee receipts**: view, print or save as PDF.
- **E-books** (members only) and **library books**: request a physical book to borrow, with a countdown to its return date.
- **Complaints**: raise one and see the library's reply.
- Log in with mobile + password, or mobile + OTP.
- **Change password** button in the top bar. Forgot it? Log in with an OTP: the current password is then not needed to set a new one.

### Admin panel
- **Students**: admissions with a shift-aware seat picker (a Full-day booking blocks Morning and Evening on that seat), renewals and deactivation.
- **Seat map**, **fee plans** (including dated festival offers) and **shifts**.
- **Payments** (cash or UPI), confirming students' UPI payments, numbered **fee receipts** (SSRA-2026-0001…) with a WhatsApp share button.
- **Dues & reminders**: memberships expiring or expired, with one-click WhatsApp reminders.
- **Books**: add printed books and e-book PDFs (up to 500 MB), edit, delete one or many at once. A book can't be deleted while a student has it.
- **Borrow & return**: approve or reject borrow requests, see who has which book, mark returns.
- **Enquiries** from the website, **complaints** with replies, **offer popups**, site **settings** (contact details, hours, UPI, facilities, gallery).
- **Change password** for the admin account.

## Tech

Next.js 15 (App Router, Server Actions) · PostgreSQL with Prisma · Auth.js v5 · Tailwind CSS v4 · next-intl (English) · Vercel Blob for files on Vercel · Vitest.

```
prisma/              schema, migrations, seed
src/app/             pages: public site, /student, /admin, API routes
src/components/      shared UI (seat board, timeline, headers, forms)
src/lib/             business logic: memberships, receipts, hours, storage, OTP, WhatsApp links
messages/en.json     all user-facing text
tests/               unit tests
```

## Run it on your computer

Needs **Node.js 20+** and **PostgreSQL**.

1. Copy `.env.example` to `.env` and fill it in:
   - `DATABASE_URL` and `DATABASE_URL_UNPOOLED`: your Postgres connection (the same value locally). If the password contains `@ : / ? # % & +`, URL-encode it (`@` → `%40`).
   - `AUTH_SECRET`: any long random string (`npx auth secret` makes one).
   - `ADMIN_MOBILE`, `ADMIN_PASSWORD`, `ADMIN_NAME`: the admin account the seed creates.
2. Install, create the tables and add the starting data:

   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed
   ```

3. Start it and open http://localhost:3000:

   ```bash
   npm run dev
   ```

Staff log in at http://localhost:3000/admin/login. With `SMS_PROVIDER="console"`, OTP codes are printed in the terminal running `npm run dev`.

### Environment variables

| Variable | Needed | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection used by the app |
| `DATABASE_URL_UNPOOLED` | Yes | Direct connection used for migrations (same as above locally) |
| `AUTH_SECRET` | Yes | Signs login sessions |
| `AUTH_TRUST_HOST` | Yes | Set to `true` |
| `ADMIN_MOBILE`, `ADMIN_PASSWORD`, `ADMIN_NAME` | For the seed | First admin account. Only used when the account is created; change the password later in Admin → Change password |
| `SEAT_COUNT` | No | Seats created by the seed (default 60) |
| `SMS_PROVIDER` | No | `console` (default) or `msg91` |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | For real SMS | MSG91 account and a DLT-approved OTP template containing `##OTP##` |
| `STORAGE_DIR` | No | Folder for uploads on a normal server (default `./storage`) |
| `BLOB_READ_WRITE_TOKEN`, `BLOB_ACCESS` | On Vercel | Set by connecting a Vercel Blob store; switches uploads to Blob |

## Deploying on Vercel

The live site runs on Vercel with a **Neon Postgres** database and a **private Vercel Blob** store.

1. Create a Vercel project for this repo (`vercel link`).
2. Add storage from the Vercel Marketplace and connect it to the project:
   - **Neon** (Postgres) sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
   - **Blob** (private) sets `BLOB_READ_WRITE_TOKEN`. Also add `BLOB_ACCESS=private`.
3. Add `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `ADMIN_MOBILE`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `SEAT_COUNT` and `SMS_PROVIDER`.
4. Add `VERCEL_FORCE_NO_BUILD_CACHE=1`. A reused build cache made builds crash with `Cannot read properties of undefined (reading 'length')`.
5. Deploy with `vercel deploy --prod`.

Each deploy runs `npm run vercel-build`, which applies database migrations, runs the seed and then builds. The seed is safe to run repeatedly: it never changes an existing admin's password or your plans and settings.

### Files on Vercel
- **E-book PDFs (up to 500 MB)** go straight from the admin's browser to Blob storage, with a progress bar. Students open them through a private link that expires after 15 minutes, after their membership is checked.
- **Cover images and photos** go through the server, so they're limited to 4 MB on Vercel.
- **Storage limits:** Vercel's free plan includes only a small amount of Blob storage and download traffic. Check *Vercel → Storage → Usage* before uploading many large e-books.

### On a normal server instead
Run `npm run build` and `npm start` behind a web server with HTTPS (for example nginx with `pm2`). Without a Blob token, uploads are saved in `STORAGE_DIR`. Back that folder up together with the database.

## Day-to-day (admin)
- **New admission:** Students → New admission → choose plan, shift, start date and a green (free) seat. The end date is calculated for you.
- **Renewal:** open the student → Renew membership. It starts the day after the current one ends.
- **Student paid by UPI:** Payments → match the UTR in your UPI app → Confirm & renew.
- **Reminders:** Dues & reminders → WhatsApp opens a ready-made message.
- **Receipts:** Fee receipts → View / print, or send on WhatsApp.
- **Books:** Books → Add a book. To remove books, use 🗑 Delete on a row, or tick several and press Delete selected.
- **Borrowing:** Borrow & return → Approve & issue sets the return date; Mark returned when the book comes back.
- **Website:** Settings for contact details, opening hours, UPI ID or QR, facilities and photos. Offer popups for festival offers.
- **Password:** Change password in the menu.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (seat overlap, dates, hours, OTP, receipts, borrowing rules, amounts in words) |
| `npm run lint` | Lint |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:seed` | Add the starting data |

## Author

Developed by Prashant Singh ([@Happybro2005](https://github.com/Happybro2005)).
