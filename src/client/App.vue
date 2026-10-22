<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useServices } from './services';
import { useEvents } from './composables/useEmitter';
import { asset } from './assets';
import ProfilePanel from './components/ProfilePanel.vue';

const { client } = useServices();
const route = useRoute();

const status = ref<'connecting' | 'online' | 'disconnected'>(client.connected ? 'online' : 'connecting');
/** The profile is available once the first connection succeeded, except while playing. */
const connected = ref(client.connected);

useEvents(client, ['connected'], () => {
    status.value = 'online';
    connected.value = true;
});
useEvents(client, ['disconnected'], () => {
    status.value = 'disconnected';
});
// Back after a lost connection: start again from what the server knows (the room and the game are waiting)
useEvents(client, ['reconnected'], () => {
    globalThis.location.reload();
});

const inGame = computed(() => route.name === 'game');
const showProfile = computed(() => connected.value && !inGame.value);

watchEffect(() => document.body.classList.toggle('game-mode', inGame.value && status.value !== 'disconnected'));

function reload(): void {
    globalThis.location.href = '/';
}
</script>

<template>
    <header>
        <RouterLink to="/" class="logo animated">
            <img id="logo" :src="asset('images/logo.svg')" alt="Curvytron" />
            <span class="brand">curvytron</span>
        </RouterLink>
    </header>

    <ProfilePanel v-if="showProfile" />

    <div v-if="status === 'connecting'" id="connecting" class="container text-center">
        <h3>Connecting...</h3>
    </div>

    <div v-if="status === 'online'" id="main">
        <RouterView :key="route.path" />
    </div>

    <div v-if="status === 'disconnected'" id="error" class="container text-center">
        <section class="centered">
            <h3>{{ client.wasConnected ? 'Connection lost' : 'Something went wrong :(' }}</h3>
            <p v-if="client.wasConnected">Reconnecting... your place in the game is kept.</p>
            <p v-else>You are not connected to the server.</p>
            <button class="btn btn-default" @click="reload">Try again now!</button>
        </section>
    </div>

    <footer>
        <div class="container">
            <div class="row">
                <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6 no-padding-bottom">
                    <a
                        href="https://github.com/tobciu/curvytron"
                        target="_blank"
                        rel="noopener"
                        class="ml10 animated"
                        title="Source code on GitHub"
                        ><i class="icon-github"></i
                    ></a>
                    <RouterLink to="/rules" class="ml15 animated">Rules</RouterLink>
                    <RouterLink to="/stats" class="ml15 animated">Stats</RouterLink>
                    <RouterLink to="/about" class="ml15 animated">About Us</RouterLink>
                </div>
                <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6 no-padding-bottom text-right">
                    <span class="game-copy">
                        A fork of
                        <a href="https://github.com/Elao/curvytron" target="_blank" rel="noopener" class="animated"
                            >Curvytron</a
                        >
                    </span>
                </div>
            </div>
        </div>
    </footer>
</template>
