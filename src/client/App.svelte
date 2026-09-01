<script lang="ts">
  // Placeholder shell — the real header / footer / <Router/> land in rewrite-plan Step 3.
  import { BaseSocketClient } from '@shared/core/BaseSocketClient.ts';

  let status = $state<'connecting' | 'online' | 'disconnected'>('connecting');

  // Prove the shared engine imports cleanly into a Svelte component.
  const protocolReady = typeof BaseSocketClient === 'function';
</script>

<header>
  <h1>Curvytron</h1>
  <p>Svelte + Vite client scaffold — Phase 2, Step 0.</p>
</header>

<main>
  <p>Status: <strong>{status}</strong></p>
  <p>Shared protocol module loaded: <strong>{protocolReady ? 'yes' : 'no'}</strong></p>
  <button onclick={() => (status = status === 'online' ? 'connecting' : 'online')}>
    toggle status (dev)
  </button>
</main>

<style>
  header {
    padding: 1.5rem;
    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
    color: #fff;
  }
  h1 {
    margin: 0;
    font-weight: 300;
    letter-spacing: 0.1em;
  }
  main {
    padding: 1.5rem;
  }
</style>
