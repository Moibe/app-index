<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let enviando = $state(false);
</script>

<svelte:head><title>Entrar · app-index</title></svelte:head>

<div class="centro">
  <form
    class="tarjeta"
    method="POST"
    use:enhance={() => {
      enviando = true;
      return async ({ update }) => {
        await update();
        enviando = false;
      };
    }}
  >
    <div class="marca">
      <span class="ico" aria-hidden="true"></span>
      <h1>app-index</h1>
    </div>
    <p class="sub">Dominios, DNS y apps en un solo lugar.</p>

    <label for="password">Contraseña</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />

    {#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}

    <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
  </form>
</div>

<style>
  .centro {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1rem;
    box-sizing: border-box;
  }
  .tarjeta {
    width: min(360px, 100%);
    box-sizing: border-box;
    padding: 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--vidrio);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid var(--vivo-borde);
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      var(--vidrio-sombra);
  }
  .marca {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }
  .ico {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--vivo);
  }
  h1 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
  }
  .sub {
    margin: 0 0 0.6rem;
    color: var(--tinta-suave);
    font-size: 0.9rem;
  }
  label {
    font-size: 0.85rem;
    color: var(--tinta-suave);
  }
  input {
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--vivo-borde);
    background: rgba(255, 255, 255, 0.85);
    color: var(--tinta);
    font: inherit;
  }
  input:focus {
    outline: 2px solid var(--vivo);
    outline-offset: 1px;
  }
  .error {
    margin: 0;
    color: #b91c1c;
    font-size: 0.85rem;
  }
  button {
    margin-top: 0.4rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--vivo);
    background: var(--vivo);
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.7;
    cursor: progress;
  }
</style>
