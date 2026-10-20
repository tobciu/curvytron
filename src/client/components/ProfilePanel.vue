<script setup lang="ts">
/** The profile link in the header and the side panel to edit the profile (name, color, controls, options). */
import { onBeforeUnmount, ref } from 'vue';
import { BasePlayer } from '../../shared/model/BasePlayer.js';
import { useServices } from '../services';
import { useLive } from '../composables/useEmitter';
import ColorPicker from './ColorPicker.vue';

const { profile: model, profilePanel: panel, sound } = useServices();
const { live: profile, bump } = useLive(model, model, ['change']);

const { maxLength: nameMaxLength, colorMaxLength } = BasePlayer as unknown as {
    maxLength: number;
    colorMaxLength: number;
};

const controls = ref<HTMLInputElement[]>([]);

/** Leave the control inputs once a key was pressed in one of them. */
function blurControls(): void {
    controls.value.forEach((control) => control.blur());
}

function setColor(color: string): void {
    model.color = color;
    bump();
}

function toggle(callback: () => void): void {
    callback();
    bump();
}

onBeforeUnmount(() => panel.reset());
</script>

<template>
    <div>
        <button
            type="button"
            class="profile-link"
            :class="{ complete: profile.isComplete() }"
            @click="panel.toggleProfile()"
        >
            <span
                v-if="profile.isComplete()"
                class="circle"
                :style="{ backgroundColor: profile.color ?? undefined }"
            ></span>
            <span class="name">
                <span v-if="profile.isComplete()">{{ profile.name }}</span>
                <span v-if="!profile.isComplete()">What's your name<span class="question">?</span></span>
            </span>
        </button>
        <div id="profile" class="panel" :class="{ active: panel.open.value }">
            <div class="profile-form">
                <h3 class="title">
                    <button type="button" class="close" @click="panel.toggleProfile()">&times;</button>
                    My profile
                </h3>
                <div class="inner">
                    <fieldset>
                        <legend>Player:</legend>

                        <div class="form-row">
                            <div class="col">
                                <label for="profile-name">My name:</label>
                                <input
                                    id="profile-name"
                                    v-model="profile.name"
                                    type="text"
                                    class="form-control"
                                    name="name"
                                    placeholder="Choose a name"
                                    :maxlength="nameMaxLength"
                                    @input="bump"
                                    @blur="toggle(() => profile.persist())"
                                />
                            </div>

                            <div class="col">
                                <label for="profile-color">My color:</label>
                                <ColorPicker
                                    id="profile-color"
                                    :model-value="profile.color"
                                    position="bottom"
                                    class="form-control player-color"
                                    name="color"
                                    placeholder="#CCCCCC"
                                    :style="{ borderColor: profile.color ?? undefined }"
                                    :maxlength="colorMaxLength"
                                    @update:model-value="setColor"
                                    @blur="toggle(() => profile.persist())"
                                />
                            </div>
                            <div class="clearfix"></div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>Controls:</legend>

                        <div class="form-row">
                            <div v-for="(control, index) in profile.controls" :key="index" class="col">
                                <label :for="`profile-controls-${index}`">{{ control.label }}</label>
                                <input
                                    :id="`profile-controls-${index}`"
                                    ref="controls"
                                    type="text"
                                    :value="control.mapper.view"
                                    class="form-control control"
                                    :class="{ active: control.mapper.listening }"
                                    @focus="toggle(() => control.start())"
                                    @blur="toggle(() => control.stop())"
                                    @keyup="blurControls"
                                />
                            </div>
                            <div class="clearfix"></div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>Options:</legend>

                        <div class="form-row clearfix">
                            <div class="col">
                                <label for="profile-sound">Sound effects:</label>
                                <span
                                    id="profile-sound"
                                    class="btn-toggle sound"
                                    :class="{ active: profile.sound }"
                                    @click="toggle(() => sound.toggle())"
                                >
                                    <i class="icon-volume"></i>
                                </span>
                            </div>
                        </div>
                    </fieldset>

                    <div class="text-center">
                        <button type="button" class="btn btn-save" @click="panel.toggleProfile()">
                            <span>I'm done</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="profile-tuto" :class="{ active: panel.tutorial.value }">
                <div class="content">
                    <p>
                        Hi there!<br />
                        We just need to know a few things before you start playing:
                    </p>
                    <ul class="list">
                        <li class="item first" :class="{ done: profile.name }">
                            Choose yourself player name.
                            <small>A name to find them, a name to rule them all...</small>
                        </li>
                        <li class="item" :class="{ done: profile.color }">
                            Pick a color that your like.
                            <small>Or one that you don't, why should I care...</small>
                        </li>
                        <li class="item final">
                            You can assign new controls if you're not happy with left and right arrows.
                            <small>Yep. Console controllers are supported.</small>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
