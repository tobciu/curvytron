<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { room } from '../lib/stores/room.ts';
  import { profile } from '../lib/stores/profile.ts';
  import { socket } from '../lib/socket/client.ts';
  import { route } from '../lib/router.ts';

  let { name }: { name: string } = $props();

  let joinError = $state('');
  let needPassword = $state(false);
  let password = $state('');
  let newPlayer = $state('');
  let chatText = $state('');
  let showConfig = $state(false);

  let myClientId = $state<string | number | null>(null);
  socket.clientId.subscribe((v) => (myClientId = v));

  const isMaster = $derived(
    $room != null && $room.master != null && $room.master === myClientId,
  );
  const mine = $derived(($room?.localPlayerIds ?? []) as (string | number)[]);

  async function attemptJoin(pw?: string) {
    joinError = '';
    const res = await room.join(name, pw);
    if (!res.success) {
      if (/password/i.test(res.error ?? '')) {
        needPassword = true;
      } else {
        joinError = res.error ?? 'Could not join';
      }
    } else {
      needPassword = false;
    }
  }

  onMount(() => attemptJoin());
  onDestroy(() => {
    // keep our room membership when handing off to this room's game
    const r = get(route);
    if (!(r.name === 'game' && r.param === name)) {
      room.leave();
    }
  });

  async function addLocal(e: Event) {
    e.preventDefault();
    const n = newPlayer.trim() || $profile.name;
    if (!n) {
      return;
    }
    const res = await room.addPlayer(n, $profile.color);
    if (res.success) {
      newPlayer = '';
    }
  }

  function send(e: Event) {
    e.preventDefault();
    const t = chatText.trim();
    if (t) {
      room.talk(t);
      chatText = '';
    }
  }
</script>

{#if needPassword}
  <section class="gate">
    <h2>{name} is private</h2>
    <form onsubmit={(e) => { e.preventDefault(); attemptJoin(password); }}>
      <input type="password" bind:value={password} placeholder="Room password" />
      <button type="submit">Join</button>
    </form>
    <p><a href="#/">Back to rooms</a></p>
  </section>
{:else if joinError}
  <section class="gate">
    <p class="error">{joinError}</p>
    <p><a href="#/">Back to rooms</a></p>
  </section>
{:else if $room}
  <section class="room">
    <h2>
      {$room.name}
      {#if isMaster}
        <button class="gear" onclick={() => (showConfig = !showConfig)} title="Room settings">⚙</button>
      {/if}
    </h2>

    {#if showConfig && isMaster}
      <div class="config">
        <label>
          Victory score
          <input
            type="number"
            min="1"
            value={$room.config.maxScore ?? ''}
            onchange={(e) => room.setMaxScore(+(e.currentTarget as HTMLInputElement).value)}
          />
        </label>
        <label>
          Bonus quantity
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={$room.config.variables.bonusRate ?? 0}
            onchange={(e) => room.setVariable('bonusRate', +(e.currentTarget as HTMLInputElement).value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={!$room.open}
            onchange={(e) => room.setOpen(!(e.currentTarget as HTMLInputElement).checked)}
          />
          Private {#if $room.password}(password: {$room.password}){/if}
        </label>
        <fieldset>
          <legend>Bonuses</legend>
          {#each Object.entries($room.config.bonuses) as [bonus, on] (bonus)}
            <label class="bonus">
              <input type="checkbox" checked={on} onchange={() => room.toggleBonus(bonus)} />
              {bonus.replace('Bonus', '')}
            </label>
          {/each}
        </fieldset>
      </div>
    {/if}

    <div class="cols">
      <div class="players">
        <p class="count">{$room.players.length} player{$room.players.length === 1 ? '' : 's'}</p>
        <form onsubmit={addLocal}>
          <input bind:value={newPlayer} placeholder="Add a local player" />
          <button type="submit">+</button>
        </form>
        <ul>
          {#each $room.players as p (p.id)}
            <li>
              <span class="dot" style="background:{p.color}"></span>
              <span class="name">{p.name}</span>
              {#if $room.master === p.client}<span class="crown" title="Room master">♛</span>{/if}
              {#if mine.includes(p.id)}
                <button class:ready={p.ready} onclick={() => room.toggleReady(p.id)}>
                  {p.ready ? 'Ready' : 'Ready?'}
                </button>
                <button class="x" onclick={() => room.removePlayer(p.id)} aria-label="Remove">×</button>
              {:else if isMaster}
                <button class="x" onclick={() => room.kick(p.id)} title="Kick">kick</button>
              {/if}
            </li>
          {/each}
        </ul>
        {#if isMaster}
          <button class="launch" onclick={() => room.launch()}>
            {$room.launching ? 'Cancel' : 'Start now!'}
          </button>
        {/if}
      </div>

      <div class="chat">
        <ul class="feed">
          {#each $room.messages as m}
            <li><span style="color:{m.color ?? '#888'}">{m.name ?? '—'}</span>: {m.content}</li>
          {/each}
        </ul>
        <form onsubmit={send}>
          <input bind:value={chatText} placeholder="Enter message…" maxlength="140" />
          <button type="submit">→</button>
        </form>
      </div>
    </div>

    <p><a href="#/" onclick={() => room.leave()}>Leave room</a></p>
  </section>
{:else}
  <p>Joining {name}…</p>
{/if}

<style>
  .room { max-width: 1000px; margin: 0 auto; }
  h2 { display: flex; align-items: center; gap: 0.5rem; }
  .gear { border: 0; background: none; font-size: 1.2rem; cursor: pointer; }
  .config { background: #fff; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; display: grid; gap: 0.75rem; }
  .config fieldset { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
  .bonus { font-size: 0.85rem; }
  .cols { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; }
  @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
  .players form, .chat form { display: flex; gap: 0.5rem; margin: 0.5rem 0; }
  .players input, .chat input { flex: 1; padding: 0.5rem; }
  ul { list-style: none; padding: 0; }
  .players li { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #fff; border-radius: 4px; margin-bottom: 0.35rem; }
  .players .name { flex: 1; }
  .dot { width: 0.8rem; height: 0.8rem; border-radius: 2px; display: inline-block; }
  .crown { color: goldenrod; }
  button.ready { background: #7bd88f; }
  .x { color: #c0392b; }
  .launch { margin-top: 0.75rem; padding: 0.6rem 1.5rem; background: #ff6b6b; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
  .chat { background: #222; color: #eee; border-radius: 6px; padding: 0.75rem; display: flex; flex-direction: column; }
  .feed { flex: 1; overflow-y: auto; max-height: 300px; font-size: 0.85rem; }
  .gate { text-align: center; }
  .error { color: #c0392b; }
</style>
