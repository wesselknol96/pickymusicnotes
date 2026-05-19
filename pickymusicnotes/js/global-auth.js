const globalAuthState = {
    client: null,
    user: null,
    profile: null,
    message: '',
    mode: 'login'
};

document.addEventListener('DOMContentLoaded', initializeGlobalAuth);

async function initializeGlobalAuth() {
    const config = window.PICKY_SUPABASE || {};
    if (config.url && config.anonKey && !config.anonKey.includes('YOUR_PUBLIC')) {
        globalAuthState.client = window.supabase.createClient(config.url, config.anonKey);
        const { data } = await globalAuthState.client.auth.getSession();
        await applyGlobalSession(data.session);
        globalAuthState.client.auth.onAuthStateChange(async (_event, session) => {
            await applyGlobalSession(session);
            renderGlobalAuth();
            refreshSongwriterAuth();
        });
    } else {
        globalAuthState.message = 'Add your Supabase anon key to enable login.';
    }

    document.getElementById('global-auth-close')?.addEventListener('click', closeGlobalAuth);
    document.getElementById('global-auth-modal')?.addEventListener('click', event => {
        if (event.target.id === 'global-auth-modal') closeGlobalAuth();
    });
    document.getElementById('global-auth-form')?.addEventListener('click', event => event.stopPropagation());
    document.getElementById('global-auth-form')?.addEventListener('pointerdown', event => event.stopPropagation());
    document.getElementById('global-auth-form')?.addEventListener('submit', event => {
        event.preventDefault();
        submitGlobalAuth();
    });
    document.getElementById('global-password-toggle')?.addEventListener('click', () => {
        togglePassword('global-auth-password', 'global-password-toggle');
    });
    document.getElementById('global-auth-secondary')?.addEventListener('click', () => {
        setGlobalAuthMode(globalAuthState.mode === 'signup' ? 'login' : 'signup');
    });
    document.getElementById('global-auth-forgot')?.addEventListener('click', () => setGlobalAuthMode('forgot'));
    document.getElementById('global-auth-out')?.addEventListener('click', globalSignOut);
    window.addEventListener('message', event => {
        if (event.data?.type === 'auth:open') openGlobalAuth();
        if (event.data?.type === 'auth:signOut') globalSignOut();
    });

    renderGlobalAuth();
}

async function applyGlobalSession(session) {
    globalAuthState.user = session?.user || null;
    globalAuthState.profile = globalAuthState.user ? await ensureGlobalProfile() : null;
    if (globalAuthState.user && !['profile'].includes(globalAuthState.mode)) {
        globalAuthState.mode = 'profile';
    }
    if (!globalAuthState.user && globalAuthState.mode === 'profile') {
        globalAuthState.mode = 'login';
    }
}

async function ensureGlobalProfile() {
    const fallbackName = globalAuthState.user.user_metadata?.display_name || globalAuthState.user.email || 'Songwriter';
    const existing = await globalAuthState.client
        .from('profiles')
        .select('id, display_name, is_admin')
        .eq('id', globalAuthState.user.id)
        .maybeSingle();

    if (existing.data) return existing.data;

    const { data, error } = await globalAuthState.client
        .from('profiles')
        .insert({
            id: globalAuthState.user.id,
            display_name: fallbackName
        })
        .select('id, display_name, is_admin')
        .single();

    if (error) {
        console.warn('Could not create profile.', error);
        return { display_name: fallbackName, is_admin: false };
    }
    return data;
}

function renderGlobalAuth() {
    const button = document.getElementById('global-auth-button');
    const label = document.getElementById('global-auth-label');
    const message = document.getElementById('global-auth-message');
    if (!button || !label || !message) return;

    const name = globalDisplayName();
    button.textContent = globalAuthState.user ? initials(name) : 'in';
    button.title = globalAuthState.user ? `Open menu for ${name}` : 'Open account menu';
    label.textContent = globalAuthTitle();
    message.textContent = globalAuthState.message;
    renderGlobalAuthMode();
    window.updateAppMenuProfile?.({
        initials: globalAuthState.user ? initials(name) : 'in',
        name: globalAuthState.user ? name : 'Local browser',
        email: globalAuthState.user?.email || 'Niet ingelogd',
        signedIn: Boolean(globalAuthState.user)
    });
}

function globalAuthTitle() {
    if (globalAuthState.mode === 'signup') return 'Account aanmaken';
    if (globalAuthState.mode === 'forgot') return 'Wachtwoord vergeten';
    if (globalAuthState.mode === 'reset') return 'Nieuw wachtwoord';
    if (globalAuthState.mode === 'profile') return 'Account';
    return 'Log in';
}

function setGlobalAuthMode(mode) {
    globalAuthState.mode = globalAuthState.user ? 'profile' : (mode || 'login');
    globalAuthState.message = '';
    renderGlobalAuth();
}

function renderGlobalAuthMode() {
    const signedIn = Boolean(globalAuthState.user);
    const mode = signedIn ? 'profile' : globalAuthState.mode;
    const nameField = document.querySelector('[data-auth-field="name"]');
    const emailField = document.querySelector('[data-auth-field="email"]');
    const codeField = document.querySelector('[data-auth-field="code"]');
    const passwordField = document.getElementById('global-auth-password')?.closest('.global-auth-field');
    const newPasswordField = document.querySelector('[data-auth-field="new-password"]');
    const confirmPasswordField = document.querySelector('[data-auth-field="confirm-password"]');
    const emailInput = document.getElementById('global-auth-email');
    const passwordInput = document.getElementById('global-auth-password');
    const codeInput = document.getElementById('global-auth-code');
    const newPasswordInput = document.getElementById('global-auth-new-password');
    const confirmPasswordInput = document.getElementById('global-auth-confirm-password');
    const primary = document.getElementById('global-auth-primary');
    const secondary = document.getElementById('global-auth-secondary');
    const forgot = document.getElementById('global-auth-forgot');
    const outButton = document.getElementById('global-auth-out');

    if (nameField) nameField.hidden = !['signup', 'profile'].includes(mode);
    if (emailField) emailField.hidden = mode === 'profile';
    if (codeField) codeField.hidden = mode !== 'reset';
    if (passwordField) passwordField.hidden = !['login', 'signup'].includes(mode);
    if (newPasswordField) newPasswordField.hidden = mode !== 'reset';
    if (confirmPasswordField) confirmPasswordField.hidden = mode !== 'reset';

    if (emailInput) emailInput.required = ['login', 'signup', 'forgot', 'reset'].includes(mode);
    if (passwordInput) passwordInput.required = ['login', 'signup'].includes(mode);
    if (codeInput) codeInput.required = mode === 'reset';
    if (newPasswordInput) newPasswordInput.required = mode === 'reset';
    if (confirmPasswordInput) confirmPasswordInput.required = mode === 'reset';

    if (signedIn) document.getElementById('global-auth-name').value = globalDisplayName();
    if (primary) {
        primary.hidden = false;
        primary.textContent = mode === 'signup'
            ? 'Registreren'
            : mode === 'forgot'
                ? 'Send code'
                : mode === 'reset'
                    ? 'Wijzig wachtwoord'
                    : mode === 'profile'
                        ? 'Display name wijzigen'
                        : 'Log in';
    }
    if (secondary) {
        secondary.hidden = signedIn || mode === 'forgot' || mode === 'reset';
        secondary.textContent = mode === 'signup' ? 'Terug naar login' : 'Registreren';
    }
    if (forgot) {
        forgot.hidden = signedIn || mode === 'forgot' || mode === 'reset';
        forgot.textContent = 'Wachtwoord vergeten?';
    }
    if (outButton) outButton.hidden = !signedIn;
}

function globalDisplayName() {
    return globalAuthState.profile?.display_name || globalAuthState.user?.user_metadata?.display_name || globalAuthState.user?.email || '';
}

function initials(name) {
    const cleaned = String(name || '').trim();
    if (!cleaned) return 'in';
    return cleaned.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function openGlobalAuth() {
    globalAuthState.mode = globalAuthState.user ? 'profile' : 'login';
    document.getElementById('global-auth-modal').hidden = false;
    renderGlobalAuth();
}

function closeGlobalAuth() {
    document.getElementById('global-auth-modal').hidden = true;
}

async function submitGlobalAuth() {
    if (globalAuthState.mode === 'signup') return globalSignUp();
    if (globalAuthState.mode === 'forgot') return sendPasswordReset();
    if (globalAuthState.mode === 'reset') return resetPasswordWithCode();
    if (globalAuthState.user) return updateDisplayName();
    return globalSignIn();
}

async function globalSignIn() {
    if (!globalAuthState.client) return showGlobalAuthMessage('Paste your Supabase anon key first.');

    const email = document.getElementById('global-auth-email').value.trim();
    const password = document.getElementById('global-auth-password').value;
    const { error } = await globalAuthState.client.auth.signInWithPassword({ email, password });
    if (error) return showGlobalAuthMessage(error.message);

    globalAuthState.message = 'Logged in.';
    closeGlobalAuth();
    renderGlobalAuth();
}

async function globalSignUp() {
    if (!globalAuthState.client) return showGlobalAuthMessage('Paste your Supabase anon key first.');

    const email = document.getElementById('global-auth-email').value.trim();
    const password = document.getElementById('global-auth-password').value;
    const display_name = document.getElementById('global-auth-name').value.trim() || email;
    const { error } = await globalAuthState.client.auth.signUp({
        email,
        password,
        options: { data: { display_name } }
    });
    if (error) return showGlobalAuthMessage(error.message);

    const session = await globalAuthState.client.auth.getSession();
    if (!session.data.session) {
        const login = await globalAuthState.client.auth.signInWithPassword({ email, password });
        if (login.error) return showGlobalAuthMessage('Account gemaakt. Bevestig je email als Supabase daarom vraagt.');
    }

    globalAuthState.message = 'Account gemaakt en ingelogd.';
    closeGlobalAuth();
    renderGlobalAuth();
}

async function sendPasswordReset() {
    if (!globalAuthState.client) return showGlobalAuthMessage('Paste your Supabase anon key first.');

    const email = document.getElementById('global-auth-email').value.trim();
    const { error } = await globalAuthState.client.auth.resetPasswordForEmail(email);
    if (error) return showGlobalAuthMessage(error.message);

    globalAuthState.mode = 'reset';
    globalAuthState.message = 'Code verstuurd. Vul de code en je nieuwe wachtwoord hieronder in.';
    renderGlobalAuth();
}

async function resetPasswordWithCode() {
    if (!globalAuthState.client) return showGlobalAuthMessage('Paste your Supabase anon key first.');

    const email = document.getElementById('global-auth-email').value.trim();
    const token = document.getElementById('global-auth-code').value.trim();
    const password = document.getElementById('global-auth-new-password').value;
    const confirm = document.getElementById('global-auth-confirm-password').value;
    if (password.length < 6 || password !== confirm) {
        return showGlobalAuthMessage('Vul twee keer hetzelfde wachtwoord in, minimaal 6 tekens.');
    }

    const verified = await globalAuthState.client.auth.verifyOtp({ email, token, type: 'recovery' });
    if (verified.error) return showGlobalAuthMessage(verified.error.message);

    const updated = await globalAuthState.client.auth.updateUser({ password });
    if (updated.error) return showGlobalAuthMessage(updated.error.message);

    await globalAuthState.client.auth.signOut();
    globalAuthState.mode = 'login';
    globalAuthState.message = 'Wachtwoord gewijzigd. Log opnieuw in.';
    closeGlobalAuth();
    renderGlobalAuth();
}

async function updateDisplayName() {
    if (!globalAuthState.client || !globalAuthState.user) return;

    const displayName = document.getElementById('global-auth-name').value.trim() || globalAuthState.user.email;
    const authUpdate = await globalAuthState.client.auth.updateUser({ data: { display_name: displayName } });
    const profileUpdate = await globalAuthState.client
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', globalAuthState.user.id)
        .select('id, display_name, is_admin')
        .single();

    if (authUpdate.error || profileUpdate.error) {
        return showGlobalAuthMessage(authUpdate.error?.message || profileUpdate.error?.message);
    }

    globalAuthState.profile = profileUpdate.data;
    globalAuthState.message = 'Display name gewijzigd.';
    renderGlobalAuth();
}

async function globalSignOut() {
    if (!globalAuthState.client) return;
    await globalAuthState.client.auth.signOut();
    globalAuthState.mode = 'login';
    closeGlobalAuth();
    renderGlobalAuth();
}

function showGlobalAuthMessage(message) {
    globalAuthState.message = message;
    renderGlobalAuth();
}

window.openGlobalAuth = openGlobalAuth;
window.globalSignOut = globalSignOut;
window.setGlobalAuthMode = setGlobalAuthMode;

function refreshSongwriterAuth() {
    const frame = document.getElementById('songwriter-frame');
    frame?.contentWindow?.postMessage({ type: 'auth:changed' }, '*');
}

function togglePassword(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;

    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.classList.toggle('showing', !showing);
    button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    button.title = showing ? 'Show password' : 'Hide password';
    input.focus();
}
