// LIGHT/DARK MODE TOGGLE
let theme = localStorage.getItem('data-theme');
const checkbox = document.getElementById("switch");
const changeThemeToDark = () => {
    document.documentElement.setAttribute("data-theme", "dark")
    localStorage.setItem("data-theme", "dark")
    console.log("Who turned off the lights?")
}

const changeThemeToLight = () => {
    document.documentElement.setAttribute("data-theme", "light")
    localStorage.setItem("data-theme", 'light')
    console.log("Let there be light!")
}

if (theme === 'dark') {
    changeThemeToDark()
}

checkbox.addEventListener('change', () => {
    let theme = localStorage.getItem('data-theme');
    if (theme === 'dark') {
        changeThemeToLight()
        location.reload(); // FIXES MOBILE ICONS NOT CHANGING
    } else {
        changeThemeToDark()
        location.reload(); // FIXES MOBILE ICONS NOT CHANGING
    }

});

// DIALOG

const openModal = document.querySelector('.open-modal');
const closeModal = document.querySelector('.close-modal');
const dialog = document.querySelector('dialog');

openModal.addEventListener('click', () => {
    dialog.showModal();
});

dialog.addEventListener('close', () => {
    output.value = dialog.returnValue;
});

// DIALOG

const openMenu = document.querySelector('.open-menu');
const closeMenu = document.querySelector('.close-menu');
const menu = document.querySelector('menu');

openModal.addEventListener('clickmenu', () => {
    dialog.showModal();
});

dialog.addEventListener('closemenu', () => {
    output.value = dialog.returnValue;
});
