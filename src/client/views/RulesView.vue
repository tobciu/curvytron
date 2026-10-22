<script setup lang="ts">
/** What the game is about: controls, bonuses, game modes and statistics. Built from the data of the game where it can be. */
import { nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { bonusDefinitions, bonusTarget, spritePosition } from '../../shared/bonuses';
import type { BonusDefinition, BonusTarget } from '../../shared/bonuses';
import { awardInfo, countingRules, statInfo } from '../content/stats';
import { gameModes } from '../content/modes';

const route = useRoute();

const sections = [
    { id: 'basics', title: 'Basics' },
    { id: 'bonuses', title: 'Bonuses' },
    { id: 'modes', title: 'Game modes' },
    { id: 'statistics', title: 'Statistics' },
    { id: 'multiplayer', title: 'Joining and leaving' }
];

/** Who is affected, in the order of the page */
const groups: Array<{ targets: BonusTarget[]; title: string }> = [
    { targets: ['self'], title: 'For you' },
    { targets: ['enemy'], title: 'For the other players' },
    { targets: ['leader'], title: 'For the leader' },
    { targets: ['all', 'game'], title: 'For everybody' }
];

const bonusGroups = groups.map(({ targets, title }) => ({
    title,
    bonuses: bonusDefinitions.filter((definition) => targets.includes(bonusTarget(definition)))
}));

function spriteStyle(definition: BonusDefinition): Record<string, number> {
    const { column, line } = spritePosition(definition.name);

    return { '--sprite-column': column, '--sprite-line': line };
}

const stats = Object.entries(statInfo).map(([id, info]) => ({ id, ...info }));
const awards = Object.entries(awardInfo).map(([id, info]) => ({ id, ...info }));

/** `#/rules/statistics` opens the page at the statistics */
onMounted(async () => {
    await nextTick();

    const section = route.params.section;

    if (typeof section === 'string') {
        document.getElementById(`rules-${section}`)?.scrollIntoView();
    }
});
</script>

<template>
    <section id="rules" class="container">
        <h1>Rules</h1>

        <nav class="rules-nav">
            <RouterLink
                v-for="section in sections"
                :key="section.id"
                :to="{ name: 'rules', params: { section: section.id } }"
                class="animated"
            >
                {{ section.title }}
            </RouterLink>
        </nav>

        <section id="rules-basics">
            <h2>Basics</h2>
            <ul>
                <li>You are always moving and leave a trail behind you. You can only turn left or right.</li>
                <li>
                    You die when you touch a border, your own trail or the trail of another player. Your trail has small
                    gaps from time to time.
                </li>
                <li>Bonuses appear on the map. Drive over one to catch it, its effect lasts a few seconds.</li>
                <li>
                    A round ends when only one player is left. Points and the end of the game depend on the
                    <a href="#/rules/modes">game mode</a>.
                </li>
            </ul>
            <h3>Controls</h3>
            <ul>
                <li>The default controls are the left and right arrow keys.</li>
                <li>Change them in your profile (top right of the page).</li>
                <li>
                    Several players can play on the same device: add them in the room and give each one their own
                    keys.
                </li>
            </ul>
        </section>

        <section id="rules-bonuses">
            <h2>Bonuses</h2>
            <p>
                Every bonus has a target: yourself, the other players, the leader or everybody. The owner of a room
                chooses which bonuses appear, with presets or one by one, in the settings of the room. Bonuses marked
                "off by default" have to be switched on there.
            </p>
            <div v-for="group in bonusGroups" :key="group.title" class="bonus-group">
                <h3>{{ group.title }}</h3>
                <ul class="bonus-table">
                    <li v-for="bonus in group.bonuses" :key="bonus.name">
                        <span class="rules-bonus" :style="spriteStyle(bonus)"></span>
                        <span class="text">
                            <strong>{{ bonus.label }}</strong>
                            <span v-if="!bonus.enabled" class="off">off by default</span>
                            <br />
                            {{ bonus.description }}
                        </span>
                    </li>
                </ul>
            </div>
        </section>

        <section id="rules-modes">
            <h2>Game modes</h2>
            <div v-for="mode in gameModes" :key="mode.id" class="mode" :class="mode.id">
                <h3>{{ mode.name }}</h3>
                <p class="summary">{{ mode.summary }}</p>
                <ul>
                    <li v-for="rule in mode.rules" :key="rule">{{ rule }}</li>
                </ul>
            </div>
        </section>

        <section id="rules-statistics">
            <h2>Statistics</h2>
            <p>
                When a game ends, the ranking comes with statistics and awards. This is what they count and how to
                get them.
            </p>
            <ul>
                <li v-for="rule in countingRules" :key="rule">{{ rule }}</li>
            </ul>

            <h3>Statistics</h3>
            <table class="table rules-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>What is counted</th>
                        <th>How to get it</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="stat in stats" :key="stat.id">
                        <td class="strong">{{ stat.label }}</td>
                        <td>{{ stat.description }}</td>
                        <td>{{ stat.how }}</td>
                    </tr>
                </tbody>
            </table>

            <h3>Awards</h3>
            <table class="table rules-table">
                <thead>
                    <tr>
                        <th>Award</th>
                        <th>Goes to the player who</th>
                        <th>Tip</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="award in awards" :key="award.id">
                        <td class="strong">{{ award.label }}</td>
                        <td>{{ award.description }}</td>
                        <td>{{ award.how }}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section id="rules-multiplayer">
            <h2>Joining and leaving</h2>
            <ul>
                <li>You can watch a running game as a spectator.</li>
                <li>You can join a running game too. You start playing with the next round, never in the middle of one.</li>
                <li>
                    If your connection drops, your players stay in the game while the page reconnects. The others see
                    who is away. When you are back you are in the game again, as long as it is running.
                </li>
            </ul>
        </section>
    </section>
</template>
