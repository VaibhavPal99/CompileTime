import { createClient } from "redis";
import { exec } from "child_process";
import path from "path";
import fs from "fs-extra";

const redisWorkerClient = createClient();
const redisWorkerPublisher = createClient();

const processSubmission = async (jobData : string) => {
    const { jobId, userId, language, code, testCases } = JSON.parse(jobData);

    console.log(jobId, userId, language, code, testCases);

    if (language !== "java") {
        console.log(`Unsupported language: ${language}`);
        return;
    }

    const classRegex = /public\s+class\s+(\w+)/;
    const match = code.match(classRegex);

    let className = "Main"; // Default class name
    if (match) {
        className = match[1]; // Extracted class name
    }

    const tmpDir = path.join(__dirname, "tmp", jobId);
    await fs.ensureDir(tmpDir);

    const codeFile = path.join(tmpDir, `${className}.java`);
    await fs.writeFile(codeFile, code);

    let inputFile = "";
    if (testCases) {
        inputFile = path.join(tmpDir, "input.txt");
        await fs.writeFile(inputFile, testCases);
    }

    let dockerCmd = `
        docker run --rm \
        -v ${tmpDir}:/usr/src/app \
        --memory=256m --cpus="0.5" \
        java_runner bash -c "javac ${className}.java && timeout 5s java ${className}"
    `;

    if (testCases) {
        dockerCmd = `
            docker run --rm \
            -v ${tmpDir}:/usr/src/app \
            --memory=256m --cpus="0.5" \
            java_runner bash -c "javac ${className}.java && timeout 2s java ${className} < input.txt"
        `;
    }

    exec(dockerCmd, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error.message}`);
            await redisWorkerPublisher.publish("job_result", JSON.stringify({ jobId, userId, error: error.message }));
        } else {
            const result = JSON.stringify({ jobId, userId, output: stdout, error: stderr });
            console.log(result);
            await redisWorkerPublisher.publish("job_result", result);
        }

        await fs.remove(tmpDir);
        console.log(`Job ${jobId} completed.`);
    });
};

async function startWorker() {
    try {
        await redisWorkerClient.connect();
        await redisWorkerPublisher.connect();

        console.log("Java Worker Connected");
        while (true) {
            try {
                const jobData = await redisWorkerClient.brPop("java_execution_jobs", 0);
                if (!jobData) continue;
                await processSubmission(jobData.element);
            } catch (e) {
                console.error("Error processing submission:", e);
            }
        }
    } catch (e) {
        console.error("Failed to connect to Redis", e);
    }
}

startWorker();
