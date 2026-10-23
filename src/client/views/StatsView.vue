<script setup lang="ts">
/** The games that were kept: leaderboard, games, records. Filtered by the tag of the rooms. */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GameStats from '../components/game/GameStats.vue';
import { NotKeptError, statsApi } from '../core/statsApi';
import { recordInfo } from '../content/stats';
import { featInfo, retiredFeatInfo } from '../content/feats';
import { leaderboardBys, type ApiGame, type ApiGameDetail, type ApiLeaderboard,
    type ApiMe, type ApiRecords, type ApiTag, type LeaderboardBy } from '../../shared/model/StatsApi';

/** The text of a feat of the player: the ones that are not given anymore have a text too */
const featText = (id: string) => featInfo[id] ?? retiredFeatInfo[id];

const route = useRoute();
const router = useRouter();

const tabs = [
    { id: 'leaderboard', title: 'Leaderboard' },
    { id: 'games', title: 'Games' },
    { id: 'records', title: 'Records' },
    { id: 'me', title: 'Me' }
] as const;
type Tab = (typeof tabs)[number]['id'];

const bys: Record<LeaderboardBy, string> = {
    wins: 'Wins',
    winRate: 'Win rate',
    roundsWon: 'Rounds won',
    kills: 'Kills',
    games: 'Games'
};

const tab = computed<Tab>(() => (tabs.some(({ id }) => id === route.params.tab) ? (route.params.tab as Tab) : 'leaderboard'));
const tag = ref<string | null>(typeof route.query.tag === 'string' ? route.query.tag : null);
const by = ref<LeaderboardBy>('wins');

const tags = ref<ApiTag[]>([]);
const leaderboard = ref<ApiLeaderboard | null>(null);
const games = ref<ApiGame[]>([]);
const next = ref<number | null>(null);
const records = ref<ApiRecords | null>(null);
const me = ref<ApiMe | null>(null);
const details = ref(new Map<number, ApiGameDetail>());
const opened = ref<number | null>(null);

const loading = ref(false);
/** `kept`: the server does not keep the games, `error`: it could not be asked */
const problem = ref<'kept' | 'error' | null>(null);

async function guard(task: () => Promise<void>): Promise<void> {
    loading.value = true;
    problem.value = null;

    try {
        await task();
    } catch (error) {
        problem.value = error instanceof NotKeptError ? 'kept' : 'error';
    } finally {
        loading.value = false;
    }
}

async function load(): Promise<void> {
    await guard(async () => {
        if (tab.value === 'leaderboard') {
            leaderboard.value = await statsApi.leaderboard(by.value, tag.value);
        } else if (tab.value === 'games') {
            const page = await statsApi.games(tag.value);

            games.value = page.games;
            next.value = page.next;
        } else if (tab.value === 'me') {
            me.value = await statsApi.me();
        } else {
            records.value = await statsApi.records(tag.value);
        }
    });
}

async function more(): Promise<void> {
    await guard(async () => {
        const page = await statsApi.games(tag.value, next.value);

        games.value = [...games.value, ...page.games];
        next.value = page.next;
    });
}

async function toggle(game: ApiGame): Promise<void> {
    if (opened.value === game.id) {
        opened.value = null;

        return;
    }

    opened.value = game.id;

    if (!details.value.has(game.id)) {
        await guard(async () => {
            details.value.set(game.id, await statsApi.game(game.id));
        });
    }
}

function show(id: Tab): void {
    router.push({ name: 'stats', params: { tab: id }, query: tag.value ? { tag: tag.value } : {} });
}

watch([tab, tag, by], () => {
    opened.value = null;
    void load();
});

watch(tag, (value) => router.replace({ query: value ? { tag: value } : {} }));

onMounted(async () => {
    await load();

    try {
        tags.value = (await statsApi.tags()).tags;
    } catch {
        // The filter is a convenience
    }
});

const percent = (value: number): string => `${Math.round(value * 100)} %`;
const date = (time: number): string => new Date(time).toLocaleString();
const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

function recordValue(id: string, value: number): string {
    return recordInfo[id]?.unit === 'seconds' ? seconds(value) : String(Math.round(value));
}
</script>

<template>
    <section id="stats" class="container">
        <h1>Stats</h1>

        <p class="intro">
            Games with at least two players are kept here, with the first player of every browser. Names are public. You can keep
            yours out of these lists in your profile.
        </p>

        <nav class="tabs">
            <a
                v-for="item in tabs"
                :key="item.id"
                href="#"
                :class="{ active: tab === item.id }"
                @click.prevent="show(item.id)"
            >
                {{ item.title }}
            </a>
            <label class="tag-filter">
                Tag
                <select v-model="tag">
                    <option :value="null">All games</option>
                    <option v-for="item in tags" :key="item.tag" :value="item.tag">
                        #{{ item.tag }} ({{ item.games }})
                    </option>
                </select>
            </label>
        </nav>

        <p v-if="problem === 'kept'" class="problem">The games are not kept on this server.</p>
        <p v-else-if="problem === 'error'" class="problem">The statistics can not be loaded right now. Try again later.</p>

        <section v-if="tab === 'leaderboard' && leaderboard">
            <p class="ways">
                Ranked by
                <a
                    v-for="way in leaderboardBys"
                    :key="way"
                    href="#"
                    :class="{ active: by === way }"
                    @click.prevent="by = way"
                >
                    {{ bys[way] }}
                </a>
            </p>
            <p v-if="by === 'winRate'" class="note">
                Only players with at least {{ leaderboard.minGamesForWinRate }} games: one win in one game says little.
            </p>
            <p v-if="!leaderboard.entries.length" class="empty">Nobody yet. Play a game with a friend.</p>
            <table v-else class="table stats-table">
                <thead>
                    <tr>
                        <th></th>
                        <th class="name">Player</th>
                        <th>Games</th>
                        <th>Wins</th>
                        <th>Win rate</th>
                        <th>Rounds won</th>
                        <th>Kills</th>
                        <th>Deaths</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in leaderboard.entries" :key="entry.rank" :class="{ mine: entry.mine }">
                        <td class="rank">{{ entry.rank }}</td>
                        <td class="name">{{ entry.name }}<span v-if="entry.mine" class="you"> (you)</span></td>
                        <td>{{ entry.games }}</td>
                        <td>{{ entry.wins }}</td>
                        <td>{{ percent(entry.winRate) }}</td>
                        <td>{{ entry.roundsWon }}</td>
                        <td>{{ entry.kills }}</td>
                        <td>{{ entry.deaths }}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <section v-if="tab === 'games'">
            <p v-if="!games.length && !loading && !problem" class="empty">No games yet.</p>
            <ul class="games">
                <li v-for="game in games" :key="game.id" :class="{ open: opened === game.id }">
                    <button type="button" class="game-head" @click="toggle(game)">
                        <span class="when">{{ date(game.endedAt) }}</span>
                        <span class="room">{{ game.room }}</span>
                        <span v-if="game.tag" class="tag">#{{ game.tag }}</span>
                        <span class="players">
                            <span
                                v-for="player in game.players"
                                :key="player.slot"
                                class="player"
                                :class="{ winner: player.rank === 1 && game.completed, mine: player.mine }"
                            >
                                {{ player.name }} <small>{{ player.score }}</small>
                            </span>
                        </span>
                        <span v-if="game.feats" class="feats-count" title="Special feats happened in this game">
                            ★ {{ game.feats }}
                        </span>
                    </button>
                    <div v-if="opened === game.id && details.get(game.id)" class="game-detail">
                        <GameStats :stats="details.get(game.id)!.stats" :hidden-feats="details.get(game.id)!.hiddenFeats" />
                    </div>
                </li>
            </ul>
            <p v-if="next"><button type="button" class="btn btn-default" :disabled="loading" @click="more">More games</button></p>
        </section>

        <section v-if="tab === 'me' && me">
            <p v-if="!me.known" class="empty">
                Nothing kept for you yet: play a game with a friend. Your games are kept under the identity code of this
                browser, see your profile (top right).
            </p>
            <template v-else>
                <p class="who">
                    {{ me.name }}
                    <span v-if="!me.public" class="private">(not in the public lists)</span>
                </p>
                <ul class="records">
                    <li>
                        <span class="label">Games</span>
                        <span class="value">{{ me.totals.games }}</span>
                    </li>
                    <li>
                        <span class="label">Wins</span>
                        <span class="value">{{ me.totals.wins }}</span>
                        <span class="where">{{ percent(me.totals.winRate) }} of your games</span>
                    </li>
                    <li>
                        <span class="label">Rounds won</span>
                        <span class="value">{{ me.totals.roundsWon }}</span>
                    </li>
                    <li>
                        <span class="label">Kills</span>
                        <span class="value">{{ me.totals.kills }}</span>
                        <span class="where">{{ me.totals.deaths }} deaths</span>
                    </li>
                    <li>
                        <span class="label">Best life</span>
                        <span class="value">{{ seconds(me.totals.bestLife) }}</span>
                    </li>
                    <li>
                        <span class="label">Best win streak</span>
                        <span class="value">{{ me.totals.bestStreak }}</span>
                    </li>
                </ul>

                <h2>My feats</h2>
                <p v-if="!me.feats.length" class="empty">None yet. There are some to be found.</p>
                <ul v-else class="my-feats">
                    <li v-for="(feat, index) in me.feats" :key="index">
                        <strong>{{ featText(feat.id)?.label ?? feat.id }}</strong>
                        <span class="where">{{ feat.room }}, round {{ feat.round }}, {{ date(feat.endedAt) }}</span>
                        <span class="description">
                            {{ (featText(feat.id)?.description ?? '').replace('{other}', feat.other ?? 'somebody') }}
                        </span>
                    </li>
                </ul>
            </template>
        </section>

        <section v-if="tab === 'records' && records">
            <p v-if="!records.records.length" class="empty">No records yet.</p>
            <ul v-else class="records">
                <li v-for="record in records.records" :key="record.id">
                    <span class="label">{{ recordInfo[record.id]?.label ?? record.id }}</span>
                    <span class="value">{{ recordValue(record.id, record.value) }}</span>
                    <span class="holder">{{ record.name }}</span>
                    <span class="where">{{ record.room }}, {{ date(record.endedAt) }}</span>
                    <span class="description">{{ recordInfo[record.id]?.description }}</span>
                </li>
            </ul>
        </section>
    </section>
</template>
