import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function Dashboard() {
    const [merchant, setMerchant] = useState(null);
    const [stats, setStats] = useState({ total: 0, amount: 0, successRate: 0 });
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/test/merchant`)
            .then(res => {
                if (!res.ok) throw new Error(`API error ${res.status}`);
                return res.json();
            })
            .then(data => {
                setMerchant(data);
                setError('');
                fetchPayments(data.api_key, data.api_secret);
            })
            .catch(err => {
                console.error('Failed to load merchant:', err);
                setError('API is not reachable. Start the backend on port 8000.');
            });
    }, []);

    // Auto-refresh stats every 2 seconds for real-time updates
    useEffect(() => {
        if (!merchant) return;
        const interval = setInterval(() => {
            fetchPayments(merchant.api_key, merchant.api_secret);
        }, 2000);
        return () => clearInterval(interval);
    }, [merchant]);

    const fetchPayments = (key, secret) => {
        fetch(`${API_BASE}/api/v1/payments`, {
            headers: {
                'X-Api-Key': key,
                'X-Api-Secret': secret
            }
        })
            .then(res => {
                if (!res.ok) throw new Error(`API error ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    const total = data.length;
                    const success = data.filter(p => p.status === 'success');
                    const amount = success.reduce((sum, p) => sum + p.amount, 0);
                    const rate = total > 0 ? Math.round((success.length / total) * 100) : 0;

                    setStats({
                        total,
                        amount,
                        successRate: rate
                    });
                }
            })
            .catch(err => {
                console.error('Failed to load payments:', err);
                setError('API is not reachable. Start the backend on port 8000.');
            });
    };

    const createTestOrder = async () => {
        if (!merchant || isCreating) return;
        setIsCreating(true);
        setError('');
        try {
            const orderRes = await fetch(`${API_BASE}/api/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': merchant.api_key,
                    'X-Api-Secret': merchant.api_secret
                },
                body: JSON.stringify({ amount: Math.floor(Math.random() * 100000) + 10000 })
            });
            
            const order = await orderRes.json();
            if (!order.id) {
                setError(order.error || 'Failed to create order');
                setIsCreating(false);
                return;
            }

            const paymentRes = await fetch(`${API_BASE}/api/v1/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': merchant.api_key,
                    'X-Api-Secret': merchant.api_secret
                },
                body: JSON.stringify({
                    order_id: order.id,
                    method: 'upi',
                    vpa: 'testuser@upi'
                })
            });
            
            const payment = await paymentRes.json();
            if (!payment.id) {
                setError(payment.error || 'Failed to create payment');
                setIsCreating(false);
                return;
            }

            // Refetch immediately and then again after a short delay
            fetchPayments(merchant.api_key, merchant.api_secret);
            setTimeout(() => {
                fetchPayments(merchant.api_key, merchant.api_secret);
            }, 500);

            setIsCreating(false);
        } catch (error) {
            console.error('Error creating test order:', error);
            setError('Failed to create test order. Check API connectivity.');
            setIsCreating(false);
        }
    };

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
    };

    if (!merchant) {
        return (
            <div className="container">
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h2>Loading...</h2>
                    {error && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid #ef4444'
                        }}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container" data-test-id="dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={createTestOrder} className="btn" style={{ backgroundColor: '#22c55e' }} disabled={isCreating}>
                        {isCreating ? 'Creating...' : '+ Create Test Order'}
                    </button>
                    <Link to="/dashboard/transactions" className="btn">View Transactions</Link>
                </div>
            </div>

            {error && (
                <div className="card" style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }}>
                    <strong style={{ color: '#ef4444' }}>Backend unreachable:</strong> {error}
                </div>
            )}

            <div className="card" data-test-id="api-credentials" style={{ marginBottom: '2rem' }}>
                <h3>API Credentials</h3>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)' }}>API Key</label>
                        <span data-test-id="api-key" style={{ fontFamily: 'monospace' }}>{merchant.api_key}</span>
                    </div>
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)' }}>API Secret</label>
                        <span data-test-id="api-secret" style={{ fontFamily: 'monospace' }}>{merchant.api_secret}</span>
                    </div>
                </div>
            </div>

            <div className="card" data-test-id="stats-container">
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }} data-test-id="total-transactions">{stats.total}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Total Transactions</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }} data-test-id="total-amount">
                            {formatCurrency(stats.amount)}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>Total Volume</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }} data-test-id="success-rate">{stats.successRate}%</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Success Rate</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
