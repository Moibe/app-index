<script lang="ts" generics="K extends string">
  // Encabezado de columna que ordena la tabla al hacer clic. Las flechitas muestran el sentido
  // activo y aria-sort se lo dice a los lectores de pantalla. La lógica vive en $lib/orden.ts.
  import type { Orden } from '$lib/orden';

  let {
    clave,
    etiqueta,
    orden,
    alOrdenar
  }: {
    clave: K;
    etiqueta: string;
    orden: Orden<K>;
    alOrdenar: (clave: K) => void;
  } = $props();

  const activa = $derived(orden.clave === clave);
</script>

<th aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
  <button
    type="button"
    class="orden"
    class:activa
    class:asc={activa && orden.dir === 'asc'}
    class:desc={activa && orden.dir === 'desc'}
    title="Ordenar por {etiqueta}"
    onclick={() => alOrdenar(clave)}
  >
    {etiqueta}
    <svg class="flechas" viewBox="0 0 8 12" aria-hidden="true">
      <path class="arriba" d="M4 0 8 5H0z" />
      <path class="abajo" d="M4 12 0 7h8z" />
    </svg>
  </button>
</th>

<style>
  .orden {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }
  .orden:hover,
  .orden.activa {
    color: var(--tinta);
  }
  .orden:focus-visible {
    outline: 2px solid var(--vivo);
    outline-offset: 3px;
    border-radius: 4px;
  }
  .flechas {
    width: 8px;
    height: 12px;
    flex-shrink: 0;
  }
  .flechas path {
    fill: currentColor;
    opacity: 0.3;
    transition: opacity 0.15s ease, fill 0.15s ease;
  }
  .orden:hover .flechas path {
    opacity: 0.55;
  }
  /* Solo la punta del sentido activo se llena de azul rey. */
  .orden.asc .arriba,
  .orden.desc .abajo {
    fill: var(--vivo);
    opacity: 1;
  }
</style>
