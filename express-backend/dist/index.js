"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const redis_1 = require("redis");
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: ["http://localhost:5173", "https://compile-time-beta.vercel.app"], credentials: true }));
const redisPublisher = (0, redis_1.createClient)();
const redisSubscriber = (0, redis_1.createClient)();
const clients = new Map();
function setupRedisSubscriber() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisSubscriber.connect(); // Ensure Redis subscriber is connected
            console.log("Redis Subscriber connected");
            redisSubscriber.subscribe("job_result", (message) => {
                try {
                    const { userId, jobId, output, error } = JSON.parse(message);
                    const ws = clients.get(userId);
                    if (ws) {
                        console.log(`Sending result to user ${userId}`);
                        ws.send(JSON.stringify({ jobId, output, error }));
                    }
                    else {
                        console.log(`No WebSocket connection found for user ${userId}`);
                    }
                }
                catch (e) {
                    console.error("Error parsing job result:", e);
                }
            });
        }
        catch (error) {
            console.error("Failed to connect Redis Subscriber:", error);
        }
    });
}
setupRedisSubscriber();
app.get("/", (req, res) => {
    res.status(200).json({ message: "Server is running!" });
});
app.post("/submit", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId, userId, code, language, testCases } = req.body;
    try {
        if (!redisPublisher.isOpen) {
            yield redisPublisher.connect();
        }
        yield redisPublisher.lPush(`${language}_execution_jobs`, JSON.stringify({ jobId, userId, language, code, testCases }));
        res.json({
            msg: "Received Job",
            userId
        });
    }
    catch (e) {
        res.json({
            msg: "Job submission failed"
        });
    }
}));
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
wss.on('connection', (ws) => {
    console.log("Client Connected!");
    ws.on("message", (message) => {
        try {
            const { userId } = JSON.parse(message.toString());
            console.log("Printing UserId", userId);
            if (userId) {
                clients.set(userId, ws); // Store WebSocket connection
                console.log(`User ${userId} connected via WebSocket`);
            }
        }
        catch (error) {
            console.error("Invalid userId message", error);
        }
    });
});
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisPublisher.connect();
            console.log("Connected to Redis");
            server.listen(3000, '0.0.0.0', () => {
                console.log("Server is running on port 3000");
            });
        }
        catch (error) {
            console.error("Failed to connect to Redis", error);
            process.exit(1);
        }
    });
}
startServer();
