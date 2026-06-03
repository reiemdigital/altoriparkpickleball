interface Team { id: string; name: string; }
interface GeneratedMatch { team1Id: string; team2Id: string; round: number; }

export function generateRoundRobin(teams: Team[]): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  const pool: Team[] = [...teams];
  if (pool.length % 2 !== 0) pool.push({ id: 'BYE_ID', name: 'BYE' });

  const numTeams = pool.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const team1 = pool[i];
      const team2 = pool[numTeams - 1 - i];
      if (team1 && team2 && team1.id !== 'BYE_ID' && team2.id !== 'BYE_ID') {
        matches.push({ team1Id: team1.id, team2Id: team2.id, round: round + 1 });
      }
    }
    if (pool.length > 1) {
      const fixedTeam = pool[0];
      const rotatingPart = pool.slice(1);
      const lastTeam = rotatingPart.pop();
      if (lastTeam !== undefined) rotatingPart.unshift(lastTeam);
      if (fixedTeam) pool.splice(0, pool.length, fixedTeam, ...rotatingPart);
    }
  }
  return matches;
}