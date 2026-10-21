const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const players = {};
const foods = [];
const WORLD_SIZE = 5000;

for (let i = 0; i < 1000; i++) {
  foods.push({ id: i, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, r: 5, color: `hsl(${Math.random()*360}, 80%, 60%)` });
}

// Criação de Bots no Servidor para o mapa não ficar vazio
for(let i=0; i<30; i++) {
  const id = "bot_" + i;
  players[id] = {
    id: id, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
    r: 15 + Math.random() * 40, color: `hsl(${Math.random()*360}, 80%, 50%)`, name: "Bot_" + Math.floor(Math.random()*99), isBot: true
  };
}

io.on('connection', (socket) => {
  socket.emit('init', { players, foods, worldSize: WORLD_SIZE, myId: socket.id });
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('setName', (name) => {
    if (players[socket.id]) {
      players[socket.id].name = name;
      io.emit('updateName', { id: socket.id, name: name });
    }
  });
  socket.on('updateState', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x; players[socket.id].y = data.y; players[socket.id].r = data.r;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });
  socket.on('chatMessage', (msg) => {
    if(players[socket.id]) io.emit('chatMessage', { name: players[socket.id].name, msg: msg });
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Movimento aleatório dos Bots
setInterval(() => {
  for(let id in players) {
    if(players[id].isBot) {
      players[id].x += (Math.random()-0.5)*50;
      players[id].y += (Math.random()-0.5)*50;
      players[id].x = Math.max(0, Math.min(WORLD_SIZE, players[id].x));
      players[id].y = Math.max(0, Math.min(WORLD_SIZE, players[id].y));
      io.emit('playerMoved', players[id]);
    }
  }
}, 100);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Servidor rodando na porta ${PORT}`); });
