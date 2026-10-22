<script setup lang="ts">
/** Special feats that happened, with what they are. The players find out about them here, they are not listed elsewhere. */
import { computed } from 'vue';
import type { Feat, PlayerStats } from '../../../shared/model/GameStats';
import { featInfo } from '../../content/feats';
import { secretFeat } from '../../../shared/model/StatsApi';

const props = defineProps<{ feats: Feat[]; players: PlayerStats[]; showRound?: boolean }>();

const playersById = computed(() => new Map(props.players.map((player) => [player.id, player])));

const entries = computed(() =>
    props.feats.map((feat) => {
        const info =
            feat.id === secretFeat
                ? { label: '?', description: 'A secret feat. Play, and you will see what it is.' }
                : (featInfo[feat.id] ?? { label: feat.id, description: '' });
        const other = feat.other === undefined ? undefined : playersById.value.get(feat.other);

        return {
            ...feat,
            label: info.label,
            description: info.description.replace('{other}', other?.name ?? 'somebody'),
            player: playersById.value.get(feat.player)
        };
    })
);
</script>

<template>
    <div v-if="entries.length" class="feats">
        <h3>Special feats</h3>
        <ul>
            <li v-for="(feat, index) in entries" :key="`${feat.round}-${feat.id}-${feat.player}-${index}`">
                <span class="label">{{ feat.label }}</span>
                <span class="strong" :style="{ color: feat.player?.color }">{{ feat.player?.name }}</span>
                <span v-if="showRound" class="round">Round {{ feat.round }}</span>
                <span class="description">{{ feat.description }}</span>
            </li>
        </ul>
    </div>
</template>
