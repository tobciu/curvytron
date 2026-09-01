import { mount } from 'svelte';
import App from './App.svelte';
import { socket } from './lib/socket/client.ts';
import './styles/app.scss';

// Connect before any component mounts (child onMount runs before the parent's).
// In `vite dev` point at the game server; in prod it's the same origin.
socket.connect(import.meta.env.DEV ? 'ws://localhost:8080/' : undefined);

const target = document.getElementById('app');
if (!target) {
  throw new Error('#app mount point missing');
}

export default mount(App, { target });
