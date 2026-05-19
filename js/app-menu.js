const THEME_STORAGE_KEY = 'picky-theme-colors-v6';

const pickyThemeRgbVariables = {
    '--paper': '--paper-rgb',
    '--ink': '--ink-rgb',
    '--soft-ink': '--soft-ink-rgb',
    '--accent': '--accent-rgb',
    '--accent-dark': '--accent-dark-rgb',
    '--accent-soft': '--accent-soft-rgb',
    '--line': '--line-rgb',
    '--danger': '--danger-rgb',
    '--good': '--good-rgb'
};

const pickyThemeSyncedExtras = [
    '--overlay-rgb',
    '--shadow-rgb',
    '--button-surface',
    '--button-surface-strong'
];

const pickyThemeColors = [
    { name: 'Paper', variable: '--paper', value: '#fffaf0', use: 'Panels, cards and songwriter paper' },
    { name: 'Ink', variable: '--ink', value: '#2e2a1f', use: 'Main text, lines and fret numbers' },
    { name: 'Soft ink', variable: '--soft-ink', value: '#746f59', use: 'Secondary text, labels and inactive controls' },
    { name: 'Border line', variable: '--line', value: '#d6cab0', use: 'Panel, input and button borders' },
    { name: 'Accent', variable: '--accent', value: '#d7a51e', use: 'Main emphasis and active details' },
    { name: 'Accent dark', variable: '--accent-dark', value: '#8c6511', use: 'Active text, roots and selected states' },
    { name: 'Accent soft', variable: '--accent-soft', value: '#f3df9b', use: 'Buttons, chord dots and hover states' },
    { name: 'Background A', variable: '--app-bg-a', value: '#4e5c3d', use: 'First app background color' },
    { name: 'Background B', variable: '--app-bg-b', value: '#d7a51e', use: 'Second app background color' },
    { name: 'End line', variable: '--string-wood', value: '#8c6511', use: 'Nut line on the right side of the fretboard tool' },
    { name: 'Tooltip bg', variable: '--tooltip-bg', value: '#272515', use: 'Chord tooltip background' },
    { name: 'Tooltip text', variable: '--tooltip-ink', value: '#fffaf0', use: 'Text and highlights in tooltips' },
    { name: 'Tooltip grid', variable: '--tooltip-grid', value: '#918764', use: 'Grid lines in tooltip chord diagrams' },
    { name: 'Tab cross', variable: '--tab-cross-bg', value: '#f3df9b', use: 'Muted crosses beside the fretboard' },
    { name: 'Section verse', variable: '--section-verse', value: '#6a9c71', use: 'Verse blocks in record player edit mode' },
    { name: 'Section chorus', variable: '--section-chorus', value: '#d7a51e', use: 'Chorus, intro, outro, interlude and solo blocks' },
    { name: 'Section bridge', variable: '--section-bridge', value: '#8575c8', use: 'Bridge, pre-chorus, instrumental, tag and odd blocks' },
    { name: 'Danger', variable: '--danger', value: '#b64c42', use: 'Delete and warning states' },
    { name: 'Good', variable: '--good', value: '#5e8f58', use: 'Success and positive states' }
];

const pickyThemePresets = [
    {
        name: 'Dark Stage',
        colors: {
            '--paper': '#1d2328',
            '--ink': '#eef3f1',
            '--soft-ink': '#a8b4b8',
            '--line': '#3b474d',
            '--accent': '#56a6d6',
            '--accent-dark': '#8fc8e8',
            '--accent-soft': '#263b49',
            '--app-bg-a': '#101820',
            '--app-bg-b': '#263247',
            '--string-wood': '#8fc8e8',
            '--tooltip-bg': '#0f151a',
            '--tooltip-ink': '#eef3f1',
            '--tooltip-grid': '#6f8088',
            '--tab-cross-bg': '#314250',
            '--section-verse': '#58b8a5',
            '--section-chorus': '#d58a52',
            '--section-bridge': '#8f99e6',
            '--danger': '#e06d79',
            '--good': '#65c39a'
        }
    },
    {
        name: 'Deep Red',
        colors: {
            '--paper': '#fff7f0',
            '--ink': '#33211a',
            '--soft-ink': '#7a6056',
            '--line': '#d9bfb2',
            '--accent': '#a8321f',
            '--accent-dark': '#742010',
            '--accent-soft': '#efcabe',
            '--app-bg-a': '#3b1712',
            '--app-bg-b': '#982b18',
            '--string-wood': '#742010',
            '--tooltip-bg': '#261712',
            '--tooltip-ink': '#fff7f0',
            '--tooltip-grid': '#927468',
            '--tab-cross-bg': '#efcabe',
            '--section-verse': '#4f8b7f',
            '--section-chorus': '#a8321f',
            '--section-bridge': '#6e70bf',
            '--danger': '#b23a2d',
            '--good': '#3f8466'
        }
    },
    {
        name: 'Golden Olive',
        colors: {
            '--paper': '#fffaf0',
            '--ink': '#2e2a1f',
            '--soft-ink': '#746f59',
            '--line': '#d6cab0',
            '--accent': '#d7a51e',
            '--accent-dark': '#8c6511',
            '--accent-soft': '#f3df9b',
            '--app-bg-a': '#4e5c3d',
            '--app-bg-b': '#d7a51e',
            '--string-wood': '#8c6511',
            '--tooltip-bg': '#272515',
            '--tooltip-ink': '#fffaf0',
            '--tooltip-grid': '#918764',
            '--tab-cross-bg': '#f3df9b',
            '--section-verse': '#6a9c71',
            '--section-chorus': '#d7a51e',
            '--section-bridge': '#8575c8',
            '--danger': '#b64c42',
            '--good': '#5e8f58'
        }
    },
    {
        name: 'Amber Red',
        colors: {
            '--paper': '#fff9f2',
            '--ink': '#302720',
            '--soft-ink': '#78695e',
            '--line': '#d8c5b5',
            '--accent': '#d98922',
            '--accent-dark': '#9b5b0f',
            '--accent-soft': '#f4dfbd',
            '--app-bg-a': '#61353a',
            '--app-bg-b': '#d98922',
            '--string-wood': '#9b5b0f',
            '--tooltip-bg': '#2a1d19',
            '--tooltip-ink': '#fff9f2',
            '--tooltip-grid': '#9a8372',
            '--tab-cross-bg': '#f4dfbd',
            '--section-verse': '#348c7d',
            '--section-chorus': '#c65142',
            '--section-bridge': '#786bc8',
            '--danger': '#b64242',
            '--good': '#4d8a5f'
        }
    }
];

document.addEventListener('DOMContentLoaded', initializeAppMenu);

function initializeAppMenu() {
    applyStoredTheme();
    renderThemePresets();
    renderColorSettings();
    renderThemeStrip();
    bindAppMenu();
    syncThemeToFrames();
}

function bindAppMenu() {
    const menu = document.getElementById('app-menu');
    const button = document.getElementById('global-auth-button');
    if (!menu || !button) return;

    button.addEventListener('click', event => {
        event.stopPropagation();
        setAppMenuOpen(menu.hidden);
    });

    document.addEventListener('click', event => {
        if (!document.getElementById('app-menu-shell')?.contains(event.target)) {
            setAppMenuOpen(false);
        } else if (!event.target.closest('.custom-color-picker, .color-picker-shell')) {
            closeCustomColorPicker();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setAppMenuOpen(false);
    });

    document.querySelectorAll('.app-menu-tab').forEach(tab => {
        tab.addEventListener('click', () => activateMenuPanel(tab.dataset.menuPanel));
    });

    document.querySelectorAll('[data-auth-open]').forEach(action => {
        action.addEventListener('click', () => {
            setAppMenuOpen(false);
            window.openGlobalAuth?.();
        });
    });

    document.querySelectorAll('[data-auth-logout]').forEach(action => {
        action.addEventListener('click', () => window.globalSignOut?.());
    });

    document.getElementById('color-reset')?.addEventListener('click', resetThemeColors);
    ['songwriter-frame', 'request-frame', 'donate-frame'].forEach(id => {
        document.getElementById(id)?.addEventListener('load', syncThemeToFrames);
    });
}

function setAppMenuOpen(open) {
    const menu = document.getElementById('app-menu');
    const button = document.getElementById('global-auth-button');
    if (!menu || !button) return;

    if (!open) closeCustomColorPicker();
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
}

function activateMenuPanel(panelName) {
    document.querySelectorAll('.app-menu-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.menuPanel === panelName);
    });
    document.querySelectorAll('.app-menu-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `app-menu-${panelName}`);
    });
}

function renderColorSettings() {
    const list = document.getElementById('color-settings-list');
    if (!list) return;

    closeCustomColorPicker();
    list.innerHTML = '';
    pickyThemeColors.forEach(color => {
        const row = document.createElement('div');
        row.className = 'color-setting-row';

        const text = document.createElement('span');
        text.innerHTML = `<span class="color-setting-name">${color.name}</span><span class="color-setting-use">${color.use}</span>`;

        const control = document.createElement('span');
        control.className = 'color-input-wrap';

        const value = getThemeColor(color);

        const picker = document.createElement('button');
        picker.className = 'color-picker-shell';
        picker.type = 'button';
        picker.style.background = value;
        picker.setAttribute('aria-label', `Pick ${color.name} color`);

        const hex = document.createElement('span');
        hex.className = 'color-hex';
        hex.textContent = value;

        picker.addEventListener('click', event => {
            event.stopPropagation();
            openCustomColorPicker(picker, color.variable, nextValue => {
                setThemeColor(color.variable, nextValue);
                picker.style.background = nextValue;
                hex.textContent = nextValue;
                renderThemeStrip();
                saveThemeColors();
                syncThemeToFrames();
            });
        });

        control.append(picker, hex);
        row.append(text, control);
        list.append(row);
    });
}

function openCustomColorPicker(anchor, variable, onChange) {
    closeCustomColorPicker();

    const startValue = getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#ffffff';
    const hsv = hexToHsv(startValue);
    const popover = document.createElement('div');
    popover.className = 'custom-color-picker';

    const wheel = document.createElement('button');
    wheel.className = 'custom-color-wheel';
    wheel.type = 'button';
    wheel.setAttribute('aria-label', 'Choose hue and saturation');

    const thumb = document.createElement('span');
    thumb.className = 'custom-color-thumb';
    wheel.append(thumb);

    const value = document.createElement('input');
    value.className = 'custom-color-value';
    value.type = 'range';
    value.min = '20';
    value.max = '100';
    value.value = String(Math.round(hsv.v * 100));
    value.setAttribute('aria-label', 'Brightness');

    popover.append(wheel, value);
    document.getElementById('app-menu-shell')?.append(popover);

    const placePopover = () => {
        const rect = anchor.getBoundingClientRect();
        popover.style.left = `${Math.max(12, rect.right + 10)}px`;
        popover.style.top = `${Math.max(12, rect.top - 58)}px`;
    };
    const apply = () => {
        hsv.v = Number(value.value) / 100;
        const nextValue = hsvToHex(hsv.h, hsv.s, hsv.v);
        wheel.style.setProperty('--picker-dim', 1 - hsv.v);
        anchor.style.background = nextValue;
        onChange(nextValue);
        updateColorThumb(thumb, hsv);
    };
    const pickFromEvent = event => {
        const rect = wheel.getBoundingClientRect();
        const radius = rect.width / 2;
        const x = event.clientX - rect.left - radius;
        const y = event.clientY - rect.top - radius;
        const distance = Math.min(Math.hypot(x, y), radius);
        hsv.h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        hsv.s = distance / radius;
        apply();
    };

    wheel.addEventListener('pointerdown', event => {
        event.preventDefault();
        wheel.setPointerCapture(event.pointerId);
        pickFromEvent(event);
    });
    wheel.addEventListener('pointermove', event => {
        if (event.buttons) pickFromEvent(event);
    });
    value.addEventListener('input', apply);
    popover.addEventListener('click', event => event.stopPropagation());
    window.addEventListener('resize', closeCustomColorPicker, { once: true });

    placePopover();
    apply();
}

function closeCustomColorPicker() {
    document.querySelector('.custom-color-picker')?.remove();
}

function updateColorThumb(thumb, hsv) {
    const radius = 54;
    const angle = hsv.h * Math.PI / 180;
    const distance = hsv.s * radius;
    thumb.style.left = `${60 + Math.cos(angle) * distance}px`;
    thumb.style.top = `${60 + Math.sin(angle) * distance}px`;
    thumb.style.background = hsvToHex(hsv.h, hsv.s, hsv.v);
}

function renderThemePresets() {
    const presets = document.getElementById('theme-presets');
    if (!presets) return;

    presets.innerHTML = '';
    pickyThemePresets.forEach(preset => {
        const button = document.createElement('button');
        button.className = 'theme-preset-btn';
        button.type = 'button';

        const swatches = document.createElement('span');
        swatches.className = 'theme-preset-swatches';
        ['--paper', '--accent', '--accent-dark', '--app-bg-b'].forEach(variable => {
            const swatch = document.createElement('span');
            swatch.style.background = preset.colors[variable];
            swatches.appendChild(swatch);
        });

        const label = document.createElement('span');
        label.className = 'theme-preset-name';
        label.textContent = preset.name;

        button.append(swatches, label);
        button.addEventListener('click', () => applyThemePreset(preset));
        presets.appendChild(button);
    });
}

function renderThemeStrip() {
    const strip = document.getElementById('theme-strip');
    if (!strip) return;

    strip.innerHTML = '';
    pickyThemeColors.slice(0, 8).forEach(color => {
        const swatch = document.createElement('span');
        swatch.className = 'theme-swatch';
        swatch.style.background = getComputedStyle(document.documentElement).getPropertyValue(color.variable).trim() || color.value;
        strip.append(swatch);
    });
}

function applyThemePreset(preset) {
    pickyThemeColors.forEach(color => {
        setThemeColor(color.variable, preset.colors[color.variable] || color.value);
    });
    renderColorSettings();
    renderThemeStrip();
    saveThemeColors();
    syncThemeToFrames();
}

function getThemeColor(color) {
    const stored = readStoredTheme()[color.variable];
    return stored || color.value;
}

function setThemeColor(variable, value) {
    document.documentElement.style.setProperty(variable, value);
    if (pickyThemeRgbVariables[variable]) {
        document.documentElement.style.setProperty(pickyThemeRgbVariables[variable], hexToRgb(value));
    }
    if (variable === '--ink') document.documentElement.style.setProperty('--overlay-rgb', hexToRgb(value));
}

function saveThemeColors() {
    const values = {};
    pickyThemeColors.forEach(color => {
        values[color.variable] = getComputedStyle(document.documentElement).getPropertyValue(color.variable).trim();
    });
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(values));
}

function applyStoredTheme() {
    const stored = readStoredTheme();
    pickyThemeColors.forEach(color => {
        if (stored[color.variable]) setThemeColor(color.variable, stored[color.variable]);
    });
}

function resetThemeColors() {
    localStorage.removeItem(THEME_STORAGE_KEY);
    pickyThemeColors.forEach(color => setThemeColor(color.variable, color.value));
    renderColorSettings();
    renderThemeStrip();
    syncThemeToFrames();
}

function readStoredTheme() {
    try {
        return JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)) || {};
    } catch (_error) {
        return {};
    }
}

function syncThemeToFrames() {
    ['songwriter-frame', 'request-frame', 'donate-frame'].forEach(id => {
        const frame = document.getElementById(id);
        const root = frame?.contentDocument?.documentElement;
        if (!root) return;

        pickyThemeColors.forEach(color => {
            const value = getComputedStyle(document.documentElement).getPropertyValue(color.variable).trim();
            root.style.setProperty(color.variable, value);
            if (pickyThemeRgbVariables[color.variable]) {
                root.style.setProperty(pickyThemeRgbVariables[color.variable], hexToRgb(value));
            }
        });
        pickyThemeSyncedExtras.forEach(variable => {
            root.style.setProperty(variable, getComputedStyle(document.documentElement).getPropertyValue(variable).trim());
        });
    });
}

function updateAppMenuProfile(profile) {
    const avatar = document.getElementById('menu-profile-avatar');
    const name = document.getElementById('menu-profile-name');
    const email = document.getElementById('menu-profile-email');
    const copy = document.getElementById('menu-profile-copy');
    const login = document.getElementById('menu-login-action');
    const settings = document.getElementById('menu-account-action');
    const logout = document.getElementById('menu-logout-action');
    if (!avatar || !name || !email) return;

    avatar.textContent = profile.initials;
    name.textContent = profile.name || 'Local browser';
    email.textContent = profile.email || 'Niet ingelogd';
    const signedIn = Boolean(profile.signedIn);
    if (copy) copy.textContent = signedIn
        ? 'Wijzig je display name of log uit.'
        : 'Log in om je online songs en account instellingen te gebruiken.';
    if (login) login.hidden = signedIn;
    if (settings) {
        settings.hidden = !signedIn;
        settings.textContent = 'Display name';
        settings.classList.remove('primary');
    }
    if (logout) logout.hidden = !signedIn;
}

function hexToRgb(hex, openFunction = false) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return openFunction ? `rgba(${r}, ${g}, ${b}` : `${r}, ${g}, ${b}`;
}

function hexToHsv(hex) {
    const [r, g, b] = hex.replace('#', '').match(/.{2}/g).map(channel => parseInt(channel, 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta && max === r) h = 60 * (((g - b) / delta) % 6);
    if (delta && max === g) h = 60 * ((b - r) / delta + 2);
    if (delta && max === b) h = 60 * ((r - g) / delta + 4);
    return {
        h: (h + 360) % 360,
        s: max ? delta / max : 0,
        v: max
    };
}

function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return `#${[r, g, b].map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

window.updateAppMenuProfile = updateAppMenuProfile;
