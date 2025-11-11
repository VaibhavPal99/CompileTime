import { useState, useEffect } from "react";
import "./NoteModal.css";

export default function NoteModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show once per session
    if (!sessionStorage.getItem("compilerNoticeShown")) {
      setShow(true);
      sessionStorage.setItem("compilerNoticeShown", "true");
    }
  }, []);

  return (
    <>
      {show && (
        <div className="notice-overlay">
          <div className="notice-box">
            <h2>⚙️ Heads up for Recruiters & Fellow Developers</h2>

            <p>
              This compiler currently uses <strong>Judge0</strong> for code execution because my
              free <strong>GCP Compute Engine</strong> instance has expired and running it again
              is temporarily costly.
            </p>

            <p>
              The <strong>original backend</strong> which runs sandboxed Docker containers and
              uses Pub/Sub for secure code execution works perfectly fine locally.
            </p>

            <p>
              If you'd like to test the full version, please follow the setup instructions in the{" "}
              <a
                href="https://github.com/VaibhavPal99/CompileTime"
                target="_blank"
                rel="noopener noreferrer"
              >
                README on GitHub
              </a>.
            </p>

            <p className="thanks">Thank you for checking out my project! 😊</p>

            <button onClick={() => setShow(false)} className="notice-btn">
              Got it, Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
