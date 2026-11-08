export const nombreFuente: Record<string, string> = {
	namecheap: 'Namecheap',
	digitalocean: 'DigitalOcean',
	servidor: 'Servidor (nginx · pm2)'
};

/** '2027-02-18' → '18 feb 2027' (sin desfase de zona horaria). */
export function fechaCorta(iso: string | null): string {
	if (!iso) return '—';
	return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(
		new Date(`${iso}T00:00:00Z`)
	);
}

export function fechaHora(ms: number): string {
	return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms));
}

export function haceTiempo(ms: number): string {
	const s = Math.round((Date.now() - ms) / 1000);
	if (s < 60) return 'hace unos segundos';
	const m = Math.round(s / 60);
	if (m < 60) return `hace ${m} min`;
	const h = Math.round(m / 60);
	if (h < 48) return `hace ${h} h`;
	return `hace ${Math.round(h / 24)} días`;
}

/** Clase de chip según los días que faltan para vencer. */
export function claseVence(dias: number | null): string {
	if (dias === null) return 'nada';
	if (dias < 0 || dias <= 30) return 'bad';
	if (dias <= 90) return 'warn';
	return 'ok';
}

export function textoVence(dias: number | null): string {
	if (dias === null) return '—';
	if (dias < 0) return `venció hace ${-dias} d`;
	if (dias === 0) return 'vence hoy';
	if (dias < 365) return `en ${dias} d`;
	const anios = dias / 365;
	return `en ${anios.toFixed(1)} años`;
}

export const etiquetaDns: Record<string, string> = {
	digitalocean: 'DigitalOcean',
	namecheap: 'Namecheap',
	otro: 'Otro proveedor',
	desconocido: '—'
};
