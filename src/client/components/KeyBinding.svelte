<script lang="ts">
  import { keyName } from '../lib/keyName.ts';

  let { value = $bindable() }: { value: number } = $props();
  let listening = $state(false);

  function start() {
    listening = true;
  }

  function onKey(e: KeyboardEvent) {
    if (!listening) {
      return;
    }
    e.preventDefault();
    value = e.keyCode;
    listening = false;
  }
</script>

<svelte:window onkeydown={onKey} />

<button type="button" class:listening onclick={start}>
  {listening ? 'press a key…' : keyName(value)}
</button>

<style>
  button {
    min-width: 4rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font: inherit;
  }
  .listening {
    border-color: #ff6b6b;
    color: #ff6b6b;
  }
</style>
