<script setup lang="ts">
/** Statistics of the game, shown with the final ranking. Hover (or focus) a title or a bonus count for the details. */
import { computed } from 'vue';
import { bonusDefinitions } from '../../../shared/bonuses';
import type { GameStatsData, PlayerStats } from '../../../shared/model/GameStats';

/** `compact`: the awards only (between the rounds) */
const props = defineProps<{ stats: GameStatsData; compact?: boolean }>();

/** What the awards are given for */
const awardInfo: Record<string, { label: string; description: string }> = {
    bonusHunter: { label: 'Bonus hunter', description: 'Caught the most bonuses.' },
    wallLover: { label: 'Wall lover', description: 'Crashed the most often on a border.' },
    clumsy: { label: 'Own worst enemy', description: 'Died the most often on their own trail.' },
    closeCall: {
        label: 'Close call',
        description: 'Passed the most often very close to the trail of another player, without touching it.'
    },
    hunter: { label: 'Hunter', description: 'Killed the most players on their trail.' },
    marathon: { label: 'Marathon driver', description: 'Drove the longest distance.' },
    survivor: { label: 'Survivor', description: 'Stayed alive the longest in a round.' }
};

/** The columns of the table: what they count */
const columns = [
    { label: 'Rounds', description: 'Rounds won.' },
    { label: 'Bonuses', description: 'Bonuses caught. Hover a number to see which ones.' },
    { label: 'Walls', description: 'Times the player crashed on a border.' },
    { label: 'Trails', description: 'Times the player crashed on a trail, their own or the one of somebody else.' },
    { label: 'Kills', description: 'Players that crashed on the trail of this player.' },
    {
        label: 'Close calls',
        description: 'Times the player passed very close to the trail of another player, without touching it.'
    },
    { label: 'Distance', description: 'Distance driven, in the units of the map.' },
    { label: 'Longest life', description: 'Longest time the player stayed alive in a round.' }
];

/** `bonus-self-fast` => "self fast" */
const bonusLabels = new Map(
    bonusDefinitions.map(({ name, css }) => [name, css.replace(/^bonus-/, '').replaceAll('-', ' ')])
);

const players = computed(() => props.stats.players.toSorted((a, b) => b.score - a.score));
const playersById = computed(() => new Map(props.stats.players.map((player) => [player.id, player])));

const awards = computed(() =>
    props.stats.awards.map((award) => ({
        ...award,
        ...(awardInfo[award.id] ?? { label: award.id, description: '' }),
        player: playersById.value.get(award.player),
        text: award.id === 'survivor' ? `${(award.value / 1000).toFixed(1)} s` : String(award.value)
    }))
);

function seconds(ms: number): string {
    return (ms / 1000).toFixed(1);
}

/** The bonuses of a player by type, the most caught first: "fast ×3, small ×1" */
function bonusDetails(player: PlayerStats): string[] {
    return Object.entries(player.bonusesByType)
        .toSorted((a, b) => b[1] - a[1])
        .map(([name, count]) => `${bonusLabels.get(name) ?? name} × ${count}`);
}
</script>

<template>
    <div class="game-stats">
        <ul v-if="awards.length" class="awards">
            <li v-for="award in awards" :key="award.id" :class="award.id" class="has-tip" tabindex="0">
                <span class="label">{{ award.label }}</span>
                <span class="strong" :style="{ color: award.player?.color }">{{ award.player?.name }}</span>
                <span class="value">{{ award.text }}</span>
                <span class="tip" role="tooltip">
                    <strong>{{ award.label }}</strong>
                    {{ award.description }}
                </span>
            </li>
        </ul>
        <table v-if="!compact" class="table table-hover stats">
            <thead>
                <tr>
                    <th class="name">Player</th>
                    <th
                        v-for="(column, index) in columns"
                        :key="column.label"
                        class="has-tip"
                        :class="{ 'tip-end': index >= columns.length - 2 }"
                        tabindex="0"
                    >
                        {{ column.label }}
                        <i class="info">?</i>
                        <span class="tip" role="tooltip">
                            <strong>{{ column.label }}</strong>
                            {{ column.description }}
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="player in players" :key="player.id">
                    <td class="name">
                        <span :style="{ color: player.color }">{{ player.name }}</span>
                    </td>
                    <td>{{ player.roundsWon }}</td>
                    <td :class="{ 'has-tip': player.bonuses > 0 }" :tabindex="player.bonuses > 0 ? 0 : undefined">
                        {{ player.bonuses }}
                        <span v-if="player.bonuses > 0" class="tip" role="tooltip">
                            <strong>Bonuses of {{ player.name }}</strong>
                            <span v-for="detail in bonusDetails(player)" :key="detail" class="line">{{ detail }}</span>
                        </span>
                    </td>
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
