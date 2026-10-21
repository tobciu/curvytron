import { createRouter, createWebHashHistory } from 'vue-router';
import RoomsView from './views/RoomsView.vue';
import AboutView from './views/AboutView.vue';
import RoomView from './views/RoomView.vue';
import GameView from './views/GameView.vue';

/** Urls keep the historic form `#/room/name?password=1234`. */
export const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', name: 'rooms', component: RoomsView },
        { path: '/about', name: 'about', component: AboutView },
        { path: '/room/:name', name: 'room', component: RoomView },
        { path: '/game/:name', name: 'game', component: GameView },
        { path: '/:pathMatch(.*)*', redirect: '/' }
    ]
});
