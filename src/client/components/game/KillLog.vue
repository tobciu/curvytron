<script setup lang="ts">
/** The last deaths, newest at the bottom. */
import { ref } from 'vue';
import { MessageDie } from '../../model/message/MessageDie.js';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import type { Avatar, Game } from '../../types';

interface Death {
    type: 'suicide' | 'kill' | 'crash' | 'wall';
    deadPlayer: Avatar;
    killerPlayer: Avatar | null;
}

const SIZE = 5;

const props = defineProps<{ game: Game }>();

const { client } = useServices();
const feed = ref<(Death | null)[]>(Array.from({ length: SIZE }, () => null));

useEvents(client, ['die'], ({ detail }) => {
    const avatar = props.game.avatars.getById(detail[0]);

    if (avatar) {
        const killer = detail[1] ? props.game.avatars.getById(detail[1]) : null;

        feed.value = [...feed.value.slice(1), new MessageDie(avatar, killer, detail[2]) as unknown as Death];
    }
});

useEvents(client, ['round:new'], () => {
    feed.value = feed.value.map(() => null);
});
</script>

<template>
    <div class="kill-log-wrapper">
        <ul id="kill-log-feed" class="feed">
            <li v-for="(death, index) in feed" :key="index" class="one-message">
                <template v-if="death">
                    <span class="message-icon icon-dead"></span>
                    <span :style="{ color: death.deadPlayer.color }">{{ death.deadPlayer.name }}</span>
                    <template v-if="death.type === 'suicide'"> committed suicide</template>
                    <template v-else-if="death.type === 'wall'"> crashed on the wall</template>
                    <template v-else>
                        {{ death.type === 'kill' ? ' was killed by ' : ' crashed on ' }}
                        <span :style="{ color: death.killerPlayer?.color }">{{ death.killerPlayer?.name }}</span>
                    </template>
                </template>
            </li>
        </ul>
    </div>
</template>
