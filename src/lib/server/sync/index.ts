import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { dnsRecords, doDomains, droplets, ncDomains, routes, syncRuns } from '$lib/server/db/schema';
import { leerNamecheap } from './namecheap';
import { leerDigitalOcean } from './digitalocean';
import { leerServidor } from './servidor';

export const FUENTES = ['namecheap', 'digitalocean', 'servidor'] as const;
export type Fuente = (typeof FUENTES)[number];

export type ResultadoSync = { fuente: Fuente; ok: boolean; items: number; mensaje: string | null };

const UN_DIA_MS = 24 * 60 * 60 * 1000;
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

/** Fecha (ms) de la última corrida de cada fuente, sea buena o mala. */
function ultimaCorrida(): Record<Fuente, number | null> {
	const filas = db
		.select({ source: syncRuns.source, ultima: sql<number>`max(${syncRuns.finishedAt})` })
		.from(syncRuns)
		.groupBy(syncRuns.source)
		.all();
	const out = { namecheap: null, digitalocean: null, servidor: null } as Record<Fuente, number | null>;
	for (const f of filas) if (f.source in out) out[f.source as Fuente] = f.ultima * 1000;
	return out;
}

let iniciado = false;

/**
 * Sync automático: cada hora revisa qué fuentes llevan más de 24 h sin correrse y las corre.
 * Una fuente que falla se reintenta al día siguiente (cuenta la última corrida, buena o mala),
 * no cada hora. Se arranca desde hooks.server.ts.
 */
export function iniciarProgramador() {
	if (iniciado) return;
	iniciado = true;
	const revisar = async () => {
		if (corriendo) return;
		const ultima = ultimaCorrida();
		const pendientes = FUENTES.filter((f) => !ultima[f] || Date.now() - ultima[f]! > UN_DIA_MS);
		if (pendientes.length) await sincronizar(pendientes).catch((e) => console.error('[sync]', e));
	};
	setTimeout(revisar, 15_000);
	setInterval(revisar, 60 * 60 * 1000).unref();
}
