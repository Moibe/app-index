import { env } from '$env/dynamic/private';

const API = 'https://api.digitalocean.com/v2';

export type DoRegistro = {
	domain: string;
	type: string;
	name: string; // FQDN
	data: string;
	ttl: number | null;
};

export type DoIp = { ip: string; name: string; kind: 'droplet' | 'reserved' };

async function get<T>(ruta: string): Promise<T> {
	if (!env.DO_TOKEN) throw new Error('Falta la variable de entorno DO_TOKEN');
	const res = await fetch(API + ruta, {
		headers: { Authorization: `Bearer ${env.DO_TOKEN}` },
		signal: AbortSignal.timeout(30_000)
	});
	if (!res.ok) throw new Error(`DigitalOcean ${ruta.split('?')[0]} respondió HTTP ${res.status}`);
	return res.json() as Promise<T>;
}

/** Recorre todas las páginas de un listado y junta `clave`. */
async function todo<T>(ruta: string, clave: string): Promise<T[]> {
	const out: T[] = [];
	for (let pagina = 1; ; pagina++) {
		const sep = ruta.includes('?') ? '&' : '?';
		const r = await get<Record<string, unknown> & { links?: { pages?: { next?: string } } }>(
			`${ruta}${sep}per_page=200&page=${pagina}`
		);
		out.push(...((r[clave] as T[] | undefined) ?? []));
		if (!r.links?.pages?.next) break;
	}
	return out;
}

export async function leerDigitalOcean(): Promise<{
	dominios: string[];
	registros: DoRegistro[];
	ips: DoIp[];
	avisos: string[];
}> {
	const avisos: string[] = [];

	const doms = await todo<{ name: string }>('/domains', 'domains');
	const dominios = doms.map((d) => d.name.toLowerCase());

	const registros: DoRegistro[] = [];
	for (const dominio of dominios) {
		const recs = await todo<{ type: string; name: string; data: string; ttl?: number }>(
			`/domains/${dominio}/records`,
			'domain_records'
		);
		for (const r of recs) {
			registros.push({
				domain: dominio,
				type: r.type,
				name: r.name === '@' ? dominio : `${r.name}.${dominio}`,
				data: r.data,
				ttl: r.ttl ?? null
			});
		}
	}

	const ips: DoIp[] = [];
	const ds = await todo<{
		name: string;
		networks: { v4: { type: string; ip_address: string }[] };
	}>('/droplets', 'droplets');
	for (const d of ds) {
		for (const n of d.networks.v4) {
			if (n.type === 'public') ips.push({ ip: n.ip_address, name: d.name, kind: 'droplet' });
		}
	}
	try {
		const reservadas = await todo<{ ip: string; droplet?: { name: string } | null }>(
			'/reserved_ips',
			'reserved_ips'
		);
		for (const r of reservadas) ips.push({ ip: r.ip, name: r.droplet?.name ?? '(sin asignar)', kind: 'reserved' });
	} catch (e) {
		avisos.push(`IPs reservadas no disponibles (${e instanceof Error ? e.message : e})`);
	}

	return { dominios, registros, ips, avisos };
}
