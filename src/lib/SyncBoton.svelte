<script lang="ts">
  // Botón "Sincronizar ahora": postea a la acción `sync` de la página donde se use.
  import { enhance } from '$app/forms';
  import { nombreFuente } from '$lib/formato';

  type Resultado = { fuente: string; ok: boolean; items: number; mensaje: string | null };
  let {
    form
  }: { form?: { ok?: boolean; error?: string; resultados?: Resultado[]; ntfy?: boolean } | null } = $props();

  let sincronizando = $state(false);
</script>

<form
  method="POST"
  action="?/sync"
  class="sync"
  use:enhance={() => {
    sincronizando = true;
    return async ({ update }) => {
      await update();
      sincronizando = false;
    };
  }}
>
  <button class="btn" type="submit" disabled={sincronizando}>
    {sincronizando ? 'Sincronizando… (puede tardar ~20 s)' : 'Sincronizar ahora'}
  </button>
  {#if form?.ntfy}
    <!-- resultado de la prueba de ntfy: lo muestra la página, no este botón -->
  {:else if form?.error}
    <p class="msg bad">{form.error}</p>
  {:else if form?.resultados}
    <ul class="msg">
      {#each form.resultados as r (r.fuente)}
        <li class={r.ok ? 'ok' : 'bad'}>
          {r.ok ? '✓' : '✗'} {nombreFuente[r.fuente] ?? r.fuente}: {r.ok ? `${r.items} elementos` : r.mensaje}
        </li>
      {/each}
    </ul>
  {/if}
</form>

<style>
  .sync {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
  }
  .msg {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.8rem;
    max-width: 38ch;
    text-align: right;
  }
  .ok {
    color: #14532d;
  }
  .bad {
    color: #b91c1c;
  }
</style>
