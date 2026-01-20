(() => {
	const hexEl = document.getElementById('hex');
	const timeEl = document.getElementById('hex-time');
	const root = document.documentElement;

	const pad = (value) => (value <= 9 ? `0${value}` : `${value}`);

	const srgbToLinear = (value) => {
		const channel = value / 255;
		if (channel <= 0.04045) {
			return channel / 12.92;
		}
		return Math.pow((channel + 0.055) / 1.055, 2.4);
	};

	const linearToSrgb = (value) => {
		if (value <= 0.0031308) {
			return value * 12.92;
		}
		return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
	};

	const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

	const hexToRgb = (hex) => ({
		r: parseInt(hex.slice(1, 3), 16),
		g: parseInt(hex.slice(3, 5), 16),
		b: parseInt(hex.slice(5, 7), 16),
	});

	const rgbToHex = ({ r, g, b }) =>
		`#${[r, g, b]
			.map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
			.join('')}`;

	const luminance = ({ r, g, b }) =>
		0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

	const contrastRatio = (lumA, lumB) => {
		const [hi, lo] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
		return (hi + 0.05) / (lo + 0.05);
	};

	const adjustLuminance = (rgb, target) => {
		const linear = {
			r: srgbToLinear(rgb.r),
			g: srgbToLinear(rgb.g),
			b: srgbToLinear(rgb.b),
		};
		const currentLum = luminance(rgb);
		if (currentLum === target) {
			return rgb;
		}

		if (currentLum > target) {
			const factor = target / currentLum;
			return {
				r: linearToSrgb(linear.r * factor) * 255,
				g: linearToSrgb(linear.g * factor) * 255,
				b: linearToSrgb(linear.b * factor) * 255,
			};
		}

		const factor = (target - currentLum) / (1 - currentLum);
		return {
			r: linearToSrgb(linear.r + (1 - linear.r) * factor) * 255,
			g: linearToSrgb(linear.g + (1 - linear.g) * factor) * 255,
			b: linearToSrgb(linear.b + (1 - linear.b) * factor) * 255,
		};
	};

	const setTextColor = (textColor) => {
		root.style.setProperty('--tc-text-primary', textColor);
		root.style.setProperty('--tc-text-secondary', textColor);
		root.style.setProperty('--tc-link', textColor);
		root.style.setProperty('--tc-action', textColor);
		const isLightText = textColor === '#ffffff';
		root.style.setProperty('--tc-logo-filter', isLightText ? 'invert(1)' : 'none');
		root.style.setProperty('--tc-logo-hover-text', isLightText ? '#000000' : textColor);
		root.style.setProperty('--tc-logo-hover-bg', isLightText ? '#ffffff' : 'var(--tc-background-secondary)');
		root.style.setProperty('--tc-logo-hover-filter', isLightText ? 'none' : 'var(--tc-logo-filter, none)');
		document.body.style.color = textColor;
	};

	const applyHexClock = (rawHex) => {
		const baseRgb = hexToRgb(rawHex);
		const baseLum = luminance(baseRgb);

		const contrastBlack = contrastRatio(baseLum, 0);
		const contrastWhite = contrastRatio(baseLum, 1);

		let textColor = contrastBlack >= contrastWhite ? '#000000' : '#ffffff';
		let finalRgb = baseRgb;

		if (contrastBlack < 7 && contrastWhite < 7) {
			const targetLum = baseLum < 0.2 ? 0.1 : 0.3;
			textColor = targetLum === 0.1 ? '#ffffff' : '#000000';
			finalRgb = adjustLuminance(baseRgb, targetLum);
		}

		const finalHex = rgbToHex(finalRgb);
		root.style.backgroundColor = finalHex;
		document.body.style.backgroundColor = finalHex;
		setTextColor(textColor);

		if (hexEl) {
			hexEl.textContent = finalHex;
		}
		return { finalHex, textColor };
	};

	const displayTime = () => {
		const d = new Date();
		const h = pad(d.getHours());
		const m = pad(d.getMinutes());
		const s = pad(d.getSeconds());

		const rawHex = `#${h}${m}${s}`;
		applyHexClock(rawHex);

		if (timeEl) {
			timeEl.textContent = `${h}:${m}:${s}`;
		}

		setTimeout(displayTime, 1000);
	};

	displayTime();
})();
