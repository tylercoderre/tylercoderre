(() => {
	const root = document.documentElement;
	root.classList.add('js');
	const storageKey = 'tc-theme';
	const soundStorageKey = 'tc-sound';
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const isFileProtocol = window.location.protocol === 'file:';
	const canPersistStorage = (() => {
		try {
			localStorage.setItem('__tc_theme_test__', '1');
			localStorage.removeItem('__tc_theme_test__');
			return true;
		} catch (error) {
			return false;
		}
	})();
	const shouldUseLinkTheme = isFileProtocol || !canPersistStorage;

	const getStoredTheme = () => {
		try {
			return localStorage.getItem(storageKey);
		} catch (error) {
			return null;
		}
	};

	const getStoredSound = () => {
		try {
			return localStorage.getItem(soundStorageKey);
		} catch (error) {
			return null;
		}
	};

	const getNameTheme = () => {
		if (!window.name) {
			return null;
		}

		if (window.name === 'dark' || window.name === 'light') {
			return window.name;
		}

		try {
			const data = JSON.parse(window.name);
			if (data && (data[storageKey] === 'dark' || data[storageKey] === 'light')) {
				return data[storageKey];
			}
		} catch (error) {
			return null;
		}

		return null;
	};

	const getUrlTheme = () => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get('theme');
		if (theme === 'dark' || theme === 'light') {
			return theme;
		}
		return null;
	};

	const setStoredTheme = (theme) => {
		try {
			localStorage.setItem(storageKey, theme);
		} catch (error) {
			// Ignore storage errors (private mode, disabled storage, etc.)
		}
	};

	const setStoredSound = (sound) => {
		try {
			localStorage.setItem(soundStorageKey, sound);
		} catch (error) {
			// Ignore storage errors (private mode, disabled storage, etc.)
		}
	};

	const setNameTheme = (theme) => {
		try {
			let data = {};

			if (window.name && window.name !== 'dark' && window.name !== 'light') {
				try {
					data = JSON.parse(window.name) || {};
				} catch (error) {
					data = {};
				}
			}

			data[storageKey] = theme;
			window.name = JSON.stringify(data);
		} catch (error) {
			window.name = theme;
		}
	};

	const getNameSound = () => {
		if (!window.name) {
			return null;
		}

		try {
			const data = JSON.parse(window.name);
			if (data && (data[soundStorageKey] === 'on' || data[soundStorageKey] === 'off')) {
				return data[soundStorageKey];
			}
		} catch (error) {
			return null;
		}

		return null;
	};

	const setNameSound = (sound) => {
		try {
			let data = {};

			if (window.name && window.name !== 'dark' && window.name !== 'light') {
				try {
					data = JSON.parse(window.name) || {};
				} catch (error) {
					data = {};
				}
			}

			data[soundStorageKey] = sound;
			window.name = JSON.stringify(data);
		} catch (error) {
			window.name = sound;
		}
	};

	const getUserTheme = () => {
		const storedTheme = canPersistStorage ? getStoredTheme() : null;
		if (storedTheme === 'dark' || storedTheme === 'light') {
			return storedTheme;
		}

		const nameTheme = getNameTheme();
		if (nameTheme === 'dark' || nameTheme === 'light') {
			return nameTheme;
		}

		return null;
	};

	const getUserSound = () => {
		const storedSound = canPersistStorage ? getStoredSound() : null;
		if (storedSound === 'on' || storedSound === 'off') {
			return storedSound;
		}

		const nameSound = getNameSound();
		if (nameSound === 'on' || nameSound === 'off') {
			return nameSound;
		}

		return null;
	};

	const resolveTheme = () => {
		const urlTheme = getUrlTheme();
		if (urlTheme) {
			return urlTheme;
		}

		const userTheme = getUserTheme();
		if (userTheme) {
			return userTheme;
		}

		return mediaQuery.matches ? 'dark' : 'light';
	};

	const applyTheme = (theme) => {
		const nextTheme = theme === 'dark' ? 'dark' : 'light';
		root.setAttribute('data-theme', nextTheme);
		updateThemeColor();
	};

	const applySound = (sound) => {
		const nextSound = sound === 'off' ? 'off' : 'on';
		root.setAttribute('data-sound', nextSound);
	};

	const scriptRef = document.querySelector('script[src$="assets/scripts/scripts.js"]');
	const getInterfaceSoundUrl = (filename) => {
		if (scriptRef && scriptRef.src) {
			return new URL(`../media/interface/${filename}`, scriptRef.src).toString();
		}
		return `/assets/media/interface/${filename}`;
	};

	const interfaceSounds = new Map();

	const getInterfaceSound = (filename) => {
		if (typeof Audio !== 'function') {
			return null;
		}
		if (!interfaceSounds.has(filename)) {
			const audio = new Audio(getInterfaceSoundUrl(filename));
			audio.preload = 'auto';
			interfaceSounds.set(filename, audio);
		}
		return interfaceSounds.get(filename);
	};

	const playInterfaceSound = (filename, options = {}) => {
		const { force = false } = options;
		if (!force && root.getAttribute('data-sound') === 'off') {
			return;
		}

		const audio = getInterfaceSound(filename);
		if (!audio) {
			return;
		}

		try {
			audio.currentTime = 0;
			const playPromise = audio.play();
			if (playPromise && typeof playPromise.catch === 'function') {
				playPromise.catch(() => {
					// Ignore playback failures (missing file, blocked autoplay, etc.)
				});
			}
		} catch (error) {
			// Ignore sound playback errors.
		}
	};

	const updateThemeColor = () => {
		const meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			return;
		}

		const value = getComputedStyle(root).getPropertyValue('--tc-background').trim();
		if (value) {
			meta.setAttribute('content', value);
		}
	};

	const updateThemeLinks = (theme) => {
		if (!shouldUseLinkTheme) {
			return;
		}

		const links = document.querySelectorAll('a[href]');
		const currentTheme = theme === 'dark' ? 'dark' : 'light';

		links.forEach((link) => {
			const href = link.getAttribute('href');
			if (!href || href.startsWith('#') || href.startsWith('//')) {
				return;
			}

			if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
				return;
			}

			const [base, hash] = href.split('#');
			const [path, queryString] = base.split('?');
			const params = new URLSearchParams(queryString || '');
			params.set('theme', currentTheme);

			const nextHref = `${path}?${params.toString()}${hash ? `#${hash}` : ''}`;
			link.setAttribute('href', nextHref);
		});
	};

	const initialTheme = resolveTheme();
	if (getUrlTheme() === initialTheme) {
		if (canPersistStorage) {
			setStoredTheme(initialTheme);
		}
		setNameTheme(initialTheme);
	}
	applyTheme(initialTheme);
	applySound(getUserSound() || 'on');

	const initClock = () => {
		const clockEl = document.querySelector('#clock');
		if (!clockEl) {
			return;
		}

		const tempEl = document.querySelector('#temp');
		const weatherIconEl = document.querySelector('.weather__icon');
		const timeZone = clockEl.getAttribute('data-timezone') || 'America/New_York';
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		});

		const updateClock = () => {
			clockEl.textContent = formatter.format(new Date());
		};

		const conditionIconMap = {
			Clear: 'fa-sun',
			Clouds: 'fa-clouds',
			Drizzle: 'fa-cloud-drizzle',
			Rain: 'fa-cloud-rain',
			Thunderstorm: 'fa-cloud-bolt',
			Snow: 'fa-cloud-snow',
			Mist: 'fa-cloud-fog',
			Smoke: 'fa-smog',
			Haze: 'fa-sun-haze',
			Dust: 'fa-sun-dust',
			Fog: 'fa-fog',
			Sand: 'fa-sun-dust',
			Ash: 'fa-smog',
			Squall: 'fa-wind',
			Tornado: 'fa-tornado',
			Default: 'fa-cloud'
		};

		const updateTemperature = async () => {
			if (!tempEl) {
				return;
			}

			const apiKey = 'a41c006d2ee7b466f3d445df68ef65fe';
			const city = 'Buffalo';
			const units = 'imperial';
			const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`;

			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Weather request failed');
				}
				const data = await response.json();
				const temp = Math.round(data.main.temp);
				const condition = data.weather && data.weather[0] ? data.weather[0].main : 'Clear';
				const iconClass = conditionIconMap[condition] || conditionIconMap.Default;
				tempEl.textContent = `${temp}`;
				if (weatherIconEl) {
					weatherIconEl.className = `weather__icon fa-sharp fa-regular ${iconClass}`;
					weatherIconEl.setAttribute('title', condition);
				}
			} catch (error) {
				tempEl.textContent = 'Unable to load temperature';
			}
		};

		updateClock();
		setInterval(updateClock, 1000);

		if (tempEl) {
			updateTemperature();
			setInterval(updateTemperature, 10 * 60 * 1000);
		}
	};

	const initFormValidation = () => {
		const form = document.querySelector('#contact form');
		const fields = form ? form.querySelectorAll('#name, #email') : [];

		if (!form || fields.length === 0) {
			return;
		}
		form.setAttribute('novalidate', 'novalidate');

		const updateField = (field) => {
			field.dataset.touched = 'true';
			if (field.checkValidity()) {
				field.removeAttribute('aria-invalid');
			} else {
				field.setAttribute('aria-invalid', 'true');
			}
		};

		form.addEventListener('submit', (event) => {
			let firstInvalid = null;

			fields.forEach((field) => {
				updateField(field);
				if (!firstInvalid && !field.checkValidity()) {
					firstInvalid = field;
				}
			});

			if (firstInvalid) {
				event.preventDefault();
				firstInvalid.focus();
			}
		});

		fields.forEach((field) => {
			field.addEventListener('blur', () => updateField(field));
			field.addEventListener('input', () => {
				if (field.dataset.touched === 'true') {
					updateField(field);
				}
			});
		});
	};

	const initThemeToggle = () => {
		const toggle = document.querySelector('[data-theme-toggle]');

		const setTheme = (theme, persist = false) => {
			const nextTheme = theme === 'dark' ? 'dark' : 'light';
			applyTheme(nextTheme);

			if (toggle) {
				const isDark = nextTheme === 'dark';
				toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
				toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
				toggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
			}

			if (persist) {
				if (canPersistStorage) {
					setStoredTheme(nextTheme);
				}
				setNameTheme(nextTheme);
			}

			updateThemeLinks(nextTheme);
		};

		const userTheme = getUserTheme();
		const systemTheme = mediaQuery.matches ? 'dark' : 'light';
		setTheme(userTheme || systemTheme);

		if (!userTheme) {
			mediaQuery.addEventListener('change', (event) => {
				const latestTheme = getUserTheme();
				if (latestTheme) {
					return;
				}
				setTheme(event.matches ? 'dark' : 'light');
			});
		}

			if (toggle) {
				toggle.addEventListener('click', () => {
					const currentTheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
					const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
					setTheme(nextTheme, true);
					playInterfaceSound(nextTheme === 'dark' ? 'toggle_off.wav' : 'toggle_on.wav');
				});
			}
		};

	const initSoundToggle = () => {
		const soundToggle = document.querySelector('[data-sound-toggle]');

		const setSound = (sound, persist = false) => {
			const nextSound = sound === 'off' ? 'off' : 'on';
			const isSoundOn = nextSound === 'on';
			applySound(nextSound);

			if (soundToggle) {
				soundToggle.setAttribute('aria-pressed', isSoundOn ? 'true' : 'false');
				soundToggle.setAttribute('aria-label', isSoundOn ? 'Mute sounds' : 'Unmute sounds');
				soundToggle.setAttribute('title', isSoundOn ? 'Mute sounds' : 'Unmute sounds');
			}

			if (persist) {
				if (canPersistStorage) {
					setStoredSound(nextSound);
				}
				setNameSound(nextSound);
			}
		};

		const userSound = getUserSound();
		setSound(userSound || 'on');

		if (soundToggle) {
			soundToggle.addEventListener('click', () => {
				const currentSound = root.getAttribute('data-sound') === 'off' ? 'off' : 'on';
				const nextSound = currentSound === 'on' ? 'off' : 'on';

				if (nextSound === 'off') {
					playInterfaceSound('toggle_off.wav', { force: true });
					setSound(nextSound, true);
					return;
				}

				setSound(nextSound, true);
				playInterfaceSound('toggle_on.wav', { force: true });
			});
		}
	};

	const initButtonSounds = () => {
		const resolveButton = (target) => {
			if (!(target instanceof Element)) {
				return null;
			}
			return target.closest('button');
		};

		const resolveLink = (target) => {
			if (!(target instanceof Element)) {
				return null;
			}
			return target.closest('a[href]');
		};

		const isManagedToggle = (button) => button.matches('[data-theme-toggle], [data-sound-toggle]');

		document.addEventListener('pointerdown', (event) => {
			const button = resolveButton(event.target);
			if (button) {
				if (button.disabled || isManagedToggle(button)) {
					return;
				}
				if (event.pointerType === 'mouse' && event.button !== 0) {
					return;
				}
				playInterfaceSound('tap_05.wav');
				return;
			}

			const link = resolveLink(event.target);
			if (!link) {
				return;
			}
			if (event.pointerType === 'mouse' && event.button !== 0) {
				return;
			}
			playInterfaceSound('tap_04.wav');
		}, true);

		document.addEventListener('keydown', (event) => {
			if (event.repeat) {
				return;
			}

			const button = resolveButton(event.target);
			if (button) {
				if (button.disabled || isManagedToggle(button)) {
					return;
				}
				if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
					return;
				}
				playInterfaceSound('tap_05.wav');
				return;
			}

			const link = resolveLink(event.target);
			if (!link) {
				return;
			}
			if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
				return;
			}
			playInterfaceSound('tap_04.wav');
		}, true);
	};

	const initSelectionSounds = () => {
		const checkedRadioByGroup = new Map();

		const getRadioGroupKey = (radio) => {
			const form = radio.form;
			let formKey = 'document';
			if (form) {
				if (form.id) {
					formKey = `form#${form.id}`;
				} else {
					const forms = Array.from(document.forms);
					const formIndex = forms.indexOf(form);
					formKey = `form@${formIndex}`;
				}
			}
			const groupName = radio.name || '__unnamed__';
			return `${formKey}::${groupName}`;
		};

		document.querySelectorAll('input[type="radio"]:checked').forEach((radio) => {
			checkedRadioByGroup.set(getRadioGroupKey(radio), radio);
		});

		document.addEventListener('change', (event) => {
			const target = event.target;
			if (!(target instanceof HTMLInputElement) || target.disabled) {
				return;
			}

			if (target.type === 'checkbox') {
				playInterfaceSound('select.wav');
				return;
			}

			if (target.type !== 'radio') {
				return;
			}

			const groupKey = getRadioGroupKey(target);
			const previous = checkedRadioByGroup.get(groupKey);
			if (previous && previous !== target) {
				// Previous option in this radio group became deselected.
				playInterfaceSound('select.wav');
			}

			if (target.checked) {
				playInterfaceSound('select.wav');
				checkedRadioByGroup.set(groupKey, target);
			}
		}, true);
	};

	const initDetailsSounds = () => {
		document.addEventListener('toggle', (event) => {
			const details = event.target;
			if (!(details instanceof HTMLDetailsElement)) {
				return;
			}
			playInterfaceSound(details.open ? 'tap_01.wav' : 'tap_02.wav');
		}, true);
	};

	const initDialogs = () => {
		const triggers = document.querySelectorAll('[data-dialog-open]');
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		triggers.forEach((trigger) => {
			const dialogId = trigger.getAttribute('data-dialog-open');
			const dialog = dialogId ? document.getElementById(dialogId) : null;

			if (!dialog || typeof dialog.showModal !== 'function') {
				return;
			}

			const openDialog = () => {
				dialog.classList.remove('is-closing');
				dialog.showModal();

				if (prefersReducedMotion) {
					dialog.classList.add('is-visible');
					return;
				}

				window.requestAnimationFrame(() => {
					dialog.classList.add('is-visible');
				});
			};

			const requestClose = () => {
				if (!dialog.open) {
					return;
				}

				if (prefersReducedMotion) {
					dialog.classList.remove('is-visible', 'is-closing');
					dialog.close();
					return;
				}

				dialog.classList.add('is-closing');
				dialog.classList.remove('is-visible');

				const onTransitionEnd = (event) => {
					if (event.target !== dialog || event.propertyName !== 'opacity') {
						return;
					}
					dialog.removeEventListener('transitionend', onTransitionEnd);
					dialog.classList.remove('is-closing');
					dialog.close();
				};

				dialog.addEventListener('transitionend', onTransitionEnd);

				window.setTimeout(() => {
					if (!dialog.open) {
						return;
					}
					dialog.removeEventListener('transitionend', onTransitionEnd);
					dialog.classList.remove('is-closing');
					dialog.close();
				}, 250);
			};

			trigger.addEventListener('click', (event) => {
				event.preventDefault();
				openDialog();
			});

			const closeForm = dialog.querySelector('form[method="dialog"]');
			if (closeForm) {
				closeForm.addEventListener('submit', (event) => {
					event.preventDefault();
					requestClose();
				});
			}

			dialog.querySelectorAll('[data-dialog-close]').forEach((closeTrigger) => {
				closeTrigger.addEventListener('click', (event) => {
					event.preventDefault();
					requestClose();
				});
			});

			dialog.addEventListener('cancel', (event) => {
				event.preventDefault();
				requestClose();
			});

			dialog.addEventListener('close', () => {
				dialog.classList.remove('is-visible', 'is-closing');
			});
		});
	};

	const initBackToTopLinks = () => {
		const topLinks = document.querySelectorAll('a[href="#Top"]');
		if (!topLinks.length) {
			return;
		}

		const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 'auto'
			: 'smooth';

		topLinks.forEach((link) => {
			link.addEventListener('click', (event) => {
				if (
					event.defaultPrevented
					|| event.button !== 0
					|| event.metaKey
					|| event.ctrlKey
					|| event.shiftKey
					|| event.altKey
				) {
					return;
				}

				event.preventDefault();
				window.scrollTo({
					top: 0,
					left: 0,
					behavior: scrollBehavior
				});
			});
		});
	};

	const initCodeCopy = () => {
		const blocks = document.querySelectorAll('[data-code-block]');
		const hasClipboardApi = typeof navigator !== 'undefined'
			&& navigator.clipboard
			&& typeof navigator.clipboard.writeText === 'function';
		const hasExecCommand = typeof document.execCommand === 'function';

		if (!blocks.length || (!hasClipboardApi && !hasExecCommand)) {
			return;
		}

		const fallbackCopy = (text) => {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'fixed';
			textarea.style.top = '0';
			textarea.style.left = '0';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();

			let success = false;
			try {
				success = document.execCommand('copy');
			} catch (error) {
				success = false;
			}

			document.body.removeChild(textarea);
			return success;
		};

		blocks.forEach((block) => {
			const button = block.querySelector('[data-code-copy]');
			const code = block.querySelector('pre code');

			if (!button || !code) {
				return;
			}

			const label = button.querySelector('span');
			const defaultLabel = label ? label.textContent : '';
			let resetTimer = null;

			const setLabel = (nextLabel) => {
				if (!label) {
					return;
				}

				label.textContent = nextLabel;
				window.clearTimeout(resetTimer);
				resetTimer = window.setTimeout(() => {
					label.textContent = defaultLabel;
				}, 2000);
			};

			button.hidden = false;
			button.addEventListener('click', async () => {
				const text = code.textContent || '';

				if (hasClipboardApi) {
					try {
						await navigator.clipboard.writeText(text);
						setLabel('Copied');
						if (!button.matches(':focus-visible')) {
							button.blur();
						}
						return;
					} catch (error) {
						// ignore clipboard errors and fall through
					}
				}

				if (fallbackCopy(text)) {
					setLabel('Copied');
					if (!button.matches(':focus-visible')) {
						button.blur();
					}
					return;
				}

				setLabel('Copy Code');
				if (!button.matches(':focus-visible')) {
					button.blur();
				}
			});
		});
	};

	const initDeviceMockupScrollbars = () => {
		const frames = Array.from(document.querySelectorAll('figure.device > div'));
		if (!frames.length) {
			return;
		}

		const items = frames.map((frame) => {
			const scroller = frame.querySelector(':scope > div');
			if (!scroller) {
				return null;
			}

			const update = () => {
				const scrollHeight = scroller.scrollHeight;
				const clientHeight = scroller.clientHeight;
				if (scrollHeight <= clientHeight + 1) {
					frame.style.setProperty('--device-scrollbar-opacity', '0');
					return;
				}

				const trackHeight = clientHeight;
				const minThumb = 24;
				const thumbHeight = Math.max(trackHeight * (clientHeight / scrollHeight), minThumb);
				const maxScrollTop = scrollHeight - clientHeight;
				const maxThumbTop = Math.max(trackHeight - thumbHeight, 0);
				const thumbTop = maxScrollTop ? (scroller.scrollTop / maxScrollTop) * maxThumbTop : 0;

				frame.style.setProperty('--device-scrollbar-height', `${thumbHeight}px`);
				frame.style.setProperty('--device-scrollbar-offset', `${thumbTop}px`);
				frame.style.setProperty('--device-scrollbar-opacity', '1');
			};

			scroller.addEventListener('scroll', update, { passive: true });
			return { scroller, update };
		}).filter(Boolean);

		const updateAll = () => {
			items.forEach((item) => item.update());
		};

		updateAll();

		if ('ResizeObserver' in window) {
			const observer = new ResizeObserver(updateAll);
			items.forEach((item) => observer.observe(item.scroller));
		} else {
			window.addEventListener('resize', updateAll);
		}
	};

	const initShyHeader = () => {
		const header = document.querySelector('body > header');
		if (!header) {
			return;
		}

		let lastScrollY = window.scrollY || 0;
		let lastDirection = null;
		let upDistance = 0;
		const revealThreshold = 100;
		const headerHeight = () => header.getBoundingClientRect().height;

		const showHeader = () => {
			header.style.transform = 'translateY(0)';
			header.style.pointerEvents = 'auto';
		};

		const hideHeader = () => {
			header.style.transform = 'translateY(-100%)';
			header.style.pointerEvents = 'none';
		};

		const onScroll = () => {
			const currentY = window.scrollY || 0;
			const delta = currentY - lastScrollY;

			if (currentY <= 0) {
				showHeader();
				upDistance = 0;
				lastDirection = 'up';
				lastScrollY = currentY;
				return;
			}

			if (delta > 0) {
				if (currentY > headerHeight()) {
					hideHeader();
				}
				if (lastDirection !== 'down') {
					lastDirection = 'down';
					upDistance = 0;
				}
			} else if (delta < 0) {
				if (lastDirection !== 'up') {
					lastDirection = 'up';
					upDistance = 0;
				}
				upDistance += Math.abs(delta);
				if (upDistance >= revealThreshold) {
					showHeader();
				}
			}

			lastScrollY = currentY;
		};

		showHeader();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', () => {
			lastScrollY = window.scrollY || 0;
		});
	};

	const initPage = () => {
		updateThemeLinks(root.getAttribute('data-theme'));
		updateThemeColor();
		initClock();
		initFormValidation();
		initThemeToggle();
		initSoundToggle();
		initButtonSounds();
		initSelectionSounds();
		initDetailsSounds();
		initDialogs();
		initBackToTopLinks();
		initCodeCopy();
		initDeviceMockupScrollbars();
		initShyHeader();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initPage);
	} else {
		initPage();
	}
})();
