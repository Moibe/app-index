import { env } from '$env/dynamic/private';

const ENDPOINT = 'https://api.namecheap.com/xml.response';
// Namecheap limita a ~20 llamadas por minuto: una pausa entre llamadas deja margen de sobra.
const PAUSA_MS = 400;

export type NcDominio = {
	name: string;
	created: string | null;
	expires: string | null;
	autoRenew: boolean;
	locked: boolean;
	whoisGuard: boolean;
	usingNcDns: boolean;
	nameservers: string[];
};

export type NcRegistro = {
	domain: string;
	type: string;
	name: string; // FQDN
	data: string;
	ttl: number | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decodificar(s: string): string {
	return s
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'")
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&amp;', '&');
}

function atributos(tag: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of tag.matchAll(/([A-Za-z]+)="([^"]*)"/g)) out[m[1]] = decodificar(m[2]);
	return out;
}

/** Atributos de cada etiqueta `<nombre ... />` del XML. */
function etiquetas(xml: string, nombre: string): Record<string, string>[] {
	return [...xml.matchAll(new RegExp(`<${nombre}\\s([^>]*?)/?>`, 'g'))].map((m) => atributos(m[1]));
}

/** 'MM/DD/YYYY' → 'YYYY-MM-DD' */
function iso(fecha: string | undefined): string | null {
	const m = fecha?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

async function llamar(comando: string, params: Record<string, string> = {}): Promise<string> {
	const faltan = (
		['NAMECHEAP_API_USER', 'NAMECHEAP_API_KEY', 'NAMECHEAP_USERNAME', 'NAMECHEAP_CLIENT_IP'] as const
	).filter((k) => !env[k]);
	if (faltan.length) throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}`);

	// POST con el cuerpo en el form: así la llave no viaja en la URL (que suele quedar en logs).
	const body = new URLSearchParams({
		ApiUser: env.NAMECHEAP_API_USER!,
		ApiKey: env.NAMECHEAP_API_KEY!,
		UserName: env.NAMECHEAP_USERNAME!,
		ClientIp: env.NAMECHEAP_CLIENT_IP!,
		Command: comando,
		...params
	});
	const res = await fetch(ENDPOINT, { method: 'POST', body, signal: AbortSignal.timeout(30_000) });
	if (!res.ok) throw new Error(`Namecheap respondió HTTP ${res.status}`);
	const xml = await res.text();
	if (/<ApiResponse[^>]*Status="ERROR"/.test(xml)) {
		const errores = [...xml.matchAll(/<Error[^>]*>([^<]*)<\/Error>/g)].map((m) => decodificar(m[1]));
		throw new Error(`Namecheap: ${errores.join(' | ') || 'error desconocido'}`);
	}
	return xml;
}

export async function leerNamecheap(): Promise<{
	dominios: NcDominio[];
	registros: NcRegistro[];
	avisos: string[];
}> {
	const avisos: string[] = [];

	// 1) Lista de dominios (paginada).
	const lista: Record<string, string>[] = [];
	for (let pagina = 1; ; pagina++) {
		const xml = await llamar('namecheap.domains.getList', { PageSize: '100', Page: String(pagina) });
		const filas = etiquetas(xml, 'Domain');
		lista.push(...filas);
		const total = Number(xml.match(/<TotalItems>(\d+)<\/TotalItems>/)?.[1] ?? filas.length);
		if (!filas.length || lista.length >= total) break;
		await sleep(PAUSA_MS);
	}

	// 2) Por dominio: nameservers (getInfo) y, si usa el DNS de Namecheap, sus registros (getHosts).
	const dominios: NcDominio[] = [];
	const registros: NcRegistro[] = [];
	for (const f of lista) {
		const name = f.Name.toLowerCase();
		const usingNcDns = f.IsOurDNS === 'true';
		let nameservers: string[] = [];

		await sleep(PAUSA_MS);
		try {
			const xml = await llamar('namecheap.domains.getInfo', { DomainName: name });
			nameservers = [...xml.matchAll(/<Nameserver>([^<]+)<\/Nameserver>/g)].map((m) =>
				m[1].trim().toLowerCase()
			);
		} catch (e) {
			avisos.push(`${name}: sin nameservers (${e instanceof Error ? e.message : e})`);
		}

		if (usingNcDns) {
			await sleep(PAUSA_MS);
			try {
				const [sld, ...resto] = name.split('.');
				const xml = await llamar('namecheap.domains.dns.getHosts', { SLD: sld, TLD: resto.join('.') });
				for (const h of etiquetas(xml, 'host')) {
					registros.push({
						domain: name,
						type: h.Type,
						name: h.Name === '@' ? name : `${h.Name}.${name}`,
						data: h.Address,
						ttl: h.TTL ? Number(h.TTL) : null
					});
				}
			} catch (e) {
				avisos.push(`${name}: sin registros DNS (${e instanceof Error ? e.message : e})`);
			}
		}

		dominios.push({
			name,
			created: iso(f.Created),
			expires: iso(f.Expires),
			autoRenew: f.AutoRenew === 'true',
			locked: f.IsLocked === 'true',
			whoisGuard: f.WhoisGuard === 'ENABLED',
			usingNcDns,
			nameservers
		});
	}

	return { dominios, registros, avisos };
}
