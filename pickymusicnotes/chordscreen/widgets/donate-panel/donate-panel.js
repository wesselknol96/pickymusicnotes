const STRIPE_DONATION_URL = 'https://donate.stripe.com/aFa14nexy0OI0At8it6EU00';
const MIN_DONATION_AMOUNT = 1;

const form = document.getElementById('donate-form');
const amountInput = document.getElementById('donation-amount');
const message = document.getElementById('donate-message');

document.querySelectorAll('.amount-chip').forEach(button => {
    button.addEventListener('click', () => {
        amountInput.value = button.dataset.amount;
        amountInput.setCustomValidity('');
        message.textContent = '';
        setActiveAmount(button.dataset.amount);
    });
});

amountInput.addEventListener('input', () => {
    amountInput.setCustomValidity('');
    message.textContent = '';
    setActiveAmount(amountInput.value);
});

form.addEventListener('submit', event => {
    event.preventDefault();

    const amount = Number(amountInput.value);
    if (!amount || amount < MIN_DONATION_AMOUNT) {
        message.textContent = `Choose an amount of at least EUR ${MIN_DONATION_AMOUNT}.`;
        amountInput.setCustomValidity(`Minimum donation is EUR ${MIN_DONATION_AMOUNT}.`);
        amountInput.reportValidity();
        return;
    }

    amountInput.setCustomValidity('');

    if (!STRIPE_DONATION_URL) {
        message.textContent = 'Stripe is ready for setup. Add your Stripe donation link in donate-panel.js.';
        return;
    }

    window.top.location.href = STRIPE_DONATION_URL;
});

function setActiveAmount(amount) {
    document.querySelectorAll('.amount-chip').forEach(button => {
        button.classList.toggle('active', button.dataset.amount === amount);
    });
}
