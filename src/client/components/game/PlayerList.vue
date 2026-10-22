<script setup lang="ts">
/** Players of the game with their scores. The order only changes at the end of a round. */
import { computed, reactive, ref, shallowRef, triggerRef } from 'vue';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import type { Avatar, Game } from '../../types';

const props = defineProps<{ game: Game }>();

const { client, gameRepository } = useServices();

const game = shallowRef(props.game);
const bump = () => triggerRef(game);
const order = shallowRef<Avatar[]>(props.game.avatars.items.slice());
const inRound = ref(false);
const dead = reactive(new Set<number>());

const avatars = computed(() => (game.value ? order.value : []));

function find(id: number): Avatar | null {
    return props.game.avatars.getById(id);
}

useEvents(client, ['score'], ({ detail }) => {
    const avatar = find(detail[0]);

    if (avatar) {
        avatar.setScore(detail[1]);
        bump();
    }
});

useEvents(client, ['score:round'], ({ detail }) => {
    const avatar = find(detail[0]);

    if (avatar) {
        avatar.setRoundScore(detail[1]);
        bump();
    }
});

useEvents(client, ['game:leave', 'game:join', 'player:connection'], bump);

// A player came in the middle of the game
useEvents(gameRepository, ['game:player'], () => {
    order.value = [...order.value, ...props.game.avatars.items.filter((avatar) => !order.value.includes(avatar))];
    bump();
});

useEvents(client, ['round:new'], () => {
    inRound.value = true;
    dead.clear();
});

useEvents(client, ['round:end'], () => {
    inRound.value = false;
    props.game.sortAvatars();
    order.value = props.game.avatars.items.slice();
});

useEvents(client, ['die'], ({ detail }) => {
    const avatar = find(detail[0]);

    if (avatar) {
        dead.add(avatar.id);
    }
});
</script>

<template>
    <div class="game-players" :class="{ 'in-round': inRound }">
        <div
            v-for="avatar in avatars"
            :id="`avatar-${avatar.id}`"
            :key="avatar.id"
            class="player"
            :class="{ local: avatar.local, dead: dead.has(avatar.id), away: !avatar.player.online || !avatar.present }"
        >
            <span class="line-color-preview" :style="{ backgroundColor: avatar.player.color }"></span>
            <span v-if="avatar.local" class="arrow" :style="{ borderLeftColor: avatar.player.color }"></span>
            <span :id="`avatar-round-score-${avatar.id}`" class="round-points">{{
                avatar.roundScore ? `+${avatar.roundScore}` : ''
            }}</span>
            <span class="player-name" :title="avatar.name">{{ avatar.name }}</span>
            <span :id="`avatar-score-${avatar.id}`" class="score">{{ avatar.score }}</span>
        </div>
    </div>
</template>
