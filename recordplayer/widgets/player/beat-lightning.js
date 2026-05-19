function pulseBeat(song) {
    const lamp = document.getElementById('beat-lamp');
    if (!lamp) return;

    const isBarStart = state.player.beatInBar === 0;
    lamp.classList.toggle('bar-start', isBarStart);
    lamp.classList.toggle('sub-beat', !isBarStart);
    lamp.style.setProperty('--beat-index', String(state.player.beatInBar || 0));
    lamp.style.setProperty('--beat-angle', `${(state.player.beatInBar || 0) * 34}deg`);
    lamp.classList.remove('beat-hit');
    void lamp.offsetWidth;
    lamp.classList.add('beat-hit');
    burstBeatLightning(lamp, isBarStart);
    clearTimeout(lamp._beatHitTimer);
    lamp._beatHitTimer = window.setTimeout(() => {
        lamp.classList.remove('beat-hit');
    }, isBarStart ? 280 : 200);
}

function burstBeatLightning(lamp, strong) {
    const canvas = ensureBeatLightningCanvas(lamp, 'active');
    if (!canvas) return;

    const metrics = sizeBeatLightningCanvas(lamp, canvas);
    if (!metrics) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { center, pixelSize } = metrics;
    const intensity = strong ? 1 : 0.58;
    const hueA = cssRgb(lamp, strong ? '--beat-main-rgb' : '--beat-sub-rgb', '--accent-rgb');
    const hueB = cssRgb(lamp, '--beat-spark-rgb', '--accent-soft-rgb');

    ctx.clearRect(0, 0, pixelSize, pixelSize);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawBeatLightning(ctx, center, pixelSize, strong, intensity, hueA, hueB);

    const started = performance.now();
    cancelAnimationFrame(canvas._fadeFrame);
    const fade = time => {
        const progress = Math.min(1, (time - started) / (strong ? 460 : 330));
        canvas.style.opacity = String((1 - progress) * (strong ? 1 : 0.72));
        if (progress < 1) {
            canvas._fadeFrame = requestAnimationFrame(fade);
        } else {
            ctx.clearRect(0, 0, pixelSize, pixelSize);
            canvas.style.opacity = '0';
        }
    };
    canvas.style.opacity = strong ? '1' : '0.72';
    canvas._fadeFrame = requestAnimationFrame(fade);
}

function drawBeatLightning(ctx, center, pixelSize, strong, intensity, hueA, hueB) {
    const radius = pixelSize * 0.2;
    const boltCount = strong ? 9 : 5;

    for (let i = 0; i < boltCount; i += 1) {
        const start = Math.random() * Math.PI * 2;
        const arc = (strong ? 0.55 : 0.34) + Math.random() * 0.34;
        const outward = strong ? 0.46 : 0.28;
        drawPlasmaArc(ctx, center, radius, start, arc, outward, intensity, hueA, hueB);
    }

    const innerRadius = pixelSize * 0.13;
    const innerBoltCount = strong ? 6 : 4;
    for (let i = 0; i < innerBoltCount; i += 1) {
        const start = Math.random() * Math.PI * 2;
        const arc = (strong ? 0.72 : 0.48) + Math.random() * 0.28;
        drawPlasmaArc(ctx, center, innerRadius, start, arc, strong ? 0.28 : 0.18, strong ? 0.95 : 0.68, hueA, hueB);
    }
}

function cssRgb(element, name, fallbackName) {
    const styles = getComputedStyle(element);
    const value = styles.getPropertyValue(name).trim() || styles.getPropertyValue(fallbackName).trim();
    return /^\d+\s*,\s*\d+\s*,\s*\d+$/.test(value) ? value : '255, 122, 89';
}

function ensureBeatLightningCanvas(lamp, layer = 'active') {
    let canvas = lamp.querySelector(`canvas.beat-lightning-canvas.${layer}`);
    if (canvas) return canvas;

    canvas = document.createElement('canvas');
    canvas.className = `beat-lightning-canvas ${layer}`;
    canvas.setAttribute('aria-hidden', 'true');
    lamp.appendChild(canvas);
    return canvas;
}

function sizeBeatLightningCanvas(lamp, canvas) {
    const rect = lamp.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.65;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelSize = Math.ceil(size * dpr);

    if (!pixelSize) return null;

    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
        canvas.width = pixelSize;
        canvas.height = pixelSize;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
    }

    return {
        center: pixelSize / 2,
        pixelSize
    };
}

function startPassiveBeatLightning(lamp = document.getElementById('beat-lamp')) {
    if (!lamp) return;

    const canvas = ensureBeatLightningCanvas(lamp, 'passive');
    if (!canvas || canvas._passiveTimer) return;

    const hit = () => {
        if (!canvas.isConnected) {
            clearTimeout(canvas._passiveTimer);
            canvas._passiveTimer = null;
            return;
        }

        const beatMs = passiveBeatMs();

        const metrics = sizeBeatLightningCanvas(lamp, canvas);
        if (!metrics) {
            canvas._passiveTimer = window.setTimeout(hit, beatMs);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            canvas._passiveTimer = window.setTimeout(hit, beatMs);
            return;
        }

        const hue = cssRgb(lamp, '--beat-idle-rgb', '--soft-ink-rgb');
        const spark = cssRgb(lamp, '--beat-spark-rgb', '--accent-soft-rgb');
        const { center, pixelSize } = metrics;

        ctx.clearRect(0, 0, pixelSize, pixelSize);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        drawBeatLightning(ctx, center, pixelSize, false, 0.52, hue, spark);

        const started = performance.now();
        cancelAnimationFrame(canvas._fadeFrame);
        const fade = time => {
            const progress = Math.min(1, (time - started) / Math.max(220, beatMs * 0.92));
            const opacity = Math.sin(progress * Math.PI) * 0.58;
            canvas.style.opacity = String(opacity);
            if (progress < 1) {
                canvas._fadeFrame = requestAnimationFrame(fade);
            } else {
                ctx.clearRect(0, 0, pixelSize, pixelSize);
                canvas.style.opacity = '0';
            }
        };
        canvas.style.opacity = '0';
        canvas._fadeFrame = requestAnimationFrame(fade);
        canvas._passiveTimer = window.setTimeout(hit, beatMs);
    };

    hit();
}

function passiveBeatMs() {
    if (typeof currentBpm === 'function') return 60000 / currentBpm();
    const bpm = Number(document.getElementById('play-bpm')?.value) || 96;
    return 60000 / Math.min(240, Math.max(30, bpm));
}

function stopPassiveBeatLightning(lamp = document.getElementById('beat-lamp')) {
    const canvas = lamp?.querySelector('canvas.beat-lightning-canvas.passive');
    if (!canvas) return;

    clearTimeout(canvas._passiveTimer);
    cancelAnimationFrame(canvas._fadeFrame);
    canvas._passiveTimer = null;
    canvas._fadeFrame = null;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.opacity = '0';
}

function drawPlasmaArc(ctx, center, radius, start, arc, outward, intensity, hueA, hueB) {
    const segments = 9 + Math.floor(Math.random() * 5);
    const points = [];
    const direction = Math.random() > 0.5 ? 1 : -1;

    for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const angle = start + direction * arc * t;
        const jitter = (Math.random() - 0.5) * radius * 0.28;
        const branchKick = Math.sin(t * Math.PI) * radius * outward * Math.random();
        const r = radius + jitter + branchKick;
        points.push({
            x: center + Math.cos(angle) * r,
            y: center + Math.sin(angle) * r,
            angle
        });
    }

    drawBoltPath(ctx, points, `rgba(${hueA}, ${0.36 * intensity})`, radius * 0.18);
    drawBoltPath(ctx, points, `rgba(${hueA}, ${0.72 * intensity})`, radius * 0.074);
    drawBoltPath(ctx, points, `rgba(${hueB}, ${0.96 * intensity})`, radius * 0.026);

    points.slice(2, -2).forEach(point => {
        if (Math.random() > 0.58) return;
        const branchLength = radius * (0.2 + Math.random() * 0.42) * intensity;
        const branchAngle = point.angle + (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.55);
        const end = {
            x: point.x + Math.cos(branchAngle) * branchLength,
            y: point.y + Math.sin(branchAngle) * branchLength
        };
        drawBoltPath(ctx, [point, {
            x: (point.x + end.x) / 2 + (Math.random() - 0.5) * radius * 0.12,
            y: (point.y + end.y) / 2 + (Math.random() - 0.5) * radius * 0.12
        }, end], `rgba(${hueB}, ${0.78 * intensity})`, radius * 0.018);
    });
}

function drawBoltPath(ctx, points, strokeStyle, lineWidth) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
}
