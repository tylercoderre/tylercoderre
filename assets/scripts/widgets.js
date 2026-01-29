(() => {
	const initWidgets = () => {
		const timeEl = document.querySelector('[data-widget-time]');
		const tempEl = document.querySelector('[data-widget-temp]');
		const iconEl = document.querySelector('[data-widget-icon]');
		const dateEl = document.querySelector('[data-widget-date]');
		const dayEl = document.querySelector('[data-widget-day]');
		const conditionEl = document.querySelector('[data-widget-condition]');
		const accumEl = document.querySelector('[data-widget-accumulation]');
		const highEl = document.querySelector('[data-widget-high]');
		const lowEl = document.querySelector('[data-widget-low]');

		if (!timeEl && !tempEl && !dateEl) {
			return;
		}

		const timeZoneSource = timeEl || dateEl;
		const timeZone = timeZoneSource?.getAttribute('data-timezone') || 'America/New_York';

		const timeFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		});

		const updateTime = () => {
			if (!timeEl) {
				return;
			}
			const now = new Date();
			timeEl.textContent = timeFormatter.format(now);
			timeEl.dateTime = now.toISOString();
		};

		const updateDate = () => {
			if (!dateEl) {
				return;
			}
			const now = new Date();
			const monthFormatter = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' });
			const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' });
			const label = `${dayFormatter.format(now)} ${monthFormatter.format(now)}`;
			dateEl.textContent = label;
			dateEl.value = now.toISOString().split('T')[0];
			if (dayEl) {
				const dayNameFormatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' });
				dayEl.textContent = dayNameFormatter.format(now);
			}
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

		const updateWeather = async () => {
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
				if (iconEl) {
					iconEl.className = `fa-sharp fa-regular ${iconClass}`;
					iconEl.setAttribute('title', condition);
				}
				if (conditionEl) {
					conditionEl.textContent = condition;
				}

				if (accumEl) {
					try {
						const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${units}&appid=${apiKey}`;
						const forecastResponse = await fetch(forecastUrl);
						if (!forecastResponse.ok) {
							throw new Error('Forecast request failed');
						}
						const forecastData = await forecastResponse.json();
						const list = Array.isArray(forecastData.list) ? forecastData.list : [];
						const dateKeyFormatter = new Intl.DateTimeFormat('en-US', {
							timeZone,
							year: 'numeric',
							month: '2-digit',
							day: '2-digit'
						});
						const todayKey = dateKeyFormatter.format(new Date());
						let totalMm = 0;
						const temps = [];
						list.forEach((entry) => {
							const entryDate = new Date(entry.dt * 1000);
							if (dateKeyFormatter.format(entryDate) !== todayKey) {
								return;
							}
							if (entry.rain && entry.rain['3h']) {
								totalMm += entry.rain['3h'];
							}
							if (entry.snow && entry.snow['3h']) {
								totalMm += entry.snow['3h'];
							}
							if (entry.main && typeof entry.main.temp === 'number') {
								temps.push(entry.main.temp);
							}
						});
						const inches = totalMm / 25.4;
						const value = totalMm === 0 ? '0 in' : `${inches.toFixed(2)} in`;
						accumEl.textContent = value;
						if (highEl && lowEl) {
							if (temps.length) {
								const high = Math.round(Math.max(...temps));
								const low = Math.round(Math.min(...temps));
								highEl.textContent = `${high} High`;
								lowEl.textContent = `${low} Low`;
							} else {
								highEl.textContent = '-- High';
								lowEl.textContent = '-- Low';
							}
						}
					} catch (error) {
						accumEl.textContent = '--';
						if (highEl && lowEl) {
							highEl.textContent = '-- High';
							lowEl.textContent = '-- Low';
						}
					}
				}
			} catch (error) {
				if (tempEl) {
					tempEl.textContent = 'Unable to load temperature';
				}
				if (conditionEl) {
					conditionEl.textContent = 'Unavailable';
				}
				if (accumEl) {
					accumEl.textContent = '--';
				}
				if (highEl && lowEl) {
					highEl.textContent = '-- High';
					lowEl.textContent = '-- Low';
				}
			}
		};

		updateTime();
		updateDate();
		if (timeEl) {
			setInterval(updateTime, 1000);
		}
		if (dateEl) {
			setInterval(updateDate, 60 * 60 * 1000);
		}

		if (tempEl) {
			updateWeather();
			setInterval(updateWeather, 10 * 60 * 1000);
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initWidgets);
	} else {
		initWidgets();
	}
})();
