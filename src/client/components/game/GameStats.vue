<script setup lang="ts">
/** Statistics of the game, shown with the final ranking. */
import { computed } from 'vue';
import type { GameStatsData } from '../../../shared/model/GameStats';

/** `compact`: the awards only (between the rounds) */
const props = defineProps<{ stats: GameStatsData; compact?: boolean }>();

const awardLabels: Record<string, string> = {
    bonusHunter: 'Bonus hunter',
    wallLover: 'Wall lover',
    clumsy: 'Own worst enemy',
    closeCall: 'Close call',
    hunter: 'Hunter',
    marathon: 'Marathon driver',
    survivor: 'Survivor'
};

const players = computed(() => props.stats.players.toSorted((a, b) => b.score - a.score));
const playersById = computed(() => new Map(props.stats.players.map((player) => [player.id, player])));

const awards = computed(() =>
    props.stats.awards.map((award) => ({
        ...award,
        label: awardLabels[award.id] ?? award.id,
        player: playersById.value.get(award.player),
        text: award.id === 'survivor' ? `${(award.value / 1000).toFixed(1)} s` : String(award.value)
    }))
);

function seconds(ms: number): string {
    return (ms / 1000).toFixed(1);
}
</script>

<template>
    <div class="game-stats">
        <ul v-if="awards.length" class="awards">
            <li v-for="award in awards" :key="award.id" :class="award.id">
                <span class="label">{{ award.label }}</span>
                <span class="strong" :style="{ color: award.player?.color }">{{ award.player?.name }}</span>
                <span class="value">{{ award.text }}</span>
            </li>
        </ul>
        <table v-if="!compact" class="table table-hover stats">
            <thead>
                <tr>
                    <th class="name">Player</th>
                    <th title="Rounds won">Rounds</th>
                    <th title="Bonuses caught">Bonuses</th>
                    <th title="Died on a border">Walls</th>
                    <th title="Died on a trail">Trails</th>
                    <th title="Players killed on your trail">Kills</th>
                    <th title="Passed very close to the trail of another player">Close calls</th>
                    <th title="Distance driven">Distance</th>
                    <th title="Longest time alive in a round">Longest life</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="player in players" :key="player.id">
                    <td class="name">
                        <span :style="{ color: player.color }">{{ player.name }}</span>
                    </td>
                    <td>{{ player.roundsWon }}</td>
                    <td>{{ player.bonuses }}</td>
                    <td>{{ player.wallDeaths }}</td>
                    <td>{{ player.selfDeaths + player.trailDeaths }}</td>
                    <td>{{ player.kills }}</td>
                    <td>{{ player.nearMisses }}</td>
                    <td>{{ player.distance }}</td>
                    <td>{{ seconds(player.longestLife) }} s</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
