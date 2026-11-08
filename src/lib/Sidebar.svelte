<script lang="ts">
  // Barra lateral "de vidrio" con el mismo tilt 3D que la superior. Incluye el handle
  // para replegar/mostrar. Publica su ancho real a la variable CSS --sidebar-width
  // para que el panel de contenido se ajuste solo. Items de ejemplo: reemplázalos.
  // Tema claro: los colores salen de las variables --tinta/--vivo/--vidrio del layout.
  import { page } from '$app/state';

  const items = [
    { href: '/', label: 'Dominios' },
    { href: '/mapa', label: 'Apps ↔ Dominios' },
    { href: '/alertas', label: 'Alertas' },
    { href: '/sync', label: 'Sincronización' }
  ];

  let {
    collapsed = false,
    toggleCollapsed
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
  } = $props();

  let tiltX = $state(0);
  let tiltY = $state(0);
  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined' && !collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }
  });

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 1.2;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }
  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
  }
  function handleCollapseClick(e: MouseEvent) {
    e.stopPropagation();
    tiltX = 0;
    tiltY = 0;
    toggleCollapsed();
  }
</script>

{#if !collapsed}
  <aside
    class="sidebar"
    style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
    bind:clientWidth={sidebarWidth}
    onmousemove={handleMove}
    onmouseleave={handleLeave}
  >
    <nav>
      {#each items as it (it.href)}
        <a href={it.href} class="nav-item" aria-current={page.url.pathname === it.href ? 'page' : undefined}>
          <span class="nav-ico" aria-hidden="true"></span>
          <span>{it.label}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <button type="button" class="collapse-btn" onclick={handleCollapseClick} aria-label="Replegar barra">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
    </div>
  </aside>
{:else}
  <button type="button" class="reveal-handle" onclick={toggleCollapsed} aria-label="Mostrar barra">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: calc(2rem + var(--topnav-height, 64px));
    left: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    background: var(--vidrio);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid var(--vivo-borde);
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      var(--vidrio-sombra);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
  }
  /* Móvil: flota encima del panel de contenido (el layout ya no le deja hueco), con el
     extremo del gradiente casi sólido para que sus items se lean sobre el contenido. */
  @media (max-width: 680px) {
    .sidebar {
      z-index: 8;
      background: color-mix(in srgb, var(--grad-b, #c9d6f7) 92%, transparent);
    }
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  nav::-webkit-scrollbar {
    display: none;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.95rem;
    color: var(--tinta-suave);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .nav-ico {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    flex-shrink: 0;
    background: rgba(65, 105, 225, 0.35);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
  .nav-item:hover {
    background: var(--vivo-suave);
    border-color: rgba(65, 105, 225, 0.3);
    color: var(--tinta);
  }
  .nav-item[aria-current='page'] {
    color: var(--tinta);
    font-weight: 600;
    background: rgba(65, 105, 225, 0.14);
    border-color: var(--vivo);
    box-shadow: 0 0 0 1px rgba(65, 105, 225, 0.18) inset;
  }
  .nav-item[aria-current='page'] .nav-ico {
    background: var(--vivo);
  }
  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(65, 105, 225, 0.2);
  }
  .collapse-btn,
  .reveal-handle {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(65, 105, 225, 0.35);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    color: var(--tinta);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .collapse-btn:hover,
  .reveal-handle:hover {
    background: var(--vivo-suave);
    border-color: var(--vivo);
    color: var(--tinta);
  }
  .reveal-handle {
    position: fixed;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.55rem 0.45rem;
    border-radius: 12px;
    border: 1px solid var(--vivo-borde);
    background: var(--vidrio);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      var(--vidrio-sombra);
    z-index: 10;
  }
</style>
