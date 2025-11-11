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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const redis_1 = require("redis");
const redisSubscriber = (0, redis_1.createClient)();
const redisWorker = (0, redis_1.createClient)();
const compile = (jobData) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId, userId, lang, code, testcases } = JSON.parse(jobData);
    yield redisWorker.hSet(`job:${jobId}`, { status: "running" });
    const tmpDir = path_1.default.join(__dirname, "tmp", jobId);
    yield fs_1.default.promises.mkdir(tmpDir, { recursive: true });
    const codeFile = path_1.default.join(tmpDir, `tmp_${jobId}.cpp`);
    yield fs_1.default.promises.writeFile(codeFile, code);
    let inputFile = "";
    if (testcases) {
        inputFile = path_1.default.join(tmpDir, "input.txt");
        yield fs_1.default.promises.writeFile(inputFile, testcases);
    }
    console.log("job", jobId);
    console.log("test", testcases);
    console.log("code", code);
    let dockerCmd = `
        docker run --rm \
        -v ${tmpDir}:/usr/src/app \
        --memory=512m --cpus="0.5" \
        cpp_runner bash -c "g++ -std=c++23 tmp_${jobId}.cpp -o tmp_${jobId}.out && timeout 2s ./tmp_${jobId}.out"
    `;
    if (testcases) {
        dockerCmd = `
            docker run --rm \
            -v ${tmpDir}:/usr/src/app \
            --memory=512m --cpus="0.5" \
            cpp_runner bash -c "g++ -std=c++23 tmp_${jobId}.cpp -o tmp_${jobId}.out && timeout 2s ./tmp_${jobId}.out < input.txt"
        `;
    }
    console.log("Reached here");
    (0, child_process_1.exec)(dockerCmd, (error, stdout, stderr) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.error(`Execution error: ${error.message}`);
            yield redisWorker.hSet(`job:${jobId}`, {
                error: error.message,
                status: "failed"
            });
        }
        else {
            yield redisWorker.hSet(`job:${jobId}`, {
                output: stdout,
                error: stderr,
                status: "success"
            });
        }
        yield fs_1.default.promises.rm(tmpDir, { recursive: true, force: true });
        console.log("stdout", stdout);
        console.log(`Job ${jobId} completed.`);
    }));
});
const startWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("started");
    try {
        yield redisWorker.connect();
        yield redisSubscriber.connect();
        while (true) {
            const jobData = yield redisSubscriber.brPop(`cpp_execution_job`, 0);
            if (!jobData)
                return;
            yield compile(jobData.element);
        }
    }
    catch (e) {
        console.error(e, "Something went wrong");
    }
});
startWorker();
