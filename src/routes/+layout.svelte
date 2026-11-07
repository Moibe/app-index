<script lang="ts">
  // Tailwind v4 + tokens de shadcn. El gradiente glass de :global(body) de abajo GANA:
  // los estilos :global de Svelte van sin @layer, así que pisan el @layer base de Tailwind.
  import '../app.css';
  import type { Snippet } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import { afterNavigate } from '$app/navigation';
  import TopNav from '$lib/TopNav.svelte';
  import Sidebar from '$lib/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();
  let collapsed = $state(false);

  // En móvil el sidebar flota encima del contenido (ver @media abajo y en Sidebar.svelte):
  // arranca replegado y se vuelve a replegar en cada navegación para no tapar la página.
  // afterNavigate también corre al montar, así que cubre la carga inicial.
  afterNavigate(() => {
    if (window.matchMedia('(max-width: 680px)').matches) collapsed = true;
  });

  // View Transitions cuando el browser las soporta para animar el repliegue.
  function withTransition(fn: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
    } else {
      fn();
    }
  }
  function toggleCollapsed() {
    withTransition(() => {
      collapsed = !collapsed;
    });
  }
</script>

<svelte:head>
  <title>app-index</title>
  <link rel="icon" href={favicon} />
</svelte:head>

<TopNav />
<Sidebar {collapsed} {toggleCollapsed} />
<main class={collapsed ? 'collapsed' : ''}>
  <div class="work-scroll">
    {@render children()}
  </div>
</main>

<style>
  :global(:root) {
    --topnav-height: 64px;
    /* Extremo del gradiente: el Sidebar lo usa de fondo casi sólido cuando flota en móvil. */
    --grad-b: #c9d6f7;

    /* Tema claro: blanco con "vivos" azul rey. TopNav y Sidebar leen estas variables en vez de
       llevar colores propios. Se nombran distinto a los tokens de shadcn (--accent, --primary...)
       para no pisarlos: esos viven en app.css. */
    --tinta: #0f1f52; /* texto principal: azul marino casi negro */
    --tinta-suave: rgba(15, 31, 82, 0.74);
    --vivo: #4169e1; /* azul rey */
    --vivo-suave: rgba(65, 105, 225, 0.12);
    --vivo-borde: rgba(65, 105, 225, 0.55);
    --vidrio: rgba(255, 255, 255, 0.6);
    --vidrio-sombra: 0 4px 16px rgba(30, 58, 138, 0.14);
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  :global(body) {
    min-height: 100vh;
    background: linear-gradient(135deg, #ffffff 0%, #c9d6f7 100%);
    background-attachment: fixed;
    color: var(--tinta);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  :global(*) {
    scrollbar-width: auto;
    scrollbar-color: rgba(65, 105, 225, 0.55) rgba(65, 105, 225, 0.08);
  }
  :global(::-webkit-scrollbar) {
    width: 14px;
    height: 14px;
  }
  :global(::-webkit-scrollbar-track) {
    background: rgba(65, 105, 225, 0.08);
    border-radius: 999px;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: rgba(65, 105, 225, 0.5);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(65, 105, 225, 0.75);
    background-clip: padding-box;
  }

  main {
    position: fixed;
    top: calc(2rem + var(--topnav-height));
    right: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    background: var(--vidrio);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid var(--vivo-borde);
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      var(--vidrio-sombra);
    overflow: hidden;
    transition: left 0.22s ease-out;
    left: calc(var(--sidebar-width, 240px) + 2rem);
  }
  main.collapsed {
    left: 2rem;
  }
  /* Móvil (mismo corte que la TopNav): el panel usa todo el ancho y el sidebar flota encima
     (su z-index vive en Sidebar.svelte). */
  @media (max-width: 680px) {
    main,
    main.collapsed {
      left: 1rem;
    }
  }

  .work-scroll {
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    right: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 16px;
  }
</style>
