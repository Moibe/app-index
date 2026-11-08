import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const COOKIE = 'app_index_session';
export const SESION_SEGUNDOS = 7 * 24 * 60 * 60;

// Sesión sin estado: la cookie es `expira.firma`, firmada con HMAC derivado de ADMIN_PASSWORD.
// Cambiar la contraseña invalida todas las sesiones abiertas.
const clave = () => `app-index|${env.ADMIN_PASSWORD ?? ''}`;
const firmar = (exp: string) => createHmac('sha256', clave()).update(exp).digest('base64url');

function iguales(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

export function contrasenaCorrecta(intento: string): boolean {
	const real = env.ADMIN_PASSWORD ?? '';
	if (!real) return false; // sin ADMIN_PASSWORD configurada nadie entra
	return iguales(intento, real);
}

export function crearSesion(): string {
	const exp = String(Math.floor(Date.now() / 1000) + SESION_SEGUNDOS);
	return `${exp}.${firmar(exp)}`;
}

export function sesionValida(token: string | undefined): boolean {
	if (!token || !env.ADMIN_PASSWORD) return false;
	const [exp, firma] = token.split('.');
	if (!exp || !firma || Number(exp) < Date.now() / 1000) return false;
	return iguales(firma, firmar(exp));
}

// Frenado de fuerza bruta: cada fallo seguido de una misma IP suma 1 s de espera (tope 5 s).
// No bloquea la cuenta: así nadie puede dejarte fuera a propósito.
const fallos = new Map<string, number>();
export const registrarFallo = (ip: string) => fallos.set(ip, (fallos.get(ip) ?? 0) + 1);
export const limpiarFallos = (ip: string) => fallos.delete(ip);
export const esperaMs = (ip: string) => Math.min(fallos.get(ip) ?? 0, 5) * 1000;
