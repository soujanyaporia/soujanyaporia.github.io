// let darkMode = localStorage.getItem("darkMode");

// if (darkMode === "enabled") {
//     enableDarkMode();
// }
// else {
//     disableDarkMode();
// }

function disableDarkMode() {
    link = document.getElementById('dark-toggle-link');
    link.href =  link.href.replace('dark', 'light');
    var e = document.getElementById('dark-toggle');
    if (e !== null)
        e.classList.add('fa-toggle-off');
        if (e !== null)
            e.classList.remove('fa-toggle-on');
    localStorage.setItem("darkMode", null);
}

function enableDarkMode() {
    link = document.getElementById('dark-toggle-link');
    link.href =  link.href.replace('light', 'dark');
    var e = document.getElementById('dark-toggle');
    if (e !== null)
        e.classList.add('fa-toggle-on');
        if (e !== null)
            e.classList.remove('fa-toggle-off');
    localStorage.setItem("darkMode", "enabled");
}

function darkToggle() {
    let darkMode = localStorage.getItem("darkMode");
    if (darkMode === "enabled") {
        disableDarkMode();
    }
    else {
        enableDarkMode();
    }
}
