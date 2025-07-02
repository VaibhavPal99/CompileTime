import express from "express"
import { createClient } from "redis";
import { WebSocket as WS, WebSocketServer } from 'ws';
import http, { IncomingMessage, ServerResponse } from "http";
import cors from "cors";

const app = express();
const PORT = 3000;
app.use(express.json());


app.use(cors({ origin: ["http://localhost:5173", "https://compile-time-beta.vercel.app"], credentials: true }));


const redisPublisher = createClient();
const redisSubscriber = createClient();
const clients = new Map<string, WS>();

async function setupRedisSubscriber() {
    try {
        await redisSubscriber.connect(); // Ensure Redis subscriber is connected
        console.log("Redis Subscriber connected");

        redisSubscriber.subscribe("job_result", (message) => {
            try {
                const { userId, jobId, output, error } = JSON.parse(message);
                const ws = clients.get(userId);

                if (ws) {
                    console.log(`Sending result to user ${userId}`);
                    ws.send(JSON.stringify({ jobId, output, error }));
                } else {
                    console.log(`No WebSocket connection found for user ${userId}`);
                }
            } catch (e) {
                console.error("Error parsing job result:", e);
            }
        });

    } catch (error) {
        console.error("Failed to connect Redis Subscriber:", error);
    }
}

setupRedisSubscriber();

app.get("/", (req, res) => {
    res.status(200).json({ message: "Server is running!" });
});

app.post("/submit", async (req,res) => {


    
    const {jobId, userId, code, language, testCases} = req.body;

    try{

        if (!redisPublisher.isOpen) {
            await redisPublisher.connect();
        }

        await redisPublisher.lPush(`${language}_execution_jobs`, JSON.stringify({jobId, userId, language, code, testCases}));
        res.json({
            msg : "Received Job",
            userId
        })

    }catch(e){

        res.json({
            msg : "Job submission failed"
        })

    }

})

const server = http.createServer(app);
const wss = new WebSocketServer({server});


wss.on('connection', (ws:WS) => {
    
    console.log("Client Connected!");
    

    ws.on("message", (message) => {
        try {
            const { userId } = JSON.parse(message.toString());
            console.log("Printing UserId",userId);

            if (userId) {
                
                
                clients.set(userId, ws); // Store WebSocket connection
                console.log(`User ${userId} connected via WebSocket`);
            }
        } catch (error) {
            console.error("Invalid userId message", error);
        }
    });

})


async function startServer() {
    try {
        await redisPublisher.connect();
        console.log("Connected to Redis");

        server.listen(3000,'0.0.0.0', () => {
            console.log("Server is running on port 3000");
        });
    } catch (error) {
        console.error("Failed to connect to Redis", error);
        process.exit(1);
    }
}

startServer();