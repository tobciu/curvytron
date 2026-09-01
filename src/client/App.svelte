<script lang="ts">
  import { socket } from './lib/socket/client.ts';
  import { route } from './lib/router.ts';
  import { profile } from './lib/stores/profile.ts';
  import RoomsList from './routes/RoomsList.svelte';
  import About from './routes/About.svelte';
  import Room from './routes/Room.svelte';
  import Game from './routes/Game.svelte';
  import Profile from './routes/Profile.svelte';

  const connected = socket.connected; // socket.connect() runs in main.ts

  let panelOpen = $state(false);
  const needsProfile = $derived($profile.name.trim().length === 0);
</script>

<header>
  <a href="#/" class="logo"><img src="images/logo.svg" alt="Curvytron" /> <span>curvytron</span></a>
  <button class="profile-btn" onclick={() => (panelOpen = true)}>
    {$profile.name || "What's your name?"}
  </button>
</header>

{#if !$connected}
  <div class="banner">Connecting…</div>
{/if}

<main>
  {#if $route.name === 'rooms'}
    <RoomsList />
  {:else if $route.name === 'about'}
    <About />
  {:else if $route.name === 'room' && $route.param}
    <Room name={$route.param} />
  {:else if $route.name === 'game' && $route.param}
    <Game name={$route.param} />
  {:else}
    <p>Not found. <a href="#/">Back to rooms</a></p>
  {/if}
</main>

<footer>
  <a href="https://github.com/Elao/curvytron" target="_blank" rel="noreferrer">GitHub</a>
  <a href="#/about">About</a>
</footer>

{#if panelOpen || needsProfile}
  <div class="overlay" class:blocking={needsProfile}>
    <div class="panel">
      {#if !needsProfile}
        <button class="close" onclick={() => (panelOpen = false)} aria-label="Close">×</button>
      {/if}
      {#if needsProfile}
        <p class="hi">Hi there! We just need to know a few things before you start playing.</p>
      {/if}
      <Profile ondone={() => (panelOpen = false)} />
    </div>
  </div>
{/if}

<style>
  header {
    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo {
    color: #fff;
    text-decoration: none;
    font-weight: 300;
    letter-spacing: 0.15em;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
  }
  .logo img {
    height: 2rem;
  }
  .profile-btn {
    background: rgba(0, 0, 0, 0.25);
    color: #fff;
    border: 0;
    border-radius: 999px;
    padding: 0.4rem 1rem;
    cursor: pointer;
    font: inherit;
  }
  .banner {
    background: #ffe08a;
    text-align: center;
    padding: 0.5rem;
  }
  main {
    padding: 1.5rem;
    min-height: 60vh;
  }
  footer {
    padding: 1rem 1.5rem;
    background: #eee;
    display: flex;
    gap: 1rem;
  }
  footer a {
    color: #666;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    justify-content: flex-end;
  }
  .overlay.blocking {
    justify-content: center;
    align-items: flex-start;
    padding-top: 4rem;
  }
  .panel {
    background: #fff;
    padding: 1.5rem 2rem;
    width: min(28rem, 100%);
    height: 100%;
    overflow: auto;
    position: relative;
  }
  .overlay.blocking .panel {
    height: auto;
    border-radius: 6px;
  }
  .close {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    border: 0;
    background: none;
    font-size: 1.5rem;
    cursor: pointer;
  }
  .hi {
    color: #666;
  }
</style>
