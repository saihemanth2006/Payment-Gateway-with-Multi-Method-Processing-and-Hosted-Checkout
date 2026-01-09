const validateVPA = (vpa) => {
    if (!vpa) return false;
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return regex.test(vpa);
};

const validateLuhn = (cardNumber) => {
    if (!cardNumber) return false;
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i));

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return (sum % 10) === 0;
};

const getCardNetwork = (cardNumber) => {
    if (!cardNumber) return 'unknown';
    const cleaned = cardNumber.replace(/[\s-]/g, '');

    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    // Rupay: 60, 65, or 81-89
    if (/^60|^65|^8[1-9]/.test(cleaned)) return 'rupay';

    return 'unknown';
};

const validateExpiry = (month, year) => {
    if (!month || !year) return false;
    const m = parseInt(month, 10);
    let y = parseInt(year, 10);

    // Handle 2-digit years
    if (year.toString().length === 2) {
        y += 2000;
    }

    if (m < 1 || m > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (y < currentYear) return false;
    if (y === currentYear && m < currentMonth) return false;

    return true;
};

module.exports = {
    validateVPA,
    validateLuhn,
    getCardNetwork,
    validateExpiry
};
