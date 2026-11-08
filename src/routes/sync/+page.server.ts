import type { Actions, PageServerLoad } from './$types';
import { getOverview } from '$lib/server/overview';
import { sincronizarSeguro } from '$lib/server/sync';

export const load: PageServerLoad = () => {
	const o = getOverview();
	return { ultimas: o.ultimas, corridas: o.corridas, ips: o.ips };
};

export const actions: Actions = {
	sync: async () => sincronizarSeguro()
};
