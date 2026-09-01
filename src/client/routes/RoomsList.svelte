<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { rooms } from '../lib/stores/rooms.ts';
  import { socket } from '../lib/socket/client.ts';
  import { go, href } from '../lib/router.ts';

  let newRoom = $state('');
  let error = $state('');

  onMount(() => rooms.start());
  onDestroy(() => rooms.stop());

  async function create(e: Event) {
    e.preventDefault();
    error = '';
    const res = await socket.request('room:create', { name: newRoom.trim() });
    if (res.success && res.room) {
      go(href.room((res.room as { name: string }).name).slice(1));
    } else {
      error = res.error ?? 'Could not create room';
    }
  }
</script>

<section class="rooms">
  <form onsubmit={create}>
    <input placeholder="Create a new room…" bind:value={newRoom} />
    <button type="submit">+</button>
  </form>
  {#if error}<p class="error">{error}</p>{/if}

  {#if $rooms.length === 0}
    <p class="empty">Start by creating a room.</p>
  {:else}
    <ul>
      {#each $rooms as room (room.name)}
        <li>
          <span class="name">{room.name}</span>
          <span class="players">{room.players} player{room.players === 1 ? '' : 's'}</span>
          <a class="join" href={href.room(room.name)}>{room.game ? 'Spectate' : 'Join'}</a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .rooms { max-width: 900px; margin: 0 auto; }
  form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  input { flex: 1; padding: 0.75rem; font-size: 1rem; }
  ul { list-style: none; padding: 0; }
  li { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: #fff; border-radius: 4px; margin-bottom: 0.5rem; }
  .name { flex: 1; font-weight: 600; }
  .players { color: #888; }
  .join { padding: 0.4rem 1rem; background: #ff6b6b; color: #fff; text-decoration: none; border-radius: 4px; }
  .empty { color: #888; }
  .error { color: #c0392b; }
</style>
