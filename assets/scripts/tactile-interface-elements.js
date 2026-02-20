(() => {
    'use strict';

    const initSwitchHints = () => {
        const switches = document.querySelectorAll('#tactile-switch .switch');

        switches.forEach((label) => {
            const input = label.querySelector('input[type="checkbox"]');
            if (!input) {
                return;
            }

            const lockHint = () => label.classList.add('switch--locked');
            const unlockHint = () => label.classList.remove('switch--locked');

            label.addEventListener('pointerdown', lockHint);
            input.addEventListener('change', lockHint);
            label.addEventListener('mouseleave', unlockHint);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initSwitchHints();
        });
    } else {
        initSwitchHints();
    }
})();
