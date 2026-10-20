/**
 * Stress test: creates a room, adds players to it and starts the game.
 * Drives the page like a user would (see doc/dev.md).
 */
(function () {
    'use strict';

    const nbPlayers = 50;

    function type(input, value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.form.requestSubmit();
    }

    function createRoom() {
        const input = document.querySelector('.top-right-form input[name=name]');

        // Ensure we are on the room list
        if (input) {
            type(input, 'Stress test ' + Date.now());
        }
    }

    function createPlayers() {
        const input = document.getElementById('add-user-name');

        // Ensure we are in a room
        if (!input) {
            return;
        }

        const total = document.querySelectorAll('.room-players tr.local').length;

        if (total < nbPlayers) {
            type(input, 'Slug #' + total);
            setTimeout(createPlayers, 50);
        } else {
            launch();
        }
    }

    function launch() {
        const button = document.querySelector('.start-now');

        if (button) {
            button.click();
        }
    }

    createRoom();
    setTimeout(createPlayers, 500);
})();
