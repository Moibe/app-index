<script lang="ts">
  // Barra superior "de vidrio" con tilt 3D al pasar el mouse + responsive (en móvil
  // colapsa a solo-íconos). Los items son de ejemplo: reemplázalos por los de tu app.
  // Tema claro: los colores salen de las variables --tinta/--vivo/--vidrio del layout.
  import { page } from '$app/state';

  let tiltX = $state(0);
  let tiltY = $state(0);

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

  // Edita estos items por las secciones reales de tu app.
  const items = [
    { href: '/', label: 'Inicio' },
    { href: '/seccion-dos', label: 'Sección dos' },
    { href: '/seccion-tres', label: 'Sección tres' }
  ];
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  class="topnav"
  style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
  onmousemove={handleMove}
  onmouseleave={handleLeave}
>
  <a href="/" class="brand" aria-label="Inicio">
    <span class="brand-ico" aria-hidden="true"></span>
    <span class="brand-title">app-index</span>
  </a>

  <nav class="topnav-nav">
    {#each items as it (it.href)}
      <a href={it.href} class="nav-item" aria-current={page.url.pathname === it.href ? 'page' : undefined}>
        <span class="nav-ico" aria-hidden="true"></span>
        <span class="nav-label">{it.label}</span>
      </a>
    {/each}
  </nav>
</header>

<style>
  .topnav {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: var(--topnav-height, 64px);
    padding: 0 1.25rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
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
    z-index: 9;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: var(--tinta);
    text-decoration: none;
    border-radius: 8px;
    padding: 0.25rem 0.4rem;
    transition: background 0.18s ease;
  }
  .brand:hover {
    background: var(--vivo-suave);
  }
  .brand-ico {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    flex-shrink: 0;
    background: var(--vivo);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
  .brand-title {
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.005em;
  }

  .topnav-nav {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-left: 1.25rem;
    padding-left: 1.25rem;
    border-left: 1px solid rgba(65, 105, 225, 0.25);
  }

  .nav-item {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.8rem;
    color: var(--tinta-suave);
    text-decoration: none;
    font-size: 0.9rem;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
    white-space: nowrap;
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
  .nav-ico {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    flex-shrink: 0;
    background: rgba(65, 105, 225, 0.35);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
  .nav-item[aria-current='page'] .nav-ico {
    background: var(--vivo);
  }

  /* En pantallas chicas: solo íconos (oculta texto y título) para que no se desborde. */
  @media (max-width: 680px) {
    .topnav {
      padding: 0 0.6rem;
    }
    .brand {
      gap: 0;
      padding: 0.25rem;
    }
    .brand-title {
      display: none;
    }
    .topnav-nav {
      margin-left: 0.5rem;
      padding-left: 0.5rem;
      gap: 0.1rem;
    }
    .nav-item {
      padding: 0.45rem 0.5rem;
    }
    .nav-label {
      display: none;
    }
  }
  @media (max-width: 360px) {
    .topnav {
      padding: 0 0.4rem;
    }
    .topnav-nav {
      margin-left: 0.35rem;
      padding-left: 0.35rem;
    }
    .nav-item {
      padding: 0.45rem 0.35rem;
    }
  }
</style>
