import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RoomsPage from './components/RoomsPage';
import RoomPage from './components/RoomPage';
import GamePage from './components/GamePage';
import ProfilePage from './components/ProfilePage';
import { SocketProvider } from './components/SocketContext';

function HomePage() {
  return <h1>Hallo, Curvytron mit React!</h1>;
}

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="room/:roomName" element={<RoomPage />} />
            <Route path="game/:roomName" element={<GamePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </Router>
    </SocketProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
