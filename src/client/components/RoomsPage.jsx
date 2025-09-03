import React, { useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useNavigate } from 'react-router-dom';
import RoomListItem from './RoomListItem';

function RoomsPage() {
  const socket = useSocket();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      socket.emit('room:create', newRoomName, (success) => {
        if (success) {
          navigate(`/room/${newRoomName}`);
        }
      });
    }
  };

  useEffect(() => {
    if (socket) {
      socket.emit('room:list');
      socket.on('room:list', setRooms);
    }

    return () => {
      if (socket) {
        socket.off('room:list', setRooms);
      }
    };
  }, [socket]);

  return (
    <div>
      <h2>Räume</h2>
      {rooms.length > 0 ? (
        <ul>
          {rooms.map((room) => (
            <RoomListItem key={room.name} room={room} />
          ))}
        </ul>
      ) : (
        <p>Keine Räume verfügbar.</p>
      )}
      <form onSubmit={handleCreateRoom}>
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Neuer Raum"
        />
        <button type="submit">Erstellen</button>
      </form>
    </div>
  );
}

export default RoomsPage;
