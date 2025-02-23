import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    const handleNav = () => {
        navigate('/code');
    }


  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>CompileTime</h1>
          <p>Your All-in-One Code Compiler</p>
          <button className="cta-button" onClick={handleNav}>Start Coding</button>
        </div>
      </header>

      <section className="features-section">
        <h2>Key Features</h2>
        <div className="features-list">
          <div className="feature-card">
            <h3>Multi-Language Support</h3>
            <p>Compile and run code in various languages.</p>
          </div>
          <div className="feature-card">
            <h3>Instant Execution</h3>
            <p>Get results within seconds, in real-time.</p>
          </div>
          <div className="feature-card">
            <h3>Secure Environment</h3>
            <p>Run your code in isolated, secure sandboxes.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>&copy; 2025 Compiler Time | All rights reserved</p>
      </footer>
    </div>
  );
};

export default Home;
