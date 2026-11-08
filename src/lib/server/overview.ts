import { db } from '$lib/server/db';
import { dnsRecords, doDomains, droplets, ncDomains, routes, syncRuns } from '$lib/server/db/schema';
import { FUENTES, type Fuente } from '$lib/server/sync';

// Cruza las tres fuentes por nombre de dominio y calcula las alertas. Todo lo que devuelve es
// JSON plano (strings, números, booleanos) para pasarlo tal cual a las páginas.

export type Severidad = 'alta' | 'media' | 'info';
export type Alerta = { id: string; severidad: Severidad; dominio: string; titulo: string; detalle: string };

export type DnsEn = 'digitalocean' | 'namecheap' | 'otro' | 'desconocido';
export type EstadoDns = 'ok' | 'ajena' | 'sin-registro' | 'dominio-desconocido' | 'externo' | 'n/d';

export type Destino = { port: number | null; target: string; app: string | null; listening: boolean | null };
export type RutaFila = {
	host: string;
	aliases: string[];
	archivo: string;
	dominio: string | null;
	enabled: boolean | null;
	destinos: Destino[];
	dns: EstadoDns;
};

export type DominioFila = {
	name: string;
	inNamecheap: boolean;
	inDo: boolean;
	expires: string | null;
	daysLeft: number | null;
	autoRenew: boolean | null;
	locked: boolean | null;
	whoisGuard: boolean | null;
	dnsEn: DnsEn;
	nameservers: string[];
	apuntaAlDroplet: boolean | null;
	hosts: string[];
	apps: string[];
	alertas: number;
};

export type CorridaFuente = { at: number; ok: boolean; items: number; message: string | null };

const ES_DO_NS = /\.digitalocean\.com$/i;
const ORDEN: Record<Severidad, number> = { alta: 0, media: 1, info: 2 };
const json = (s: string): string[] => {
	try {
		return JSON.parse(s) as string[];
	} catch {
		return [];
	}
};

function diasHasta(iso: string | null): number | null {
	if (!iso) return null;
	const hoy = new Date();
	const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
	return Math.round((Date.parse(`${iso}T00:00:00Z`) - hoyUtc) / 86_400_000);
}

export function getOverview() {
	const nc = db.select().from(ncDomains).all();
	const doNames = new Set(db.select().from(doDomains).all().map((d) => d.name));
	const registros = db.select().from(dnsRecords).all();
	const ips = db.select().from(droplets).all();
	const rutasDb = db.select().from(routes).all();
	const corridas = db.select().from(syncRuns).all();

	const ncPorNombre = new Map(nc.map((d) => [d.name, d]));
	const nombres = [...new Set([...ncPorNombre.keys(), ...doNames])].sort();
	const ipsPropias = new Set(ips.map((i) => i.ip));

	// Última corrida por fuente (cualquier resultado) y última buena.
	const ultimas = {} as Record<Fuente, CorridaFuente | null>;
	for (const f of FUENTES) {
		const mias = corridas.filter((c) => c.source === f).sort((a, b) => b.id - a.id);
		const u = mias[0];
		ultimas[f] = u
			? { at: u.finishedAt.getTime(), ok: u.ok, items: u.items, message: u.message }
			: null;
	}

	// Dominio al que pertenece un host: el más largo que coincida (a.b.c.com → c.com si b.c.com no existe).
	const dominioDe = (host: string): string | null => {
		let mejor: string | null = null;
		for (const n of nombres) {
			if ((host === n || host.endsWith(`.${n}`)) && (!mejor || n.length > mejor.length)) mejor = n;
		}
		return mejor;
	};

	// Dónde vive el DNS de cada dominio, y qué registros son los vigentes.
	const dnsEnDe = (nombre: string): DnsEn => {
		const d = ncPorNombre.get(nombre);
		if (!d) return 'desconocido'; // solo en DO: se asume que su DNS es el de DO, pero no se puede confirmar
		if (d.usingNcDns) return 'namecheap';
		const ns = json(d.nameservers);
		if (!ns.length) return 'desconocido';
		return ns.every((n) => ES_DO_NS.test(n)) ? 'digitalocean' : 'otro';
	};
	const vigentes = (nombre: string, dnsEn: DnsEn) => {
		const fuente = dnsEn === 'namecheap' ? 'namecheap' : dnsEn === 'otro' ? null : 'do';
		return fuente ? registros.filter((r) => r.domain === nombre && r.source === fuente) : [];
	};

	// Rutas agrupadas por host.
	const porHost = new Map<string, RutaFila>();
	for (const r of rutasDb) {
		const fila = porHost.get(r.host) ?? {
			host: r.host,
			aliases: json(r.aliases),
			archivo: r.file,
			dominio: dominioDe(r.host),
			enabled: r.enabled,
			destinos: [],
			dns: 'n/d' as EstadoDns
		};
		// Varios `location` al mismo puerto cuentan como un solo destino.
		if (!fila.destinos.some((x) => x.port !== null && x.port === r.port)) {
			fila.destinos.push({ port: r.port, target: r.target, app: r.app, listening: r.listening });
		}
		porHost.set(r.host, fila);
	}
	const cubiertos = new Set<string>();
	for (const r of porHost.values()) [r.host, ...r.aliases].forEach((h) => cubiertos.add(h));

	// Estado del DNS de cada host según el DNS vigente de su dominio.
	for (const r of porHost.values()) {
		if (r.host.includes('*')) continue;
		if (!r.dominio) {
			r.dns = 'dominio-desconocido';
			continue;
		}
		const dnsEn = dnsEnDe(r.dominio);
		if (dnsEn === 'otro') {
			r.dns = 'externo'; // nameservers de un tercero: no se pueden ver sus registros
			continue;
		}
		const propios = vigentes(r.dominio, dnsEn).filter(
			(x) => x.name.toLowerCase() === r.host && (x.type === 'A' || x.type === 'CNAME')
		);
		if (!propios.length) r.dns = 'sin-registro';
		else if (propios.some((x) => x.type === 'CNAME' || ipsPropias.has(x.data))) r.dns = 'ok';
		else r.dns = ipsPropias.size ? 'ajena' : 'n/d';
	}

	// ---- Alertas ----
	const alertas: Alerta[] = [];
	const alerta = (severidad: Severidad, dominio: string, clave: string, titulo: string, detalle: string) =>
		alertas.push({ id: `${clave}:${dominio}`, severidad, dominio, titulo, detalle });

	const dominios: DominioFila[] = nombres.map((name) => {
		const d = ncPorNombre.get(name);
		const inDo = doNames.has(name);
		const dnsEn = dnsEnDe(name);
		const ns = d ? json(d.nameservers) : [];
		const dias = diasHasta(d?.expires ?? null);
		const activos = vigentes(name, dnsEn);
		const apunta = !ips.length
			? null
			: dnsEn === 'otro'
				? null
				: activos.some((x) => x.type === 'A' && x.name.toLowerCase() === name && ipsPropias.has(x.data));
		const hostsDe = [...porHost.values()].filter((r) => r.dominio === name);

		// Vencimiento: con auto-renew el aviso baja un escalón (la tarjeta ya se cobra sola).
		if (d && dias !== null) {
			const cuando = dias < 0 ? `venció hace ${-dias} días` : `vence en ${dias} días (${d.expires})`;
			if (dias < 0) alerta('alta', name, 'vence', 'Dominio vencido', cuando);
			else if (dias <= 30) alerta(d.autoRenew ? 'media' : 'alta', name, 'vence', 'Vence pronto', cuando);
			else if (dias <= 60) alerta(d.autoRenew ? 'info' : 'media', name, 'vence', 'Vence en menos de 60 días', cuando);
			else if (dias <= 90) alerta('info', name, 'vence', 'Vence en menos de 90 días', cuando);
		}
		if (d && !d.autoRenew) alerta('media', name, 'sin-autorenew', 'Sin auto-renovación', 'Si olvidas renovarlo, se pierde.');

		if (d && !inDo) {
			alerta('info', name, 'no-en-do', 'No está en DigitalOcean', `Su DNS vive en: ${dnsEn === 'namecheap' ? 'Namecheap' : ns.join(', ') || 'desconocido'}.`);
		}
		if (!d && inDo) {
			alerta('info', name, 'no-en-nc', 'No está en Namecheap', 'Está dado de alta en DO pero registrado en otro proveedor: su vencimiento no se ve aquí.');
		}
		if (d && inDo && dnsEn !== 'digitalocean' && dnsEn !== 'desconocido') {
			alerta('media', name, 'ns-ajenos', 'Los registros de DigitalOcean no se están usando', `Sus nameservers apuntan ${dnsEn === 'namecheap' ? 'al DNS de Namecheap' : `a ${ns.join(', ')}`}, no a DO.`);
		}
		// Solo los hosts sin ruta: los que sí tienen ruta ya se reportan abajo, con su propia alerta.
		const ajenas = registros.filter(
			(r) =>
				r.source === 'do' &&
				r.domain === name &&
				r.type === 'A' &&
				ips.length &&
				!ipsPropias.has(r.data) &&
				!cubiertos.has(r.name.toLowerCase())
		);
		if (ajenas.length) {
			alerta('media', name, 'ip-ajena', 'Registro A hacia una IP que no es de tus droplets', ajenas.map((r) => `${r.name} → ${r.data}`).join(' · '));
		}
		// DNS al droplet sin ruta nginx.
		if (dnsEn !== 'otro' && rutasDb.length) {
			const sinRuta = activos
				.filter((r) => r.type === 'A' && ipsPropias.has(r.data) && !r.name.includes('*') && !cubiertos.has(r.name.toLowerCase()))
				.map((r) => r.name);
			if (sinRuta.length) alerta('info', name, 'sin-ruta', 'DNS hacia el droplet sin ruta en nginx', [...new Set(sinRuta)].join(' · '));
		}

		return {
			name,
			inNamecheap: !!d,
			inDo,
			expires: d?.expires ?? null,
			daysLeft: dias,
			autoRenew: d?.autoRenew ?? null,
			locked: d?.locked ?? null,
			whoisGuard: d?.whoisGuard ?? null,
			dnsEn,
			nameservers: ns,
			apuntaAlDroplet: apunta,
			hosts: hostsDe.map((r) => r.host),
			apps: [...new Set(hostsDe.flatMap((r) => r.destinos.map((x) => x.app).filter((a): a is string => !!a)))],
			alertas: 0
		};
	});

	// Alertas por ruta.
	const archivosAvisados = new Set<string>(); // un archivo con varios hosts avisa una sola vez
	for (const r of porHost.values()) {
		const dom = r.dominio ?? r.host;
		if (r.enabled === false && !archivosAvisados.has(r.archivo)) {
			archivosAvisados.add(r.archivo);
			alerta('alta', dom, `symlink:${r.archivo}`, `${r.archivo}: nginx no lo carga`, 'El archivo está en nx-routes pero falta el symlink en sites-enabled.');
		}
		const caidos = r.destinos.filter((x) => x.listening === false).map((x) => x.port);
		if (caidos.length) {
			alerta('alta', dom, `escucha:${r.host}`, `${r.host}: nada escucha en ${caidos.length > 1 ? 'los puertos' : 'el puerto'} ${caidos.join(', ')}`, 'Probable 502: la app no está corriendo ahí.');
		}
		if (r.dns === 'sin-registro') alerta('media', dom, `dns:${r.host}`, `${r.host}: sin registro DNS`, 'Hay ruta en nginx, pero el DNS vigente del dominio no tiene registro A/CNAME para este host.');
		if (r.dns === 'ajena') alerta('media', dom, `dns:${r.host}`, `${r.host}: el DNS apunta a otra IP`, 'Su registro A no coincide con ninguna IP de tus droplets.');
		if (r.dns === 'externo') {
			const ns = json(ncPorNombre.get(r.dominio ?? '')?.nameservers ?? '[]');
			alerta('info', dom, `dns:${r.host}`, `${r.host}: su DNS está fuera de Namecheap y DO`, `Los nameservers son ${ns.join(', ') || 'de otro proveedor'}: no se puede verificar que el dominio apunte al droplet.`);
		}
		if (r.dns === 'dominio-desconocido') alerta('media', r.host, `dns:${r.host}`, `${r.host}: su dominio no está en Namecheap ni en DO`, 'No se puede verificar su DNS ni su vencimiento.');
	}

	alertas.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad] || a.dominio.localeCompare(b.dominio));
	for (const d of dominios) d.alertas = alertas.filter((a) => a.dominio === d.name).length;

	return {
		hayDatos: Object.values(ultimas).some((u) => u?.ok),
		dominios,
		rutas: [...porHost.values()].sort((a, b) => a.host.localeCompare(b.host)),
		alertas,
		ips: ips.map((i) => ({ ip: i.ip, name: i.name, kind: i.kind })),
		ultimas,
		corridas: corridas
			.sort((a, b) => b.id - a.id)
			.slice(0, 40)
			.map((c) => ({ id: c.id, source: c.source, at: c.finishedAt.getTime(), ok: c.ok, items: c.items, message: c.message }))
	};
}
