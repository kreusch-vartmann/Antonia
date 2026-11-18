/** Helpers to show children by class and to pick whole groups. */
export interface GroupLite {
	id: string;
	name: string;
	kind: 'class' | 'subgroup';
	memberIds: string[];
}

export interface ClassSection<T> {
	key: string;
	/** null = there are no classes at all, so no heading is needed. */
	name: string | null;
	students: T[];
}

/** The children by class (in the order of the classes), the ones without a class last. */
export function sectionsByClass<T extends { id: string }>(
	students: T[],
	groups: GroupLite[]
): ClassSection<T>[] {
	const classes = groups.filter((g) => g.kind === 'class');
	if (classes.length === 0) return [{ key: 'all', name: null, students }];
	const placed = new Set<string>();
	const out: ClassSection<T>[] = [];
	for (const c of classes) {
		const list = students.filter((s) => c.memberIds.includes(s.id));
		list.forEach((s) => placed.add(s.id));
		if (list.length > 0) out.push({ key: c.id, name: c.name, students: list });
	}
	const rest = students.filter((s) => !placed.has(s.id));
	if (rest.length > 0) out.push({ key: 'none', name: 'Ohne Klasse', students: rest });
	return out;
}

/** Ticks all members of the group, or unticks them if all of them are ticked already. */
export function toggleGroup(selected: string[], memberIds: string[]): string[] {
	if (memberIds.length === 0) return selected;
	const all = memberIds.every((id) => selected.includes(id));
	if (all) return selected.filter((id) => !memberIds.includes(id));
	return [...new Set([...selected, ...memberIds])];
}
