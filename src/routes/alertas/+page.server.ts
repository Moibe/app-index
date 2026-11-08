import type { PageServerLoad } from './$types';
import { getOverview } from '$lib/server/overview';

export const load: PageServerLoad = () => {
	const o = getOverview();
	return { alertas: o.alertas, hayDatos: o.hayDatos };
};
