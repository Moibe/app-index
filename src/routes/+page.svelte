<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import SyncBoton from '$lib/SyncBoton.svelte';
  import ThOrden from '$lib/ThOrden.svelte';
  import AbrirFuera from '$lib/AbrirFuera.svelte';
  import { claseVence, etiquetaDns, fechaCorta, haceTiempo, textoVence } from '$lib/formato';
  import { alternar, ordenar, type Orden } from '$lib/orden';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Fila = PageData['dominios'][number];

  // Lo que cada columna aporta para ordenar. Lo que en pantalla sale como "—" va null: queda
  // siempre al final, sea cual sea el sentido. Falso va antes que verdadero (los "no" primero).
  const columnas = {
    dominio: (d: Fila) => d.name,
    vence: (d: Fila) => d.daysLeft,
    autoRenew: (d: Fila) => d.autoRenew,
    dnsEn: (d: Fila) => (d.dnsEn === 'desconocido' ? null : etiquetaDns[d.dnsEn]),
    enDo: (d: Fila) => d.inDo,
    droplet: (d: Fila) => d.apuntaAlDroplet,
    apps: (d: Fila) => d.hosts.length || null,
    alertas: (d: Fila) => d.alertas || null
  };
  type Clave = keyof typeof columnas;

  // Arranca como siempre: primero lo que vence antes; los que no se conocen (solo en DO) al final.
  let orden = $state<Orden<Clave>>({ clave: 'vence', dir: 'asc' });
  const ordenarPor = (clave: Clave) => (orden = alternar(orden, clave));
  const filas = $derived(ordenar(data.dominios, orden, columnas, (a, b) => a.name.localeCompare(b.name)));

  // Al volver con "atrás" desde otra página se conserva el orden elegido.
  export const snapshot = {
    capture: () => orden,
    restore: (guardado: Orden<Clave>) => (orden = guardado)
  };
  const vencen90 = $derived(data.dominios.filter((d) => d.daysLeft !== null && d.daysLeft <= 90).length);
  const altas = $derived(data.alertas.filter((a) => a.severidad === 'alta').length);
  const medias = $derived(data.alertas.filter((a) => a.severidad === 'media').length);
  const ultima = $derived(
    Math.max(0, ...Object.values(data.ultimas).map((u) => (u ? u.at : 0)))
  );
</script>

<div class="fila-titulo">
  <div>
    <h1 class="titulo">Dominios</h1>
    <p class="sub">
      {#if ultima}Última sincronización {haceTiempo(ultima)}.{:else}Aún no se ha sincronizado.{/if}
    </p>
  </div>
  <SyncBoton {form} />
</div>

{#if !data.hayDatos}
  <p class="vacio">Todavía no hay datos. Pulsa <b>Sincronizar ahora</b> para traer tus dominios.</p>
{:else}
  <div class="tiles">
    <div class="tile"><b>{data.dominios.length}</b><span>dominios</span></div>
    <div class="tile"><b>{vencen90}</b><span>vencen en 90 días o menos</span></div>
    <div class="tile"><b>{altas}</b><span>alertas altas</span></div>
    <div class="tile"><b>{medias}</b><span>alertas medias</span></div>
    <div class="tile"><b>{data.rutas.length}</b><span>hosts en nginx</span></div>
  </div>

  <div class="tabla-wrap">
    <table class="tabla">
      <thead>
        <tr>
          <ThOrden clave="dominio" etiqueta="Dominio" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="vence" etiqueta="Vence" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="autoRenew" etiqueta="Auto-renew" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="dnsEn" etiqueta="DNS en" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="enDo" etiqueta="En DO" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="droplet" etiqueta="Apunta al droplet" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="apps" etiqueta="Apps" {orden} alOrdenar={ordenarPor} />
          <ThOrden clave="alertas" etiqueta="Alertas" {orden} alOrdenar={ordenarPor} />
        </tr>
      </thead>
      <tbody>
        {#each filas as d (d.name)}
          <tr>
            <td><b>{d.name}</b><AbrirFuera host={d.name} />{#if !d.inNamecheap} <span class="chip nada" title="No está registrado en Namecheap">otro registrador</span>{/if}</td>
            <td>
              {#if d.expires}
                {fechaCorta(d.expires)}
                <span class="chip {claseVence(d.daysLeft)}">{textoVence(d.daysLeft)}</span>
              {:else}<span class="mute">—</span>{/if}
            </td>
            <td>
              {#if d.autoRenew === null}<span class="mute">—</span>
              {:else if d.autoRenew}<span class="chip ok">sí</span>
              {:else}<span class="chip bad">no</span>{/if}
            </td>
            <td>
              {etiquetaDns[d.dnsEn]}
              {#if d.dnsEn === 'otro'}<span class="mute mono">{d.nameservers[0]}</span>{/if}
            </td>
            <td>{#if d.inDo}<span class="chip ok">sí</span>{:else}<span class="chip nada">no</span>{/if}</td>
            <td>
              {#if d.apuntaAlDroplet === null}<span class="mute">—</span>
              {:else if d.apuntaAlDroplet}<span class="chip ok">sí</span>
              {:else}<span class="chip nada">no</span>{/if}
            </td>
            <td>
              {#if d.hosts.length}
                {d.hosts.length} {d.hosts.length === 1 ? 'host' : 'hosts'}
                {#if d.apps.length}<span class="mute mono">{d.apps.join(', ')}</span>{/if}
              {:else}<span class="mute">—</span>{/if}
            </td>
            <td>
              {#if d.alertas}<a href="/alertas#{d.name}"><span class="chip warn">{d.alertas}</span></a>
              {:else}<span class="mute">—</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
