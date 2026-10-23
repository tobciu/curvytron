import { classicMode } from './ClassicMode.ts';
import { drawMissions, MissionRound } from './Missions.ts';
import { missionPoints, missions, starPoints } from '../../shared/missions.ts';
import { BonusStar } from '../model/Bonus/BonusStar.ts';
import { CoinSpawner } from './Coins.ts';
import { randomUnit } from './random.ts';
import { StarSpawner } from './Stars.ts';
import type { RoundSummary } from '../../shared/missions.ts';
import type { ScoringMode } from './ScoringMode.ts';

/** How often the standing of the missions is looked at during a round (ms) */
const checkInterval = 250;

/** The most the bonuses against the leader get more likely: 1 + this */
const maxLeaderBonusHelp = 1.5;

/**
 * Star Chase: the points of the classic scoring, and on top of it the missions of the round. Every round has some
 * missions that everybody sees; the best of each one gets points. (The stars come with their own bonus.)
 */
export const starChaseMode: ScoringMode = {
    id: 'starchase',
    warmdownTime: 8000,

    onRoundStart(game) {
        const players = game.getPresentAvatars().count();
        const enabled = Object.entries(game.room.config.bonuses)
            .filter(([, on]) => on)
            .map(([name]) => name);
        const lookBack = game.stats.previousPlaces.size >= missions.comeback.minPlayers;
        const ids = drawMissions(players, game.missions?.ids ?? [], randomUnit, enabled, lookBack);

        game.stars?.stop();
        game.coins?.stop();
        game.stars = new StarSpawner(game);
        game.missions = new MissionRound(game, ids);
        // The coins are only there in a round that has the mission of the coins
        game.coins = ids.includes('coinHunter') ? new CoinSpawner(game) : null;
        game.summary = null;
        // The counters of the round before are still there until the countdown is over
        game.stats.resetRound();
        game.missions.markSent(Date.now());
        game.emit('round:missions', game.missions.standings());
    },

    onFrame(game, now) {
        const missions = game.missions;

        // The stars appear once the round runs
        game.stars?.begin(missions?.players.length ?? 2);
        game.coins?.begin(missions?.players.length ?? 2);

        if (!missions || now - missions.checkedAt < checkInterval) {
            return;
        }

        missions.checkedAt = now;

        const changes = missions.changes(now);

        if (changes.length > 0) {
            game.emit('mission:progress', changes);
        }
    },

    leaderBonusFactor(game) {
        const scores = game.getPresentAvatars().items.map(({ score }) => score);
        const roundWin = Math.max(scores.length - 1, 1);
        const lead = (Math.max(0, ...scores) - Math.min(...scores)) / roundWin;

        // Every round win of difference makes the bonuses against the leader half as likely again, up to 2.5 times
        return 1 + Math.min(lead / 2, maxLeaderBonusHelp);
    },

    onKill: classicMode.onKill,

    onBonusCatch(game, avatar, bonus) {
        if (bonus instanceof BonusStar) {
            game.award(avatar, starPoints(game.missions?.players.length ?? 2), 'stars');
        }
    },

    onRoundEnd(game, winner) {
        game.stars?.stop();
        game.coins?.stop();
        classicMode.onRoundEnd(game, winner);

        const missions = game.missions;

        if (!missions) {
            return;
        }

        const results = missions.results(winner?.id ?? null);
        const points = missionPoints(missions.players.length);

        for (const { winners } of results) {
            for (const id of winners) {
                const avatar = game.avatars.getById(id);

                if (avatar?.present) {
                    game.award(avatar, points, 'missions');
                }
            }
        }

        const summary: RoundSummary = {
            missions: results,
            players: missions.players.map((id) => {
                const {
                    placement,
                    missions: won,
                    stars
                } = game.breakdown.get(id) ?? { placement: 0, missions: 0, stars: 0 };

                return { id, placement, missions: won, stars, total: placement + won + stars };
            })
        };

        game.summary = summary;
    }
};
