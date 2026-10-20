<script setup lang="ts">
/** Players whose game is still loading. */
import { shallowRef, triggerRef } from 'vue';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import type { Avatar, Game } from '../../types';

const props = defineProps<{ game: Game }>();

const { client } = useServices();
const list = shallowRef<Avatar[]>(props.game.avatars.items.slice());

useEvents(client, ['ready'], ({ detail }) => {
    const avatar = props.game.avatars.getById(detail);
    const index = avatar ? list.value.indexOf(avatar) : -1;

    if (index >= 0) {
        list.value.splice(index, 1);
        triggerRef(list);
    }
});
</script>

<template>
    <div class="waiting">
        <p>Waiting for players...</p>
        <ul>
            <li v-for="avatar in list" :key="avatar.id">
                <span :style="{ color: avatar.player.color }">{{ avatar.name }}</span>
            </li>
        </ul>
    </div>
</template>
