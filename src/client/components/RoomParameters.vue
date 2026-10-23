<script setup lang="ts">
/** Configuration of a room: victory score, public / private, bonuses. Only the room master can change it. */
import { computed } from 'vue';
import { normalizeTag, tagMaxLength } from '../../shared/tag';
import { gameModes } from '../content/modes';
import { useServices } from '../services';
import { useLive } from '../composables/useEmitter';
import { spritePosition } from '../../shared/bonuses';
import type { Preset, Room } from '../types';

const props = defineProps<{ room: Room; master: boolean }>();

const { roomRepository: repository } = useServices();
const { live: config, bump } = useLive(props.room.config, repository, [
    'config:open',
    'room:config:open',
    'config:max-score',
    'config:win',
    'config:mode',
    'config:tag',
    'config:variable',
    'config:bonus'
]);

/** Where the image of the bonus is in the sprite (used by the CSS) */
function spriteStyle(bonus: string): Record<string, number> {
    const { column, line } = spritePosition(bonus);

    return { '--sprite-column': column, '--sprite-line': line };
}

const variables = computed(() => Object.keys(config.value.variables));
const included = computed(() => bonusNames(true));
const excluded = computed(() => bonusNames(false));

function bonusNames(enabled: boolean): string[] {
    return Object.entries(config.value.bonuses)
        .filter(([, value]) => value === enabled)
        .map(([bonus]) => bonus);
}

function toggleBonus(bonus: string): void {
    if (config.value.bonusExists(bonus) && repository.amIMaster()) {
        const target = config.value;

        repository.setConfigBonus(bonus, (result: { enabled: boolean }) => {
            target.setBonus(bonus, result.enabled);
            bump();
        });
    } else {
        console.error('Unknown bonus: %s', bonus);
    }
}

function applyPreset(preset: Preset): void {
    if (!repository.amIMaster()) {
        return;
    }

    if (preset.name && preset.name === 'Random') {
        preset.calculateRandom?.();
    }

    for (const bonus in config.value.bonuses) {
        if (config.value.bonuses[bonus] !== preset.hasBonus(bonus)) {
            toggleBonus(bonus);
        }
    }

    config.value.preset = preset;
    bump();
}

function togglePreset(preset: Preset): void {
    const current = config.value;

    if (current.preset === preset && preset.name && preset.name !== 'Random') {
        if (preset === current.getDefaultPreset()) {
            return;
        }

        return applyPreset(current.getDefaultPreset());
    }

    applyPreset(preset);
}

function setOpen(open: boolean): void {
    if (repository.amIMaster()) {
        const target = config.value;

        repository.setConfigOpen(open, (result: { open: boolean; password: string | null }) => {
            target.setOpen(result.open);
            target.setPassword(result.password);
            bump();
        });
    }
}

function setMaxScore(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const maxScore = value === '' ? null : Number(value);

    config.value.maxScore = maxScore;

    if (repository.amIMaster()) {
        const target = config.value;

        repository.setConfigMaxScore(maxScore as number, (result: { maxScore: number }) => {
            target.setMaxScore(result.maxScore);
            bump();
        });
    }
}

function setMode(event: Event): void {
    const mode = (event.target as HTMLSelectElement).value;

    if (repository.amIMaster()) {
        const target = config.value;

        repository.setConfigMode(mode, (result) => {
            if ('mode' in result) {
                target.setMode(result.mode);
            }

            bump();
        });
    }
}

function setWinCondition(event: Event): void {
    const condition = (event.target as HTMLSelectElement).value;

    if (repository.amIMaster()) {
        const target = config.value;

        repository.setConfigWin(condition, undefined, (result) => {
            if ('condition' in result) {
                target.setWinCondition(result.condition);
            }

            bump();
        });
    }
}

function setWinValue(condition: 'rounds' | 'minutes', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const number = value === '' ? null : Number(value);

    config.value[condition] = number;

    if (repository.amIMaster()) {
        const target = config.value;

        repository.setConfigWin(condition === 'rounds' ? 'rounds' : 'time', number, (result) => {
            if ('condition' in result) {
                target.rounds = result.rounds;
                target.minutes = result.minutes;
            }

            bump();
        });
    }
}

function setTag(event: Event): void {
    const input = event.target as HTMLInputElement;

    input.value = normalizeTag(input.value) ?? '';

    if (repository.amIMaster()) {
        repository.setConfigTag(input.value, (result) => {
            input.value = ('tag' in result ? result.tag : props.room.tag) ?? '';
            bump();
        });
    }
}

function setVariable(variable: string, event: Event): void {
    const target = config.value;

    target.variables[variable] = Number((event.target as HTMLInputElement).value);

    if (target.variableExists(variable) && repository.amIMaster()) {
        repository.setConfigVariable(
            variable,
            target.getVariable(variable),
            (result: { variable: string; value: number }) => {
                target.setVariable(result.variable, result.value);
                bump();
            }
        );
    }
}
</script>

<template>
    <div class="row">
        <div class="col-lg-4 max-score">
            <h2>Mode</h2>
            <select id="scoring-mode" class="form-control" :value="config.mode" :disabled="!master" @change="setMode">
                <option v-for="mode in gameModes" :key="mode.id" :value="mode.id">{{ mode.name }}</option>
            </select>

            <h2>The game is over</h2>
            <select
                id="win-condition"
                class="form-control"
                :value="config.winCondition"
                :disabled="!master"
                @change="setWinCondition"
            >
                <option value="points">at a score</option>
                <option value="rounds">after rounds</option>
                <option value="time">after some time</option>
            </select>

            <input
                v-if="config.winCondition === 'points'"
                id="max-score"
                type="number"
                class="form-control"
                :value="config.maxScore"
                :placeholder="String(config.getDefaultMaxScore())"
                maxlength="3"
                :disabled="!master"
                @input="setMaxScore"
            />
            <input
                v-else-if="config.winCondition === 'rounds'"
                id="win-rounds"
                type="number"
                class="form-control"
                :value="config.rounds"
                :placeholder="String(config.getRounds())"
                min="1"
                max="99"
                :disabled="!master"
                @input="setWinValue('rounds', $event)"
            />
            <input
                v-else
                id="win-minutes"
                type="number"
                class="form-control"
                :value="config.minutes"
                :placeholder="String(config.getMinutes())"
                min="1"
                max="120"
                :disabled="!master"
                @input="setWinValue('minutes', $event)"
            />

            <div class="room-tag">
                <h2>Tag</h2>
                <input
                    id="room-tag"
                    type="text"
                    class="form-control"
                    name="tag"
                    placeholder="daily"
                    :value="room.tag ?? ''"
                    :maxlength="tagMaxLength + 8"
                    :disabled="!master"
                    @change="setTag"
                />
            </div>

            <div class="public-room">
                <h2>Your room is</h2>
                <span id="is-open" class="toggler" :class="{ active: config.open === true }" @click="setOpen(true)"
                    >Public</span
                >
                <div class="toggle" :class="{ active: config.open === false }">
                    <input
                        id="open"
                        type="checkbox"
                        class="check"
                        :checked="config.open"
                        :disabled="!master"
                        @change="setOpen(($event.target as HTMLInputElement).checked)"
                    />
                    <b class="b switch"></b>
                </div>
                <span id="is-private" class="toggler" :class="{ active: config.open === false }" @click="setOpen(false)"
                    >Private</span
                >
                <div v-if="!config.open" class="password-container">
                    <label for="password">Password:</label>
                    <input
                        id="password"
                        type="text"
                        class="form-control"
                        :value="config.password"
                        readonly
                        maxlength="4"
                    />
                </div>
            </div>
        </div>
        <div class="col-lg-8 bonus-list">
            <h2>Bonus</h2>

            <div v-for="variable in variables" :key="variable" class="config-variables">
                <label :for="`config-${variable}`">{{ config.variablesNames[variable] }}:</label>
                <div class="input-range">
                    <span class="range-icon less-icon"><i class="icon-minus"></i></span>
                    <span class="range-icon more-icon"><i class="icon-plus"></i></span>
                    <input
                        :id="`config-${variable}`"
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        :value="config.variables[variable]"
                        :disabled="!master"
                        @input="setVariable(variable, $event)"
                    />
                </div>
            </div>

            <span class="form-caption">Preset:</span>
            <div class="bonus-selection">
                <span
                    v-for="(preset, index) in config.presets"
                    :key="index"
                    class="preset"
                    :class="{ active: preset === config.preset, disabled: !master }"
                    @click="togglePreset(preset)"
                >
                    {{ preset.name }}
                </span>
                <span
                    v-if="config.preset === config.customPreset"
                    class="preset active"
                    :class="{ disabled: !master }"
                    @click="togglePreset(config.customPreset)"
                >
                    {{ config.customPreset.name }}
                </span>
            </div>

            <span class="form-caption">Include:</span>
            <div class="bonus-selection selected">
                <span
                    v-for="bonus in included"
                    :key="bonus"
                    class="bonus"
                    :class="[config.bonusClasses[bonus], { disabled: !master }]"
                    :style="spriteStyle(bonus)"
                    @click="toggleBonus(bonus)"
                ></span>
            </div>

            <span class="form-caption">Exclude:</span>
            <div class="bonus-selection available">
                <span
                    v-for="bonus in excluded"
                    :key="bonus"
                    class="bonus"
                    :class="[config.bonusClasses[bonus], { disabled: !master }]"
                    :style="spriteStyle(bonus)"
                    @click="toggleBonus(bonus)"
                ></span>
            </div>
        </div>
    </div>
</template>
