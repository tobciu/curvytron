import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from './SocketContext';

function RoomPage() {
  const { roomName } = useParams();
  const socket = useSocket();
  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (socket) {
      const onSync = (data) => setRoom(data);

      socket.emit('room:join', roomName);
      socket.on('room:sync', onSync);

      return () => {
        socket.emit('room:leave', roomName);
        socket.off('room:sync', onSync);
      };
    }
  }, [socket, roomName]);

  if (!room) {
    return <div>Lade Raum...</div>;
  }

  return (
    <div>
      <h2>Raum: {room.name}</h2>
      
      <h3>Spieler ({room.players.length}/{room.config.maxPlayers})</h3>
      <ul>
        {room.players.map(player => (
          <li key={player.id} style={{ color: player.color }}>
            {player.name}
          </li>
        ))}
      </ul>

      <h3>Konfiguration</h3>
      <pre>{JSON.stringify(room.config, null, 2)}</pre>

      <Link to={`/game/${room.name}`}>
        <button>Spiel starten</button>
      </Link>

      {/* Chat-Komponente wird hier später eingefügt */}
    </div>
  );
}

export default RoomPage;
