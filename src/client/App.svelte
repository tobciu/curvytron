<script lang="ts">
  import { socket } from './lib/socket/client.ts';
  import { route } from './lib/router.ts';
  import RoomsList from './routes/RoomsList.svelte';
  import About from './routes/About.svelte';
  import Room from './routes/Room.svelte';
  import Game from './routes/Game.svelte';

  const connected = socket.connected; // socket.connect() runs in main.ts
</script>

<header>
  <a href="#/" class="logo"><img src="images/logo.svg" alt="Curvytron" /> <span>curvytron</span></a>
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

<style>
  header {
    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
    padding: 1rem 1.5rem;
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
</style>
