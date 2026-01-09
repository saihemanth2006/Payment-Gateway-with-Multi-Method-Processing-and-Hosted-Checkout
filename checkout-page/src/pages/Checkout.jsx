import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE } from '../config/api';

// Client-side validators mirror backend logic for immediate feedback
const validateVPA = (vpa) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(vpa || '');
const validateLuhn = (num) => {
    if (!num) return false;
    const cleaned = num.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;
    let sum = 0;
    let dbl = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let d = parseInt(cleaned[i], 10);
        if (dbl) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        dbl = !dbl;
    }
    return sum % 10 === 0;
};
const validateExpiry = (month, year) => {
    if (!month || !year) return false;
    const m = parseInt(month, 10);
    let y = parseInt(year, 10);
    if (Number.isNaN(m) || Number.isNaN(y)) return false;
    if (year.toString().length === 2) y += 2000;
    if (m < 1 || m > 12) return false;
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    if (y < cy) return false;
    if (y === cy && m < cm) return false;
    return true;
};
const getCardNetwork = (num) => {
    const c = (num || '').replace(/[\s-]/g, '');
    if (/^4/.test(c)) return 'visa';
    if (/^5[1-5]/.test(c)) return 'mastercard';
    if (/^3[47]/.test(c)) return 'amex';
    if (/^60|^65|^8[1-9]/.test(c)) return 'rupay';
    return 'unknown';
};

export default function Checkout() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');

    const [order, setOrder] = useState(null);
    const [method, setMethod] = useState(null);

    const [vpa, setVpa] = useState('');
    const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

    const [step, setStep] = useState('summary'); // summary, processing, success, error
    const [paymentId, setPaymentId] = useState(null);
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (orderId) {
            fetch(`${API_BASE}/api/v1/orders/${orderId}/public`)
                .then(res => {
                    if (!res.ok) throw new Error('Order not found');
                    return res.json();
                })
                .then(data => setOrder(data))
                .catch(err => {
                    console.error(err);
                    // Handle error, maybe show error state or alert
                });
        }
    }, [orderId]);

    const handlePayment = (e) => {
        e.preventDefault();
        setFormError(null);

        // Client-side validation before hitting API
        if (!method) {
            setFormError('Select a payment method.');
            return;
        }

        const payload = { order_id: orderId, method };

        if (method === 'upi') {
            if (!validateVPA(vpa)) {
                setFormError('Enter a valid UPI ID (e.g., user@bank).');
                return;
            }
            payload.vpa = vpa;
        } else {
            const [month, year] = (card.expiry || '').split('/');
            if (!validateLuhn(card.number)) {
                setFormError('Card number failed Luhn check.');
                return;
            }
            if (!validateExpiry(month, year)) {
                setFormError('Card expiry is invalid or in the past.');
                return;
            }
            if (!card.cvv || card.cvv.length < 3 || card.cvv.length > 4) {
                setFormError('Enter a valid CVV.');
                return;
            }
            payload.card = {
                number: card.number,
                expiry_month: month,
                expiry_year: year,
                cvv: card.cvv,
                holder_name: card.name,
                network: getCardNetwork(card.number)
            };
        }

        setStep('processing');

        fetch(`${API_BASE}/api/v1/payments/public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setFormError(data.error.description || 'Payment failed.');
                    setStep('summary');
                } else {
                    setPaymentId(data.id);
                    pollStatus(data.id); // Note: Should probably clear interval on unmount
                }
            })
            .catch(() => {
                setFormError('Payment request failed.');
                setStep('summary');
            });
    };

    const pollStatus = (pid) => {
        const interval = setInterval(() => {
            fetch(`${API_BASE}/api/v1/payments/${pid}/public`)
                .then(res => res.json())
                .then(p => {
                    if (p.status === 'success') {
                        clearInterval(interval);
                        setStep('success');
                    } else if (p.status === 'failed') {
                        clearInterval(interval);
                        setStep('error');
                    }
                });
        }, 2000);
    };

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
    };

    if (!order) return <div className="container" style={{ color: 'white' }}>Loading Order...</div>;

    return (
        <div className="container" data-test-id="checkout-container">
            {step === 'summary' || step === 'processing' ? (
                <>
                    <div className="card" data-test-id="order-summary" style={{ marginBottom: '2rem' }}>
                        <h2>Complete Payment</h2>
                        <div>
                            <span>Amount: </span>
                            <span data-test-id="order-amount" style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{formatCurrency(order.amount)}</span>
                        </div>
                        <div>
                            <span>Order ID: </span>
                            <span data-test-id="order-id" style={{ fontFamily: 'monospace' }}>{order.id}</span>
                        </div>
                    </div>

                    {step === 'processing' ? (
                        <div data-test-id="processing-state" style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
                            <style>{`@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}`}</style>
                            <span data-test-id="processing-message">Processing payment...</span>
                        </div>
                    ) : (
                        <>
                            {formError && (
                                <div data-test-id="validation-error" style={{
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    background: '#fef2f2',
                                    border: '1px solid #ef4444',
                                    borderRadius: '0.5rem',
                                    color: '#ef4444'
                                }}>
                                    {formError}
                                </div>
                            )}
                            <div data-test-id="payment-methods" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                                <button
                                    className="btn"
                                    style={{ background: method === 'upi' ? 'var(--primary-dark)' : 'var(--bg-card)', border: '1px solid var(--primary)' }}
                                    data-test-id="method-upi"
                                    data-method="upi"
                                    onClick={() => setMethod('upi')}
                                >
                                    UPI
                                </button>
                                <button
                                    className="btn"
                                    style={{ background: method === 'card' ? 'var(--primary-dark)' : 'var(--bg-card)', border: '1px solid var(--primary)' }}
                                    data-test-id="method-card"
                                    data-method="card"
                                    onClick={() => setMethod('card')}
                                >
                                    Card
                                </button>
                            </div>

                            {method === 'upi' && (
                                <form data-test-id="upi-form" onSubmit={handlePayment}>
                                    <input
                                        className="input"
                                        data-test-id="vpa-input"
                                        placeholder="username@bank"
                                        type="text"
                                        onChange={e => setVpa(e.target.value)}
                                        required
                                    />
                                    <button data-test-id="pay-button" type="submit" className="btn" style={{ width: '100%' }}>
                                        Pay {formatCurrency(order.amount)}
                                    </button>
                                </form>
                            )}

                            {method === 'card' && (
                                <form data-test-id="card-form" onSubmit={handlePayment}>
                                    <input
                                        className="input"
                                        data-test-id="card-number-input"
                                        placeholder="Card Number"
                                        type="text"
                                        onChange={e => setCard({ ...card, number: e.target.value })}
                                        required
                                    />
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input
                                            className="input"
                                            data-test-id="expiry-input"
                                            placeholder="MM/YY"
                                            type="text"
                                            onChange={e => setCard({ ...card, expiry: e.target.value })}
                                            required
                                        />
                                        <input
                                            className="input"
                                            data-test-id="cvv-input"
                                            placeholder="CVV"
                                            type="text"
                                            onChange={e => setCard({ ...card, cvv: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <input
                                        className="input"
                                        data-test-id="cardholder-name-input"
                                        placeholder="Name on Card"
                                        type="text"
                                        onChange={e => setCard({ ...card, name: e.target.value })}
                                        required
                                    />
                                    <button data-test-id="pay-button" type="submit" className="btn" style={{ width: '100%' }}>
                                        Pay {formatCurrency(order.amount)}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </>
            ) : null}

            {step === 'success' && (
                <div data-test-id="success-state" className="card" style={{ textAlign: 'center', borderColor: 'var(--success)' }}>
                    <h2 style={{ color: 'var(--success)' }}>Payment Successful!</h2>
                    <div>
                        <span>Payment ID: </span>
                        <span data-test-id="payment-id" style={{ fontFamily: 'monospace' }}>{paymentId}</span>
                    </div>
                    <span data-test-id="success-message">
                        Your payment has been processed successfully
                    </span>
                </div>
            )}

            {step === 'error' && (
                <div data-test-id="error-state" className="card" style={{ textAlign: 'center', borderColor: '#ef4444' }}>
                    <h2 style={{ color: '#ef4444' }}>Payment Failed</h2>
                    <span data-test-id="error-message" style={{ display: 'block', marginBottom: '1rem' }}>
                        Payment could not be processed
                    </span>
                    <button data-test-id="retry-button" className="btn" onClick={() => setStep('summary')}>Try Again</button>
                </div>
            )}
        </div>
    );
}
