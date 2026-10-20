<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Room } from '../model/Room.js';
import { RoomsRepository } from '../repository/RoomsRepository.js';
import { asset } from '../assets';
import { useServices } from '../services';
import { useEmitterVersion } from '../composables/useEmitter';
import { pluralizePlayers } from '../utils';
import type { RoomListItem, RoomsRepository as Repository } from '../types';

const { client } = useServices();
const route = useRoute();
const router = useRouter();

const repository = new RoomsRepository(client) as unknown as Repository;
const { version, bump } = useEmitterVersion(repository, [
    'room:open',
    'room:close',
    'room:players',
    'room:game',
    'room:config:open'
]);

const roomName = ref('');
const roomMaxLength = (Room.prototype as unknown as { maxLength: number }).maxLength;

const rooms = computed(() => (version.value >= 0 ? repository.rooms.items.slice() : []));
const waiting = computed(() => rooms.value.filter((room) => !room.game));
const playing = computed(() => rooms.value.filter((room) => room.game));

const title = computed(() => {
    const count = rooms.value.length;

    if (count === 0) {
        return 'Start by creating a room:';
    }

    return count === 1 ? 'You can join 1 room!' : `You can join ${count} rooms!`;
});

if (route.query.password !== undefined) {
    const { password: _password, ...query } = route.query;

    router.replace({ query });
}

repository.start();
onBeforeUnmount(() => repository.stop());

function join(room: RoomListItem): void {
    if (room.open) {
        router.push(room.getUrl());
    } else if (room.password && /[0-9]{4}/.test(room.password)) {
        router.push({ path: room.getUrl(), query: { password: room.password } });
    }
}

function createRoom(): void {
    repository.create(roomName.value, (result: { success: boolean; room: unknown }) => {
        if (result.success) {
            join(repository.createRoom(result.room));
            bump();
        } else {
            console.error('Could not create room %s', roomName.value);
        }
    });
}
</script>

<template>
    <section>
        <div id="intro" class="container intro">
            <blockquote class="quote">
                <p>A multiplayer tron-like game... with curves!</p>
            </blockquote>

            <div class="tuto">
                <img :src="asset('images/tuto/turn.gif')" class="circle" alt="Turning" width="150" height="150" />
                <p class="content">You're always moving. But you can choose to go left or right.</p>
            </div>

            <div class="tuto">
                <img :src="asset('images/tuto/death.gif')" class="circle" alt="Turning" width="150" height="150" />
                <p class="content">If you hit another player's line or your own: you're dead!</p>
            </div>

            <div class="tuto">
                <img :src="asset('images/tuto/bonus.gif')" class="circle" alt="Turning" width="150" height="150" />
                <p class="content">There are bonuses on the map that can help you.</p>
            </div>

            <div class="clearfix"></div>
        </div>

        <div class="container room-list">
            <h2 class="header" :class="{ empty: rooms.length === 0 }">
                <span class="title">{{ title }}</span>
                <form class="top-right-form" @submit.prevent="createRoom">
                    <button id="submit" type="submit">
                        <span><i class="icon-plus"></i></span>
                    </button>
                    <input
                        v-model="roomName"
                        type="text"
                        class="form-control clearfix"
                        name="name"
                        placeholder="Create a new room..."
                        :maxlength="roomMaxLength"
                    />
                </form>
            </h2>

            <table v-if="rooms.length" id="rooms" class="rooms table table-hover v-align-middle">
                <tbody>
                    <template v-for="inGame in [false, true]" :key="String(inGame)">
                        <tr
                            v-for="room in inGame ? playing : waiting"
                            :key="room.name"
                            class="room"
                            :class="{ 'in-game': inGame, private: !room.open }"
                            @click="join(room)"
                        >
                            <td class="room-name">{{ room.name }}</td>
                            <td class="room-nb-players">{{ pluralizePlayers(room.players) }}</td>
                            <td class="room-enter-col">
                                <i v-if="!room.open" class="icon-lock"></i>
                                <form v-if="!room.open" class="room-password-col" @submit.prevent="join(room)">
                                    <input
                                        v-model="room.password"
                                        type="text"
                                        class="form-control password"
                                        maxlength="4"
                                        placeholder="••••"
                                    />
                                </form>
                                <div class="room-enter-container">
                                    <p class="room-enter">
                                        <span v-if="inGame"><i class="icon-spectate"></i> Spectate</span>
                                        <span v-else><i class="icon-game"></i> Join</span>
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </section>
</template>
