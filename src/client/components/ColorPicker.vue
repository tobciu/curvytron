<script setup lang="ts">
/**
 * Text input with a color picker dropdown (saturation / brightness square and hue slider).
 * The v-model is the color as an hex string (`#rrggbb`).
 */
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue';
import { hsbToHex, parseColor, type HSB } from '../colorpicker/color';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{ modelValue: string | null; position?: 'top' | 'right' | 'bottom' | 'left' }>(),
    {
        position: 'bottom'
    }
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const attrs = useAttrs();

/** Size in pixels of the sliders */
const SIZE = 100;

const input = ref<HTMLInputElement>();
const visible = ref(false);
const top = ref(0);
const left = ref(0);
const hsb = ref<HSB>({ h: 1, s: 0, b: 1, a: 1 });

/** Re-read the color typed in the input, the previous one is kept if it can not be parsed. */
function readText(): void {
    const parsed = parseColor(props.modelValue);

    if (parsed) {
        hsb.value = parsed;
    }
}

watch(() => props.modelValue, readText, { immediate: true });

const previewColor = computed(() => hsbToHex(hsb.value));
const squareColor = computed(() => hsbToHex({ h: hsb.value.h, s: 1, b: 1 }));
const squareKnob = computed(() => ({ left: `${hsb.value.s * SIZE}px`, top: `${SIZE - hsb.value.b * SIZE}px` }));
const hueKnob = computed(() => ({ top: `${SIZE * (1 - hsb.value.h)}px` }));

function onInput(event: Event): void {
    emit('update:modelValue', (event.target as HTMLInputElement).value);
}

function show(): void {
    if (visible.value || !input.value) {
        return;
    }

    readText();

    const rect = input.value.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY;
    const offsetLeft = rect.left + window.scrollX;
    const gap = 2;

    if (props.position === 'right') {
        top.value = offsetTop;
        left.value = offsetLeft + input.value.offsetWidth + gap;
    } else if (props.position === 'left') {
        top.value = offsetTop;
        left.value = offsetLeft - (SIZE + 29) - gap;
    } else if (props.position === 'top') {
        top.value = offsetTop - (SIZE + 55) - gap;
        left.value = offsetLeft;
    } else {
        top.value = offsetTop + input.value.offsetHeight + gap;
        left.value = offsetLeft;
    }

    visible.value = true;
    nextTick(() => document.addEventListener('mousedown', hide));
}

function hide(): void {
    visible.value = false;
    document.removeEventListener('mousedown', hide);
}

/** Start dragging a slider: `apply` receives the position (0 to 1) of the pointer inside of it. */
function drag(event: MouseEvent, apply: (x: number, y: number) => void): void {
    const slider = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const move = (e: MouseEvent) => {
        const x = Math.max(0, Math.min(SIZE, e.clientX - slider.left)) / SIZE;
        const y = Math.max(0, Math.min(SIZE, e.clientY - slider.top)) / SIZE;

        apply(x, y);
        emit('update:modelValue', hsbToHex(hsb.value));
    };
    const stop = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stop);
    };

    move(event);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
}

const dragSquare = (event: MouseEvent) =>
    drag(event, (x, y) => {
        hsb.value = { ...hsb.value, s: x, b: 1 - y };
    });
const dragHue = (event: MouseEvent) =>
    drag(event, (_x, y) => {
        hsb.value = { ...hsb.value, h: 1 - y };
    });

onBeforeUnmount(() => document.removeEventListener('mousedown', hide));
</script>

<template>
    <input
        ref="input"
        type="text"
        v-bind="attrs"
        :value="modelValue"
        @input="onInput"
        @click="show"
        @blur="readText"
        @keyup="readText"
        @change="readText"
    />
    <Teleport to="body">
        <div
            class="colorpicker dropdown"
            :class="[`colorpicker-position-${position}`, { 'colorpicker-visible': visible }]"
            :style="{ minWidth: `${SIZE + 29}px`, top: `${top}px`, left: `${left}px` }"
            @mousedown.stop.prevent
        >
            <div class="dropdown-menu">
                <colorpicker-saturation
                    :style="{ width: `${SIZE}px`, height: `${SIZE}px`, backgroundColor: squareColor }"
                    @mousedown="dragSquare"
                    ><i :style="squareKnob"></i
                ></colorpicker-saturation>
                <colorpicker-hue :style="{ height: `${SIZE}px` }" @mousedown="dragHue"
                    ><i :style="hueKnob"></i
                ></colorpicker-hue>
                <colorpicker-preview :style="{ backgroundColor: previewColor }"></colorpicker-preview>
                <button type="button" class="close close-colorpicker" @click="hide">&times;</button>
            </div>
        </div>
    </Teleport>
</template>
