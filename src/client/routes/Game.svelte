<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { gameStore } from '../lib/stores/game.ts';
  import { room } from '../lib/stores/room.ts';
  import { profile } from '../lib/stores/profile.ts';
  import { route, go, href } from '../lib/router.ts';

  let { name }: { name: string } = $props();

  const hud = gameStore;

  let stage = $state<HTMLDivElement | null>(null);
  let bgCanvas = $state<HTMLCanvasElement | null>(null);
  let bonusCanvas = $state<HTMLCanvasElement | null>(null);
  let gameCanvas = $state<HTMLCanvasElement | null>(null);
  let effectCanvas = $state<HTMLCanvasElement | null>(null);
  let renderSize = $state(0);
  let chatText = $state('');

  let ro: ResizeObserver | null = null;

  function fit() {
    if (!stage) {
      return;
    }
    const size = Math.max(0, Math.min(stage.clientWidth, stage.clientHeight) - 8);
    renderSize = size;
    gameStore.resize(size);
  }

  onMount(async () => {
    if (!gameStore.start(name)) {
      // no live game state (e.g. reloaded /game/:name directly) — bounce to room
      go(href.room(name).slice(1));
      return;
    }

    await tick();
    if (bgCanvas && bonusCanvas && gameCanvas && effectCanvas) {
      gameStore.attachCanvases({
        background: bgCanvas,
        bonus: bonusCanvas,
        game: gameCanvas,
        effect: effectCanvas,
      });
    }
    fit();

    ro = new ResizeObserver(fit);
    if (stage) {
      ro.observe(stage);
    }
    window.addEventListener('resize', fit);
  });

  onDestroy(() => {
    ro?.disconnect();
    window.removeEventListener('resize', fit);
    gameStore.destroy();

    const r = get(route);
    if (!(r.name === 'room' && r.param === name)) {
      room.leave();
    }
  });

  function backToRoom() {
    go(href.room(name).slice(1));
  }

  function sendChat(e: Event) {
    e.preventDefault();
    const t = chatText.trim();
    if (t) {
      room.talk(t);
      chatText = '';
    }
  }

  function killText(k: import('../lib/stores/game.ts').KillLogEntry): string {
    switch (k.type) {
      case 'wall':
        return `${k.dead.name} crashed on the wall`;
      case 'suicide':
        return `${k.dead.name} committed suicide`;
      case 'crash':
        return `${k.dead.name} crashed on ${k.killer?.name}`;
      default:
        return `${k.dead.name} was killed by ${k.killer?.name}`;
    }
  }
</script>

<section class="game" class:borderless={$hud.borderless}>
  <aside class="infos">
    <a href="#/" class="logo">curvytron</a>

    <div class="max-score">🏆 <span>{$hud.maxScore}</span></div>
    <h3 title={$hud.name}>{$hud.name}</h3>

    <ul class="players">
      {#each $hud.avatars as a (a.id)}
        <li class:dead={!a.alive} class:local={a.local}>
          <span class="dot" style="background:{a.color}"></span>
          <span class="pname" title={a.name}>{a.name}</span>
          {#if a.roundScore}<span class="round-pts">+{a.roundScore}</span>{/if}
          <span class="score">{a.score}</span>
        </li>
      {/each}
    </ul>

    <footer class="metrics">
      <button
        class="mute"
        onclick={() => profile.patch({ sound: !$profile.sound })}
        title={$profile.sound ? 'Mute sound' : 'Unmute sound'}
      >{$profile.sound ? '🔊' : '🔇'}</button>
      <span class="fps">{$hud.fps} fps</span>
      <span class="ping">{$hud.latency}ms</span>
      {#if $hud.spectators}<span class="spectators">{$hud.spectators} 👁</span>{/if}
    </footer>

    <div class="chat">
      <ul class="feed">
        {#each $room?.messages ?? [] as m}
          <li><span style="color:{m.color ?? '#888'}">{m.name ?? '—'}</span>: {m.content}</li>
        {/each}
      </ul>
      <form onsubmit={sendChat}>
        <input bind:value={chatText} placeholder="Message…" maxlength="140" />
        <button type="submit">→</button>
      </form>
    </div>
  </aside>

  <div class="stage" bind:this={stage}>
    {#if $hud.killLog.length}
      <ul class="kill-log">
        {#each $hud.killLog as k, i (i)}
          <li>💀 {killText(k)}</li>
        {/each}
      </ul>
    {/if}

    <div class="render" style="width:{renderSize}px;height:{renderSize}px">
      <canvas bind:this={bgCanvas} class="layer bg"></canvas>
      <canvas bind:this={bonusCanvas} class="layer"></canvas>
      <canvas bind:this={gameCanvas} class="layer"></canvas>
      <canvas bind:this={effectCanvas} class="layer"></canvas>

      {#if $hud.phase === 'waiting'}
        <div class="overlay">
          <p>Waiting for players…</p>
          <ul class="waiting">
            {#each $hud.waiting as w (w.id)}
              <li style="color:{w.color}">{w.name}</li>
            {/each}
          </ul>
        </div>
      {:else if $hud.phase === 'warmup'}
        <div class="overlay">
          {#if $hud.tieBreak}<p class="tie-break">Tie break</p>{/if}
          <div class="count">{$hud.warmupCount}</div>
        </div>
      {:else if $hud.phase === 'round-end' || $hud.phase === 'game-end'}
        <div class="overlay">
          {#if $hud.phase === 'game-end'}
            {#if $hud.gameWinner}
              <p class="victory">🏆 <strong style="color:{$hud.gameWinner.color}">{$hud.gameWinner.name}</strong> won the game!</p>
            {:else}
              <p class="victory">Oops, everybody died…</p>
            {/if}
            <table class="recap">
              <tbody>
                {#each $hud.recap as a, i (a.id)}
                  <tr>
                    <td class="rank">{i + 1}</td>
                    <td><span style="color:{a.color}">{a.name}</span></td>
                    <td class="pts"><strong>{a.score}</strong> pts</td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <button class="back" onclick={backToRoom}>Back to the room</button>
          {:else if $hud.roundWinner}
            <p class="victory">🏆 <strong style="color:{$hud.roundWinner.color}">{$hud.roundWinner.name}</strong> won the round!</p>
          {:else}
            <p class="victory">Oops, everybody died…</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .game {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 1rem;
    height: calc(100vh - 8rem);
  }
  .infos {
    display: flex;
    flex-direction: column;
    background: #1c1c1c;
    color: #ddd;
    border-radius: 6px;
    padding: 1rem;
    overflow: hidden;
  }
  .logo {
    color: #ff6b6b;
    text-decoration: none;
    letter-spacing: 0.15em;
    font-size: 1.1rem;
  }
  .max-score {
    margin-top: 0.75rem;
    font-size: 1.2rem;
  }
  .infos h3 {
    margin: 0.25rem 0 0.75rem;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .players {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 0 0 auto;
  }
  .players li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0;
  }
  .players li.dead {
    opacity: 0.4;
  }
  .players li.local .pname {
    font-weight: 700;
  }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    flex: 0 0 auto;
  }
  .pname {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .round-pts {
    color: #7bd88f;
    font-size: 0.8rem;
  }
  .score {
    font-variant-numeric: tabular-nums;
  }
  .metrics {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #888;
    margin: 0.5rem 0;
  }
  .mute {
    background: none;
    border: 0;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
    line-height: 1;
  }
  .chat {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .chat .feed {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    overflow-y: auto;
    flex: 1;
    font-size: 0.8rem;
    max-height: 30vh;
  }
  .chat form {
    display: flex;
    gap: 0.4rem;
  }
  .chat input {
    flex: 1;
    padding: 0.35rem;
    background: #2a2a2a;
    border: 1px solid #333;
    color: #eee;
    border-radius: 3px;
  }
  .stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }
  .render {
    position: relative;
    background: #222;
    border: 4px solid #ff6b6b;
    box-sizing: content-box;
  }
  .game.borderless .render {
    border-color: #333;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    text-align: center;
    padding: 1rem;
  }
  .count {
    font-size: 5rem;
    font-weight: 700;
  }
  .tie-break {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #ffd166;
  }
  .victory {
    font-size: 1.3rem;
  }
  .recap {
    border-collapse: collapse;
    color: #ddd;
  }
  .recap td {
    padding: 0.2rem 0.6rem;
  }
  .recap .rank {
    color: #888;
  }
  .recap .pts {
    text-align: right;
  }
  .back {
    padding: 0.6rem 1.5rem;
    background: #ff6b6b;
    color: #fff;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
  .kill-log {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
    text-align: right;
    font-size: 0.8rem;
    color: #bbb;
    z-index: 2;
  }
  @media (max-width: 720px) {
    .game {
      grid-template-columns: 1fr;
      height: auto;
    }
  }
</style>
