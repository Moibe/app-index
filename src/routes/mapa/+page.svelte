<script lang="ts">
  import type { PageData } from './$types';
  import ThOrden from '$lib/ThOrden.svelte';
  import AbrirFuera from '$lib/AbrirFuera.svelte';
  import { alternar, ordenar, type Orden } from '$lib/orden';

  let { data }: { data: PageData } = $props();

  // Una fila por host, con lo que la tabla y el orden necesitan ya calculado.
  const base = $derived(
    data.rutas.map((r) => {
      const conEstado = r.destinos.filter((x) => x.listening !== null);
      return {
        r,
        apps: [...new Set(r.destinos.map((x) => x.app).filter((a): a is string => !!a))],
        total: conEstado.length, // destinos de los que se sabe si escuchan
        arriba: conEstado.filter((x) => x.listening).length // y de esos, cuántos escuchan
      };
    })
  );
  type Fila = (typeof base)[number];

  const dnsTexto = {
    ok: ['ok', 'apunta al droplet'],
    ajena: ['bad', 'otra IP'],
    'sin-registro': ['warn', 'sin registro'],
    'dominio-desconocido': ['warn', 'dominio desconocido'],
    externo: ['info', 'DNS externo'],
    'n/d': ['nada', 'n/d']
  } as const;

  // De peor a mejor: de menor a mayor salen primero los hosts con problemas de DNS.
  const rangoDns = { ajena: 0, 'sin-registro': 1, 'dominio-desconocido': 2, externo: 3, 'n/d': 4, ok: 5 } as const;

  // Lo que cada columna aporta para ordenar. Lo que en pantalla sale como "—" va null: queda
  // siempre al final, sea cual sea el sentido. En las columnas de estado los problemas van antes
  // (nada escucha → parcial → todo bien; sin symlink → activo).
  const columnas = {
    dominio: (f: Fila) => f.r.dominio,
    host: (f: Fila) => f.r.host,
    app: (f: Fila) => f.apps.join(', ') || null,
    puertos: (f: Fila) => {
      const p = f.r.destinos.map((x) => x.port).filter((x): x is number => x !== null);
      return p.length ? Math.min(...p) : null;
    },
    proceso: (f: Fila) => (f.total === 0 ? null : f.arriba === f.total ? 2 : f.arriba === 0 ? 0 : 1),
    nginx: (f: Fila) => f.r.enabled,
    dns: (f: Fila) => rangoDns[f.r.dns]
  };
  type Clave = keyof typeof columnas;

  // Arranca como siempre: agrupado por dominio (los de dominio desconocido al final) y, dentro de
  // cada uno, por host.
  let orden = $state<Orden<Clave>>({ clave: 'dominio', dir: 'asc' });
  const ordenarPor = (clave: Clave) => (orden = alternar(orden, clave));
  const filas = $derived(ordenar(base, orden, columnas, (a, b) => a.r.host.localeCompare(b.r.host)));

  // Al volver con "atrás" desde otra página se conserva el orden elegido.
  export const snapshot = {
    capture: () => orden,
    restore: (guardado: Orden<Clave>) => (orden = guardado)
  };
</script>

<h1 class="titulo">Apps ↔ Dominios</h1>
<p class="sub">
  Qué app responde en cada host. Sale de los archivos de nginx (<span class="mono">nx-routes</span>), de pm2 y de los
  puertos en escucha del servidor.
</p>

{#if !data.hayDatos || !data.servidor}
  <p class="vacio">Aún no hay datos del servidor. Sincroniza desde la página de Dominios.</p>
{:else if !data.servidor.ok}
  <p class="vacio">La última lectura del servidor falló: {data.servidor.message}</p>
{:else}
  {#if data.servidor.message}<p class="sub">Nota: {data.servidor.message}.</p>{/if}
  <div class="tabla-wrap">
    <table class="tabla">
      <thead>
        <tr>
          <ThOrden clave="dominio" etiqueta="Dominio" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="host" etiqueta="Host" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="app" etiqueta="App" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="puertos" etiqueta="Puertos" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="proceso" etiqueta="Proceso" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="nginx" etiqueta="nginx" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="dns" etiqueta="DNS" {orden} alOrdenar={ordenarPor} />
        </tr>
      </thead>
      <tbody>
        {#each filas as { r, apps, total, arriba } (r.host)}
          <tr>
            <td>{r.dominio ?? '(dominio desconocido)'}</td>
            <td>
              <b>{r.host}</b>{#if !r.host.includes('*')}<AbrirFuera host={r.host} />{/if}
              {#if r.aliases.length}<br /><span class="mute mono">{r.aliases.join(' ')}</span>{/if}
            </td>
            <td>{#if apps.length}{apps.join(', ')}{:else}<span class="mute">—</span>{/if}</td>
            <td class="mono">{r.destinos.map((x) => x.port ?? x.target).join(' · ')}</td>
            <td>
              {#if total === 0}<span class="mute">—</span>
              {:else if arriba === total}<span class="chip ok">{total > 1 ? `${arriba}/${total} ` : ''}escuchando</span>
              {:else if arriba === 0}<span class="chip bad">nada escucha</span>
              {:else}<span class="chip warn">{arriba}/{total} escuchando</span>{/if}
            </td>
            <td>
              {#if r.enabled === null}<span class="mute">—</span>
              {:else if r.enabled}<span class="chip ok">activo</span>
              {:else}<span class="chip bad">sin symlink</span>{/if}
            </td>
            <td><span class="chip {dnsTexto[r.dns][0]}">{dnsTexto[r.dns][1]}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
