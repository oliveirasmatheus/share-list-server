require('dotenv').config();

const express = require('express');
const session = require('express-session');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));

// Serve static files (CSS, JS)
app.use(express.static('public'));


// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Mock login endpoint
app.post('/login', async (req, res) => {
  const { email } = req.body;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, firstName: "Mock", lastName: "User" },
    });
  }

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

// API: Get user's lists
app.get('/api/lists', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    include: {
      lists: { include: { items: true } },
      sharedLists: { include: { items: true, owner: true } },
    },
  });

  res.json({ lists: user.lists, sharedLists: user.sharedLists });
});

// Socket.IO: Real-time list updates
io.on('connection', (socket) => {
  socket.on('addItem', async ({ listId, itemName }) => {
    // Save to database
    const newItem = await prisma.listItem.create({
      data: {
        name: itemName,
        listId: listId,
      },
    });

    // Broadcast to all users in this list's room
    io.to(`list-${listId}`).emit('newItem', newItem);
  });

  socket.on('joinList', (listId) => {
    socket.join(`list-${listId}`);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});