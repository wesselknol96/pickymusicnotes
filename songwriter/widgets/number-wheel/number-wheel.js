function createOptionWheel({ className = '', value, options, onChange }) {
    const wheel = createNumberWheel({
        value,
        options,
        format: optionValue => options.find(option => option.value === optionValue)?.label || String(optionValue),
        onChange
    });
    wheel.classList.add(...className.split(' ').filter(Boolean));
    return wheel;
}

function createNumberWheel({ value, min, max, step = 1, options = null, format = value => String(value), onChange }) {
    const wheel = document.createElement('div');
    wheel.className = 'number-wheel';
    wheel.tabIndex = 0;
    wheel.dataset.value = String(normalizeWheelValue(value, { min, max, step, options }));
    wheel._wheelConfig = { min, max, step, options, format, onChange };

    const typed = document.createElement('input');
    typed.className = 'wheel-input';
    typed.type = 'text';
    typed.inputMode = 'decimal';
    typed.value = format(Number(wheel.dataset.value));
    typed.addEventListener('focus', () => {
        typed.value = format(Number(wheel.dataset.value));
    });
    typed.addEventListener('input', () => {
        const typedValue = parseWheelInput(typed.value, configOrWheel(wheel));
        if (typedValue === null) return;
        updateNumberWheel(wheel, typedValue);
        wheel._wheelConfig.onChange?.(Number(wheel.dataset.value));
    });
    typed.addEventListener('blur', () => {
        updateNumberWheel(wheel, Number(wheel.dataset.value));
    });
    typed.addEventListener('click', event => {
        event.stopPropagation();
    });
    typed.addEventListener('wheel', event => {
        event.preventDefault();
        event.stopPropagation();
        const direction = event.deltaY > 0 ? -1 : 1;
        stepNumberWheel(wheel, direction);
    }, { passive: false });
    wheel.appendChild(typed);

    ['next', 'current', 'previous'].forEach(part => {
        const span = document.createElement('span');
        span.className = `wheel-number ${part}`;
        wheel.appendChild(span);
    });

    wheel.addEventListener('wheel', event => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        stepNumberWheel(wheel, direction);
    }, { passive: false });

    wheel.addEventListener('click', event => {
        const rect = wheel.getBoundingClientRect();
        stepNumberWheel(wheel, event.clientY < rect.top + rect.height / 2 ? 1 : -1);
    });

    wheel.addEventListener('keydown', event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        stepNumberWheel(wheel, event.key === 'ArrowUp' ? 1 : -1);
    });

    updateNumberWheel(wheel, Number(wheel.dataset.value));
    return wheel;
}

function configOrWheel(wheel) {
    return wheel._wheelConfig;
}

function stepNumberWheel(wheel, direction) {
    const config = wheel._wheelConfig;
    const values = getWheelValues(config);
    const current = Number(wheel.dataset.value);
    const index = values.findIndex(value => value === current);
    const nextIndex = clamp(index + direction, 0, values.length - 1);
    const nextValue = values[nextIndex] ?? current;
    wheel.classList.remove('scroll-up', 'scroll-down');
    void wheel.offsetWidth;
    wheel.classList.add(direction > 0 ? 'scroll-up' : 'scroll-down');
    updateNumberWheel(wheel, nextValue);
    config.onChange?.(nextValue);
}

function updateNumberWheel(wheel, value) {
    const config = wheel._wheelConfig;
    const values = getWheelValues(config);
    const normalized = normalizeWheelValue(value, config);
    const index = values.findIndex(item => item === normalized);

    wheel.dataset.value = String(normalized);
    wheel.querySelector('.wheel-number.current').textContent = config.format(normalized);
    wheel.querySelector('.wheel-number.next').textContent = values[index + 1] === undefined ? '' : config.format(values[index + 1]);
    wheel.querySelector('.wheel-number.previous').textContent = values[index - 1] === undefined ? '' : config.format(values[index - 1]);
    wheel.querySelector('.wheel-input').value = config.format(normalized);
}

function parseWheelInput(value, config) {
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    if (config.options) {
        const match = config.options.find(option => (
            option.label === trimmed || String(option.value) === trimmed || option.aliases?.includes(trimmed)
        ));
        return match ? match.value : null;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeWheelValue(value, config) {
    const values = getWheelValues(config);
    return values.reduce((closest, item) => (
        Math.abs(item - Number(value)) < Math.abs(closest - Number(value)) ? item : closest
    ), values[0]);
}

function getWheelValues(config) {
    if (config.options) return config.options.map(option => option.value);
    const values = [];
    for (let value = config.min; value <= config.max; value += config.step) {
        values.push(value);
    }
    return values;
}
