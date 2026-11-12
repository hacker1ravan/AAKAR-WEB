// Optional sample data so you can try the store straight away: npm run db:demo
// Safe to run twice: it does nothing if products already exist.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const img = (text: string, w = 600, h = 800) =>
  `https://placehold.co/${w}x${h}/png?text=${encodeURIComponent(text)}`;

async function main() {
  if ((await prisma.product.count()) > 0) {
    console.log("Products already exist: demo data skipped.");
    return;
  }

  await prisma.category.createMany({
    data: [
      {
        name: "Clothes", position: 0, imageUrl: img("Clothes", 600, 600),
        sizeChart: "Size | Chest (in) | Length (in)\nS | 36 | 27\nM | 38 | 28\nL | 40 | 29\nXL | 42 | 30",
      },
      { name: "Jewellery", position: 1, imageUrl: img("Jewellery", 600, 600), codAvailable: false },
    ],
  });

  const products = [
    { name: "Linen Shirt", description: "Breathable linen shirt with a relaxed fit.\nMachine wash cold.", price: 149900, comparePrice: 199900, category: "Clothes", gstRate: 5, sizes: ["S", "M", "L", "XL"], colors: ["White", "Sky Blue"] },
    { name: "Cotton Kurta", description: "Soft cotton kurta for everyday wear.", price: 99900, comparePrice: 0, category: "Clothes", gstRate: 5, sizes: ["M", "L", "XL"], colors: ["Mustard"] },
    { name: "Denim Jacket", description: "Classic mid-wash denim jacket.", price: 249900, comparePrice: 299900, category: "Clothes", gstRate: 12, sizes: ["M", "L"], colors: ["Blue"] },
    { name: "Gold Plated Necklace", description: "Hand finished gold plated necklace.", price: 79900, comparePrice: 0, category: "Jewellery", gstRate: 3, sizes: ["Free"], colors: ["Gold"] },
    { name: "Silver Hoop Earrings", description: "Lightweight sterling silver hoops.", price: 59900, comparePrice: 79900, category: "Jewellery", gstRate: 3, sizes: ["Free"], colors: ["Silver"] },
  ];

  for (const p of products) {
    const { sizes, colors, ...rest } = p;
    await prisma.product.create({
      data: {
        ...rest,
        images: [img(p.name), img(p.name + " back")],
        variants: {
          create: colors.flatMap((color) => sizes.map((size) => ({ size, color, stock: 10 }))),
        },
      },
    });
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", type: "percent", value: 10, maxDiscount: 20000, perUserLimit: 1 },
  });

  await prisma.banner.create({
    data: {
      imageUrl: img("Festive Sale", 1600, 600), title: "Festive sale",
      subtitle: "Up to 30% off selected styles", buttonText: "Shop the sale", linkUrl: "/products?sale=1",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: { siteName: "Demo Store", tagline: "Everyday clothes and jewellery", codEnabled: true, codFee: 4000 },
    create: { id: "main", siteName: "Demo Store", tagline: "Everyday clothes and jewellery", codEnabled: true, codFee: 4000, contactEmail: "owner@example.com" },
  });

  console.log("Demo data added: 2 categories, 5 products, coupon WELCOME10, 1 banner.");
}

main().finally(() => prisma.$disconnect());
