import angular from 'angular';
import 'angular-route';
import 'angular-cookies';
import 'angular-bootstrap-colorpicker';
import './styles/style.scss';

import { SocketClient } from './core/SocketClient.js';
import { Profile } from './service/Profile.js';
import { SoundManager } from './service/SoundManager.js';
import { ActivityWatcher } from './service/ActivityWatcher.js';
import { RoomRepository } from './repository/RoomRepository.js';
import { GameRepository } from './repository/GameRepository.js';
import { Chat } from './service/Chat.js';
import { Radio } from './service/Radio.js';
import { Notifier } from './service/Notifier.js';

import { CurvytronController } from './controller/CurvytronController.js';
import { RoomsController } from './controller/RoomsController.js';
import { RoomController } from './controller/RoomController.js';
import { RoomConfigController } from './controller/room/RoomConfigController.js';
import { GameController } from './controller/GameController.js';
import { ChatController } from './controller/ChatController.js';
import { PlayerListController } from './controller/game/PlayerListController.js';
import { RoundController } from './controller/game/RoundController.js';
import { MetricController } from './controller/game/MetricController.js';
import { WaitingController } from './controller/game/WaitingController.js';
import { KillLogController } from './controller/game/KillLogController.js';
import { ProfileController } from './controller/ProfileController.js';

// Angular templates, whitespace-collapsed by the `curvytron-templates` Vite plugin (see vite.config.js).
const templates = import.meta.glob('./views/*/*.html', { query: '?template', import: 'default', eager: true });

const curvytronApp = angular.module('curvytronApp', ['ngRoute', 'ngCookies', 'colorpicker.module']);

curvytronApp.run([
    '$templateCache',
    ($templateCache) => {
        for (const [file, html] of Object.entries(templates)) {
            $templateCache.put(file.replace('./', ''), html);
        }
    }
]);

curvytronApp.service('SocketClient', SocketClient);
curvytronApp.service('Profile', ['$rootScope', Profile]);
curvytronApp.service('SoundManager', ['Profile', SoundManager]);
curvytronApp.service('ActivityWatcher', ['SocketClient', ActivityWatcher]);
curvytronApp.service('RoomRepository', ['SocketClient', RoomRepository]);
curvytronApp.service('GameRepository', ['SocketClient', 'RoomRepository', 'SoundManager', GameRepository]);
curvytronApp.service('Chat', ['SocketClient', 'RoomRepository', Chat]);
curvytronApp.service('Radio', ['Profile', Radio]);
curvytronApp.service('Notifier', ['SoundManager', 'ActivityWatcher', Notifier]);

curvytronApp.controller('CurvytronController', [
    '$scope',
    '$window',
    '$location',
    'Profile',
    'ActivityWatcher',
    'SocketClient',
    CurvytronController
]);
curvytronApp.controller('RoomsController', ['$scope', '$location', 'SocketClient', RoomsController]);
curvytronApp.controller('RoomController', [
    '$scope',
    '$routeParams',
    '$location',
    'SocketClient',
    'RoomRepository',
    'Profile',
    'Chat',
    'Notifier',
    RoomController
]);
curvytronApp.controller('RoomConfigController', ['$scope', 'RoomRepository', RoomConfigController]);
curvytronApp.controller('GameController', [
    '$scope',
    '$routeParams',
    '$location',
    'SocketClient',
    'GameRepository',
    'Chat',
    'Radio',
    'SoundManager',
    GameController
]);
curvytronApp.controller('ChatController', ['$scope', 'Chat', ChatController]);
curvytronApp.controller('PlayerListController', ['$scope', '$element', 'SocketClient', PlayerListController]);
curvytronApp.controller('RoundController', ['$scope', 'GameRepository', 'Notifier', RoundController]);
curvytronApp.controller('MetricController', ['$scope', 'SocketClient', MetricController]);
curvytronApp.controller('WaitingController', ['$scope', 'SocketClient', WaitingController]);
curvytronApp.controller('KillLogController', ['$scope', 'SocketClient', KillLogController]);
curvytronApp.controller('ProfileController', ['$scope', 'Profile', 'Radio', 'SoundManager', ProfileController]);

curvytronApp.config([
    '$routeProvider',
    '$locationProvider',
    ($routeProvider, $locationProvider) => {
        // Keep the historic "#/path" urls (AngularJS >= 1.6 defaults to "#!/path")
        $locationProvider.hashPrefix('');

        $routeProvider
            .when('/', {
                templateUrl: 'views/rooms/list.html',
                controller: 'RoomsController'
            })
            .when('/about', {
                templateUrl: 'views/pages/about.html'
            })
            .when('/room/:name', {
                templateUrl: 'views/rooms/detail.html',
                controller: 'RoomController',
                reloadOnSearch: false
            })
            .when('/game/:name', {
                templateUrl: 'views/game/play.html',
                controller: 'GameController'
            })
            .otherwise({
                redirectTo: '/'
            });
    }
]);
