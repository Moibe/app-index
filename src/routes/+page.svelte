<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import SyncBoton from '$lib/SyncBoton.svelte';
  import { claseVence, etiquetaDns, fechaCorta, haceTiempo, textoVence } from '$lib/formato';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Primero lo que vence antes; los que no se conocen (solo en DO) al final.
  const filas = $derived(
    [...data.dominios].sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9) || a.name.localeCompare(b.name))
  );
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
          <th>Dominio</th>
          <th>Vence</th>
          <th>Auto-renew</th>
          <th>DNS en</th>
          <th>En DO</th>
          <th>Apunta al droplet</th>
          <th>Apps</th>
          <th>Alertas</th>
        </tr>
      </thead>
      <tbody>
        {#each filas as d (d.name)}
          <tr>
            <td><b>{d.name}</b>{#if !d.inNamecheap} <span class="chip nada" title="No está registrado en Namecheap">otro registrador</span>{/if}</td>
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
