import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Tabla de EJEMPLO — reemplázala por las tablas reales de tu app. Después corre
// `npm run db:generate` (crea la migración en ./drizzle) y `npm run db:migrate`.
export const items = sqliteTable('items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	texto: text('texto').notNull(),
	hecho: integer('hecho', { mode: 'boolean' }).notNull().default(false),
	creado: integer('creado', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Item = typeof items.$inferSelect;
