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
  <a href="#/" class="logo">
    <img src="images/logo.svg" alt="Curvytron" />
    <span class="brand">curvytron</span>
  </a>
  <button class="profile-btn" onclick={() => (panelOpen = true)}>
    {#if $profile.name}<span class="swatch" style="background:{$profile.color}"></span>{/if}
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
  <div class="links">
    <a href="https://github.com/Elao/curvytron" target="_blank" rel="noreferrer">GitHub</a>
    <a href="#/about">About</a>
  </div>
</footer>

{#if panelOpen || needsProfile}
  <div class="overlay" class:blocking={needsProfile}>
    <div class="panel">
      <div class="panel-title">
        <span>My profile</span>
        {#if !needsProfile}
          <button class="close" onclick={() => (panelOpen = false)} aria-label="Close">×</button>
        {/if}
      </div>
      <div class="panel-body">
        {#if needsProfile}
          <p class="hi">Hi there! We just need to know a few things before you start playing.</p>
        {/if}
        <Profile ondone={() => (panelOpen = false)} />
      </div>
    </div>
  </div>
{/if}

<style>
  header {
    background: var(--gradient-header);
    padding: 20px;
    text-align: center;
    position: relative;
  }
  .logo {
    color: #fff;
    text-decoration: none;
    display: inline-block;
    transition: opacity 0.15s ease;
  }
  .logo:hover {
    opacity: 0.9;
  }
  .logo img {
    display: block;
    width: 130px;
    height: 130px;
    margin: 0 auto;
  }
  .brand {
    display: block;
    margin-top: 13px;
    font-size: 26px;
    font-weight: 400;
    text-transform: uppercase;
    line-height: 46px;
  }
  .profile-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: #222;
    color: #fff;
    border: 0;
    border-radius: 40px;
    padding: 8px 16px;
    cursor: pointer;
    font: inherit;
    font-size: 18px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s ease;
  }
  .profile-btn:hover {
    background: #333;
  }
  .swatch {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-block;
    flex: 0 0 auto;
  }
  .banner {
    background: #ffe08a;
    text-align: center;
    padding: 0.5rem;
  }
  main {
    padding: 2rem 1.5rem;
    min-height: 60vh;
  }
  footer {
    padding: 30px 1.75rem;
    background: var(--color-footer-bg);
    font-weight: 300;
  }
  .links {
    display: flex;
    gap: 1.25rem;
  }
  footer a {
    color: var(--color-footer-text);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  footer a:hover {
    color: var(--color-ink);
    text-decoration: underline;
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
    background: var(--color-page);
    width: min(30rem, 100%);
    height: 100%;
    overflow: auto;
    position: relative;
  }
  .overlay.blocking .panel {
    height: auto;
    max-height: 90vh;
  }
  .panel-title {
    background: var(--color-label-bg);
    color: #fff;
    font-size: 30px;
    font-weight: 300;
    text-transform: uppercase;
    padding: 0 20px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .panel-body {
    padding: 1.5rem 2rem;
  }
  .close {
    border: 0;
    background: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
  }
  .hi {
    color: var(--color-ink);
  }
</style>
