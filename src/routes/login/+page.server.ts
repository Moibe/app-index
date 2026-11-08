import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	COOKIE,
	SESION_SEGUNDOS,
	contrasenaCorrecta,
	crearSesion,
	esperaMs,
	limpiarFallos,
	registrarFallo,
	sesionValida
} from '$lib/server/auth';

export const load: PageServerLoad = ({ cookies }) => {
	if (sesionValida(cookies.get(COOKIE))) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		let ip = 'desconocida';
		try {
			ip = getClientAddress();
		} catch {
			/* sin IP disponible: todos comparten el mismo contador */
		}

		const form = await request.formData();
		const intento = String(form.get('password') ?? '');

		if (!contrasenaCorrecta(intento)) {
			const espera = esperaMs(ip);
			registrarFallo(ip);
			if (espera) await new Promise((r) => setTimeout(r, espera));
			return fail(400, { error: 'Contraseña incorrecta' });
		}

		limpiarFallos(ip);
		cookies.set(COOKIE, crearSesion(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESION_SEGUNDOS
		});
		redirect(303, '/');
	}
};
