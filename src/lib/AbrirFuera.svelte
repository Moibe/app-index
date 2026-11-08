<script lang="ts">
  // Iconito que abre https://<host> en otra pestaña. Solo el ícono es link, no el texto.
  let { host }: { host: string } = $props();
</script>

<a class="fuera" href="https://{host}" target="_blank" rel="noopener noreferrer" title="Abrir {host} en otra pestaña" aria-label="Abrir {host} en otra pestaña">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
</a>

<style>
  .fuera {
    display: inline-flex;
    vertical-align: -2px;
    margin-left: 0.35rem;
    padding: 2px;
    border-radius: 4px;
    color: var(--vivo);
    opacity: 0.6;
    transition: opacity 0.15s ease, background 0.15s ease;
  }
  .fuera:hover {
    opacity: 1;
    background: var(--vivo-suave);
  }
  .fuera:focus-visible {
    opacity: 1;
    outline: 2px solid var(--vivo);
  }
  svg {
    width: 13px;
    height: 13px;
  }
</style>
