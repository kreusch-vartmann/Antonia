/** Game scenarios (for the display case: one board per scenario). */
export const SCENARIOS = [{ id: 'race', label: 'Autorennen' }] as const;

export function scenarioLabel(id: string): string {
	return SCENARIOS.find((s) => s.id === id)?.label ?? 'Weitere Spiele';
}

/** Known scenarios in their order, then unknown ones as they appear. */
export function scenarioOrder(ids: string[]): string[] {
	const known = SCENARIOS.map((s) => s.id as string).filter((id) => ids.includes(id));
	return [...known, ...[...new Set(ids)].filter((id) => !known.includes(id))];
}
