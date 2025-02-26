const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 8080;
const path = require('path');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})

io.on('connection', (socket) => {
    console.log('User connected');
    console.log('what is socket?', socket)

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`);
});

