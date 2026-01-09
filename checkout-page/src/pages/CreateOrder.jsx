import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function CreateOrder() {
    const navigate = useNavigate();
    const [amount, setAmount] = useState('100.00');
    // Defaults match backend-seeded test merchant (see backend/src/utils/initDb.js)
    const [apiKey, setApiKey] = useState('key_test_abc123');
    const [apiSecret, setApiSecret] = useState('secret_test_xyz789');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': apiKey,
                    'X-Api-Secret': apiSecret
                },
                body: JSON.stringify({
                    amount: Math.round(parseFloat(amount) * 100), // Convert to paise
                    currency: 'INR',
                    customer_email: 'customer@example.com',
                    customer_phone: '+919876543210'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const serverError = data?.error;
                const errorMessage =
                    typeof serverError === 'string'
                        ? serverError
                        : serverError?.description
                            || serverError?.message
                            || serverError?.detail
                            || data?.message
                            || 'Failed to create order';
                throw new Error(errorMessage);
            }

            // Redirect to checkout page with order ID
            navigate(`/checkout?order_id=${data.id}`);
        } catch (err) {
            const fallbackError =
                typeof err === 'string'
                    ? err
                    : err?.description
                        || err?.message
                        || err?.error
                        || 'An error occurred. Please try again.';
            setError(fallbackError);
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (value) => {
        // Remove non-numeric characters except decimal point
        const cleaned = value.replace(/[^\d.]/g, '');
        // Ensure only one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            return parts[0] + '.' + parts.slice(1).join('');
        }
        // Limit to 2 decimal places
        if (parts[1] && parts[1].length > 2) {
            return parts[0] + '.' + parts[1].slice(0, 2);
        }
        return cleaned;
    };

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Create Test Order</h1>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Amount (INR)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                ₹
                            </span>
                            <input
                                className="input"
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(formatAmount(e.target.value))}
                                placeholder="100.00"
                                style={{ paddingLeft: '2rem' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            API Key
                        </label>
                        <input
                            className="input"
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            API Secret
                        </label>
                        <input
                            className="input"
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            placeholder="Enter your API secret"
                            required
                        />
                    </div>

                    {error && (
                        <div
                            data-test-id="validation-error"
                            style={{ 
                                padding: '0.75rem', 
                                marginBottom: '1rem', 
                                background: '#fef2f2', 
                                border: '1px solid #ef4444',
                                borderRadius: '0.5rem',
                                color: '#ef4444'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn" 
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating Order...' : 'Create Order & Pay'}
                    </button>
                </form>

                    <div style={{ 
                    marginTop: '2rem', 
                    padding: '1rem', 
                    background: 'rgba(79, 70, 229, 0.1)', 
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)' }}>Test Credentials</h3>
                    <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        <div>Key: key_test_abc123</div>
                        <div>Secret: secret_test_xyz789</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
