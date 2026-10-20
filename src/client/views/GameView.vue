<script setup lang="ts">
/** A running game: players, chat and the canvases the game is drawn on. */
import { onBeforeUnmount, onMounted, ref, shallowRef, triggerRef } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { gamepadListener } from '../gamepadListener.js';
import { asset } from '../assets';
import { useServices } from '../services';
import { useEvents } from '../composables/useEmitter';
import ChatPanel from '../components/ChatPanel.vue';
import KillLog from '../components/game/KillLog.vue';
import MetricsFooter from '../components/game/MetricsFooter.vue';
import PlayerList from '../components/game/PlayerList.vue';
import RoundOverlay from '../components/game/RoundOverlay.vue';
import WaitingList from '../components/game/WaitingList.vue';
import type { Avatar, Game } from '../types';

const CONFIRMATION = 'Are you sure you want to leave the game?';

const { client, gameRepository: repository, chat, sound } = useServices();
const route = useRoute();
const router = useRouter();

const name = String(route.params.name);

const game = shallowRef<Game | null>(null);
const bump = () => triggerRef(game);
const spectating = ref(false);
const borderless = ref(false);
const soundActive = shallowRef(sound);

let setup = false;
let destination = '';

repository.start();

if (!repository.game || repository.game.name !== name) {
    // Nothing to play (page reloaded, game over): go back to the room
    router.replace(`/room/${encodeURIComponent(name)}`);
} else {
    game.value = repository.game;
}

/** Leaving a running game as a player is a big deal. */
function needConfirmation(): boolean {
    return !spectating.value && Boolean(game.value?.started);
}

function onBeforeUnload(event: BeforeUnloadEvent): void {
    if (needConfirmation()) {
        event.preventDefault();
        event.returnValue = CONFIRMATION;
    }
}

onBeforeRouteLeave((to) => {
    destination = to.path;

    if (needConfirmation() && !confirm(CONFIRMATION)) {
        return false;
    }

    return true;
});

function checkReady(): void {
    const current = game.value;

    if (current && current.bonusManager.loaded && setup) {
        current.bonusManager.off('load', checkReady);
        client.addEvent('ready');
    }
}

function onMove({ detail }: { detail: { avatar: Avatar; move: number } }): void {
    client.addEvent('player:move', { avatar: detail.avatar.id, move: detail.move ? detail.move : 0 });
}

function updateBorders(): void {
    borderless.value = Boolean(game.value?.borderless);
}

function onFirstRound(): void {
    // Hide the waiting list once the first round starts
    setTimeout(() => repository.off('round:new', onFirstRound), 0);
    bump();
}

useEvents(repository, ['spectate'], () => {
    spectating.value = true;
});
useEvents(client, ['ready'], bump);
useEvents(client, ['borderless', 'round:new'], updateBorders);
useEvents(repository, ['round:new'], onFirstRound);

onMounted(() => {
    const current = game.value;

    if (!current) {
        return;
    }

    window.addEventListener('beforeunload', onBeforeUnload);

    current.loadDOM();
    current.bonusManager.on('load', checkReady);

    gamepadListener.stop();

    for (const avatar of current.avatars.items) {
        if (avatar.local && avatar.input) {
            avatar.input.on('move', onMove);

            if (avatar.input.useGamepad()) {
                gamepadListener.start();
            }
        }
    }

    setup = true;
    checkReady();
});

onBeforeUnmount(() => {
    const current = game.value;

    // Leave the room unless we are going back to it
    if ((current && destination !== current.room.getUrl()) || current?.started) {
        repository.parent.leave();
        chat.clear();
    }

    window.removeEventListener('beforeunload', onBeforeUnload);
    sound.stop('win');

    current?.avatars.items.forEach((avatar) => avatar.input?.off('move', onMove));
    current?.bonusManager.off('load', checkReady);
});

function toggleSound(): void {
    sound.toggle();
    triggerRef(soundActive);
}

function backToRoom(): void {
    const room = game.value?.room;

    if (room) {
        router.push({
            path: room.getUrl(),
            query: room.config.open ? {} : { password: room.config.password as string }
        });
    }
}
</script>

<template>
    <section>
        <section v-if="game" id="game-wrapper">
            <aside id="game-infos">
                <header>
                    <RouterLink to="/" class="logo"
                        ><img id="logo" :src="asset('images/logo.svg')" alt="Curvytron" /> Curvytron</RouterLink
                    >
                </header>
                <div class="maxScore">
                    <i class="icon-trophy"></i><span>{{ game.maxScore }}</span>
                </div>
                <h3 :title="game.name">{{ game.name }}</h3>

                <span id="sound" class="btn-toggle sound pull-right" :class="{ active: soundActive.active }" @click="toggleSound">
                    <i class="icon-volume"></i>
                </span>

                <PlayerList :game="game" />

                <MetricsFooter :game="game" />

                <div class="room-chat">
                    <div class="chat-wrapper">
                        <ChatPanel />
                    </div>
                </div>
            </aside>
            <div id="col-right">
                <KillLog :game="game" />

                <WaitingList v-if="!spectating && !game.isReady()" :game="game" />
                <RoundOverlay :game="game" @back-to-room="backToRoom" />
                <div id="render" class="game-render" :class="{ borderless }">
                    <canvas id="background" class="game-background"></canvas>
                    <canvas id="bonus" class="game-bonus"></canvas>
                    <canvas id="game" class="game-front"></canvas>
                    <canvas id="effect" class="game-effect"></canvas>
                </div>
                <div v-if="spectating" class="spectating">
                    <h2><i class="icon-viewer"></i> You are in spectator mode</h2>
                    <p>You must wait for the game to finish before you can play.</p>
                </div>
            </div>
        </section>
    </section>
</template>
