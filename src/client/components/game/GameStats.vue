<script setup lang="ts">
/** Statistics of the game, shown with the final ranking. Hover (or focus) a title or a bonus count for the details. */
import { computed } from 'vue';
import { bonusDefinitions } from '../../../shared/bonuses';
import type { GameStatsData, PlayerStats } from '../../../shared/model/GameStats';
import FeatList from './FeatList.vue';
import { awardInfo, statInfo } from '../../content/stats';
import type { StatInfo } from '../../content/stats';

const props = defineProps<{ stats: GameStatsData; hiddenFeats?: number }>();

/** The columns of the table: what they count, see `content/stats.ts` */
const columns: Array<StatInfo & { value: (player: PlayerStats) => number; format?: (value: number) => string }> = [
    { ...statInfo.roundsWon, value: (player: PlayerStats) => player.roundsWon },
    { ...statInfo.longestStreak, value: (player: PlayerStats) => player.longestStreak },
    { ...statInfo.bonuses, value: (player: PlayerStats) => player.bonuses },
    { ...statInfo.deaths, value: (player: PlayerStats) => deaths(player) },
    { ...statInfo.kills, value: (player: PlayerStats) => player.kills },
    { ...statInfo.nearMisses, value: (player: PlayerStats) => player.nearMisses },
    { ...statInfo.squeezes, value: (player: PlayerStats) => player.squeezes },
    { ...statInfo.gapRuns, value: (player: PlayerStats) => player.gapRuns },
    { ...statInfo.distance, value: (player: PlayerStats) => player.distance },
    {
        ...statInfo.longestLife,
        value: (player: PlayerStats) => player.longestLife,
        format: (value: number) => `${seconds(value)} s`
    }
];

/** The highest value of every column: the bars of the cells are relative to it */
const maxima = computed(() => columns.map((column) => Math.max(0, ...props.stats.players.map(column.value))));

/** Width of the bar of a cell, in percent of the best of its column */
function bar(index: number, player: PlayerStats): Record<string, string> {
    const max = maxima.value[index];

    return { '--bar': `${max > 0 ? Math.round((columns[index].value(player) / max) * 100) : 0}%` };
}

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

const rounds = computed(() =>
    props.stats.rounds.map((result) => ({
        ...result,
        winner: result.winner === null ? null : (playersById.value.get(result.winner) ?? null)
    }))
);

/** Does the cell have an explanation? The bonuses and the deaths are broken down */
function hasTip(label: string, player: PlayerStats): boolean {
    return (label === 'Bonuses' && player.bonuses > 0) || (label === 'Deaths' && deaths(player) > 0);
}

function deaths(player: PlayerStats): number {
    return player.wallDeaths + player.selfDeaths + player.trailDeaths;
}

/** What killed a player, for the explanation of the number of deaths */
function deathDetails(player: PlayerStats): string[] {
    const causes: Array<[number, string]> = [
        [player.wallDeaths, 'on a border'],
        [player.selfDeaths, 'on their own trail'],
        [player.trailDeaths, 'on the trail of another player']
    ];

    return causes.filter(([count]) => count > 0).map(([count, what]) => `${count} × ${what}`);
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
            <li v-for="award in awards" :key="award.id" :class="award.id">
                <button type="button" class="has-tip">
                    <span class="label">{{ award.label }}</span>
                    <span class="strong" :style="{ color: award.player?.color }">{{ award.player?.name }}</span>
                    <span class="value">{{ award.text }}</span>
                    <span class="tip" role="tooltip">
                        <strong>{{ award.label }}</strong>
                        {{ award.description }}
                    </span>
                </button>
            </li>
        </ul>
        <table class="table table-hover stats">
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
                    <td
                        v-for="(column, index) in columns"
                        :key="column.label"
                        class="bar"
                        :class="{ 'has-tip': hasTip(column.label, player) }"
                        :style="bar(index, player)"
                        :tabindex="hasTip(column.label, player) ? 0 : undefined"
                    >
                        {{ column.format ? column.format(column.value(player)) : column.value(player) }}
                        <span
                            v-if="column.label === 'Bonuses' && hasTip(column.label, player)"
                            class="tip"
                            role="tooltip"
                        >
                            <strong>Bonuses of {{ player.name }}</strong>
                            <span v-for="detail in bonusDetails(player)" :key="detail" class="line">{{ detail }}</span>
                        </span>
                        <span
                            v-if="column.label === 'Deaths' && hasTip(column.label, player)"
                            class="tip"
                            role="tooltip"
                        >
                            <strong>Deaths of {{ player.name }}</strong>
                            <span v-for="detail in deathDetails(player)" :key="detail" class="line">{{ detail }}</span>
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
        <FeatList :feats="stats.feats" :players="stats.players" :hidden="hiddenFeats" show-round />
        <ol v-if="rounds.length > 1" class="rounds">
            <li v-for="result in rounds" :key="result.round">
                <span class="label">Round {{ result.round }}</span>
                <span v-if="result.winner" class="strong" :style="{ color: result.winner.color }">
                    {{ result.winner.name }}
                </span>
                <span v-else class="nobody">nobody</span>
                <span class="value">{{ seconds(result.duration) }} s</span>
            </li>
        </ol>
        <p class="rules-link">
            <a href="#/rules/statistics" target="_blank" class="animated">How is this counted?</a>
        </p>
    </div>
</template>
