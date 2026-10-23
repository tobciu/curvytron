<script setup lang="ts">
/** The missions of the round, small at the edge of the field. Only the standing changes during the round. */
import { computed, shallowRef, triggerRef } from 'vue';
import { useServices } from '../../services';
import { useEvents } from '../../composables/useEmitter';
import { missionInfo, missionStateText } from '../../content/missions';
import { missions as definitions } from '../../../shared/missions';
import type { MissionStanding } from '../../../shared/missions';
import type { Game } from '../../types';

const props = defineProps<{ game: Game }>();

const { client, gameRepository } = useServices();

const game = shallowRef(props.game);
const bump = () => triggerRef(game);

useEvents(gameRepository, ['round:new', 'round:missions', 'mission:progress', 'round:summary'], bump);
useEvents(client, ['game:join', 'game:leave', 'game:player'], bump);

/** The player this client is: the first local one, spectators have none */
const me = computed(() => game.value.avatars.items.find((avatar) => avatar.player.local && avatar.present) ?? null);

const nameOf = (id: number): string => game.value.avatars.getById(id)?.name ?? '?';

interface Row {
    id: string;
    name: string;
    description: string;
    status: 'leading' | 'tied' | 'behind' | 'none' | 'open' | 'done' | 'missed';
    text: string;
}

function countRow(standing: MissionStanding): Pick<Row, 'status' | 'text'> {
    const format = missionInfo[standing.id].format ?? String;
    const values = new Map(standing.values ?? []);
    const best = Math.max(0, ...values.values());
    const mine = me.value ? (values.get(me.value.id) ?? 0) : null;
    const leader = standing.leaders.length > 0 ? nameOf(standing.leaders[0]) : null;
    const lead =
        leader === null
            ? 'nobody yet'
            : standing.leaders.length > 1
              ? `${standing.leaders.length} tied at ${format(best)}`
              : `${leader} leads with ${format(best)}`;

    if (mine === null) {
        return { status: 'none', text: lead };
    }

    const you = `you: ${format(mine)}`;

    if (best === 0) {
        return { status: 'none', text: you };
    }

    if (me.value && standing.leaders.includes(me.value.id)) {
        return { status: standing.leaders.length > 1 ? 'tied' : 'leading', text: `${you} · ${lead}` };
    }

    return { status: 'behind', text: `${you} · ${lead} (${format(best - mine)} behind)` };
}

function flagRow(standing: MissionStanding): Pick<Row, 'status' | 'text'> {
    const states = new Map(standing.states ?? []);
    const mine = me.value ? states.get(me.value.id) : undefined;

    if (mine) {
        return { status: mine, text: `you: ${missionStateText[mine]}` };
    }

    const done = standing.leaders.map(nameOf);

    return { status: 'open', text: done.length > 0 ? `done: ${done.join(', ')}` : 'open for everybody' };
}

const rows = computed<Row[]>(() =>
    game.value.missions.map((standing) => ({
        id: standing.id,
        name: missionInfo[standing.id].name,
        description: missionInfo[standing.id].description,
        ...(definitions[standing.id].kind === 'count' ? countRow(standing) : flagRow(standing))
    }))
);
</script>

<template>
    <ul v-if="rows.length" id="missions" class="mission-panel">
        <li v-for="row in rows" :key="row.id" :class="`mission mission-${row.status}`" :title="row.description">
            <span class="mission-name">{{ row.name }}</span>
            <span class="mission-text">{{ row.text }}</span>
        </li>
    </ul>
</template>
