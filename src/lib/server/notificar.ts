import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { ncDomains, notificaciones } from '$lib/server/db/schema';
import { armarMensaje, decidirAvisos } from './avisos';

export const ntfyActivo = () => !!env.NTFY_TOPIC;

type Mensaje = {
	titulo: string;
	mensaje: string;
	prioridad?: 1 | 2 | 3 | 4 | 5;
	etiquetas?: string[];
	click?: string;
};

/**
 * Publica en ntfy con el formato JSON (se manda al servidor raíz con el topic en el cuerpo):
 * así título y texto viajan en UTF-8 y los acentos no se rompen.
 */
export async function enviarNtfy(m: Mensaje): Promise<void> {
	if (!env.NTFY_TOPIC) throw new Error('Falta la variable de entorno NTFY_TOPIC');
	const base = (env.NTFY_URL || 'https://ntfy.sh').replace(/\/+$/, '');
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			topic: env.NTFY_TOPIC,
			title: m.titulo,
			message: m.mensaje,
			priority: m.prioridad ?? 3,
			tags: m.etiquetas,
			click: m.click
		}),
		signal: AbortSignal.timeout(15_000)
	});
	if (!res.ok) throw new Error(`ntfy respondió HTTP ${res.status}`);
}

/**
 * Avisa de los dominios que cruzaron un umbral de vencimiento y aún no se han avisado.
 * Devuelve un texto para la bitácora, o null si no había nada que avisar (o ntfy está apagado).
 * Los avisos se registran solo si el envío salió bien: si falla, se reintenta en el siguiente sync.
 */
export async function avisarVencimientos(): Promise<string | null> {
	if (!ntfyActivo()) return null;
	const vistos = new Set(db.select({ clave: notificaciones.clave }).from(notificaciones).all().map((r) => r.clave));
	const avisos = decidirAvisos(db.select().from(ncDomains).all(), vistos);
	if (!avisos.length) return null;

	const m = armarMensaje(avisos);
	await enviarNtfy({
		...m,
		etiquetas: ['hourglass_flowing_sand'],
		click: env.ORIGIN?.startsWith('https://') ? `${env.ORIGIN}/alertas` : undefined
	});

	const ahora = new Date();
	db.transaction((tx) => {
		for (const clave of avisos.flatMap((a) => a.claves)) {
			tx.insert(notificaciones).values({ clave, enviada: ahora }).onConflictDoNothing().run();
		}
	});
	return `ntfy: ${avisos.length} ${avisos.length === 1 ? 'aviso enviado' : 'avisos enviados'}`;
}
