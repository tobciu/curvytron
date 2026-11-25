import { computed, ref } from 'vue';
import { getEnabledScoringModes, setEnabledScoringModes, type ScoringModeId } from '../../shared/scoring';

/**
 * The game modes, for the rules page and the room settings.
 * A new mode is one more entry here: it gets its own card, and is enabled with the toggle in shared/scoring.ts.
 */
export interface GameMode {
    id: string;
    name: string;
    /** One sentence */
    summary: string;
    /** How points are earned and how the game is won */
    rules: readonly string[];
}

const allGameModes: readonly GameMode[] = [
    {
        id: 'classic',
        name: 'Classic',
        summary: 'Survive longer than the others.',
        rules: [
            'Every player who dies gets as many points as there are players who died before them in that round.',
            'The last one alive wins the round and gets one point for each other player (at least one).',
            'The game ends when a player reaches the score limit and is alone in the lead. The default limit is 10 points for each opponent; the room owner can change it in the room settings.',
            'If several players reach the limit with the same score, the game goes on until one of them is ahead.'
        ]
    },
    {
        id: 'starchase',
        name: 'Star Chase',
        summary: 'Driving well is the base, but missions decide who wins: the result stays open until the last round.',
        rules: [
            'The places in a round give points as in the classic mode.',
            'Every round has missions that everybody sees at the edge of the field, with the standing during the round: one mission with two players, two missions from three, three from ten. The best player of each mission gets points, all of them when tied, nobody when the value is 0.',
            'A mission is worth half the points of a round win (at least one). Nothing counts while a player is invincible.',
            'Small stars appear at risky places, close to the walls or to trails, and go away after a while: a ring around a star shows how long it stays. A star is worth a third of the points of a round win (at least one). There are fewer stars than players: half the players rounded up, at most three.',
            'Between two rounds the recap shows what everybody got: the place, the missions and the total.',
            'By default the game ends after 8 rounds. In the last two rounds, every source of points counts twice. A tied score is decided in a tie break round, in which only the tied players score.',
            'The room owner can also end the game at a score or after some time, in both modes.'
        ]
    }
];

/**
 * The modes ready for players: the toggle hides the ones still in development.
 * The server tells the page which modes it has enabled (`server:info`), before anything renders:
 * the settings and the rules page mirror what the server allows. Until then (and before the server
 * says anything) the default of `shared/scoring.ts` is used.
 */
const enabled = ref<ScoringModeId[]>([...getEnabledScoringModes()]);

/** Apply the modes the server announced (`server:info`) */
export function setClientEnabledModes(modes: ScoringModeId[]): void {
    setEnabledScoringModes(modes);
    enabled.value = [...getEnabledScoringModes()];
}

/**
 * Apply what the server announced through `server:info`.
 * The client emitter wraps the payload in a DOM-like event (`{ type, detail }`), the server sends the payload itself.
 */
export function applyServerInfo(event: unknown): void {
    const wrapped = event as { detail?: { enabledModes?: unknown } } | null;
    const modes = wrapped?.detail?.enabledModes ?? (event as { enabledModes?: unknown } | null)?.enabledModes;

    if (Array.isArray(modes)) {
        setClientEnabledModes(modes.filter((mode): mode is ScoringModeId => typeof mode === 'string'));
    }
}

export const gameModes = computed<readonly GameMode[]>(() =>
    allGameModes.filter((mode) => enabled.value.includes(mode.id as ScoringModeId))
);
