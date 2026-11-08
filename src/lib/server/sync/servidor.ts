import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { env } from '$env/dynamic/private';

const execFileP = promisify(execFile);

export type Ruta = {
	file: string;
	host: string;
	aliases: string[];
	target: string;
	port: number | null;
	enabled: boolean | null;
	listening: boolean | null;
	app: string | null;
};

type Bloque = { names: string[]; targets: string[]; estatico: boolean };

/** Extrae los bloques `server { ... }` de un archivo de nginx (ignora comentarios). */
function bloquesServer(texto: string): Bloque[] {
	const src = texto.replace(/#[^\n]*/g, '');
	const out: Bloque[] = [];
	const re = /\bserver\s*\{/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(src))) {
		let profundidad = 1;
		let i = re.lastIndex;
		while (i < src.length && profundidad > 0) {
			const c = src[i++];
			if (c === '{') profundidad++;
			else if (c === '}') profundidad--;
		}
		const cuerpo = src.slice(re.lastIndex, i - 1);
		re.lastIndex = i;

		const names = [...cuerpo.matchAll(/server_name\s+([^;]+);/g)]
			.flatMap((x) => x[1].trim().split(/\s+/))
			.filter((n) => n && n !== '_' && n !== '""');
		const targets = [...new Set([...cuerpo.matchAll(/proxy_pass\s+([^;\s]+)\s*;/g)].map((x) => x[1]))];
		out.push({ names, targets, estatico: /\broot\s+[^;]+;/.test(cuerpo) });
	}
	return out;
}

function puertoDe(target: string): number | null {
	const m = target.match(/^https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]):(\d+)/);
	return m ? Number(m[1]) : null;
}

/** Puerto → nombres de apps de pm2, leído del dump (`pm2 save`). Solo toma nombre y puerto. */
function leerPm2(): Map<number, string[]> | null {
	const archivo = env.PM2_DUMP || join(process.env.PM2_HOME || join(homedir(), '.pm2'), 'dump.pm2');
	if (!existsSync(archivo)) return null;
	try {
		const apps = JSON.parse(readFileSync(archivo, 'utf8')) as Record<string, unknown>[];
		const mapa = new Map<number, string[]>();
		for (const a of apps) {
			const nombre = String(a.name ?? '');
			if (!nombre) continue;
			const args = Array.isArray(a.args) ? a.args.join(' ') : String(a.args ?? '');
			// Solo se mira la variable PORT (en `env` o suelta, según la versión de pm2): el resto del
			// env del dump, que puede traer secretos, nunca se guarda.
			const puerto =
				Number((a.env as Record<string, unknown> | undefined)?.PORT) ||
				Number(a.PORT) ||
				Number(args.match(/--port[=\s]+(\d+)/)?.[1]) ||
				Number(args.match(/(?:--bind|-b)[=\s]+\S*:(\d+)/)?.[1]) ||
				null;
			if (!puerto) continue;
			mapa.set(puerto, [...(mapa.get(puerto) ?? []), nombre]);
		}
		return mapa;
	} catch {
		return null;
	}
}

/** Puertos TCP en escucha (Linux: `ss`). null si no se puede saber (laptop con Windows). */
async function puertosEnEscucha(): Promise<Set<number> | null> {
	try {
		const { stdout } = await execFileP('ss', ['-ltnH'], { timeout: 5000 });
		const set = new Set<number>();
		for (const linea of stdout.split('\n')) {
			const local = linea.trim().split(/\s+/)[3];
			if (!local) continue;
			const puerto = Number(local.slice(local.lastIndexOf(':') + 1));
			if (puerto) set.add(puerto);
		}
		return set;
	} catch {
		return null;
	}
}

export async function leerServidor(): Promise<{ rutas: Ruta[]; avisos: string[] }> {
	const avisos: string[] = [];
	const dir = env.NX_ROUTES_DIR || '/etc/nginx/sites-available';
	if (!existsSync(dir) || !statSync(dir).isDirectory()) {
		throw new Error(`No existe el directorio de rutas de nginx: ${dir} (variable NX_ROUTES_DIR)`);
	}
	const dirActivos = env.NGINX_ENABLED_DIR || '/etc/nginx/sites-enabled';
	const sabeActivos = existsSync(dirActivos);
	const pm2 = leerPm2();
	const escucha = await puertosEnEscucha();
	if (!sabeActivos) avisos.push('sin sites-enabled: no se sabe qué sitios están activos');
	if (!pm2) avisos.push('sin dump de pm2: no se sabe qué app corre en cada puerto');
	if (!escucha) avisos.push('sin ss: no se sabe qué puertos están en escucha');

	// Cada archivo de nx-routes se llama como su dominio (siempre lleva punto; se saltan README, carpetas, etc.).
	const archivos = readdirSync(dir).filter(
		(f) => f.includes('.') && !f.startsWith('.') && !f.endsWith('.md') && statSync(join(dir, f)).isFile()
	);

	const rutas: Ruta[] = [];
	const vistas = new Set<string>();
	for (const file of archivos.sort()) {
		const enabled = sabeActivos ? existsSync(join(dirActivos, file)) : null;
		for (const b of bloquesServer(readFileSync(join(dir, file), 'utf8'))) {
			const destinos = b.targets.length ? b.targets : b.estatico ? ['estático'] : [];
			if (!destinos.length) continue; // bloques de redirect 301 / 404 de certbot
			// www.X se pliega en X cuando ambos están en el mismo bloque.
			const hosts = b.names.filter((n) => !(n.startsWith('www.') && b.names.includes(n.slice(4))));
			const aliases = b.names.filter((n) => !hosts.includes(n));
			for (const host of hosts) {
				for (const target of destinos) {
					const clave = `${file}|${host}|${target}`;
					if (vistas.has(clave)) continue;
					vistas.add(clave);
					const port = puertoDe(target);
					rutas.push({
						file,
						host: host.toLowerCase(),
						aliases: aliases.map((a) => a.toLowerCase()),
						target,
						port,
						enabled,
						listening: port && escucha ? escucha.has(port) : null,
						app: port && pm2 ? (pm2.get(port)?.join(', ') ?? null) : null
					});
				}
			}
		}
	}
	return { rutas, avisos };
}
