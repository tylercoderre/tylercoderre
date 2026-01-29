(() => {
	const root = document.documentElement;
	const storageKey = 'tc-theme';
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
			});
		}
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

	const initMediumFeed = () => {
		const feed = document.querySelector('[data-medium-feed]');
		if (!feed) {
			return;
		}

		const list = feed.querySelector('[data-medium-feed-list]');
		const status = feed.querySelector('[data-medium-feed-status]');
		if (!list) {
			return;
		}

		const username = feed.getAttribute('data-medium-username') || 'tylercoderre';
		const limit = Number.parseInt(feed.getAttribute('data-medium-limit') || '3', 10);
		const feedUrl = feed.getAttribute('data-medium-feed-url') || `https://${username}.medium.com/feed`;
		const fallbackUrl = `https://medium.com/feed/@${username}`;

		const setStatus = (text, show = true) => {
			if (!status) {
				return;
			}
			status.textContent = text;
			status.hidden = !show;
		};

		const stripHtml = (html) => {
			const temp = document.createElement('div');
			temp.innerHTML = html;
			return (temp.textContent || '').replace(/\s+/g, ' ').trim();
		};

		const formatDate = (value) => {
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) {
				return null;
			}
			return {
				label: new Intl.DateTimeFormat('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				}).format(date),
				iso: date.toISOString(),
			};
		};

		const parseFeed = (xmlText) => {
			const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
			const items = Array.from(doc.querySelectorAll('item'));
			return items.map((item) => {
				const title = item.querySelector('title')?.textContent?.trim() || 'Untitled';
				const link = item.querySelector('link')?.textContent?.trim() || '';
				const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
				const encoded = item.querySelector('content\\:encoded')?.textContent
					|| item.querySelector('encoded')?.textContent
					|| item.querySelector('description')?.textContent
					|| '';
				const cleaned = stripHtml(encoded)
					.replace(/Continue reading on Medium\s*»?/gi, '')
					.replace(/\s+/g, ' ')
					.trim();
				return {
					title,
					link,
					pubDate,
					excerpt: cleaned,
				};
			}).filter((item) => item.link);
		};

		const renderItems = (items) => {
			list.innerHTML = '';
			items.slice(0, Number.isFinite(limit) ? limit : 3).forEach((item) => {
				const li = document.createElement('li');

				const title = document.createElement('h4');
				const link = document.createElement('a');
				link.href = item.link;
				link.target = '_blank';
				link.rel = 'noopener noreferrer';
				link.textContent = item.title;
				title.appendChild(link);

				const meta = document.createElement('time');
				const formatted = formatDate(item.pubDate);
				if (formatted) {
					meta.dateTime = formatted.iso;
					meta.textContent = formatted.label;
				}

				const excerpt = document.createElement('p');
				excerpt.textContent = item.excerpt ? `${item.excerpt.slice(0, 140)}${item.excerpt.length > 140 ? '…' : ''}` : '';

				li.appendChild(title);
				if (meta.textContent) {
					li.appendChild(meta);
				}
				if (excerpt.textContent) {
					li.appendChild(excerpt);
				}
				list.appendChild(li);
			});
		};

		const fetchWithProxy = async (url) => {
			const response = await fetch(url);
			if (response.ok) {
				return parseFeed(await response.text());
			}
			throw new Error('Direct feed failed');
		};

		const fetchWithAllOrigins = async (url) => {
			const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
			const response = await fetch(proxyUrl);
			if (response.ok) {
				return parseFeed(await response.text());
			}
			throw new Error('Proxy feed failed');
		};

		const fetchFeed = async () => {
			const urls = [feedUrl, fallbackUrl];
			for (const url of urls) {
				try {
					return await fetchWithProxy(url);
				} catch (error) {
					// Try next step
				}
				try {
					return await fetchWithAllOrigins(url);
				} catch (error) {
					// Try next URL
				}
			}
			return [];
		};

		setStatus('Loading latest posts...', true);

		fetchFeed()
			.then((items) => {
				if (!items.length) {
					setStatus('No posts found yet. Check back soon.', true);
					return;
				}
				renderItems(items);
				setStatus('', false);
			})
			.catch(() => {
				setStatus('Unable to load Medium posts right now.', true);
			});
	};

	const initPage = () => {
		updateThemeLinks(root.getAttribute('data-theme'));
		updateThemeColor();
		initClock();
		initFormValidation();
		initThemeToggle();
		initDialogs();
		initCodeCopy();
		initMediumFeed();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initPage);
	} else {
		initPage();
	}
})();
