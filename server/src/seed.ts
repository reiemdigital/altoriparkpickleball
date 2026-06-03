import { PrismaClient } from '@prisma/client';
import { generateRoundRobin } from './utils/scheduler.js';

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning database...");
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();

  const teamData = [
    { name: "The Baseline Kings", players: ["Raymart", "Raymond"] },
    { name: "Kitchen Ninjas", players: ["Alice", "Bob"] },
    { name: "Pickle Power", players: ["Charlie", "David"] },
    { name: "Dink Masters", players: ["Eve", "Frank"] },
  ];

  const createdTeams = [];
  for (const t of teamData) {
    const team = await prisma.team.create({
      data: { name: t.name, players: { create: t.players.map(p => ({ name: p })) } }
    });
    createdTeams.push(team);
  }

  const matchSchedule = generateRoundRobin(createdTeams);
  for (const m of matchSchedule) {
    await prisma.match.create({ data: { team1Id: m.team1Id, team2Id: m.team2Id, type: 'ROUND_ROBIN' } });
  }
  console.log("✅ Tournament Seeded Successfully!");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());