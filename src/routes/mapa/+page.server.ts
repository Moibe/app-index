import type { PageServerLoad } from './$types';
import { getOverview } from '$lib/server/overview';

export const load: PageServerLoad = () => {
	const o = getOverview();
	return { rutas: o.rutas, hayDatos: o.hayDatos, servidor: o.ultimas.servidor };
};
