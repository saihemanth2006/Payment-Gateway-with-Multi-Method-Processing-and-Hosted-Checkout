import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (localStorage.getItem('isAuthenticated') === 'true') {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate]);

    const handleLogin = (e) => {
        e.preventDefault();
        // For Deliverable 1, accept any password with the test email
        const isValid = email === 'test@example.com';
        if (isValid) {
            setError('');
            localStorage.setItem('isAuthenticated', 'true');
            navigate('/dashboard');
        } else {
            setError('Invalid credentials. Use test@example.com');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="card" style={{ maxWidth: '400px', margin: '100px auto' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Merchant Login</h2>
                <form data-test-id="login-form" onSubmit={handleLogin}>
                    <input
                        className="input"
                        data-test-id="email-input"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input
                        className="input"
                        data-test-id="password-input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className="btn" style={{ width: '100%' }} data-test-id="login-button">Login</button>
                    {error && <p style={{ color: 'salmon', marginTop: '0.75rem' }}>{error}</p>}
                </form>
            </div>
        </div>
    );
}
