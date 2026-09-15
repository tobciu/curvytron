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

<section class="intro">
  <p class="tagline">A multiplayer tron-like game… with curves!</p>
  <div class="tuto">
    <div class="tuto-item">
      <span class="circle"><img src="images/tuto/turn.gif" alt="" width="150" height="150" /></span>
      <p>You're always moving. But you can choose to go left or right.</p>
    </div>
    <div class="tuto-item">
      <span class="circle"><img src="images/tuto/death.gif" alt="" width="150" height="150" /></span>
      <p>If you hit another player's line or your own: you're dead!</p>
    </div>
    <div class="tuto-item">
      <span class="circle"><img src="images/tuto/bonus.gif" alt="" width="150" height="150" /></span>
      <p>There are bonuses on the map that can help you.</p>
    </div>
  </div>
</section>

<section class="rooms">
  <div class="rooms-header">
    <span class="label">
      {#if $rooms.length === 0}Start by creating a room:
      {:else}You can join {$rooms.length} room{$rooms.length === 1 ? '' : 's'}!
      {/if}
    </span>
    <form onsubmit={create}>
      <input placeholder="Create a new room…" bind:value={newRoom} />
      <button type="submit" aria-label="Create room"><span>+</span></button>
    </form>
  </div>
  {#if error}<p class="error">{error}</p>{/if}

  {#if $rooms.length > 0}
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
  .intro { max-width: 1000px; margin: 0 auto 20px; text-align: center; }
  .tagline { color: var(--color-ink); font-size: 26px; font-weight: 300; margin: 0 0 40px; }
  .tuto { display: flex; justify-content: center; gap: 2.5rem; flex-wrap: wrap; }
  .tuto-item { max-width: 200px; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
  .circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    background: #1a1a1a;
    display: block;
  }
  .circle img { width: 100%; height: 100%; display: block; }
  .tuto-item p { margin: 0; color: var(--color-ink); font-size: 18px; font-weight: 300; line-height: 1.4; }

  .rooms { max-width: 1000px; margin: 0 auto; }
  .rooms-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 20px 0 10px;
  }
  .label { font-weight: 300; letter-spacing: normal; color: var(--color-ink); text-transform: uppercase; font-size: 30px; }
  form { display: flex; gap: 20px; align-items: center; }
  input {
    padding: 6px 12px;
    font-size: 18px;
    color: var(--color-ink);
    border: 2px solid var(--color-border);
    border-radius: 0;
    background: transparent;
    height: 60px;
  }
  input:focus { outline: none; border-color: var(--color-accent); }
  form button {
    width: 60px;
    height: 60px;
    padding: 0;
    background: var(--gradient-button);
    color: #fff;
    border: 2px solid var(--brand-a);
    border-radius: 0;
    cursor: pointer;
    font-size: 30px;
    line-height: 1;
    transform: skewX(-10deg);
    transition: filter 0.15s ease;
  }
  form button span { display: inline-block; transform: skewX(10deg); }
  form button:hover { filter: brightness(1.05); }
  ul { list-style: none; padding: 0; }
  li {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 12px 20px;
    background: var(--color-surface);
    border-bottom: 1px solid #e5e5e5;
  }
  .name { flex: 1; font-weight: 400; }
  .players { color: var(--color-muted); font-size: 0.9rem; }
  .join {
    padding: 0 20px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    background: var(--gradient-button);
    color: #fff;
    text-decoration: none;
    text-transform: uppercase;
    font-size: 0.9rem;
    font-weight: 400;
  }
  .join:hover { filter: brightness(1.05); }
  .error { color: #c0392b; }
</style>
