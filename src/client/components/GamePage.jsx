import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from './SocketContext';
import Canvas from '../core/Canvas';
import Game from '../model/Game';
import Room from '../model/Room';
import Player from '../model/Player';
import Client from '../model/Client';

function GamePage() {
  const { roomName } = useParams();
  const socket = useSocket();
  const [game, setGame] = useState(null);
  
  const renderRef = useRef(null);
  const backgroundRef = useRef(null);
  const gameRef = useRef(null);
  const effectRef = useRef(null);
  const bonusRef = useRef(null);
  const infosRef = useRef(null);

  useEffect(() => {
    if (game && socket) {
      const onMove = ({ detail }) => {
        socket.emit('player:move', {
          avatar: detail.avatar.id,
          move: detail.move,
        });
      };

      const player = game.room.players.items.find(p => p.client.id === socket.id);
      if (player && player.avatar.input) {
        player.avatar.input.on('move', onMove);
      }

      return () => {
        if (player && player.avatar.input) {
          player.avatar.input.off('move', onMove);
        }
      };
    }
  }, [game, socket]);

  useEffect(() => {
    let room;
    let newGame;

    if (socket) {
      const onRoomSync = (roomData) => {
        if (!newGame) {
          room = new Room(roomData.name);
          const client = new Client(socket.id);
          
          roomData.players.forEach(playerData => {
            const player = new Player(playerData.id, client, playerData.name, playerData.color, playerData.ready);
            room.addPlayer(player);
          });

          newGame = new Game(room);
          setGame(newGame);
        }
        
        room.config.setData(roomData.config);
        
        // Sync players
        const serverPlayerIds = roomData.players.map(p => p.id);
        room.players.items.forEach(player => {
          if (!serverPlayerIds.includes(player.id)) {
            room.removePlayer(player);
          }
        });
        roomData.players.forEach(playerData => {
          let player = room.players.getById(playerData.id);
          if (!player) {
            const client = new Client(playerData.client);
            player = new Player(playerData.id, client, playerData.name, playerData.color, playerData.ready);
            room.addPlayer(player);
          } else {
            player.name = playerData.name;
            player.color = playerData.color;
            player.ready = playerData.ready;
          }
        });
      };

      const onGameStart = () => {
        if (newGame) newGame.start();
      };

      const onGameEnd = () => {
        if (newGame) newGame.stop();
      };

      const onAvatarDie = ({ avatar: avatarId }) => {
        const avatar = newGame.avatars.getById(avatarId);
        if (avatar) avatar.die();
      };

      const onBonusPop = ({ bonus: bonusData }) => {
        newGame.bonusManager.add(bonusData.id, bonusData.x, bonusData.y, bonusData.type);
      };

      const onBonusClear = ({ bonus: bonusId }) => {
        const bonus = newGame.bonusManager.bonuses.getById(bonusId);
        if (bonus) newGame.bonusManager.remove(bonus);
      };

      socket.on('room:sync', onRoomSync);
      socket.on('game:start', onGameStart);
      socket.on('game:end', onGameEnd);
      socket.on('avatar:die', onAvatarDie);
      socket.on('bonus:pop', onBonusPop);
      socket.on('bonus:clear', onBonusClear);

      socket.emit('room:join', roomName);

      return () => {
        if (newGame) {
          newGame.end();
        }
        socket.emit('room:leave', roomName);
        socket.off('room:sync', onRoomSync);
        socket.off('game:start', onGameStart);
        socket.off('game:end', onGameEnd);
        socket.off('avatar:die', onAvatarDie);
        socket.off('bonus:pop', onBonusPop);
        socket.off('bonus:clear', onBonusClear);
      };
    }
  }, [roomName, socket]);

  useEffect(() => {
    if (game) {
      game.loadDOM({
        render: renderRef.current,
        infos: infosRef.current,
        game: gameRef.current,
        background: backgroundRef.current,
        effect: effectRef.current,
        bonus: bonusRef.current,
      });
    }
  }, [game]);

  return (
    <div id="render" ref={renderRef}>
      <h2>Spiel in Raum: {roomName}</h2>
      <div style={{ position: 'relative', width: '800px', height: '600px' }}>
        <canvas id="background" ref={backgroundRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} width="800" height="600"></canvas>
        <canvas id="game" ref={gameRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }} width="800" height="600"></canvas>
        <canvas id="effect" ref={effectRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 3 }} width="800" height="600"></canvas>
        <canvas id="bonus" ref={bonusRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 4 }} width="800" height="600"></canvas>
      </div>
      <div id="game-infos" ref={infosRef}>
        <h3>Players</h3>
        <ul>
          {game && game.room.players.items.map(player => (
            <li key={player.id} style={{ color: player.color }}>
              {player.name}: {player.score}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default GamePage;
