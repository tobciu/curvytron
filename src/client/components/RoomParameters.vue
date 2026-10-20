<script setup lang="ts">
/** Configuration of a room: victory score, public / private, bonuses. Only the room master can change it. */
import { computed } from 'vue';
import { useServices } from '../services';
import { useLive } from '../composables/useEmitter';
import type { Preset, Room } from '../types';

const props = defineProps<{ room: Room; master: boolean }>();

const { roomRepository: repository } = useServices();
const { live: config, bump } = useLive(props.room.config, repository, [
    'config:open',
    'room:config:open',
    'config:max-score',
    'config:variable',
    'config:bonus'
]);

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
            <h2>Victory score</h2>
            <input
                id="max-score"
                type="number"
                class="form-control"
                :value="config.maxScore"
                :placeholder="String(config.getDefaultMaxScore())"
                maxlength="3"
                :disabled="!master"
                @input="setMaxScore"
            />

            <div class="public-room">
                <h2>Your room is</h2>
                <label id="is-open" class="toggler" :class="{ active: config.open === true }" @click="setOpen(true)"
                    >Public</label
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
                <label
                    id="is-private"
                    class="toggler"
                    :class="{ active: config.open === false }"
                    @click="setOpen(false)"
                    >Private</label
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

            <label>Preset:</label>
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

            <label>Include:</label>
            <div class="bonus-selection selected">
                <span
                    v-for="bonus in included"
                    :key="bonus"
                    class="bonus"
                    :class="[config.bonusClasses[bonus], { disabled: !master }]"
                    @click="toggleBonus(bonus)"
                ></span>
            </div>

            <label>Exclude:</label>
            <div class="bonus-selection available">
                <span
                    v-for="bonus in excluded"
                    :key="bonus"
                    class="bonus"
                    :class="[config.bonusClasses[bonus], { disabled: !master }]"
                    @click="toggleBonus(bonus)"
                ></span>
            </div>
        </div>
    </div>
</template>
