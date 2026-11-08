import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

// Cada fuente tiene sus propias tablas y se reemplaza completa cuando su sync termina bien.
// Si una fuente falla, sus datos anteriores se conservan (ver sync/index.ts). El cruce entre
// fuentes se hace al leer (overview.ts), no al guardar.

/** Dominios registrados en Namecheap (domains.getList + domains.getInfo). */
export const ncDomains = sqliteTable('nc_domains', {
	name: text('name').primaryKey(),
	created: text('created'), // ISO yyyy-mm-dd
	expires: text('expires'), // ISO yyyy-mm-dd
	autoRenew: integer('auto_renew', { mode: 'boolean' }).notNull(),
	locked: integer('locked', { mode: 'boolean' }).notNull(),
	whoisGuard: integer('whois_guard', { mode: 'boolean' }).notNull(),
	usingNcDns: integer('using_nc_dns', { mode: 'boolean' }).notNull(),
	nameservers: text('nameservers').notNull().default('[]') // JSON: string[]
});

/** Dominios dados de alta en DigitalOcean → Networking. */
export const doDomains = sqliteTable('do_domains', {
	name: text('name').primaryKey()
});

/** Registros DNS de ambas fuentes (source = 'do' | 'namecheap'). `name` ya es el FQDN. */
export const dnsRecords = sqliteTable(
	'dns_records',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		source: text('source').notNull(),
		domain: text('domain').notNull(),
		type: text('type').notNull(),
		name: text('name').notNull(),
		data: text('data').notNull(),
		ttl: integer('ttl')
	},
	(t) => [index('dns_records_domain_idx').on(t.domain)]
);

/** IPs propias en DigitalOcean: droplets (IP pública) e IPs reservadas. */
export const droplets = sqliteTable('droplets', {
	ip: text('ip').primaryKey(),
	name: text('name').notNull(),
	kind: text('kind').notNull() // 'droplet' | 'reserved'
});

/**
 * Rutas de nginx (repo nx-routes) cruzadas con pm2 y los puertos en escucha. Una fila por
 * host + destino. `enabled`/`listening`/`app` son null cuando no se pudieron averiguar
 * (p. ej. al correr en la laptop, donde no hay sites-enabled, ss ni pm2).
 */
export const routes = sqliteTable('routes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	file: text('file').notNull(),
	host: text('host').notNull(),
	aliases: text('aliases').notNull().default('[]'), // JSON: otros server_name del mismo bloque (www.*)
	target: text('target').notNull(), // proxy_pass tal cual, o 'estático'
	port: integer('port'),
	enabled: integer('enabled', { mode: 'boolean' }),
	listening: integer('listening', { mode: 'boolean' }),
	app: text('app')
});

/** Bitácora de sincronizaciones, una fila por fuente y corrida. */
export const syncRuns = sqliteTable('sync_runs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	source: text('source').notNull(), // 'namecheap' | 'digitalocean' | 'servidor'
	startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
	finishedAt: integer('finished_at', { mode: 'timestamp' }).notNull(),
	ok: integer('ok', { mode: 'boolean' }).notNull(),
	items: integer('items').notNull().default(0),
	message: text('message')
});
