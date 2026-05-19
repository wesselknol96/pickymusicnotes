document.getElementById('request-form').addEventListener('submit', handleRequestSubmit);

async function handleRequestSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const message = document.getElementById('request-message');
    const name = formData.get('name').trim();
    const request = formData.get('request').trim();

    if (!name || !request) return;

    if (isLocalPreview()) {
        message.textContent = 'Requests save in Netlify after upload.';
        return;
    }

    message.textContent = 'Sending...';

    try {
        await saveNetlifyRequest(formData);

        message.textContent = 'Request saved.';
        form.reset();
    } catch (error) {
        console.error('Request save failed:', error);
        message.textContent = 'Could not save. Try again in a moment.';
    }
}

async function saveNetlifyRequest(formData) {
    const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
    });

    if (!response.ok) {
        throw new Error(`Netlify form failed with status ${response.status}`);
    }
}

function isLocalPreview() {
    const hostname = window.location.hostname;

    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname.startsWith('192.168.')
        || hostname.startsWith('10.')
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
}
