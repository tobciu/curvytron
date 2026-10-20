import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { createServices, installServices } from './services';
import './styles/style.scss';

const app = createApp(App);

installServices(app, createServices());
app.use(router);
app.mount('#app');
