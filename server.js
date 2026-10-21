const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const players = {};
const foods = [];
const WORLD_SIZE = 4000;

for (let i = 0; i < 800; i++) {
  foods.push({ 
    id: i, 
    x: Math.random() * WORLD_SIZE, 
    y: Math.random() * WORLD_SIZE, 
    r: 5 + Math.random() * 4, 
    color: `hsl(${Math.random()*360}, 80%, 60%)` 
  });
}

io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
    r: 20, color: `hsl(${Math.random()*360}, 80%, 50%)`, name: "Jogador"
  };

  socket.emit('init', { players, foods, worldSize: WORLD_SIZE, myId: socket.id });
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('setName', (name) => {
    if (players[socket.id]) {
      players[socket.id].name = name.substring(0, 12);
      io.emit('updateName', { id: socket.id, name: players[socket.id].name });
    }
  });

  socket.on('updateState', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x; players[socket.id].y = data.y; players[socket.id].r = data.r;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('eatPlayer', (targetId) => {
    const eater = players[socket.id]; const target = players[targetId];
    if (eater && target && eater.r > target.r * 1.1) {
      eater.r = Math.sqrt(eater.r * eater.r + target.r * target.r);
      io.to(targetId).emit('youWereEaten');
      delete players[targetId];
      io.emit('playerEaten', { eaterId: socket.id, targetId: targetId, newRadius: eater.r });
    }
  });

  socket.on('eatFood', (foodId) => {
    const fIndex = foods.findIndex(f => f.id === foodId);
    if (fIndex !== -1) {
      foods.splice(fIndex, 1);
      foods.push({ id: Math.random(), x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, r: 5 + Math.random() * 4, color: `hsl(${Math.random()*360}, 80%, 60%)` });
      io.emit('foodEaten', foodId);
    }
  });

  // --- SISTEMA DE CHAT ---
  socket.on('chatMessage', (msg) => {
    if(players[socket.id]) {
      io.emit('chatMessage', { name: players[socket.id].name, msg: msg });
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Servidor rodando na porta ${PORT}`); });
