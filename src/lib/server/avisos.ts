// Decide qué dominios merecen un aviso de vencimiento. Es una función pura (sin base de datos ni
// red) para poder probarla con fechas inventadas.

/** Días antes del vencimiento en que se avisa. 0 = vencido o vence hoy. */
export const UMBRALES = [60, 30, 7, 0] as const;

export type DominioVence = { name: string; expires: string | null; autoRenew: boolean };

export type Aviso = {
	name: string;
	dias: number;
	expires: string;
	autoRenew: boolean;
	/** Clave del umbral más cercano ya cruzado: si está en `vistos`, ya se avisó. */
	clave: string;
	/** Todas las claves cruzadas: se registran juntas al enviar, para no avisar "tarde" de umbrales ya pasados. */
	claves: string[];
};

export function diasHasta(iso: string | null, hoy: Date = new Date()): number | null {
	if (!iso) return null;
	const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
	return Math.round((Date.parse(`${iso}T00:00:00Z`) - hoyUtc) / 86_400_000);
}

/**
 * Un aviso por dominio y por umbral. La clave incluye la fecha de vencimiento: al renovar, la fecha
 * cambia y los avisos se rearman solos. Si de golpe se cruzan varios umbrales (p. ej. la primera vez
 * que se activa con un dominio a 20 días), avisa una sola vez, por el más cercano.
 */
export function decidirAvisos(dominios: DominioVence[], vistos: ReadonlySet<string>, hoy: Date = new Date()): Aviso[] {
	const out: Aviso[] = [];
	for (const d of dominios) {
		const dias = diasHasta(d.expires, hoy);
		if (dias === null || !d.expires) continue;
		const cruzados = UMBRALES.filter((u) => dias <= u);
		if (!cruzados.length) continue;
		const claves = cruzados.map((u) => `vence:${d.name}:${d.expires}:${u}`);
		const clave = `vence:${d.name}:${d.expires}:${Math.min(...cruzados)}`;
		if (vistos.has(clave)) continue;
		out.push({ name: d.name, dias, expires: d.expires, autoRenew: d.autoRenew, clave, claves });
	}
	return out.sort((a, b) => a.dias - b.dias);
}

const cuando = (dias: number) =>
	dias < 0 ? `venció hace ${-dias} días` : dias === 0 ? 'vence HOY' : `vence en ${dias} días`;

/** Texto del aviso. Prioridad 4 (alta) si queda una semana o menos, o si es pronto y no se renueva solo. */
export function armarMensaje(avisos: Aviso[]): { titulo: string; mensaje: string; prioridad: 3 | 4 } {
	const lineas = avisos.map(
		(a) => `${a.name}: ${cuando(a.dias)} (${a.expires}) · ${a.autoRenew ? 'auto-renew activo' : 'SIN auto-renew'}`
	);
	return {
		titulo: avisos.length === 1 ? `Dominio por vencer: ${avisos[0].name}` : `${avisos.length} dominios por vencer`,
		mensaje: lineas.join('\n'),
		prioridad: avisos.some((a) => a.dias <= 7 || (!a.autoRenew && a.dias <= 30)) ? 4 : 3
	};
}
