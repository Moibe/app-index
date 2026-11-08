<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Agrupa por dominio padre; los hosts cuyo dominio no está en Namecheap ni en DO van al final.
  const grupos = $derived.by(() => {
    const m = new Map<string, typeof data.rutas>();
    for (const r of data.rutas) {
      const k = r.dominio ?? '(dominio desconocido)';
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()].sort(([a], [b]) => (a.startsWith('(') ? 1 : 0) - (b.startsWith('(') ? 1 : 0) || a.localeCompare(b));
  });

  const dnsTexto = {
    ok: ['ok', 'apunta al droplet'],
    ajena: ['bad', 'otra IP'],
    'sin-registro': ['warn', 'sin registro'],
    'dominio-desconocido': ['warn', 'dominio desconocido'],
    externo: ['info', 'DNS externo'],
    'n/d': ['nada', 'n/d']
  } as const;
</script>

<h1 class="titulo">Apps ↔ Dominios</h1>
<p class="sub">
  Qué app responde en cada host. Sale de los archivos de nginx (<span class="mono">nx-routes</span>), de pm2 y de los
  puertos en escucha del servidor.
</p>

{#if !data.hayDatos || !data.servidor}
  <p class="vacio">Aún no hay datos del servidor. Sincroniza desde la página de Dominios.</p>
{:else if !data.servidor.ok}
  <p class="vacio">La última lectura del servidor falló: {data.servidor.message}</p>
{:else}
  {#if data.servidor.message}<p class="sub">Nota: {data.servidor.message}.</p>{/if}
  <div class="tabla-wrap">
    <table class="tabla">
      <thead>
        <tr>
          <th>Dominio</th>
          <th>Host</th>
          <th>App</th>
          <th>Puertos</th>
          <th>Proceso</th>
          <th>nginx</th>
          <th>DNS</th>
        </tr>
      </thead>
      <tbody>
        {#each grupos as [dominio, rutas] (dominio)}
          {#each rutas as r (r.host)}
            {@const apps = [...new Set(r.destinos.map((x) => x.app).filter((a) => a))]}
            {@const conEstado = r.destinos.filter((x) => x.listening !== null)}
            {@const arriba = conEstado.filter((x) => x.listening).length}
            <tr>
              <td>{dominio}</td>
              <td>
                <b>{r.host}</b>
                {#if r.aliases.length}<br /><span class="mute mono">{r.aliases.join(' ')}</span>{/if}
              </td>
              <td>{#if apps.length}{apps.join(', ')}{:else}<span class="mute">—</span>{/if}</td>
              <td class="mono">{r.destinos.map((x) => x.port ?? x.target).join(' · ')}</td>
              <td>
                {#if !conEstado.length}<span class="mute">—</span>
                {:else if arriba === conEstado.length}<span class="chip ok">{conEstado.length > 1 ? `${arriba}/${conEstado.length} ` : ''}escuchando</span>
                {:else if arriba === 0}<span class="chip bad">nada escucha</span>
                {:else}<span class="chip warn">{arriba}/{conEstado.length} escuchando</span>{/if}
              </td>
              <td>
                {#if r.enabled === null}<span class="mute">—</span>
                {:else if r.enabled}<span class="chip ok">activo</span>
                {:else}<span class="chip bad">sin symlink</span>{/if}
              </td>
              <td><span class="chip {dnsTexto[r.dns][0]}">{dnsTexto[r.dns][1]}</span></td>
            </tr>
          {/each}
        {/each}
      </tbody>
    </table>
  </div>
{/if}
