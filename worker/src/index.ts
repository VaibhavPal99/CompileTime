import { createClient } from "redis";
import {exec} from 'child_process'
import path from 'path'
import fs from "fs-extra"; 


const client = createClient();

const processSubmission = async (jobData : string) => {

    const {jobId, userId, language, code, testCases} = JSON.parse(jobData);

    console.log(jobId);
    console.log(userId);
    console.log(language);
    console.log(code);
    console.log(testCases);


    if(language !== "cpp"){
        console.log(`Unsupported language: ${language}`);
        return;
    }

    const tmpDir = path.join(__dirname, "tmp", jobId);
    await fs.ensureDir(tmpDir);

    const codeFile = path.join(tmpDir, `tmp_${jobId}.cpp`)
    await fs.writeFile(codeFile, code);

    let inputFile = "";
    if(testCases){
        inputFile = path.join(tmpDir, "input.txt")
        await fs.writeFile(inputFile,testCases);
    }

    let dockerCmd = `
        docker run --rm \
        -v ${tmpDir}:/usr/src/app \
        --memory=256m --cpus="0.5" \
        cpp_runner bash -c "g++ tmp_${jobId}.cpp -o tmp_${jobId}.out && timeout 2s ./tmp_${jobId}.out"
    `;

    if(testCases){
        dockerCmd = `
            docker run --rm \
            -v ${tmpDir}:/usr/src/app \
            --memory=256m --cpus="0.5" \
            cpp_runner bash -c "g++ tmp_${jobId}.cpp -o tmp_${jobId}.out && timeout 2s ./tmp_${jobId}.out < input.txt"
        `;
    }

    exec(dockerCmd, async(error,stdout,stderr) => {
        if(error){
            console.error(`Execution error: ${error.message}`);

            await client.publish(
                `job_result`, 
                JSON.stringify({ jobId, error: error.message })
            );

        }else{
            const result = JSON.stringify({ jobId, userId, output: stdout, error: stderr });

            await client.publish("job_result", result);

        }

        await fs.remove(tmpDir);
        console.log(`Job ${jobId} completed.`);
    })

   
}

async function startWorker(){

    try{
    
        await client.connect();

        console.log("Worker Connected");
        while(true){

            try{
                const jobData = await client.brPop("code_execution_jobs",0);

                if (!jobData) return;
                await processSubmission(jobData.element);

            }catch(e){
                console.error("Error processing submission:", e);
            }

        }

    }catch(e){

        console.error("Failed to connect to Redis", e);

    }

}

startWorker();