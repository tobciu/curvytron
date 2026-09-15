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

  const nameValid = $derived(name.trim().length > 0);

  function done() {
    if (!nameValid) {
      return;
    }
    profile.patch({ name: name.trim(), color, controls: [left, right], sound });
    ondone?.();
  }
</script>

<section class="profile">
  <fieldset>
    <legend>Player</legend>
    <div class="row">
      <label>
        <span>My name</span>
        <input bind:value={name} placeholder="Choose a name" maxlength="25" />
      </label>
      <label>
        <span>My colour</span>
        <span class="color">
          <input type="color" bind:value={color} />
          <input class="hex" bind:value={color} maxlength="7" />
        </span>
      </label>
    </div>
  </fieldset>

  <fieldset>
    <legend>Controls</legend>
    <div class="row">
      <label><span>Left</span> <KeyBinding bind:value={left} /></label>
      <label><span>Right</span> <KeyBinding bind:value={right} /></label>
      <span class="preview">{keyName(left)} / {keyName(right)}</span>
    </div>
  </fieldset>

  <fieldset>
    <legend>Options</legend>
    <div class="row">
      <label class="checkbox"><input type="checkbox" bind:checked={sound} /> Sound effects</label>
    </div>
  </fieldset>

  <button class="done" disabled={!nameValid} onclick={done}>I'm done</button>
</section>

<style>
  .profile { max-width: 32rem; }
  fieldset { border: 0; padding: 0; margin: 0 0 20px; }
  legend {
    width: 100%;
    padding: 0 0 10px;
    margin: 0 0 20px;
    font-size: 27px;
    font-weight: 300;
    text-transform: uppercase;
    color: var(--color-ink);
    border-bottom: 2px solid #999;
  }
  .row { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: end; }
  label { display: flex; flex-direction: column; gap: 5px; }
  label span:first-child { font-weight: 700; font-size: 18px; }
  label.checkbox { flex-direction: row; align-items: center; font-weight: 700; }
  input:not([type='color']):not([type='checkbox']),
  .hex {
    padding: 6px 12px;
    height: 46px;
    font: inherit;
    border: 2px solid var(--color-border);
    border-radius: 0;
    background: transparent;
    color: var(--color-ink);
  }
  .color { display: inline-flex; gap: 0.5rem; align-items: center; }
  .hex { width: 6rem; }
  .preview { color: var(--color-muted); }
  .done {
    margin-top: 1rem;
    padding: 15px 35px;
    background: none;
    border: 2px solid #555;
    color: #555;
    text-transform: uppercase;
    font: inherit;
    cursor: pointer;
  }
  .done:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
