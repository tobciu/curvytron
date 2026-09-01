<script lang="ts">
  import { profile } from '../lib/stores/profile.ts';
  import { keyName } from '../lib/keyName.ts';
  import KeyBinding from '../components/KeyBinding.svelte';

  let { ondone }: { ondone?: () => void } = $props();

  // Local editable copy; committed on "Done".
  let name = $state($profile.name);
  let color = $state($profile.color);
  let left = $state($profile.controls[0]);
  let right = $state($profile.controls[1]);
  let sound = $state($profile.sound);
  let radio = $state($profile.radio);

  const nameValid = $derived(name.trim().length > 0);

  function done() {
    if (!nameValid) {
      return;
    }
    profile.patch({ name: name.trim(), color, controls: [left, right], sound, radio });
    ondone?.();
  }
</script>

<section class="profile">
  <h2>My profile</h2>

  <div class="row">
    <label>
      My name
      <input bind:value={name} placeholder="Choose a name" maxlength="25" />
    </label>
    <label>
      My colour
      <span class="color">
        <input type="color" bind:value={color} />
        <input class="hex" bind:value={color} maxlength="7" />
      </span>
    </label>
  </div>

  <h3>Controls</h3>
  <div class="row">
    <label>Left <KeyBinding bind:value={left} /></label>
    <label>Right <KeyBinding bind:value={right} /></label>
    <span class="preview">{keyName(left)} / {keyName(right)}</span>
  </div>

  <h3>Options</h3>
  <div class="row">
    <label><input type="checkbox" bind:checked={sound} /> Sound effects</label>
    <label><input type="checkbox" bind:checked={radio} /> Radio</label>
  </div>

  <button class="done" disabled={!nameValid} onclick={done}>I'm done</button>
</section>

<style>
  .profile { max-width: 480px; }
  .row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin-bottom: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.35rem; }
  input:not([type='color']):not([type='checkbox']), .hex { padding: 0.5rem; font: inherit; }
  .color { display: inline-flex; gap: 0.5rem; align-items: center; }
  .hex { width: 6rem; }
  .preview { color: #888; }
  .done { margin-top: 1rem; padding: 0.6rem 1.5rem; }
</style>
