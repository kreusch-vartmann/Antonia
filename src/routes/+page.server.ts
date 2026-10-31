import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session?.role === 'teacher') redirect(303, '/lehrkraft');
	if (locals.session?.role === 'student') redirect(303, '/ueben');
	redirect(303, '/login');
};
