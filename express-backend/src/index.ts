import express from "express"
import { createClient } from "redis";
import { WebSocket as WS, WebSocketServer } from 'ws';
import http, { IncomingMessage, ServerResponse } from "http";


const app = express();
const PORT = 3000;
app.use(express.json());


const redisPublisher = createClient();
const redisSbuscriber = createClient();


app.post("/submit", async (req,res) => {

    const {jobId, userId, code, language, testCases} = req.body;

    try{

        if (!redisPublisher.isOpen) {
            await redisPublisher.connect();
        }

        await redisPublisher.lPush("code_execution_jobs", JSON.stringify({jobId, userId, language, code, testCases}));
        res.json({
            msg : "Received Job"
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
    redisSbuscriber.subscribe("job_result", (message) => {

        console.log("Sending to browser...");
        ws.send(message);
    })

    ws.on('close',() => {
        console.log("WebSocket client disconnected");
    })

})


async function startServer() {
    try {
        await redisPublisher.connect();
        console.log("Connected to Redis");

        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    } catch (error) {
        console.error("Failed to connect to Redis", error);
        process.exit(1);
    }
}

startServer();