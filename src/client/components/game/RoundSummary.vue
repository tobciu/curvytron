<script setup lang="ts">
/** What every player got in the round, and who got the missions. */
import { computed, shallowRef, triggerRef } from 'vue';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import { missionInfo } from '../../content/missions';
import type { Game } from '../../types';

const props = defineProps<{ game: Game }>();

const { gameRepository } = useServices();

const game = shallowRef(props.game);

useEvents(gameRepository, ['round:new', 'round:summary'], () => triggerRef(game));

const summary = computed(() => game.value.summary);
const nameOf = (id: number): string => game.value.avatars.getById(id)?.name ?? '?';
const colorOf = (id: number): string | undefined => game.value.avatars.getById(id)?.player.color;

const players = computed(() => (summary.value?.players ?? []).toSorted((a, b) => b.total - a.total));
/** The column of the stars is only there once somebody got one */
const hasStars = computed(() => players.value.some((player) => player.stars > 0));
</script>

<template>
    <div v-if="summary" id="round-summary" class="round-summary">
        <h3>Missions</h3>
        <ul class="mission-results">
            <li v-for="result in summary.missions" :key="result.id">
                <span class="label">{{ missionInfo[result.id].name }}</span>
                <template v-if="result.winners.length">
                    <span v-for="id in result.winners" :key="id" class="strong" :style="{ color: colorOf(id) }">{{
                        nameOf(id)
                    }}</span>
                </template>
                <span v-else class="nobody">nobody</span>
            </li>
        </ul>
        <table class="table recap">
            <thead>
                <tr>
                    <th class="name">Player</th>
                    <th class="points">Survival</th>
                    <th class="points">Missions</th>
                    <th v-if="hasStars" class="points">Stars</th>
                    <th class="points">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="player in players" :key="player.id">
                    <td class="name">
                        <span :style="{ color: colorOf(player.id) }">{{ nameOf(player.id) }}</span>
                    </td>
                    <td class="points">{{ player.placement }}</td>
                    <td class="points">{{ player.missions }}</td>
                    <td v-if="hasStars" class="points">{{ player.stars }}</td>
                    <td class="points">
                        <strong>+{{ player.total }}</strong>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
