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
const redis_1 = require("redis");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const redisWorkerClient = (0, redis_1.createClient)();
const redisWorkerPublisher = (0, redis_1.createClient)();
const processSubmission = (jobData) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId, userId, language, code, testCases } = JSON.parse(jobData);
    console.log(jobId, userId, language, code, testCases);
    if (language !== "java") {
        console.log(`Unsupported language: ${language}`);
        return;
    }
    const tmpDir = path_1.default.join(__dirname, "tmp", jobId);
    yield fs_extra_1.default.ensureDir(tmpDir);
    const codeFile = path_1.default.join(tmpDir, "Main.java");
    yield fs_extra_1.default.writeFile(codeFile, code);
    let inputFile = "";
    if (testCases) {
        inputFile = path_1.default.join(tmpDir, "input.txt");
        yield fs_extra_1.default.writeFile(inputFile, testCases);
    }
    let dockerCmd = `
        docker run --rm \
        -v ${tmpDir}:/usr/src/app \
        --memory=256m --cpus="0.5" \
        java_runner bash -c "javac Main.java && timeout 5s java Main"
    `;
    if (testCases) {
        dockerCmd = `
            docker run --rm \
            -v ${tmpDir}:/usr/src/app \
            --memory=256m --cpus="0.5" \
            java_runner bash -c "javac Main.java && timeout 2s java Main < input.txt"
        `;
    }
    (0, child_process_1.exec)(dockerCmd, (error, stdout, stderr) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.error(`Execution error: ${error.message}`);
            yield redisWorkerPublisher.publish("job_result", JSON.stringify({ jobId, userId, error: error.message }));
        }
        else {
            const result = JSON.stringify({ jobId, userId, output: stdout, error: stderr });
            console.log(result);
            yield redisWorkerPublisher.publish("job_result", result);
        }
        yield fs_extra_1.default.remove(tmpDir);
        console.log(`Job ${jobId} completed.`);
    }));
});
function startWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisWorkerClient.connect();
            yield redisWorkerPublisher.connect();
            console.log("Java Worker Connected");
            while (true) {
                try {
                    const jobData = yield redisWorkerClient.brPop("java_execution_jobs", 0);
                    if (!jobData)
                        continue;
                    yield processSubmission(jobData.element);
                }
                catch (e) {
                    console.error("Error processing submission:", e);
                }
            }
        }
        catch (e) {
            console.error("Failed to connect to Redis", e);
        }
    });
}
startWorker();
