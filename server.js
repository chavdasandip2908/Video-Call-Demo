// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://video-call.onrender.com", // Render पर आपके फ्रंटेंड का URL
    methods: ["GET", "POST"],
  },
});

app.use(cors({
  origin: "https://video-call.onrender.com" // Render पर आपके फ्रंटेंड का URL
}));

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.emit('yourID', socket.id);

  socket.on('offer', (data) => {
    io.to(data.to).emit('offer', data);
  });

  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', data);
  });

  socket.on('candidate', (data) => {
    io.to(data.to).emit('candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
