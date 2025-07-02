import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Editor from "@monaco-editor/react";
import "./CodePage.css";

export const CodePage = () => {
    const websocket = useRef<WebSocket | null>(null);
    const [code, setCode] = useState("");
    const [testCases, setTestCases] = useState("");
    const [output, setOutput] = useState("");
    const [debugOutput, setDebugOutput] = useState("");
    const [userId] = useState(() => uuidv4());
    const [language, setLanguage] = useState("cpp"); // Default language
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState("output"); // State to switch between output.txt and debug.txt
    const [theme, setTheme] = useState<"light" | "dark">("light");


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
                    setOutput(data.output || "No output received");
                    setDebugOutput(data.error || "No debug output received");
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                } finally {
                    setIsLoading(false);
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

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    const submitJob = async () => {
        setIsLoading(true);
        setOutput("");
        setDebugOutput("");
        const jobId = uuidv4();

        try {
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
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
        <div className={`code-container ${theme}`}>
            {/* Top Toolbar */}
            <div className="editor-section">
                <div className="toolbar">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="language-selector"
                    >
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                    </select>

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            className="theme-toggle"
                            id="theme-toggle"
                            title="Toggle light & dark theme"
                            aria-label="Toggle theme"
                            aria-live="polite"
                            onClick={toggleTheme}
                        >
                            {theme === "light" ? (
                                
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M21.75 15.5a.75.75 0 0 0-1.03-.36A9 9 0 0 1 8.86 3.28a.75.75 0 0 0-.9-.9 10.5 10.5 0 1 0 13.76 13.76.75.75 0 0 0 .03-.64z" />
                                </svg>
                            ) : (
                               
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 4a1 1 0 0 1 1-1h.01a1 1 0 1 1-1.01 1zM18.36 5.64a1 1 0 1 1 1.41-1.41 1 1 0 0 1-1.41 1.41zM20 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM18.36 18.36a1 1 0 1 1 1.41 1.41 1 1 0 0 1-1.41-1.41zM12 20a1 1 0 0 1 0 2 1 1 0 0 1 0-2zM5.64 18.36a1 1 0 0 1-1.41 1.41 1 1 0 0 1 1.41-1.41zM4 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM5.64 5.64a1 1 0 0 1-1.41-1.41 1 1 0 0 1 1.41 1.41zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                                </svg>
                            )}
                        </button>



                        <button onClick={submitJob} className="submit-btn" disabled={isLoading}>
                            {isLoading ? "Running..." : "Run Code"}
                        </button>
                    </div>
                </div>

                <Editor
                    height="88vh"
                    width="100%"
                    defaultLanguage="cpp"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme={theme === "light" ? "vs-light" : "vs-dark"}
                    options={{
                        fontFamily: "'Courier New', monospace",
                        fontSize: 16,
                        minimap: { enabled: false },
                        padding: { top: 10 },
                        automaticLayout: true,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        scrollbar: {
                            vertical: "hidden",
                            horizontal: "hidden",
                            handleMouseWheel: false,
                        },
                        overviewRulerLanes: 0,
                    }}
                />
            </div>

            {/* I/O Section */}
            <div className="io-section">
                <textarea
                    className="input-box"
                    value={testCases}
                    placeholder="Enter test cases"
                    onChange={(e) => setTestCases(e.target.value)}
                />

                <div className="output-toggle">
                    <button
                        className={selectedFile === "output" ? "active" : ""}
                        onClick={() => setSelectedFile("output")}
                    >
                        output.txt
                    </button>
                    <button
                        className={selectedFile === "debug" ? "active" : ""}
                        onClick={() => setSelectedFile("debug")}
                    >
                        debug.txt
                    </button>
                </div>

                <textarea
                    className="output-box"
                    placeholder="Output will be displayed here"
                    value={isLoading ? "Processing..." : selectedFile === "output" ? output : debugOutput}
                    readOnly
                />
            </div>
        </div>
    );

};
