/** Per-teacher preferences (stored as JSON on the teacher). */
import type { SettingsLayer } from './settings';

export interface TeacherPreferences {
	/** Display settings (material, colours) that new sets start with. */
	setDefaults?: SettingsLayer;
	/** Order of the headings on the set overview, e.g. ["range:zr10", "custom:<uuid>"]. */
	headingOrder?: string[];
}
