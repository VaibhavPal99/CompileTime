
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createClient } from "redis";


const redisSubscriber = createClient(); 
const redisWorker = createClient(); 

const compile = async (jobData : string) => {

    const {jobId, userId, lang, code, testcases} = JSON.parse(jobData);

    await redisWorker.hSet(`job:${jobId}`, { status : "running"});

    const tmpDir = path.join(__dirname, "tmp", jobId); 

    await fs.promises.mkdir(tmpDir, {recursive : true});

    const codeFile = path.join(tmpDir, `tmp_${jobId}.cpp`);

    await fs.promises.writeFile(codeFile, code);

    let inputFile = "";
    if(testcases){
        inputFile = path.join(tmpDir, "input.txt")
        await fs.promises.writeFile(inputFile,testcases);
    }
    console.log("job", jobId);
    console.log("test",testcases);
    console.log("code",code );

    let dockerCmd = `
        docker run --rm \
        -v ${tmpDir}:/usr/src/app \
        --memory=512m --cpus="0.5" \
        cpp_runner bash -c "g++ -std=c++23 tmp_${jobId}.cpp -o tmp_${jobId}.out && timeout 2s ./tmp_${jobId}.out"
    `;

    if(testcases){
        dockerCmd = `
            docker run --rm \
            -v ${tmpDir}:/usr/src/app \
            --memory=512m --cpus="0.5" \
            cpp_runner bash -c "g++ -std=c++23 tmp_${jobId}.cpp -o tmp_${jobId}.out && timeout 2s ./tmp_${jobId}.out < input.txt"
        `;
    }
    console.log("Reached here");
    exec(dockerCmd, async(error,stdout,stderr) => {
        if(error){
            console.error(`Execution error: ${error.message}`);
            
            await redisWorker.hSet(`job:${jobId}`, {
                error : error.message,
                status : "failed"
            });

        }else{
            await redisWorker.hSet(`job:${jobId}`, {
                output : stdout,
                error : stderr,
                status : "success"
            });

        }

        await fs.promises.rm(tmpDir, { recursive: true, force: true });
        console.log("stdout",stdout);

        console.log(`Job ${jobId} completed.`);
    })



    

}

const startWorker = async () => {
    console.log("started");
    try{
        await redisWorker.connect();
        await redisSubscriber.connect();
        while(true){
            const jobData = await redisSubscriber.brPop(`cpp_execution_job`, 0);
           
            if(!jobData) return;

            
            await compile(jobData.element);
            

        }
    }catch(e){

        console.error(e,"Something went wrong");
    }
}

startWorker();

