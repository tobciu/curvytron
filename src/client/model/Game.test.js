import { describe, it, expect, beforeEach } from 'vitest';
import Game from './Game.js';
import Room from './Room.js';
import Player from './Player.js';
import Client from './Client.js';

describe('Game', () => {
  let game;
  let room;
  let player;

  beforeEach(() => {
    room = new Room('test');
    const client = new Client('test-client');
    player = new Player('test-player', client, 'Player 1', '#ff0000', true);
    room.addPlayer(player);
    game = new Game(room);
  });

  it('should create a game with avatars', () => {
    expect(game.avatars.items.length).toBe(1);
  });

  it('should handle self collision', () => {
    const avatar = game.avatars.items[0];
    avatar.trail.points = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ];
    avatar.trail.lastX = 0;
    avatar.trail.lastY = 0;
    avatar.trail.minLength = 3;
    expect(avatar.trail.isSelfCollision()).toBe(true);
  });
});
