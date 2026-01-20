(() => {
	const storageKey = 'tc-design-systems-checklist';
	const paramKey = 'checked';
	const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
	const copyButton = document.getElementById('copy-progress-link');
	const resetButton = document.getElementById('clear-progress');
	const copyPercent = document.getElementById('copy-progress-percent');

	if (!checkboxes.length) {
		return;
	}

	const getCheckedIds = () =>
		checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.id);

	const updateUrl = (ids) => {
		const url = new URL(window.location.href);
		if (ids.length) {
			url.searchParams.set(paramKey, ids.join(','));
		} else {
			url.searchParams.delete(paramKey);
		}
		history.replaceState(null, '', url.toString());
	};

	const persistProgress = (ids) => {
		localStorage.setItem(storageKey, JSON.stringify(ids));
		updateUrl(ids);
	};

	const updateSectionProgress = () => {
		document.querySelectorAll('section').forEach((section) => {
			const sectionCheckboxes = section.querySelectorAll('input[type="checkbox"]');
			if (!sectionCheckboxes.length) {
				return;
			}

			const checked = section.querySelectorAll('input[type="checkbox"]:checked').length;
			const total = sectionCheckboxes.length;
			const percentage = total ? Math.round((checked / total) * 100) : 0;
			const progressBar = section.querySelector('progress');
			if (progressBar) {
				progressBar.value = percentage;
			}
		});
	};

	const updateDetailsProgress = () => {
		document.querySelectorAll('details').forEach((details) => {
			const detailsCheckboxes = details.querySelectorAll('input[type="checkbox"]');
			const checked = details.querySelectorAll('input[type="checkbox"]:checked').length;
			const label = details.querySelector('.summary-progress');
			if (label) {
				label.textContent = `${checked} / ${detailsCheckboxes.length}`;
			}
		});
	};

	const updateOverallProgress = () => {
		const checked = getCheckedIds().length;
		const total = checkboxes.length;
		const percent = total ? (checked / total) * 100 : 0;
		const display = total ? `${percent.toFixed(1)}%` : '0%';
		if (copyPercent) {
			copyPercent.textContent = display;
		}
	};

	const updateAll = () => {
		updateSectionProgress();
		updateDetailsProgress();
		updateOverallProgress();
	};

	const loadProgress = () => {
		const urlParams = new URLSearchParams(window.location.search);
		const checkedFromUrl = urlParams.get(paramKey);
		const saved = checkedFromUrl
			? checkedFromUrl.split(',').filter(Boolean)
			: JSON.parse(localStorage.getItem(storageKey) || '[]');

		checkedFromUrl && localStorage.setItem(storageKey, JSON.stringify(saved));

		saved.forEach((id) => {
			const checkbox = document.getElementById(id);
			if (checkbox) {
				checkbox.checked = true;
			}
		});
	};

	loadProgress();
	updateAll();

	checkboxes.forEach((checkbox) => {
		checkbox.addEventListener('change', () => {
			const ids = getCheckedIds();
			updateAll();
			persistProgress(ids);
		});
	});

	if (copyButton) {
		copyButton.addEventListener('click', () => {
			const ids = getCheckedIds();
			const url = new URL(window.location.href);
			if (ids.length) {
				url.searchParams.set(paramKey, ids.join(','));
			} else {
				url.searchParams.delete(paramKey);
			}

			const copiedText = url.toString();
			const restoreText = () => updateOverallProgress();

			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard
					.writeText(copiedText)
					.then(() => {
						if (copyPercent) {
							copyPercent.textContent = 'Progress URL Copied!';
							setTimeout(restoreText, 2000);
						}
					})
					.catch(() => {
						if (copyPercent) {
							copyPercent.textContent = 'Copy Failed';
							setTimeout(restoreText, 2000);
						}
					});
			}
		});
	}

	if (resetButton) {
		resetButton.addEventListener('click', () => {
			checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			persistProgress([]);
			updateAll();
		});
	}
})();
