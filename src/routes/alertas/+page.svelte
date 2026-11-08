<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const secciones = $derived(
    (
      [
        ['alta', 'Altas', 'bad'],
        ['media', 'Medias', 'warn'],
        ['info', 'Informativas', 'info']
      ] as const
    )
      .map(([clave, titulo, clase]) => ({
        titulo,
        clase,
        items: data.alertas.filter((a) => a.severidad === clave)
      }))
      .filter((s) => s.items.length)
  );
</script>

<h1 class="titulo">Alertas</h1>
<p class="sub">Lo que no cuadra al cruzar Namecheap, DigitalOcean y el servidor.</p>

{#if !data.hayDatos}
  <p class="vacio">Aún no hay datos. Sincroniza desde la página de Dominios.</p>
{:else if !data.alertas.length}
  <p class="vacio">Todo cuadra: no hay alertas. 🎉</p>
{:else}
  {#each secciones as s (s.titulo)}
    <h2 class="seccion">{s.titulo} <span class="chip {s.clase}">{s.items.length}</span></h2>
    <ul class="lista">
      {#each s.items as a (a.id)}
        <li id={a.dominio}>
          <span class="chip {s.clase}">{a.dominio}</span>
          <div>
            <b>{a.titulo}</b>
            <p>{a.detalle}</p>
          </div>
        </li>
      {/each}
    </ul>
  {/each}
{/if}

<style>
  .seccion {
    margin: 1.25rem 0 0.5rem;
    font-size: 1rem;
    font-weight: 600;
  }
  .lista {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  li {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.6rem 0.8rem;
    border-radius: 12px;
    border: 1px solid rgba(65, 105, 225, 0.25);
    background: rgba(255, 255, 255, 0.6);
  }
  li .chip {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
  li p {
    margin: 0.15rem 0 0;
    font-size: 0.85rem;
    color: var(--tinta-suave);
  }
</style>
