<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import SyncBoton from '$lib/SyncBoton.svelte';
  import { fechaHora, haceTiempo, nombreFuente } from '$lib/formato';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="fila-titulo">
  <div>
    <h1 class="titulo">Sincronización</h1>
    <p class="sub">
      Cada fuente se sincroniza sola una vez al día en el servidor. Si una falla, se conservan sus datos anteriores.
    </p>
  </div>
  <SyncBoton {form} />
</div>

<div class="tiles">
  {#each Object.entries(data.ultimas) as [fuente, u] (fuente)}
    <div class="tile">
      <b>
        {#if !u}<span class="chip nada">nunca</span>
        {:else if u.ok}<span class="chip ok">bien</span>
        {:else}<span class="chip bad">falló</span>{/if}
      </b>
      <span>{nombreFuente[fuente]}{#if u} · {haceTiempo(u.at)}{/if}</span>
    </div>
  {/each}
</div>

{#if data.ips.length}
  <p class="sub">
    IPs propias en DigitalOcean:
    {#each data.ips as ip, i (ip.ip)}{i ? ', ' : ''}<span class="mono">{ip.ip}</span> ({ip.name}){/each}
  </p>
{/if}

<div class="tabla-wrap">
  <table class="tabla">
    <thead>
      <tr><th>Cuándo</th><th>Fuente</th><th>Resultado</th><th>Elementos</th><th>Detalle</th></tr>
    </thead>
    <tbody>
      {#each data.corridas as c (c.id)}
        <tr>
          <td>{fechaHora(c.at)}</td>
          <td>{nombreFuente[c.source] ?? c.source}</td>
          <td>{#if c.ok}<span class="chip ok">bien</span>{:else}<span class="chip bad">falló</span>{/if}</td>
          <td>{c.items}</td>
          <td class="mute">{c.message ?? ''}</td>
        </tr>
      {:else}
        <tr><td colspan="5" class="vacio">Sin corridas todavía.</td></tr>
      {/each}
    </tbody>
  </table>
</div>
