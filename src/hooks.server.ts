import { redirect, type Handle } from '@sveltejs/kit';
import { building, dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { COOKIE, sesionValida } from '$lib/server/auth';
import { iniciarProgramador } from '$lib/server/sync';

// Sync diario automático. En desarrollo no arranca solo (cada reinicio pegaría a las APIs):
// ahí se usa el botón "Sincronizar", o AUTO_SYNC=1 para forzarlo.
if (!building && (!dev || env.AUTO_SYNC === '1')) iniciarProgramador();

// Todo el sitio exige sesión salvo /login. Los assets de /_app los sirve adapter-node antes de llegar aquí.
export const handle: Handle = async ({ event, resolve }) => {
	const ruta = event.url.pathname;
	if (ruta !== '/login' && ruta !== '/robots.txt' && !sesionValida(event.cookies.get(COOKIE))) {
		redirect(303, '/login');
	}
	return resolve(event);
};
