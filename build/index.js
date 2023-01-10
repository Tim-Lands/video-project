"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const httpServer = require('http');
const app = (0, express_1.default)();
const server = httpServer.createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.use(cors());
const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => {
    res.send('Running');
});
io.on("connection", (socket) => {
    socket.emit("me", socket.id);
    socket.on("disconnect", () => {
        socket.broadcast.emit("callEnded");
    });
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        io.to(userToCall).emit("callUser", { signal: signalData, from, name });
    });
    socket.on("answerCall", (data) => {
        console.log(data.to);
        io.to(data.to).emit("callAccepted", data.signal);
    });
});
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
