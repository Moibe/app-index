// Orden de las tablas por columna. Lógica pura (sin Svelte) para poder probarla aparte;
// el encabezado clicable que la usa es ThOrden.svelte.

export type Dir = 'asc' | 'desc';
export type Orden<K extends string = string> = { clave: K; dir: Dir };

/** Lo que una columna aporta para ordenar. null/undefined = "sin valor" (en pantalla, un —). */
export type Valor = string | number | boolean | null | undefined;

// Sin distinguir mayúsculas ni acentos, y con los números "naturales" (h2 antes que h10).
const texto = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Clic en una columna: si ya era la activa invierte el sentido; si no, la activa de menor a mayor. */
export function alternar<K extends string>(actual: Orden<K>, clave: K): Orden<K> {
	if (actual.clave !== clave) return { clave, dir: 'asc' };
	return { clave, dir: actual.dir === 'asc' ? 'desc' : 'asc' };
}

const comparar = (a: string | number | boolean, b: string | number | boolean) =>
	typeof a === 'string' || typeof b === 'string' ? texto.compare(String(a), String(b)) : Number(a) - Number(b);

/**
 * Devuelve una copia de `filas` ordenada por la columna activa (no toca el arreglo original).
 * - Lo que no tiene valor (null/undefined) va siempre al final, de menor a mayor o al revés.
 * - `desempate` decide entre filas con el mismo valor y no se invierte con el sentido.
 */
export function ordenar<T, K extends string>(
	filas: readonly T[],
	orden: Orden<K>,
	valores: Record<K, (fila: T) => Valor>,
	desempate?: (a: T, b: T) => number
): T[] {
	const valorDe = valores[orden.clave];
	const signo = orden.dir === 'asc' ? 1 : -1;
	// El valor se calcula una vez por fila, no en cada comparación.
	const items = filas.map((fila) => ({ fila, v: valorDe(fila) }));
	items.sort((a, b) => {
		const va = a.v;
		const vb = b.v;
		if (va == null || vb == null) {
			if (va == null && vb == null) return desempate?.(a.fila, b.fila) ?? 0;
			return va == null ? 1 : -1;
		}
		return signo * comparar(va, vb) || (desempate?.(a.fila, b.fila) ?? 0);
	});
	return items.map((x) => x.fila);
}
