import React from 'react';
import { Link } from 'react-router-dom';

function RoomListItem({ room }) {
  return (
    <li>
      <Link to={`/room/${room.name}`}>
        {room.name} ({room.players.length}/{room.config.maxPlayers})
      </Link>
    </li>
  );
}

export default RoomListItem;
