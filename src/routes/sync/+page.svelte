<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import SyncBoton from '$lib/SyncBoton.svelte';
  import { fechaHora, haceTiempo, nombreFuente } from '$lib/formato';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let probando = $state(false);
</script>

<div class="fila-titulo">
  <div>
    <h1 class="titulo">Sincronización</h1>
    <p class="sub">
      Cada fuente se sincroniza sola una vez al día en el servidor; si una falla, se reintenta cada hora y al
      reiniciar la app. Mientras tanto se conservan sus datos anteriores.
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

<div class="avisos">
  <p class="sub">
    Avisos de vencimiento por ntfy:
    {#if data.ntfyActivo}
      <span class="chip ok">activados</span> a 60, 30 y 7 días del vencimiento, y al vencer. Una sola vez por dominio
      y fecha: si renuevas, se rearman solos.
    {:else}
      <span class="chip nada">apagados</span> falta <span class="mono">NTFY_TOPIC</span> en el
      <span class="mono">.env</span> del servidor.
    {/if}
  </p>
  {#if data.ntfyActivo}
    <form
      method="POST"
      action="?/ntfy"
      use:enhance={() => {
        probando = true;
        return async ({ update }) => {
          await update({ reset: false });
          probando = false;
        };
      }}
    >
      <button class="btn" type="submit" disabled={probando}>
        {probando ? 'Enviando…' : 'Enviar aviso de prueba'}
      </button>
      {#if form?.ntfy}
        <span class="chip {form.ok ? 'ok' : 'bad'}">{form.ok ? 'enviado: revisa tu celular' : form.error}</span>
      {/if}
    </form>
  {/if}
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
