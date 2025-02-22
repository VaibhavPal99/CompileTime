import express from "express"
import { createClient } from "redis";


const app = express();
const PORT = 3000;
app.use(express.json());


const client = createClient();


app.post("/submit", async (req,res) => {

    const {jobId, userId, code, language, testCases} = req.body;

    try{

        if (!client.isOpen) {
            await client.connect();
        }

        await client.lPush("code_execution_jobs", JSON.stringify({jobId, userId, language, code, testCases}));
        res.json({
            msg : "Received Job"
        })

    }catch(e){

        res.json({
            msg : "Job submission failed"
        })

    }

})

async function startServer() {
    try {
        await client.connect();
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