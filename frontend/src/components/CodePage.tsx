import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import './CodePage.css';

export const CodePage = () => {
    const websocket = useRef<WebSocket | null>(null);
    const [code, setCode] = useState("");
    const [testCases, setTestCases] = useState("");
    const [output, setOutput] = useState("");
    const [userId] = useState(() => uuidv4()); 

    const language = "java";

    useEffect(() => {
        const connectWebSocket = () => {
            if (websocket.current && websocket.current.readyState !== WebSocket.CLOSED) {
                return; // Avoid reconnecting if WebSocket is already open
            }

            websocket.current = new WebSocket("ws://localhost:3000");
            const socket = websocket.current;

            socket.onopen = () => {
                console.log("WebSocket connected");
                socket.send(JSON.stringify({ userId }));
            };

            socket.onmessage = async (event) => {
                try {
                    let textData = event.data instanceof Blob ? await event.data.text() : event.data;

                    const data = JSON.parse(textData);
                    console.log("Error", data.error);
                    console.log("Received Data:", data);
                    

                    setOutput(data.output || data.error || "No output received");

                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };

            socket.onclose = () => {
                console.log("WebSocket disconnected, attempting to reconnect...");
                setTimeout(connectWebSocket, 1000); // Auto-reconnect after 1 second
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                socket.close();
            };
        };

        connectWebSocket(); // Initial WebSocket connection
        return () => websocket.current?.close(); // Cleanup on unmount

    }, []); // Ensures WebSocket only initializes once

    const submitJob = async () => {
        const jobId = uuidv4();

        const res = await fetch(`http://localhost:3000/submit`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, userId, language, code, testCases }),
        });

        if (!res.ok) {
            throw new Error("Failed to submit job");
        }

        const data = await res.json();
        console.log("Job submitted:", data);
    };

    return (
        <>
            <textarea value={code} placeholder="Enter Code" onChange={(e) => setCode(e.target.value)}></textarea>
            <textarea value={testCases} placeholder="Enter testcases" onChange={(e) => setTestCases(e.target.value)}></textarea>
            <textarea placeholder="Output will be displayed here" value={output} readOnly></textarea>
            <button onClick={submitJob}>Submit</button>
        </>
    );
};
