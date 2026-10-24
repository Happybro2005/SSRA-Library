import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const adminMobile = process.env.ADMIN_MOBILE ?? "9935184537";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword === "change-me") {
    throw new Error("Set ADMIN_PASSWORD in .env before seeding.");
  }

  await prisma.user.upsert({
    where: { mobile: adminMobile },
    create: {
      name: process.env.ADMIN_NAME ?? "Satyadev Kumar",
      mobile: adminMobile,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
    update: { role: "ADMIN" },
  });

  if ((await prisma.shift.count()) === 0) {
    await prisma.shift.createMany({
      data: [
        { nameEn: "Morning", nameHi: "सुबह", startTime: "06:00", endTime: "14:00", sortOrder: 1 },
        { nameEn: "Evening", nameHi: "शाम", startTime: "14:00", endTime: "22:00", sortOrder: 2 },
        { nameEn: "Full day", nameHi: "पूरा दिन", startTime: "06:00", endTime: "22:00", sortOrder: 3 },
      ],
    });
  }

  const seatCount = Number(process.env.SEAT_COUNT ?? 60);
  for (let n = 1; n <= seatCount; n++) {
    await prisma.seat.upsert({ where: { number: n }, create: { number: n }, update: {} });
  }

  if ((await prisma.feePlan.count()) === 0) {
    const year = new Date().getFullYear();
    const offer = await prisma.feePlan.create({
      data: {
        nameEn: "Diwali & Chhath special offer",
        nameHi: "दीपावली एवं छठ पर्व विशेष ऑफर",
        durationMonths: 2,
        price: 700,
        isOffer: true,
        validFrom: dateOnly(`${year}-10-01`),
        validTill: dateOnly(`${year}-11-30`),
        sortOrder: 0,
      },
    });
    // Regular monthly prices aren't on the poster — add them from Admin → Fee plans.

    await prisma.promotion.create({
      data: {
        titleEn: "Diwali & Chhath Special Offer",
        titleHi: "दीपावली एवं छठ पर्व के शुभ अवसर पर विशेष ऑफर",
        messageEn: "Join SSRA Library for 2 months at just ₹700. Fully AC, CCTV, 24×7 power backup, free books & e-books.",
        messageHi: "सिर्फ ₹700 में 2 महीने की सदस्यता। पूर्णतः AC, CCTV, 24×7 पावर बैकअप, मुफ़्त किताबें और ई-बुक्स।",
        badge: "₹700 / 2 months",
        ctaTextEn: "Call to book your seat",
        ctaTextHi: "सीट बुक करने के लिए कॉल करें",
        ctaLink: "tel:+919935184537",
        startDate: offer.validFrom!,
        endDate: offer.validTill!,
        planId: offer.id,
        priority: 10,
      },
    });
  }

  if ((await prisma.facility.count()) === 0) {
    const facilities: [string, string, string][] = [
      ["❄️", "Fully AC", "पूर्णतः वातानुकूलित"],
      ["🪑", "Comfortable seating arrangement", "आरामदायक बैठने की व्यवस्था"],
      ["🅿️", "Good parking facilities", "अच्छी पार्किंग सुविधा"],
      ["💧", "Clean R.O. water", "स्वच्छ आर.ओ. पानी"],
      ["📹", "CCTV camera", "सीसीटीवी कैमरा"],
      ["🔋", "24×7 power backup", "24×7 पावर बैकअप"],
      ["💡", "Separate table lamp & charging point", "अलग टेबल लैंप और चार्जिंग पॉइंट"],
      ["🤫", "Peaceful, inspiring environment with strict discipline", "सख्त अनुशासन के साथ शांत और प्रेरक माहौल"],
      ["🤖", "Chatbot (online practice platform)", "चैटबॉट (ऑनलाइन अभ्यास प्लेटफ़ॉर्म)"],
      ["🖥️", "Desktop (computer system)", "डेस्कटॉप (कंप्यूटर सिस्टम)"],
      ["🖨️", "Printer", "प्रिंटर"],
      ["📱", "Free e-books", "मुफ़्त ई-बुक्स"],
      ["📚", "Free books", "मुफ़्त किताबें"],
      ["📰", "Daily newspaper & magazines", "दैनिक समाचार पत्र और पत्रिकाएं"],
      ["👫", "For boys & girls both", "लड़के और लड़कियों दोनों के लिए"],
    ];
    await prisma.facility.createMany({
      data: facilities.map(([icon, titleEn, titleHi], i) => ({ icon, titleEn, titleHi, sortOrder: i })),
    });
  }

  console.log(`Seeded: admin ${adminMobile}, ${seatCount} seats.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
