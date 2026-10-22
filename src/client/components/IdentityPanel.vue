<script setup lang="ts">
/**
 * What the statistics know of this browser: whether the name shows in the public lists, the identity code (the proof
 * that the games are yours), and what to do with it: use the code of another browser, get a new one, forget everything.
 */
import { computed, ref, watch } from 'vue';
import { useServices } from '../services';
import { ApiError, statsApi } from '../core/statsApi';
import { getIdentity, isIdentityCode, newIdentityCode, setIdentity } from '../core/session';
import type { ApiMe } from '../../shared/model/StatsApi';

const { profilePanel: panel } = useServices();

const me = ref<ApiMe | null>(null);
const unavailable = ref(false);
const showCode = ref(false);
const otherCode = ref('');
const message = ref('');
const busy = ref(false);

const code = computed(() => getIdentity());
const shown = computed({
    get: () => (me.value?.known ? me.value.public : true),
    set: (value: boolean) => void save(value)
});

async function load(): Promise<void> {
    try {
        me.value = await statsApi.me();
        unavailable.value = false;
    } catch {
        unavailable.value = true;
    }
}

/** Something that changes the identity: do it, say what went wrong, and load the page again */
async function change(task: () => Promise<void>, failure: (error: unknown) => string): Promise<void> {
    busy.value = true;
    message.value = '';

    try {
        await task();
        globalThis.location.reload();
    } catch (error) {
        message.value = failure(error);
    } finally {
        busy.value = false;
    }
}

async function save(value: boolean): Promise<void> {
    message.value = '';

    try {
        await statsApi.setPublic(value);
        await load();
    } catch {
        message.value = 'Could not save this. Try again later.';
    }
}

async function copy(): Promise<void> {
    try {
        await globalThis.navigator.clipboard.writeText(code.value);
        message.value = 'Code copied.';
    } catch {
        showCode.value = true;
        message.value = 'Could not copy, select the code and copy it.';
    }
}

function useOtherCode(): void {
    const next = otherCode.value.trim();

    if (!isIdentityCode(next)) {
        message.value = 'This is not a code. It has 16 to 64 letters, digits and dashes.';

        return;
    }

    if (
        !globalThis.confirm(
            'From now on you are the player of this code. Your games of this browser stay with the old one.'
        )
    ) {
        return;
    }

    setIdentity(next);
    globalThis.location.reload();
}

function rotate(): Promise<void> {
    const next = newIdentityCode();

    return change(
        async () => {
            try {
                await statsApi.rotate(next);
            } catch (error) {
                // Nothing kept yet: nothing to take along, the new code is enough
                if (!(error instanceof ApiError && error.status === 404)) {
                    throw error;
                }
            }

            setIdentity(next);
        },
        () => 'Could not get a new code. Try again later.'
    );
}

function startFresh(): void {
    if (globalThis.confirm('You start without your games. They stay with your old code, which you can still use.')) {
        setIdentity(newIdentityCode());
        globalThis.location.reload();
    }
}

function forget(): Promise<void> {
    if (
        !globalThis.confirm(
            'Forget everything the statistics know of you? Your totals and feats are deleted. Your games stay, without your name.'
        )
    ) {
        return Promise.resolve();
    }

    return change(
        async () => {
            await statsApi.forget();
            setIdentity(newIdentityCode());
        },
        () => 'Could not delete this. Try again later.'
    );
}

watch(
    () => panel.open.value,
    (open) => {
        if (open) {
            void load();
        }
    },
    { immediate: true }
);
</script>

<template>
    <fieldset class="identity">
        <legend>Statistics:</legend>

        <p v-if="unavailable" class="note">The games are not kept on this server.</p>

        <template v-else>
            <div class="form-row">
                <label for="identity-public" class="identity-check">
                    <input id="identity-public" v-model="shown" type="checkbox" />
                    Show me in public lists
                </label>
                <small>
                    Leaderboard, records and games show your name. Without it you are "Anonymous" there, also in games
                    of the past. In the game and in the room the others still see your name.
                </small>
            </div>

            <div class="form-row">
                <label>My identity code:</label>
                <small>
                    Your games belong to this code, kept in this browser. Keep it secret, and copy it to use it in
                    another browser.
                </small>
                <div class="code">
                    <input
                        id="identity-code"
                        class="form-control"
                        :type="showCode ? 'text' : 'password'"
                        :value="code"
                        readonly
                        autocomplete="off"
                    />
                    <button type="button" class="btn btn-default" @click="showCode = !showCode">
                        {{ showCode ? 'Hide' : 'Show' }}
                    </button>
                    <button type="button" class="btn btn-default" @click="copy">Copy</button>
                </div>
            </div>

            <details class="more">
                <summary>Use another code, get a new one, forget me</summary>

                <div class="form-row">
                    <label for="identity-other">Use the code of another browser:</label>
                    <div class="code">
                        <input
                            id="identity-other"
                            v-model="otherCode"
                            class="form-control"
                            type="text"
                            placeholder="Paste the code"
                            maxlength="64"
                            autocomplete="off"
                        />
                        <button type="button" class="btn btn-default" :disabled="busy" @click="useOtherCode">
                            Use
                        </button>
                    </div>
                </div>

                <div class="form-row">
                    <button id="identity-rotate" type="button" class="btn btn-default" :disabled="busy" @click="rotate">
                        New code, keep my history
                    </button>
                    <small>The old code stops working. Do this if it got somewhere it should not be.</small>
                </div>

                <div class="form-row">
                    <button type="button" class="btn btn-default" :disabled="busy" @click="startFresh">
                        Start fresh
                    </button>
                    <small>A new code without your games. Your games stay with the old code.</small>
                </div>

                <div class="form-row">
                    <button id="identity-forget" type="button" class="btn btn-default" :disabled="busy" @click="forget">
                        Delete my data
                    </button>
                    <small> Deletes your totals and feats. Your games stay in the history, without your name. </small>
                </div>
            </details>

            <p v-if="message" class="note" role="status">{{ message }}</p>
        </template>
    </fieldset>
</template>
