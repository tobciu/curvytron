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
  const inGame = $derived($route.name === 'game' && !!$route.param);
</script>

{#if !inGame}
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
{/if}

<main class:full={inGame}>
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

{#if !inGame}
<footer>
  <div class="links">
    <a href="https://github.com/Elao/curvytron" target="_blank" rel="noreferrer" aria-label="GitHub">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
        ><path
          d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55v-2.17c-3.2.7-3.88-1.35-3.88-1.35-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"
        ></path></svg
      >
    </a>
    <a href="http://twitter.com/curvytron" target="_blank" rel="noreferrer" aria-label="Twitter">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
        ><path
          d="M23 4.9c-.8.4-1.7.6-2.6.8a4.5 4.5 0 0 0 2-2.5c-.9.5-1.9.9-2.9 1.1a4.5 4.5 0 0 0-7.7 4.1A12.8 12.8 0 0 1 2.7 3.9a4.5 4.5 0 0 0 1.4 6 4.4 4.4 0 0 1-2-.6v.1a4.5 4.5 0 0 0 3.6 4.4c-.4.1-.9.2-1.4.1a4.5 4.5 0 0 0 4.2 3.1A9 9 0 0 1 1 19.5a12.8 12.8 0 0 0 6.9 2c8.3 0 12.8-6.9 12.8-12.8v-.6c.9-.6 1.6-1.4 2.3-2.2z"
        ></path></svg
      >
    </a>
    <a href="http://www.reddit.com/r/curvytron" target="_blank" rel="noreferrer" aria-label="Reddit">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
        ><path
          d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 013.24 12.42c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.717zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"
        ></path></svg
      >
    </a>
    <a href="#/about" class="about-link">About Us</a>
  </div>
  <a href="https://www.elao.com" target="_blank" rel="noreferrer" class="credit"
    >Handmade at Elao with <svg class="icon heart" viewBox="0 0 24 24" aria-hidden="true"
      ><path
        d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5c2.1-1.2 4.6-.6 6 1.2l1.8 2.3 1.8-2.3c1.4-1.8 3.9-2.4 6-1.2 2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z"
      ></path></svg
    ></a
  >
</footer>
{/if}

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
  main.full {
    padding: 0;
    min-height: 0;
  }
  footer {
    padding: 30px 1.75rem;
    background: var(--color-footer-bg);
    font-weight: 300;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .links {
    display: flex;
    align-items: center;
  }
  .links a {
    margin-left: 10px;
  }
  .links a:first-child {
    margin-left: 0;
  }
  .about-link {
    margin-left: 15px !important;
    text-decoration: none;
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
  .icon {
    width: 1em;
    height: 1em;
    fill: currentColor;
    vertical-align: -0.15em;
  }
  .credit {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
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
