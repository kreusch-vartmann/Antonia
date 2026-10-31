import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';

/** Records security-relevant actions. Never stores personal data, only ids. */
export async function audit(
	db: Db,
	teacherId: string | null,
	action: string,
	targetType?: string,
	targetId?: string
) {
	await db.insert(schema.auditLog).values({ teacherId, action, targetType, targetId });
}

export async function recentAudit(db: Db, teacherId: string, limit = 50) {
	return db
		.select()
		.from(schema.auditLog)
		.where(and(eq(schema.auditLog.teacherId, teacherId)))
		.orderBy(desc(schema.auditLog.at))
		.limit(limit);
}

export const AUDIT_LABELS: Record<string, string> = {
	'teacher.create': 'Konto angelegt',
	'teacher.login': 'Anmeldung',
	'teacher.password.change': 'Passwort geändert',
	'teacher.2fa.enable': '2FA aktiviert',
	'teacher.2fa.disable': '2FA deaktiviert',
	'teacher.2fa.recoveryUsed': 'Wiederherstellungscode benutzt',
	'teacher.sessions.revoke': 'Alle Sitzungen abgemeldet',
	'student.create': 'Kind angelegt',
	'student.update': 'Kind bearbeitet',
	'student.password.reset': 'Passwort eines Kindes zurückgesetzt',
	'student.delete': 'Kind gelöscht',
	'student.export': 'Daten eines Kindes exportiert',
	'results.export': 'Ergebnisse exportiert'
};
