import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Editor from "@monaco-editor/react";
import "./CodePage.css";

export const CodePage = () => {
    const websocket = useRef<WebSocket | null>(null);
    const [code, setCode] = useState("");
    const [testCases, setTestCases] = useState("");
    const [output, setOutput] = useState("");
    const [userId] = useState(() => uuidv4());
    const [language, setLanguage] = useState("cpp"); // Default language

    useEffect(() => {
        const connectWebSocket = () => {
            if (websocket.current && websocket.current.readyState !== WebSocket.CLOSED) {
                return;
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

                    console.log("Received Data:", data);
                    setOutput(data.output || data.error || "No output received");
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };

            socket.onclose = () => {
                console.log("WebSocket disconnected, attempting to reconnect...");
                setTimeout(connectWebSocket, 1000);
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                socket.close();
            };
        };

        connectWebSocket();
        return () => websocket.current?.close();
    }, []);

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
        <div className="code-container">
            {/* Code Editor Section */}
            <div className="editor-section">
                <div className="toolbar">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="language-selector">
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                    </select>
                    <button onClick={submitJob} className="submit-btn">Run Code</button>
                </div>
                <Editor
                    height="88vh"
                    width="100%"
                    defaultLanguage="cpp"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme="vs-dark"
                />
            </div>

            {/* Input/Output Section */}
            <div className="io-section">
                <textarea 
                    className="input-box"
                    value={testCases} 
                    placeholder="Enter test cases" 
                    onChange={(e) => setTestCases(e.target.value)}
                />
                <textarea 
                    className="output-box"
                    placeholder="Output will be displayed here" 
                    value={output} 
                    readOnly
                />
            </div>
        </div>
    );
};
