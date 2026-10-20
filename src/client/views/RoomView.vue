<script setup lang="ts">
/** A room: players, parameters and chat, until the master starts the game. */
import { computed, onBeforeUnmount, ref, shallowRef, triggerRef } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { BasePlayer } from '../../shared/model/BasePlayer.js';
import { gamepadListener } from '../gamepadListener.js';
import { useServices } from '../services';
import { useEvents } from '../composables/useEmitter';
import { pluralizePlayers } from '../utils';
import ChatPanel from '../components/ChatPanel.vue';
import ColorPicker from '../components/ColorPicker.vue';
import RoomParameters from '../components/RoomParameters.vue';
import type { Callback, Player, Room } from '../types';

const { client, profile, profilePanel, roomRepository: repository, chat, notifier } = useServices();
const route = useRoute();
const router = useRouter();

const { maxLength: nameMaxLength, colorMaxLength } = BasePlayer.prototype as unknown as {
    maxLength: number;
    colorMaxLength: number;
};

const name = String(route.params.name);
const password = typeof route.query.password === 'string' ? route.query.password : null;
const hasTouch = typeof window.ontouchstart !== 'undefined';

/** The joined room (a plain model: re-rendered with `bump`) */
const room = shallowRef<Room | null>(null);
const bump = () => triggerRef(room);

const master = ref(repository.amIMaster());
const displayParameters = ref(false);
/** Seconds before the game starts, `false` when no launch is planned */
const launching = ref<number | false>(false);
const username = ref('');

let useTouch = false;
let controlSynchro = false;
let launchInterval: ReturnType<typeof setInterval> | null = null;
let destination = '';

const localPlayers = computed(() => (room.value?.players.items ?? []).filter((player) => player.local));
const remotePlayers = computed(() => (room.value?.players.items ?? []).filter((player) => !player.local));
const playersCount = computed(() => (room.value ? pluralizePlayers(room.value.players.items.length) : ''));

// Room:

function joinRoom(): void {
    profile.off('close', joinRoom);
    repository.join(name, password, onJoined);
}

function onJoined(result: { success: boolean; room?: Room; name?: string; error?: string }): void {
    if (result.success && result.room) {
        room.value = result.room;

        attachEvents();
        addProfileUser();
        bump();
    } else {
        console.error('Could not join room %s: %s', result.name, result.error);
        goHome();
    }
}

function goHome(): void {
    router.push('/');
}

function leaveRoom(): void {
    if (room.value) {
        if (destination !== room.value.getGameUrl()) {
            repository.leave();
        }

        detachEvents();
    }

    profile.off('close', joinRoom);
    profile.off('change', updateProfile);
    clearLaunchInterval();
}

onBeforeRouteLeave((to) => {
    destination = to.path;
});

// Events:

const roomEvents = ['player:leave', 'player:ready', 'player:color', 'player:name', 'client:activity'];

useEvents(repository, roomEvents, () => bump());
useEvents(repository, ['room:close'], goHome);
useEvents(repository, ['player:join'], onJoin);
useEvents(repository, ['room:master'], onRoomMaster);
useEvents(repository, ['room:game:start'], start);
useEvents(repository, ['room:config:open'], onConfigOpen);
useEvents(repository, ['room:launch:start'], onLaunchStart);
useEvents(repository, ['room:launch:cancel'], onLaunchCancel);

function attachEvents(): void {
    room.value?.players.items.forEach((player) => player.on('control:change', onControlChange));
}

function detachEvents(): void {
    room.value?.players.items.forEach((player) => player.off('control:change', onControlChange));
}

onBeforeUnmount(leaveRoom);

// Players:

function addPlayer(playerName: string | null = username.value, color: string | null = null): void {
    if (!playerName) {
        return;
    }

    repository.addPlayer(playerName, color, (result: { success: boolean; error?: string }) => {
        if (result.success) {
            username.value = '';
        } else {
            console.error('Could not add player %s: %s', playerName, result.error ?? 'Unknown error');
        }
    });
}

function removePlayer(player: Player): void {
    if (player.local) {
        repository.removePlayer(player, (result: { success: boolean }) => {
            if (!result.success) {
                console.error('Could not remove player %s', player.name);
            }
        });
    }
}

function kickPlayer(player: Player): void {
    repository.kickPlayer(player, (result: { success: boolean }) => {
        if (!result.success) {
            console.error('Could not kick player %s', player.name);
        }

        bump();
    });
}

function setColor(player: Player): void {
    if (player.local) {
        repository.setColor(player, player.color, () => {
            if (player.profile) {
                profile.setColor(player.color);
            }

            bump();
        });
    }
}

function setName(player: Player): void {
    if (player.local) {
        repository.setName(player.id, player.name, (result: { success: boolean; error?: string; name?: string }) => {
            if (!result.success) {
                console.error('Could not rename player: %s', result.error ?? 'Unknown error');

                if (result.name) {
                    player.name = result.name;
                }
            }

            if (player.profile) {
                profile.setName(player.name);
            }

            bump();
        });
    }
}

function setReady(player: Player): void {
    if (player.local) {
        repository.setReady(player.id, (result: { success: boolean }) => {
            if (!result.success) {
                console.error('Could not set player %s ready', player.name);
            }
        });
    }
}

function setTouch(): void {
    if (hasTouch && room.value) {
        useTouch = true;
        room.value.getLocalPlayers().items.forEach((player) => player.setTouch());
    }
}

function onJoin(event: { detail: { player: Player } }): void {
    const player = event.detail.player;

    if (player.client.id === client.id) {
        player.on('control:change', onControlChange);
        player.setLocal(true);
        player.profile = profile.name === player.name;

        updateCurrentMessage();

        if (player.profile) {
            setProfileControls(player);
        }

        if (useTouch) {
            player.setTouch();
        }
    } else {
        notifier.notify('New player joined!');
    }

    bump();
}

// Profile:

function addProfileUser(): void {
    if (room.value?.isNameAvailable(profile.name as string)) {
        profile.on('change', updateProfile);
        addPlayer(profile.name, profile.color);
    }
}

function getProfilePlayer(): Player | null {
    return room.value?.players.match(function (this: Player) { return this.profile; }) ?? null;
}

function updateProfile(): void {
    const player = getProfilePlayer();

    if (player) {
        if (profile.name !== player.name) {
            player.setName(profile.name as string);
            setName(player);
        }

        if (profile.color !== player.color) {
            player.setColor(profile.color as string);
            setColor(player);
        }

        setProfileControls(player);
    }
}

function updateCurrentMessage(): void {
    const profilePlayer = getProfilePlayer();
    const local = room.value?.players.match(function (this: Player) { return this.local; }) ?? null;

    chat.setPlayer(profilePlayer ?? local);
}

function onControlChange(): void {
    const player = getProfilePlayer();

    if (player && !controlSynchro) {
        controlSynchro = true;
        profile.setControls(player.getMapping());
        controlSynchro = false;
    }

    bump();
}

function setProfileControls(player: Player): void {
    if (!controlSynchro) {
        controlSynchro = true;

        profile.controls.forEach((control, index) => player.controls?.[index].loadMapping(control.getMapping()));

        controlSynchro = false;
        bump();
    }
}

// Room settings:

function toggleParameters(): void {
    displayParameters.value = !displayParameters.value;
}

function onRoomMaster(): void {
    master.value = repository.amIMaster();
    bump();
}

function setPasswordQuery(value: string | null): void {
    const query = { ...route.query };

    if (value) {
        query.password = value;
    } else {
        delete query.password;
    }

    router.replace({ query });
}

function onConfigOpen(): void {
    setPasswordQuery(room.value?.config.password ?? null);
}

// Game:

function launch(): void {
    if (repository.amIMaster()) {
        repository.launch();
    }
}

function start(): void {
    if (room.value) {
        const query = room.value.config.open && room.value.config.password ? { password: room.value.config.password } : {};

        router.push({ path: room.value.getGameUrl(), query });
    }
}

function onLaunchStart(): void {
    clearLaunchInterval();
    launchInterval = setInterval(() => {
        if (launching.value) {
            launching.value--;
        }
    }, 1000);
    launching.value = (repository.room as Room).launchTime / 1000;
}

function onLaunchCancel(): void {
    clearLaunchInterval();
    launching.value = false;
}

function clearLaunchInterval(): void {
    if (launchInterval) {
        clearInterval(launchInterval);
        launchInterval = null;
    }
}

// Start:

repository.start();
gamepadListener.start();

if (!profile.isComplete()) {
    profile.on('close', joinRoom);
    profilePanel.openProfile();
} else {
    joinRoom();
}

const onFail: Callback = () => undefined;
void onFail;
</script>

<template>
    <section>
        <div class="container room">
            <h2 class="header">
                {{ room?.name }}
                <i class="icon-params" :class="{ active: displayParameters }" @click="toggleParameters"></i>
            </h2>

            <div v-if="displayParameters && room" id="room-parameters">
                <RoomParameters :room="room" :master="master" />
            </div>

            <button v-if="master || launching" type="button" class="btn start-now" @click="launch">
                <span v-if="!launching" class="label">Start now!</span>
                <span v-else id="starter-count">{{ launching }}</span>
            </button>

            <form class="top-right-form" name="addPlayer" @submit.prevent="addPlayer()">
                <button id="submit" type="submit">
                    <span><i class="icon-plus"></i></span>
                </button>
                <input
                    id="add-user-name"
                    v-model="username"
                    type="text"
                    class="form-control"
                    name="username"
                    placeholder="Add a local player"
                    :maxlength="nameMaxLength"
                />
                <div class="clearfix"></div>
            </form>

            <h3>
                <p class="count">{{ playersCount }}</p>
            </h3>
            <div class="clearfix"></div>

            <div class="room-details">
                <div v-if="hasTouch" class="touch">
                    <h5>Are you playing on a smartphone?</h5>
                    <button class="btn btn-default" @click="setTouch">Activate the touch controls!</button>
                </div>
                <table class="room-players table v-align-middle">
                    <thead>
                        <tr>
                            <th class="col-remove"></th>
                            <th class="col-icon"></th>
                            <th class="col-player">Name</th>
                            <th class="col-color">Color</th>
                            <th class="col-keys">Controls</th>
                            <th class="col-ready">Ready?</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="room && room.players.isEmpty()">
                            <td colspan="5" class="empty">Waiting for players...</td>
                        </tr>
                        <tr v-for="player in localPlayers" :key="`local-${player.id}`" class="local">
                            <td class="col-remove col-show-hover">
                                <button
                                    type="button"
                                    class="btn btn-link btn-sm btn-remove pull-left"
                                    @click="removePlayer(player)"
                                >
                                    <span class="icon-close"></span>
                                </button>
                            </td>
                            <td class="col-icon">
                                <span v-if="player.isMaster()" class="icon icon-crown pull-left"></span>
                            </td>
                            <td class="col-player">
                                <input
                                    v-model="player.name"
                                    type="text"
                                    class="form-control player-name"
                                    name="name"
                                    :maxlength="nameMaxLength"
                                    @blur="setName(player)"
                                />
                            </td>
                            <td class="col-color">
                                <ColorPicker
                                    v-model="player.color"
                                    position="right"
                                    class="form-control player-color"
                                    name="color"
                                    placeholder="#CCCCCC"
                                    :style="{ borderColor: player.color }"
                                    :maxlength="colorMaxLength"
                                    @blur="setColor(player)"
                                />
                            </td>
                            <td class="col-keys">
                                <button
                                    v-for="(control, index) in player.controls"
                                    :key="index"
                                    class="btn btn-default control"
                                    :class="{ active: control.mapper.listening }"
                                    @click="control.toggle(); bump()"
                                >
                                    {{ control.mapper.view }}
                                </button>
                            </td>
                            <td class="col-ready">
                                <div class="player-ready local" :class="{ ready: player.ready }" @click="setReady(player)">
                                    <span>
                                        <span v-if="!player.ready">Ready?</span>
                                        <span v-else class="icon-check success"></span>
                                    </span>
                                </div>
                            </td>
                        </tr>
                        <tr v-for="player in remotePlayers" :key="`remote-${player.id}`">
                            <td class="col-remove col-show-hover" :class="player.vote ? 'active' : ''">
                                <button
                                    type="button"
                                    class="btn btn-link btn-sm btn-remove pull-left"
                                    @click="kickPlayer(player)"
                                >
                                    <span class="icon-kick" :class="player.kicked ? 'kicked' : ''"></span>
                                </button>
                            </td>
                            <td class="col-icon">
                                <span
                                    v-if="!player.client.active"
                                    class="icon inactive icon-clock pull-left"
                                ></span>
                                <span v-if="player.isMaster()" class="icon icon-crown pull-left"></span>
                            </td>
                            <td class="col-player">
                                <p class="player-name">{{ player.name }}</p>
                            </td>
                            <td class="col-color">
                                <span class="line-color-preview" :style="{ backgroundColor: player.color }"></span>
                                <p>{{ player.color }}</p>
                            </td>
                            <td class="col-keys"></td>
                            <td class="col-ready">
                                <div class="player-ready" :class="{ ready: player.ready }">
                                    <span>
                                        <i v-if="player.ready" class="icon-check success"></i>
                                        <i v-else class="icon-close success"></i>
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="room-chat">
                    <div class="chat-wrapper">
                        <ChatPanel :kick-player="kickPlayer" />
                    </div>
                </div>

                <div class="clearfix"></div>
            </div>
        </div>
    </section>
</template>
