<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { room } from '../lib/stores/room.ts';
  import { profile } from '../lib/stores/profile.ts';
  import { socket } from '../lib/socket/client.ts';
  import { route } from '../lib/router.ts';
  import { BonusManager } from '../manager/BonusManager.ts';

  let { name }: { name: string } = $props();

  let joinError = $state('');
  let needPassword = $state(false);
  let password = $state('');
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
      // Joining a room drops you straight into it as a player — no separate step.
      if (($room?.localPlayerIds.length ?? 0) === 0) {
        await room.addPlayer($profile.name, $profile.color);
      }
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

  function send(e: Event) {
    e.preventDefault();
    const t = chatText.trim();
    if (t) {
      room.talk(t);
      chatText = '';
    }
  }

  /** Fixed (non-shuffled) position of a bonus's icon on `images/bonus.png`, for the settings UI. */
  function bonusSpritePosition(bonus: string): string {
    const i = BonusManager.spritePosition.indexOf(bonus);
    const col = i < 0 ? 0 : i % 3;
    const row = i < 0 ? 0 : Math.floor(i / 3);
    return `${-col * 32}px ${-row * 32}px`;
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
        <button class="gear" onclick={() => (showConfig = !showConfig)} title="Room settings">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      {/if}
    </h2>

    {#if showConfig && isMaster}
      <div class="config">
        <div class="config-col score-col">
          <p class="config-label">Victory score</p>
          <div class="stepper">
            <button
              type="button"
              aria-label="Decrease victory score"
              onclick={() => room.setMaxScore(Math.max(1, ($room.config.maxScore ?? 10) - 1))}
            >−</button>
            <span class="score-value">{$room.config.maxScore ?? '10'}</span>
            <button
              type="button"
              aria-label="Increase victory score"
              onclick={() => room.setMaxScore(($room.config.maxScore ?? 10) + 1)}
            >+</button>
          </div>

          <p class="config-label spaced">Your room is</p>
          <div class="switch-row">
            <span class="switch-label" class:active={$room.open}>Public</span>
            <label class="switch">
              <input
                type="checkbox"
                checked={!$room.open}
                onchange={(e) => room.setOpen(!(e.currentTarget as HTMLInputElement).checked)}
              />
              <span class="track"><span class="thumb"></span></span>
            </label>
            <span class="switch-label" class:active={!$room.open}>Private</span>
          </div>
          {#if !$room.open && $room.password}
            <p class="password-hint">Password: <strong>{$room.password}</strong></p>
          {/if}
        </div>

        <div class="config-col bonus-col">
          <p class="config-label">Bonus quantity</p>
          <input
            class="range"
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={$room.config.variables.bonusRate ?? 0}
            onchange={(e) => room.setVariable('bonusRate', +(e.currentTarget as HTMLInputElement).value)}
          />

          <p class="config-label spaced">Bonuses</p>
          <div class="bonus-grid">
            {#each Object.entries($room.config.bonuses) as [bonus, on] (bonus)}
              <button
                type="button"
                class="bonus-icon"
                class:off={!on}
                style="background-position: {bonusSpritePosition(bonus)}"
                onclick={() => room.toggleBonus(bonus)}
                title={bonus.replace('Bonus', '')}
                aria-label={bonus.replace('Bonus', '')}
              ></button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <div class="cols">
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

      <div class="players">
        <div class="players-header">
          <p class="count">{$room.players.length} player{$room.players.length === 1 ? '' : 's'}</p>
          {#if isMaster}
            <button class="launch" onclick={() => room.launch()}>
              {$room.launching ? 'Cancel' : 'Start now!'}
            </button>
          {/if}
        </div>
        <div class="table-head">
          <span>Name</span>
          <span>Ready?</span>
        </div>
        <ul>
          {#each $room.players as p (p.id)}
            <li>
              <span class="dot" style="background:{p.color}"></span>
              <span class="name">{p.name}</span>
              {#if $room.master === p.client}
                <svg class="crown" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" role="img">
                  <title>Room master</title>
                  <path d="M3 8 L7 11 L12 5 L17 11 L21 8 L19 18 L5 18 Z"></path>
                </svg>
              {/if}
              <span class="spacer"></span>
              {#if mine.includes(p.id)}
                <button class="ready-badge" class:ready={p.ready} onclick={() => room.toggleReady(p.id)}>
                  {p.ready ? '✓ Ready' : 'Ready?'}
                </button>
              {:else if isMaster}
                <button class="kick" onclick={() => room.kick(p.id)} title="Kick">Kick</button>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <p><a href="#/" onclick={() => room.leave()}>Leave room</a></p>
  </section>
{:else}
  <p>Joining {name}…</p>
{/if}

<style>
  .room { max-width: 1000px; margin: 0 auto; }
  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 30px;
    font-weight: 300;
    text-transform: uppercase;
    color: var(--color-ink);
    margin: 20px 0 10px;
  }
  .gear {
    border: 0;
    background: none;
    padding: 0;
    display: inline-flex;
    color: var(--color-muted);
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .gear:hover { color: var(--color-ink); }
  .config {
    background: var(--color-surface);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  @media (max-width: 720px) { .config { grid-template-columns: 1fr; } }
  .score-col { text-align: center; border-right: 1px solid #eee; }
  @media (max-width: 720px) { .score-col { border-right: 0; border-bottom: 1px solid #eee; padding-bottom: 1.5rem; } }
  .config-label {
    margin: 0 0 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .config-label.spaced { margin-top: 1.5rem; }
  .stepper { display: flex; align-items: center; justify-content: center; gap: 1.25rem; }
  .stepper button {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 50%;
    border: 1px solid #ddd;
    background: #fff;
    font-size: 1.2rem;
    line-height: 1;
    color: var(--color-ink);
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .stepper button:hover { border-color: var(--color-accent); color: var(--color-accent-dark); }
  .score-value { font-size: 2.75rem; font-weight: 700; min-width: 3ch; }
  .switch-row { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
  .switch-label { font-size: 0.85rem; font-weight: 600; color: var(--color-muted); }
  .switch-label.active { color: var(--color-ink); }
  .switch { position: relative; display: inline-block; width: 2.6rem; height: 1.4rem; flex: 0 0 auto; }
  .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; z-index: 1; }
  .track { position: absolute; inset: 0; background: #ddd; border-radius: 999px; transition: background 0.15s ease; }
  .thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 1.1rem;
    height: 1.1rem;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 0.15s ease;
  }
  .switch input:checked + .track { background: var(--color-accent); }
  .switch input:checked + .track .thumb { transform: translateX(1.2rem); }
  .password-hint { margin: 0.75rem 0 0; font-size: 0.85rem; color: var(--color-muted); }
  .range { width: 100%; accent-color: var(--color-accent); }
  .bonus-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .bonus-icon {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    background-color: #fff;
    background-image: url('/images/bonus.png');
    background-size: 96px 224px;
    background-repeat: no-repeat;
    padding: 0;
    cursor: pointer;
    opacity: 1;
    transition: opacity 0.15s ease, filter 0.15s ease;
  }
  .bonus-icon:hover { filter: brightness(0.95); }
  .bonus-icon.off { opacity: 0.3; filter: grayscale(1); }
  .cols { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
  @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
  .players-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 10px; }
  .count {
    margin: 0;
    font-weight: 300;
    text-transform: uppercase;
    font-size: 30px;
    color: #fff;
    background: var(--color-label-bg);
    padding: 10px 20px;
  }
  .launch {
    height: 60px;
    padding: 0 30px;
    background: var(--gradient-button);
    color: #fff;
    border: 2px solid var(--brand-a);
    font-size: 20px;
    font-weight: 300;
    text-transform: uppercase;
    cursor: pointer;
  }
  .table-head {
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    margin-bottom: 4px;
    font-size: 0.8rem;
    text-transform: uppercase;
    color: var(--color-faded);
  }
  .chat form { display: flex; gap: 0.5rem; margin: 0.5rem 0; }
  .chat input { flex: 1; padding: 0.5rem; }
  ul { list-style: none; padding: 0; margin: 0; }
  .players li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 12px 20px;
    background: var(--color-surface);
    border-bottom: 1px solid #e5e5e5;
  }
  .players .name { font-weight: 400; }
  .spacer { flex: 1; }
  .dot { width: 0.8rem; height: 0.8rem; border-radius: 2px; display: inline-block; flex: 0 0 auto; }
  .crown { color: goldenrod; }
  .ready-badge {
    border: 0;
    background: var(--color-footer-bg);
    color: #fff;
    padding: 0 20px;
    height: 40px;
    font-size: 0.9rem;
    font-weight: 300;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .ready-badge.ready { background: #7bd88f; color: #fff; }
  .kick { border: 0; background: none; color: #c0392b; font-size: 0.85rem; cursor: pointer; }
  .chat { background: #1a1a1a; color: #eee; padding: 0.75rem; display: flex; flex-direction: column; }
  .feed { flex: 1; overflow-y: auto; max-height: 300px; font-size: 0.85rem; }
  .gate { text-align: center; }
  .error { color: #c0392b; }
</style>
