import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { dnsRecords, doDomains, droplets, ncDomains, routes, syncRuns } from '$lib/server/db/schema';
import { avisarVencimientos } from '$lib/server/notificar';
import { leerNamecheap } from './namecheap';
import { leerDigitalOcean } from './digitalocean';
import { leerServidor } from './servidor';

export const FUENTES = ['namecheap', 'digitalocean', 'servidor'] as const;
export type Fuente = (typeof FUENTES)[number];

export type ResultadoSync = { fuente: Fuente; ok: boolean; items: number; mensaje: string | null };

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const UNA_HORA_MS = 60 * 60 * 1000;
let corriendo = false;

export const sincronizando = () => corriendo;

async function ejecutar(fuente: Fuente): Promise<ResultadoSync> {
	const inicio = new Date();
	let ok = true;
	let items = 0;
	let mensaje: string | null = null;

	try {
		if (fuente === 'namecheap') {
			const r = await leerNamecheap();
			db.transaction((tx) => {
				tx.delete(ncDomains).run();
				tx.delete(dnsRecords).where(eq(dnsRecords.source, 'namecheap')).run();
				for (const d of r.dominios) {
					tx.insert(ncDomains)
						.values({ ...d, nameservers: JSON.stringify(d.nameservers) })
						.run();
				}
				for (const x of r.registros) tx.insert(dnsRecords).values({ source: 'namecheap', ...x }).run();
			});
			items = r.dominios.length;
			mensaje = r.avisos.join(' · ') || null;
		} else if (fuente === 'digitalocean') {
			const r = await leerDigitalOcean();
			db.transaction((tx) => {
				tx.delete(doDomains).run();
				tx.delete(droplets).run();
				tx.delete(dnsRecords).where(eq(dnsRecords.source, 'do')).run();
				for (const name of r.dominios) tx.insert(doDomains).values({ name }).run();
				for (const x of r.registros) tx.insert(dnsRecords).values({ source: 'do', ...x }).run();
				for (const ip of r.ips) tx.insert(droplets).values(ip).onConflictDoNothing().run();
			});
			items = r.dominios.length;
			mensaje = r.avisos.join(' · ') || null;
		} else {
			const r = await leerServidor();
			db.transaction((tx) => {
				tx.delete(routes).run();
				for (const x of r.rutas) tx.insert(routes).values({ ...x, aliases: JSON.stringify(x.aliases) }).run();
			});
			items = r.rutas.length;
			mensaje = r.avisos.join(' · ') || null;
		}
	} catch (e) {
		ok = false;
		mensaje = e instanceof Error ? e.message : String(e);
	}

	// Avisos de vencimiento: corren aunque el sync haya fallado, porque las fechas guardadas siguen
	// siendo válidas (una API caída varios días no debe silenciar un vencimiento). Que ntfy falle no
	// cambia el resultado del sync: queda anotado en el detalle y se reintenta en el siguiente.
	if (fuente === 'namecheap') {
		try {
			const aviso = await avisarVencimientos();
			if (aviso) mensaje = [mensaje, aviso].filter(Boolean).join(' · ');
		} catch (e) {
			mensaje = [mensaje, `ntfy falló: ${e instanceof Error ? e.message : e}`].filter(Boolean).join(' · ');
		}
	}

	db.insert(syncRuns).values({ source: fuente, startedAt: inicio, finishedAt: new Date(), ok, items, message: mensaje }).run();
	// Bitácora acotada: solo las últimas 300 corridas.
	db.run(sql`delete from sync_runs where id not in (select id from sync_runs order by id desc limit 300)`);
	return { fuente, ok, items, mensaje };
}

/** Corre las fuentes indicadas (todas por defecto), una tras otra. Una que falla no tumba a las demás. */
export async function sincronizar(fuentes: readonly Fuente[] = FUENTES): Promise<ResultadoSync[]> {
	if (corriendo) throw new Error('Ya hay una sincronización en curso');
	corriendo = true;
	try {
		const out: ResultadoSync[] = [];
		for (const f of fuentes) out.push(await ejecutar(f));
		return out;
	} finally {
		corriendo = false;
	}
}

/** Para las acciones de formulario: nunca lanza, devuelve el resultado o el error. */
export async function sincronizarSeguro(): Promise<{ ok: boolean; error?: string; resultados?: ResultadoSync[] }> {
	try {
		return { ok: true, resultados: await sincronizar() };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

/** Última corrida de cada fuente (fecha en ms y si salió bien). */
function ultimaCorrida(): Record<Fuente, { at: number; ok: boolean } | null> {
	const filas = db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(300).all();
	const out = { namecheap: null, digitalocean: null, servidor: null } as Record<
		Fuente,
		{ at: number; ok: boolean } | null
	>;
	for (const f of filas) {
		if (f.source in out && !out[f.source as Fuente]) {
			out[f.source as Fuente] = { at: f.finishedAt.getTime(), ok: f.ok };
		}
	}
	return out;
}

let iniciado = false;

/**
 * Sync automático. Cada hora revisa qué fuentes tocan: las que salieron bien hace más de 24 h y
 * las que fallaron hace más de 1 h. Al arrancar la app (p. ej. tras corregir el `.env` y
 * redesplegar) reintenta además toda fuente que haya fallado, sin esperar. Se arranca desde
 * hooks.server.ts.
 */
export function iniciarProgramador() {
	if (iniciado) return;
	iniciado = true;
	const revisar = async (alArrancar = false) => {
		if (corriendo) return;
		const ultima = ultimaCorrida();
		const pendientes = FUENTES.filter((f) => {
			const u = ultima[f];
			if (!u) return true;
			const edad = Date.now() - u.at;
			return u.ok ? edad > UN_DIA_MS : alArrancar || edad > UNA_HORA_MS;
		});
		if (pendientes.length) await sincronizar(pendientes).catch((e) => console.error('[sync]', e));
	};
	setTimeout(() => revisar(true), 15_000);
	setInterval(() => revisar(), 60 * 60 * 1000).unref();
}
