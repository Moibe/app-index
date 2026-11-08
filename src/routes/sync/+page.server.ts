import type { Actions, PageServerLoad } from './$types';
import { getOverview } from '$lib/server/overview';
import { enviarNtfy, ntfyActivo } from '$lib/server/notificar';
import { sincronizarSeguro } from '$lib/server/sync';

export const load: PageServerLoad = () => {
	const o = getOverview();
	return { ultimas: o.ultimas, corridas: o.corridas, ips: o.ips, ntfyActivo: ntfyActivo() };
};

export const actions: Actions = {
	sync: async () => sincronizarSeguro(),

	// Manda un aviso de prueba para comprobar que el topic y la red están bien, sin esperar a un vencimiento.
	ntfy: async () => {
		try {
			await enviarNtfy({
				titulo: 'app-index: prueba de avisos',
				mensaje: 'Si lees esto, los avisos de vencimiento van a llegar bien.',
				etiquetas: ['white_check_mark']
			});
			return { ntfy: true as const, ok: true };
		} catch (e) {
			return { ntfy: true as const, ok: false, error: e instanceof Error ? e.message : String(e) };
		}
	}
};
