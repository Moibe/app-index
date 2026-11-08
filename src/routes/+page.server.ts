import type { Actions, PageServerLoad } from './$types';
import { getOverview } from '$lib/server/overview';
import { sincronizarSeguro } from '$lib/server/sync';

export const load: PageServerLoad = () => getOverview();

export const actions: Actions = {
	sync: async () => sincronizarSeguro()
};
