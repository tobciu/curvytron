import AbstractController from './AbstractController.js';

/**
 * Room Controller
 */
class RoomController extends AbstractController {
    constructor($scope, $routeParams, $location, client, repository, profile, chat, notifier) {
        super($scope);

        document.body.classList.remove('game-mode');

        const search = $location.search();

        this.$location = $location;
        this.$routeParams = $routeParams;
        this.client = client;
        this.profile = profile;
        this.chat = chat;
        this.notifier = notifier;
        this.hasTouch = typeof(window.ontouchstart) !== 'undefined';
        this.name = decodeURIComponent($routeParams.name);
        this.password = typeof(search.password) !== 'undefined' ? search.password : null;
        this.repository = repository;
        this.controlSynchro = false;
        this.useTouch = false;
        this.launchInterval = null;

        // Binding:
        this.addPlayer = this.addPlayer.bind(this);
        this.addProfileUser = this.addProfileUser.bind(this);
        this.removePlayer = this.removePlayer.bind(this);
        this.kickPlayer = this.kickPlayer.bind(this);
        this.onJoin = this.onJoin.bind(this);
        this.onJoined = this.onJoined.bind(this);
        this.onControlChange = this.onControlChange.bind(this);
        this.joinRoom = this.joinRoom.bind(this);
        this.leaveRoom = this.leaveRoom.bind(this);
        this.setColor = this.setColor.bind(this);
        this.setReady = this.setReady.bind(this);
        this.setName = this.setName.bind(this);
        this.setTouch = this.setTouch.bind(this);
        this.updateProfile = this.updateProfile.bind(this);
        this.toggleParameters = this.toggleParameters.bind(this);
        this.onRoomMaster = this.onRoomMaster.bind(this);
        this.onConfigOpen = this.onConfigOpen.bind(this);
        this.onLaunchStart = this.onLaunchStart.bind(this);
        this.onLaunchTimer = this.onLaunchTimer.bind(this);
        this.onLaunchCancel = this.onLaunchCancel.bind(this);
        this.launch = this.launch.bind(this);
        this.start = this.start.bind(this);

        this.$scope.$on('$destroy', this.leaveRoom);

        // Hydrating scope:
        this.$scope.launch = this.launch;
        this.$scope.submitAddPlayer = this.addPlayer;
        this.$scope.removePlayer = this.removePlayer;
        this.$scope.kickPlayer = this.kickPlayer;
        this.$scope.setColor = this.setColor;
        this.$scope.setReady = this.setReady;
        this.$scope.setName = this.setName;
        this.$scope.setTouch = this.setTouch;
        this.$scope.toggleParameters = this.toggleParameters;
        this.$scope.nameMaxLength = Player.prototype.maxLength;
        this.$scope.colorMaxLength = Player.prototype.colorMaxLength;
        this.$scope.hasTouch = this.hasTouch;
        this.$scope.master = this.repository.amIMaster();
        this.$scope.displayParameters = false;
        this.$scope.$parent.profile = true;
        this.$scope.launching = false;

        this.repository.start();
        gamepadListener.start();

        if (!this.profile.isComplete()) {
            this.profile.on('close', this.joinRoom);
            if (this.profile.controller.loaded) {
                this.profile.controller.openProfile();
            } else {
                this.profile.controller.on('loaded', this.profile.controller.openProfile);
            }
        } else {
            this.joinRoom();
        }
    }

    /**
     * Join room and load scope
     */
    joinRoom() {
        if (!this.client.connected) {
            return this.client.on('connected', this.joinRoom);
        }

        this.profile.off('close', this.joinRoom);
        this.repository.join(this.name, this.password, this.onJoined);
    }

    /**
     * On room joined
     *
     * @param {Object} result
     */
    onJoined(result) {
        if (result.success) {
            this.room = result.room;
            this.$scope.room = this.room;

            this.attachEvents();
            this.addProfileUser();
            this.requestDigestScope();
        } else {
            console.error('Could not join room %s: %s', result.name, result.error);
            this.goHome();
            this.applyScope();
        }
    }

    /**
     * Leave room
     */
    leaveRoom() {
        const path = this.$location.path();

        if (this.room) {
            if (path !== this.room.getGameUrl()) {
                this.repository.leave();
            }

            this.detachEvents();
        }
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.repository.on('room:close', this.goHome);
        this.repository.on('player:join', this.onJoin);
        this.repository.on('player:leave', this.requestDigestScope);
        this.repository.on('player:ready', this.requestDigestScope);
        this.repository.on('player:color', this.requestDigestScope);
        this.repository.on('player:name', this.requestDigestScope);
        this.repository.on('client:activity', this.requestDigestScope);
        this.repository.on('room:master', this.onRoomMaster);
        this.repository.on('room:game:start', this.start);
        this.repository.on('room:config:open', this.onConfigOpen);
        this.repository.on('room:launch:start', this.onLaunchStart);
        this.repository.on('room:launch:cancel', this.onLaunchCancel);

        for (let i = this.room.players.items.length - 1; i >= 0; i--) {
            this.room.players.items[i].on('control:change', this.onControlChange);
        }
    }

    /**
     * Detach events
     */
    detachEvents() {
        this.repository.off('room:close', this.goHome);
        this.repository.off('player:join', this.onJoin);
        this.repository.off('player:leave', this.requestDigestScope);
        this.repository.off('player:ready', this.requestDigestScope);
        this.repository.off('player:color', this.requestDigestScope);
        this.repository.off('player:name', this.requestDigestScope);
        this.repository.off('client:activity', this.requestDigestScope);
        this.repository.off('room:master', this.onRoomMaster);
        this.repository.off('room:game:start', this.start);
        this.repository.off('room:config:open', this.onConfigOpen);
        this.repository.off('room:launch:start', this.onLaunchStart);
        this.repository.off('room:launch:cancel', this.onLaunchCancel);

        if (this.room) {
            for (let i = this.room.players.items.length - 1; i >= 0; i--) {
                this.room.players.items[i].off('control:change', this.onControlChange);
            }
        }
    }

    /**
     * Go back to the homepage
     */
    goHome() {
        this.$location.path('/');
    }

    /**
     * Launch game
     */
    launch() {
        if (this.repository.amIMaster()) {
            this.repository.launch();
        }
    }

    /**
     * Add player
     */
    addPlayer(name, color) {
        const $scope = this.$scope;

        name = typeof(name) !== 'undefined' ? name : $scope.username;
        color = typeof(color) !== 'undefined' ? color : null;

        if (name) {
            this.repository.addPlayer(
                name,
                color,
                function (result) {
                    if (result.success) {
                        $scope.username = null;
                        $scope.$apply();
                    } else {
                        const error = typeof(result.error) !== 'undefined' ? result.error : 'Unknown error';
                        console.error('Could not add player %s: %s', name, error);
                    }
                }
            );
        }
    }

    /**
     * Remove player
     */
    removePlayer(player) {
        if (!player.local) { return; }

        this.repository.removePlayer(
            player,
            function (result) {
                if (!result.success) {
                    console.error('Could not remove player %s', player.name);
                }
            }
        );
    }

    /**
     * Kick player
     */
    kickPlayer(player) {
        const repository = this;

        this.repository.kickPlayer(player, function (result) {
            if (!result.success) {
                console.error('Could not kick player %s', player.name);
            }
            repository.digestScope();
        });
    }

    /**
     * Go room config open
     */
    onConfigOpen(e) {
        this.$location.search('password', this.room.config.password);
        this.applyScope();
    }

    /**
     * On join
     *
     * @param {Event} e
     */
    onJoin(e) {
        const player = e.detail.player;

        if (player.client.id === this.client.id) {
            player.on('control:change', this.onControlChange);
            player.setLocal(true);

            player.profile = this.profile.name === player.name;

            this.updateCurrentMessage();

            if (player.profile) {
                this.setProfileControls(player);
            }

            if (this.useTouch) {
                player.setTouch();
            }
        } else {
            this.notifier.notify('New player joined!');
        }

        this.requestDigestScope();
    }

    /**
     * Set player color
     *
     * @return {Array}
     */
    setColor(player) {
        if (!player.local) { return; }

        const controller = this;

        this.repository.setColor(
            player,
            player.color,
            function (result) {
                if (player.profile) {
                    controller.profile.setColor(player.color);
                }
                controller.digestScope();
            }
        );
    }

    /**
     * Set player name
     *
     * @return {Array}
     */
    setName(player) {
        if (!player.local) { return; }

        const controller = this;

        this.repository.setName(
            player.id,
            player.name,
            function (result) {
                if (!result.success) {
                    const error = typeof(result.error) !== 'undefined' ? result.error : 'Unknown error';
                    const name = typeof(result.name) !== 'undefined' ? result.name : null;

                    console.error('Could not rename player: %s', error);

                    if (name) {
                        player.name = name;
                    }
                }

                if (player.profile) {
                    controller.profile.setName(player.name);
                }

                controller.digestScope();
            }
        );
    }

    /**
     * Set player ready
     *
     * @return {Array}
     */
    setReady(player) {
        if (!player.local) { return; }

        this.repository.setReady(
            player.id,
            function (result) {
                if (!result.success) {
                    console.error('Could not set player %s ready', player.name);
                }
            }
        );
    }

    /**
     * Set touch for local players
     */
    setTouch() {
        if (!this.hasTouch) { return; }

        this.useTouch = true;

        const players = this.room.getLocalPlayers();

        for (let i = players.items.length - 1; i >= 0; i--) {
            players.items[i].setTouch();
        }
    }

    /**
     * Start Game
     *
     * @param {Event} e
     */
    start(e) {
        this.$location.path(this.room.getGameUrl());

        if (this.room.config.open) {
            this.$location.search('password', this.room.config.password);
        }

        this.applyScope();
    }

    /**
     * Add profile user
     */
    addProfileUser() {
        if (this.room.isNameAvailable(this.profile.name)) {
            this.profile.on('change', this.updateProfile);
            this.addPlayer(this.profile.name, this.profile.color);
        }
    }

    /**
     * Update profile
     */
    updateProfile() {
        const player = this.room.players.match(function () { return this.profile; });

        if (player) {
            this.setProfileName(player);
            this.setProfileColor(player);
            this.setProfileControls(player);
        }
    }

    /**
     * Update current message
     */
    updateCurrentMessage() {
        const profile = this.room.players.match(function () { return this.profile; });
        const player = this.room.players.match(function () { return this.local; });

        this.chat.setPlayer(profile ? profile : player);
    }

    /**
     * Triggered when a local player changes its controls
     *
     * @param {Event} e
     */
    onControlChange(e) {
        this.saveProfileControls();
        this.digestScope();
    }

    /**
     * Save controls
     */
    saveProfileControls() {
        const player = this.room.players.match(function () { return this.profile; });

        if (player && !this.controlSynchro) {
            this.controlSynchro = true;
            this.profile.setControls(player.getMapping());
            this.controlSynchro = false;
        }
    }

    /**
     * Set profile controls
     */
    setProfileControls(player) {
        if (!this.controlSynchro) {
            this.controlSynchro = true;

            for (let i = this.profile.controls.length - 1; i >= 0; i--) {
                player.controls[i].loadMapping(this.profile.controls[i].getMapping());
            }

            this.controlSynchro = false;
            this.digestScope();
        }
    }

    /**
     * Set profile name
     */
    setProfileName(player) {
        if (this.profile.name !== player.name) {
            player.setName(this.profile.name);
            this.setName(player);
        }
    }

    /**
     * Set profile color
     */
    setProfileColor(player) {
        if (this.profile.color !== player.color) {
            player.setColor(this.profile.color);
            this.setColor(player);
        }
    }

    /**
     * Toggle parameters
     */
    onRoomMaster(e) {
        this.$scope.master = this.repository.amIMaster();
        this.digestScope();
    }

    /**
     * On launch start
     *
     * @param {Event} e
     */
    onLaunchStart(e) {
        this.clearLaunchInterval();
        this.launchInterval = setInterval(this.onLaunchTimer, 1000);
        this.$scope.launching = this.repository.room.launchTime / 1000;
        this.digestScope();
    }

    /**
     * On launch cancel
     *
     * @param {Event} e
     */
    onLaunchCancel(e) {
        this.clearLaunchInterval();
        this.$scope.launching = false;
        this.digestScope();
    }

    /**
     * On launch timer
     *
     * @param {Event} e
     */
    onLaunchTimer(e) {
        if (this.$scope.launching) {
            this.$scope.launching--;
            this.digestScope();
        }
    }

    /**
     * Clear launch interval
     */
    clearLaunchInterval() {
        if (this.launchInterval) {
            this.launchInterval = clearInterval(this.launchInterval);
        }
    }

    /**
     * Toggle parameters
     */
    toggleParameters() {
        this.$scope.displayParameters = !this.$scope.displayParameters;
    }
}

export default RoomController;
