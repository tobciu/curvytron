<script setup lang="ts">
/** Frame rate, latency and spectators of the game. */
import { ref } from 'vue';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import type { Game } from '../../types';

const props = defineProps<{ game: Game }>();

const { client } = useServices();

const fps = ref(0);
const fpsColor = ref('gray');
const latency = ref(0);
const latencyColor = ref('gray');
const spectators = ref(0);

function getFPSColor(value: number): string {
    if (value >= 55) {
        return 'green';
    }

    if (value >= 40) {
        return 'orange';
    }

    return value >= 1 ? 'red' : 'gray';
}

function getLatencyColor(value: number): string {
    if (value <= 100) {
        return 'green';
    }

    return value <= 250 ? 'orange' : 'red';
}

useEvents(props.game.fps, ['fps'], () => {
    const value = props.game.fps.frequency;

    if (fps.value !== value) {
        fps.value = value;
        fpsColor.value = getFPSColor(value);
    }
});

useEvents(client, ['latency'], ({ detail }) => {
    if (latency.value !== detail) {
        latency.value = detail;
        latencyColor.value = getLatencyColor(detail);
    }
});

useEvents(client, ['game:spectators'], ({ detail }) => {
    spectators.value = detail;
});
</script>

<template>
    <footer>
        <span class="fps pull-right" :style="{ color: fpsColor }"> {{ fps }} fps </span>
        <span class="ping pull-right" :style="{ color: latencyColor }"> {{ latency }}ms </span>
        <span v-if="spectators" id="spectators" class="pull-right">
            {{ spectators }} <span class="icon-viewer"></span>
        </span>
        <a href="http://www.elao.com" class="game-copy pull-left" target="_blank"
            >Handmade by Elao with <i class="icon-love"></i
        ></a>
    </footer>
</template>
