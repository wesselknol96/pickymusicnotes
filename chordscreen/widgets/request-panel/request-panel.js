document.getElementById('request-form').addEventListener('submit', handleRequestSubmit);

function handleRequestSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const message = document.getElementById('request-message');
    const name = formData.get('name').trim();
    const request = formData.get('request').trim();

    if (!name || !request) return;

    saveLocalRequest({ name, request, createdAt: new Date().toISOString() });
    message.textContent = 'Request noted locally. GitHub Pages needs a connected form service to send it.';
    form.reset();
}

function saveLocalRequest(request) {
    try {
        const key = 'pickyMusicChangeRequests';
        const stored = localStorage.getItem(key);
        const requests = stored ? JSON.parse(stored) : [];
        requests.push(request);
        localStorage.setItem(key, JSON.stringify(requests));
    } catch {
        return;
    }
}
