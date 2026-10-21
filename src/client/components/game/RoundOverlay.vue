<script setup lang="ts">
/** Round countdown and round / game recap. */
import { computed, onBeforeUnmount, ref, shallowRef, triggerRef } from 'vue';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import GameStats from './GameStats.vue';
import type { Avatar, Game } from '../../types';

const props = defineProps<{ game: Game }>();
const emit = defineEmits<{ backToRoom: [] }>();

const { client, notifier } = useServices();

const game = shallowRef(props.game);
const warmup = ref(false);
const tieBreak = ref(false);
const count = ref<number | string>('');
const end = ref(false);
/** Winner of the round or of the game, `false` when everybody died */
const winner = shallowRef<Avatar | false | null>(null);

let warmupInterval: ReturnType<typeof setInterval> | null = null;
let warmupTimeout: ReturnType<typeof setTimeout> | null = null;

const avatars = computed(() => game.value.avatars.items);

function clearWarmup(): void {
    if (warmupInterval) {
        clearInterval(warmupInterval);
        warmupInterval = null;
    }

    if (warmupTimeout) {
        clearTimeout(warmupTimeout);
        warmupTimeout = null;
    }
}

function endWarmup(): void {
    clearWarmup();
    warmup.value = false;
    notifier.notify('Go!', 1000);
}

function displayWarmup(time: number): void {
    clearWarmup();

    warmup.value = true;
    count.value = time / 1000;
    warmupInterval = setInterval(() => {
        count.value = Number(count.value) - 1;
        notifier.notify(`Round start in ${count.value}...`);
    }, 1000);
    warmupTimeout = setTimeout(endWarmup, time);

    notifier.notify(`Round start in ${count.value}...`);
}

useEvents(client, ['round:new'], () => {
    end.value = false;
    tieBreak.value = props.game.isTieBreak();

    displayWarmup(props.game.warmupTime);
});

useEvents(client, ['round:end'], () => {
    const roundWinner = props.game.roundWinner;

    notifier.notifyInactive(roundWinner ? `${roundWinner.name} won round!` : 'Round end!');

    winner.value = roundWinner ? roundWinner : false;
    end.value = true;
    triggerRef(game);
});

useEvents(client, ['game:stats'], () => {
    triggerRef(game);
});

useEvents(client, ['end'], () => {
    notifier.notify('Game over!', null, 'win');

    winner.value = props.game.avatars.getFirst();
    end.value = true;
    triggerRef(game);
});

onBeforeUnmount(clearWarmup);
</script>

<template>
    <div>
        <div v-show="warmup" id="warmup">
            <p v-show="tieBreak" id="tie-break" class="tie-break">Tie break</p>
            <section class="countdown">
                <div id="count" class="count">{{ count }}</div>
            </section>
            <div class="countdown-anim"></div>
        </div>
        <div v-show="end" id="end">
            <div id="game-view" class="recap-view" :class="game.started ? 'round' : 'game'">
                <p v-if="winner" class="victory">
                    <i class="icon-trophy"></i>
                    <span class="strong" :style="{ color: winner.color }">
                        {{ winner.name }}
                    </span>
                    won the {{ game.started ? 'round' : 'game' }} !
                </p>
                <p v-else class="victory">
                    <i class="icon-dead"></i>
                    Oops, everybody died...
                </p>
                <div v-if="!game.started">
                    <button type="button" class="btn btn-hero btn-back-to-room" @click="emit('backToRoom')">
                        Back to the room
                    </button>
                    <table class="table table-hover recap">
                        <tbody>
                            <tr v-for="(avatar, index) in avatars" :key="avatar.id">
                                <td class="rank">{{ index + 1 }}</td>
                                <td class="name">
                                    <span :style="{ color: avatar.player.color }">{{ avatar.name }}</span>
                                </td>
                                <td class="points">
                                    <strong>{{ avatar.score }}</strong> points
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <GameStats v-if="game.stats" :stats="game.stats" />
                    <button type="button" class="btn btn-hero btn-back-to-room" @click="emit('backToRoom')">
                        Back to the room
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
