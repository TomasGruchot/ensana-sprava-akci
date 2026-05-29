import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "  (přeskočeno) ADMIN_EMAIL / ADMIN_PASSWORD nejsou nastaveny — IT admin nebyl vytvořen.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.profile.upsert({
    where: { email },
    update: { passwordHash, role: Role.IT, activatedAt: new Date() },
    create: {
      email,
      name: "IT Administrátor",
      role: Role.IT,
      passwordHash,
      activatedAt: new Date(),
    },
  });
  console.log(`  ✓ IT admin: ${email}`);
}

async function main() {
  console.log("Seeding IT admin...");
  await seedAdmin();

  console.log("Seeding hotels and rooms...");

  const hotels = [
    {
      code: "NL",
      name: "Nové Lázně",
      color: "#6366f1",
      imageUrl: "/hotels/nl.svg",
      rooms: [
        "Casino",
        "Knihovna",
        "Zelený salonek",
        "ZSO galerie",
        "Růžový salonek",
        "Akon",
        "Fenomén",
      ],
    },
    {
      code: "BU",
      name: "Butterfly",
      color: "#8b5cf6",
      imageUrl: "/hotels/bu.svg",
      rooms: ["Salónek Bellevue", "Restaurace"],
    },
    {
      code: "PA",
      name: "Pacifik",
      color: "#0ea5e9",
      imageUrl: "/hotels/pa.svg",
      rooms: ["Salónek"],
    },
    {
      code: "HV",
      name: "Hvězda",
      color: "#f59e0b",
      imageUrl: "/hotels/hv.svg",
      rooms: ["Café Imperiál"],
    },
    {
      code: "VL",
      name: "Vltava",
      color: "#10b981",
      imageUrl: "/hotels/vl.svg",
      rooms: ["Salónek Hamelika"],
    },
  ];

  for (const hotel of hotels) {
    const created = await prisma.hotel.upsert({
      where: { code: hotel.code },
      update: {
        name: hotel.name,
        color: hotel.color,
        imageUrl: hotel.imageUrl,
      },
      create: {
        code: hotel.code,
        name: hotel.name,
        color: hotel.color,
        imageUrl: hotel.imageUrl,
      },
    });

    for (const roomName of hotel.rooms) {
      await prisma.room.upsert({
        where: { hotelId_name: { hotelId: created.id, name: roomName } },
        update: {},
        create: { name: roomName, hotelId: created.id },
      });
    }

    console.log(`  ✓ ${hotel.name} (${hotel.rooms.length} místností)`);
  }

  console.log("Seed hotový.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
