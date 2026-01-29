(() => {
	const initWeather = () => {
		const locationEl = document.querySelector('[data-weather-location]');
		const dateEl = document.querySelector('[data-weather-date]');
		const timeEl = document.querySelector('[data-weather-time]');
		const tempEl = document.querySelector('[data-weather-temp]');
		const highValueEl = document.querySelector('[data-weather-high]');
		const lowValueEl = document.querySelector('[data-weather-low]');
		const conditionEl = document.querySelector('[data-weather-condition]');
		const unitLabelEl = document.querySelector('[data-weather-unit]');
		const unitInputs = document.querySelectorAll('[data-unit-toggle-input]');
		const precipTypeEl = document.querySelector('[data-weather-precip-type]');
		const precipChanceEl = document.querySelector('[data-weather-precip-chance]');
		const precipTotalEl = document.querySelector('[data-weather-precip-total]');
		const forecastList = document.querySelector('[data-forecast-list]');
		const hourlyBody = document.querySelector('[data-hourly-body]');

		if (!dateEl || !timeEl || !tempEl || !forecastList) {
			return;
		}

		const city = 'Buffalo';
		const timeZone = timeEl.getAttribute('data-timezone') || 'America/New_York';
		const apiKey = 'a41c006d2ee7b466f3d445df68ef65fe';
		const units = 'imperial';

		if (locationEl) {
			locationEl.textContent = `${city}, NY`;
		}

		const timeFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		});
		const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			weekday: 'short'
		});
		const monthFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			month: 'short'
		});
		const dayFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			day: 'numeric'
		});
		const dayNameFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			weekday: 'long'
		});
		const hourFormatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour: 'numeric'
		});
		const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});

		const getUnit = () => {
			const toggle = document.querySelector('[data-unit-toggle-input]');
			return toggle && toggle.checked ? 'C' : 'F';
		};

		const toCelsius = (value) => Math.round((value - 32) * (5 / 9));

		const formatTempNumber = (value, unit) => {
			const numeric = unit === 'C' ? toCelsius(value) : Math.round(value);
			return `${numeric}`;
		};

		const formatTemp = (value, unit) => `${formatTempNumber(value, unit)}°${unit}`;

		const renderUnits = () => {
			const unit = getUnit();
			if (unitLabelEl) {
				unitLabelEl.textContent = `°${unit}`;
			}
			if (tempEl && tempEl.dataset.tempF) {
				const value = Number(tempEl.dataset.tempF);
				tempEl.textContent = Number.isFinite(value) ? formatTempNumber(value, unit) : '--';
			}
			if (highValueEl && highValueEl.dataset.tempF) {
				const value = Number(highValueEl.dataset.tempF);
				highValueEl.innerHTML = Number.isFinite(value)
					? `<i class="fa-sharp fa-solid fa-arrow-up" aria-hidden="true"></i> ${formatTemp(value, unit)}`
					: '<i class="fa-sharp fa-solid fa-arrow-up" aria-hidden="true"></i> --';
			}
			if (lowValueEl && lowValueEl.dataset.tempF) {
				const value = Number(lowValueEl.dataset.tempF);
				lowValueEl.innerHTML = Number.isFinite(value)
					? `<i class="fa-sharp fa-solid fa-arrow-down" aria-hidden="true"></i> ${formatTemp(value, unit)}`
					: '<i class="fa-sharp fa-solid fa-arrow-down" aria-hidden="true"></i> --';
			}
			document.querySelectorAll('[data-hourly-value]').forEach((el) => {
				const value = Number(el.dataset.tempF);
				el.textContent = Number.isFinite(value) ? formatTemp(value, unit) : '--';
			});
			document.querySelectorAll('[data-forecast-high]').forEach((el) => {
				const value = Number(el.dataset.tempF);
				el.textContent = Number.isFinite(value) ? formatTemp(value, unit) : '--';
			});
			document.querySelectorAll('[data-forecast-low]').forEach((el) => {
				const value = Number(el.dataset.tempF);
				el.textContent = Number.isFinite(value) ? formatTemp(value, unit) : '--';
			});
		};

		const updateDateTime = () => {
			const now = new Date();
			timeEl.textContent = timeFormatter.format(now);
			timeEl.dateTime = now.toISOString();
			const dateLabel = `${weekdayFormatter.format(now)} ${monthFormatter.format(now)} ${dayFormatter.format(now)}`;
			dateEl.textContent = dateLabel;
			dateEl.dateTime = now.toISOString().split('T')[0];
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

		const updateCurrentWeather = async () => {
			const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`;
			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Weather request failed');
				}
				const data = await response.json();
				const temp = Math.round(data.main.temp);
				const high = Math.round(data.main.temp_max);
				const low = Math.round(data.main.temp_min);
				const condition = data.weather && data.weather[0] ? data.weather[0].main : 'Clear';
				if (tempEl) {
					tempEl.dataset.tempF = `${temp}`;
				}
				if (highValueEl) {
					highValueEl.dataset.tempF = `${high}`;
				}
				if (lowValueEl) {
					lowValueEl.dataset.tempF = `${low}`;
				}
				renderUnits();
				if (conditionEl) {
					conditionEl.textContent = condition;
				}
			} catch (error) {
				if (tempEl) {
					tempEl.textContent = '--';
					delete tempEl.dataset.tempF;
				}
				if (highValueEl) {
					highValueEl.innerHTML = '<i class="fa-sharp fa-solid fa-arrow-up" aria-hidden="true"></i> --';
					delete highValueEl.dataset.tempF;
				}
				if (lowValueEl) {
					lowValueEl.innerHTML = '<i class="fa-sharp fa-solid fa-arrow-down" aria-hidden="true"></i> --';
					delete lowValueEl.dataset.tempF;
				}
				if (conditionEl) {
					conditionEl.textContent = 'Unavailable';
				}
				if (precipTypeEl) {
					precipTypeEl.textContent = 'Precipitation unavailable';
				}
				if (precipChanceEl) {
					precipChanceEl.textContent = '--';
				}
				if (precipTotalEl) {
					precipTotalEl.textContent = '--';
				}
			}
		};

		const updateForecast = async () => {
			const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${units}&appid=${apiKey}`;
			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Forecast request failed');
				}
				const data = await response.json();
				const list = Array.isArray(data.list) ? data.list : [];
				const now = new Date();
				const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
				const todayKey = dateKeyFormatter.format(now);
				const days = new Map();
				let windowTotalMm = 0;
				let windowPop = 0;
				let windowType = null;
				const hourlyEntries = [];

				list.forEach((entry) => {
					const entryDate = new Date(entry.dt * 1000);
					const dayKey = dateKeyFormatter.format(entryDate);
					if (entryDate >= now && entryDate <= cutoff) {
						hourlyEntries.push({ entry, entryDate });
						if (typeof entry.pop === 'number') {
							windowPop = Math.max(windowPop, entry.pop);
						}
						if (entry.rain && entry.rain['3h']) {
							windowTotalMm += entry.rain['3h'];
							windowType = 'Rain';
						}
						if (entry.snow && entry.snow['3h']) {
							windowTotalMm += entry.snow['3h'];
							windowType = windowType || 'Snow';
						}
					}

					if (dayKey === todayKey) {
						return;
					}
					if (!days.has(dayKey)) {
						days.set(dayKey, {
							temps: [],
							icon: null,
							condition: null,
							date: entryDate
						});
					}
					const bucket = days.get(dayKey);
					if (entry.main && typeof entry.main.temp === 'number') {
						bucket.temps.push(entry.main.temp);
					}
					if (!bucket.icon || entryDate.getHours() === 12) {
						const condition = entry.weather && entry.weather[0] ? entry.weather[0].main : 'Clear';
						bucket.condition = condition;
						bucket.icon = conditionIconMap[condition] || conditionIconMap.Default;
					}
				});

				const sortedDays = Array.from(days.entries())
					.sort((a, b) => (a[0] > b[0] ? 1 : -1))
					.slice(0, 4);

				forecastList.innerHTML = '';

				if (precipTypeEl) {
					precipTypeEl.textContent = windowType ? windowType : 'None';
				}
				if (precipChanceEl) {
					precipChanceEl.textContent = `${Math.round(windowPop * 100)}%`;
				}
				if (precipTotalEl) {
					const inches = windowTotalMm / 25.4;
					precipTotalEl.textContent = windowTotalMm === 0 ? '0 in' : `${inches.toFixed(2)} in`;
				}

				if (hourlyBody) {
					hourlyBody.innerHTML = '';
					hourlyEntries.forEach(({ entry, entryDate }) => {
						const row = document.createElement('tr');

						const hourCell = document.createElement('td');
						hourCell.textContent = hourFormatter.format(entryDate);
						row.appendChild(hourCell);

						const condition = entry.weather && entry.weather[0] ? entry.weather[0].main : 'Clear';
						const iconClass = conditionIconMap[condition] || conditionIconMap.Default;
						const conditionCell = document.createElement('td');
						const icon = document.createElement('i');
						icon.className = `fa-sharp fa-regular ${iconClass}`;
						icon.setAttribute('aria-hidden', 'true');
						conditionCell.appendChild(icon);
						const conditionText = document.createElement('span');
						conditionText.textContent = ` ${condition}`;
						conditionCell.appendChild(conditionText);
						row.appendChild(conditionCell);

						const precipCell = document.createElement('td');
						const chance = typeof entry.pop === 'number' ? Math.round(entry.pop * 100) : 0;
						let totalMm = 0;
						if (entry.rain && entry.rain['3h']) {
							totalMm += entry.rain['3h'];
						}
						if (entry.snow && entry.snow['3h']) {
							totalMm += entry.snow['3h'];
						}
						const inches = totalMm / 25.4;
						const accumulation = totalMm === 0 ? '0 in' : `${inches.toFixed(2)} in`;
						const precipText = `${chance}% / ${accumulation}`;
						const precipValue = document.createElement('data');
						precipValue.setAttribute('data-hourly-precip', '');
						precipValue.textContent = precipText;
						precipCell.appendChild(precipValue);
						row.appendChild(precipCell);

						const tempCell = document.createElement('td');
						const tempVal = entry.main && typeof entry.main.temp === 'number'
							? Math.round(entry.main.temp)
							: '--';
						const tempValue = document.createElement('data');
						tempValue.setAttribute('data-hourly-value', '');
						if (tempVal !== '--') {
							tempValue.dataset.tempF = `${tempVal}`;
							tempValue.textContent = formatTemp(tempVal, getUnit());
						} else {
							tempValue.textContent = '--';
						}
						tempCell.appendChild(tempValue);
						row.appendChild(tempCell);

						hourlyBody.appendChild(row);
					});
				}

				sortedDays.forEach(([key, bucket]) => {
					const high = bucket.temps.length ? Math.round(Math.max(...bucket.temps)) : '--';
					const low = bucket.temps.length ? Math.round(Math.min(...bucket.temps)) : '--';
					const dayLabel = dayNameFormatter.format(bucket.date);
					const iconClass = bucket.icon || conditionIconMap.Default;

					const group = document.createElement('div');

					const icon = document.createElement('i');
					icon.className = `fa-sharp fa-regular ${iconClass}`;
					icon.setAttribute('aria-hidden', 'true');
					const iconWrap = document.createElement('p');
					iconWrap.setAttribute('aria-label', `Conditions: ${bucket.condition || 'Clear'}`);
					iconWrap.appendChild(icon);
					group.appendChild(iconWrap);

					const day = document.createElement('p');
					day.textContent = dayLabel;
					group.appendChild(day);

					const range = document.createElement('p');
					const highValue = document.createElement('data');
					highValue.setAttribute('data-forecast-high', '');
					highValue.dataset.tempF = `${high}`;
					const lowValue = document.createElement('data');
					lowValue.setAttribute('data-forecast-low', '');
					lowValue.dataset.tempF = `${low}`;
					range.appendChild(highValue);
					range.appendChild(document.createTextNode(' / '));
					range.appendChild(lowValue);
					group.appendChild(range);

					forecastList.appendChild(group);
				});
				renderUnits();
			} catch (error) {
				forecastList.innerHTML = '<p>Unable to load forecast.</p>';
				if (hourlyBody) {
					hourlyBody.innerHTML = '<tr><td>Unable to load hourly forecast.</td><td></td><td>--</td><td>--</td></tr>';
				}
				if (precipTypeEl) {
					precipTypeEl.textContent = 'Precipitation unavailable';
				}
				if (precipChanceEl) {
					precipChanceEl.textContent = '--';
				}
				if (precipTotalEl) {
					precipTotalEl.textContent = '--';
				}
			}
		};

		updateDateTime();
		setInterval(updateDateTime, 60 * 1000);
		updateCurrentWeather();
		updateForecast();
		setInterval(updateCurrentWeather, 10 * 60 * 1000);
		setInterval(updateForecast, 30 * 60 * 1000);

		unitInputs.forEach((input) => {
			input.addEventListener('change', renderUnits);
		});
		renderUnits();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initWeather);
	} else {
		initWeather();
	}
})();
