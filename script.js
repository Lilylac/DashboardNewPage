// ============================================
// STATE MANAGEMENT
// ============================================
const getLocalDateString = (date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
};

let modalCallback = null;
let currentViewDate = new Date();
let selectedDate = new Date();
selectedDate.setHours(12, 0, 0, 0);

// ============================================
// MULTI-DASHBOARD SYSTEM
// ============================================
let dashboards = [];
let currentDashboardId = null;

const DEFAULT_DASHBOARD = {
    id: 'default',
    name: 'Main',
    icon: '🏠',
    created: Date.now(),
    data: {
        favorites: [],
        playlist: [{ name: "Lofi Girl Focus", url: "https://youtube.com" }],
        readings: [{ name: "Eloquent JS", url: "https://eloquentjavascript.net/" }],
        resources: [
            { name: "The Odin Project", url: "https://www.theodinproject.com/" },
            { name: "IELTS Preparation", url: "https://www.ielts.org/" }
        ]
    }
};

function loadDashboards() {
    const saved = localStorage.getItem('bento_dashboards');
    if (saved) {
        dashboards = JSON.parse(saved);
    } else {
        dashboards = [{ ...DEFAULT_DASHBOARD }];
    }

    // Normalize dashboard schema + migrate legacy global data only to first dashboard.
    const legacyData = {
        favorites: JSON.parse(localStorage.getItem('bento_favs') || '[]'),
        playlist: JSON.parse(localStorage.getItem('bento_playlist') || '[]'),
        readings: JSON.parse(localStorage.getItem('bento_readings') || '[]'),
        resources: JSON.parse(localStorage.getItem('bento_resources') || '[]')
    };

    dashboards = dashboards.map((dashboard, index) => {
        const data = dashboard.data || {};
        return {
            ...dashboard,
            data: {
                favorites: Array.isArray(data.favorites)
                    ? data.favorites
                    : (index === 0 ? legacyData.favorites : []),
                playlist: Array.isArray(data.playlist)
                    ? data.playlist
                    : (index === 0 ? legacyData.playlist : []),
                readings: Array.isArray(data.readings)
                    ? data.readings
                    : (index === 0 ? legacyData.readings : []),
                resources: Array.isArray(data.resources)
                    ? data.resources
                    : (index === 0 ? legacyData.resources : [])
            }
        };
    });
    
    // Load current dashboard ID
    currentDashboardId = localStorage.getItem('bento_current_dashboard') || dashboards[0].id;
    
    // Ensure current dashboard exists
    if (!dashboards.find(d => d.id === currentDashboardId)) {
        currentDashboardId = dashboards[0].id;
    }
}

function saveDashboards() {
    localStorage.setItem('bento_dashboards', JSON.stringify(dashboards));
    localStorage.setItem('bento_current_dashboard', currentDashboardId);
}

function getCurrentDashboard() {
    return dashboards.find(d => d.id === currentDashboardId) || dashboards[0];
}

function switchDashboard(dashboardId) {
    // Transition effect
    const content = document.getElementById('dashboardContent');
    content.classList.add('transitioning');
    
    setTimeout(() => {
        currentDashboardId = dashboardId;
        saveDashboards();
        loadCurrentDashboardData();
        renderDashboardTabs();
        content.classList.remove('transitioning');
    }, 150);
}

function addDashboard() {
    const name = prompt('Dashboard name:', `Dashboard ${dashboards.length + 1}`);
    if (!name || name.trim() === '') return;
    
    const icons = ['📝', '💼', '🎓', '🎯', '🚀', '💡', '🎨', '⚡', '🌟', '🔥'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    
    const newDashboard = {
        id: `dashboard_${Date.now()}`,
        name: name.trim(),
        icon: randomIcon,
        created: Date.now(),
        data: {
            favorites: [],
            playlist: [],
            readings: [],
            resources: []
        }
    };
    
    dashboards.push(newDashboard);
    saveDashboards();
    switchDashboard(newDashboard.id);
}

function renameDashboard(dashboardId) {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (!dashboard) return;
    
    const newName = prompt('Rename dashboard:', dashboard.name);
    if (!newName || newName.trim() === '') return;
    
    dashboard.name = newName.trim();
    saveDashboards();
    renderDashboardTabs();
    renderDashboardManager();
}

function deleteDashboard(dashboardId) {
    if (dashboards.length <= 1) {
        alert('Cannot delete the last dashboard!');
        return;
    }
    
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (!confirm(`Delete "${dashboard.name}"? This cannot be undone.`)) return;
    
    dashboards = dashboards.filter(d => d.id !== dashboardId);
    
    // Switch to first dashboard if current was deleted
    if (currentDashboardId === dashboardId) {
        currentDashboardId = dashboards[0].id;
        loadCurrentDashboardData();
    }
    
    saveDashboards();
    renderDashboardTabs();
    renderDashboardManager();
}

function renderDashboardTabs() {
    const container = document.getElementById('dashboardTabs');
    if (!container) return;
    
    container.innerHTML = dashboards.map(dashboard => `
        <div class="dashboard-tab ${dashboard.id === currentDashboardId ? 'active' : ''}"
             onclick="switchDashboard('${dashboard.id}')">
            <span class="tab-icon">${dashboard.icon}</span>
            <span class="tab-name">${dashboard.name}</span>
            ${dashboards.length > 1 ? `
                <button class="tab-close" 
                        onclick="event.stopPropagation(); deleteDashboard('${dashboard.id}')">
                    ×
                </button>
            ` : ''}
        </div>
    `).join('');
}

function renderDashboardManager() {
    const container = document.getElementById('dashboardList');
    if (!container) return;
    
    container.innerHTML = dashboards.map(dashboard => `
        <div class="dashboard-manager-item ${dashboard.id === currentDashboardId ? 'active' : ''}">
            <div class="dashboard-manager-item-info">
                <span class="dashboard-manager-item-icon">${dashboard.icon}</span>
                <span class="dashboard-manager-item-name">${dashboard.name}</span>
            </div>
            <div class="dashboard-manager-item-actions">
                <button class="btn-rename" onclick="renameDashboard('${dashboard.id}')">
                    Rename
                </button>
                ${dashboards.length > 1 ? `
                    <button class="btn-delete" onclick="deleteDashboard('${dashboard.id}')">
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function openDashboardManager() {
    const modal = document.getElementById('dashboardManagerModal');
    if (modal) {
        modal.style.display = 'flex';
        renderDashboardManager();
    }
}

function closeDashboardManager() {
    document.getElementById('dashboardManagerModal').style.display = 'none';
}

function loadCurrentDashboardData() {
    const dashboard = getCurrentDashboard();
    favorites = [...(dashboard.data.favorites || [])];
    playlist = [...(dashboard.data.playlist || [])];
    readings = [...(dashboard.data.readings || [])];
    resources = [...(dashboard.data.resources || [])];
    renderAll();
}

function saveCurrentDashboardData() {
    const dashboard = getCurrentDashboard();
    if (!dashboard) return;
    
    dashboard.data = {
        favorites: [...favorites],
        playlist: [...playlist],
        readings: [...readings],
        resources: [...resources]
    };
    saveDashboards();
}

// Legacy compatibility - redirect to dashboard data
let favorites = [];
let playlist = [];
let readings = [];
let resources = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    loadThemeSettings();     // Load theme first
    loadDashboards();         // Load dashboards
    loadCurrentDashboardData(); // Load current dashboard data
    renderDashboardTabs();    // Render tabs
    renderAll();
    setupEventListeners();
    setupEnterKeyHandlers();
});

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    // Double Click pada Card
    const cards = document.querySelectorAll(".card");
    cards.forEach((card) => {
        card.addEventListener("dblclick", function (e) {
            const forbidden = ["BUTTON", "A", "INPUT", "LABEL", "IMG"];
            if (forbidden.includes(e.target.tagName)) return;

            const h2 = this.querySelector("h2");
            const title = h2 ? h2.innerText.toLowerCase() : "";

            if (title.includes("todo") || title.includes("hari ini") || this.querySelector('#todo-container')) {
                addTodoModal();
            } else if (title.includes("reading")) {
                addReading();
            } else if (title.includes("playlist")) {
                addPlaylistItem();
            } else if (title.includes("learning") || title.includes("resources") || this.querySelector('#resources-container')) {
                addResource();
            } else if (this.classList.contains("main-fav")) {
                addFav();
            }
        });
    });
}

// Setup Enter Key untuk semua Input Modal
function setupEnterKeyHandlers() {
    const inputs = ["modalInput1", "modalInput2", "bgInput"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    if (id === "bgInput") {
                        saveSettings();
                    } else {
                        document.getElementById("modalConfirmBtn").click();
                    }
                }
            });
        }
    });
    
    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        // Ctrl/Cmd + D: Switch dashboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            openDashboardManager();
        }
        
        // Ctrl/Cmd + N: New dashboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            addDashboard();
        }
        
        // Ctrl/Cmd + ,: Settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            openSettings();
        }
        
        // Ctrl/Cmd + 1-9: Switch to dashboard by number
        if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            if (dashboards[index]) {
                switchDashboard(dashboards[index].id);
            }
        }
    });
}

// ============================================
// RENDER ALL COMPONENTS
// ============================================
function renderAll() {
    renderCalendar();
    renderTodos();
    renderFavs();
    renderPlaylist();
    renderReadings();
    renderResources();
    
    const q = document.getElementById("quote-text");
    if (q) q.innerText = "Koding adalah seni mengubah logika menjadi keajaiban.";
}

// ============================================
// CALENDAR LOGIC
// ============================================
function renderCalendar() {
    const body = document.getElementById("calendar-body");
    const monthYearLabel = document.getElementById("cal-month-year");
    if (!body) return;
    
    body.innerHTML = "";

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    monthYearLabel.innerText = new Intl.DateTimeFormat("id-ID", { 
        month: "long", 
        year: "numeric" 
    }).format(currentViewDate);

    // Day Labels
    ["S", "S", "R", "K", "J", "S", "M"].forEach(d => {
        body.innerHTML += `<div class="cal-day-label">${d}</div>`;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingSpace = firstDay === 0 ? 6 : firstDay - 1;

    // Empty spaces
    for (let i = 0; i < startingSpace; i++) {
        body.innerHTML += `<div></div>`;
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const isToday = new Date().toDateString() === dateObj.toDateString();
        const isSelected = selectedDate.toDateString() === dateObj.toDateString();

        let style = isSelected ? "background: var(--mauve); color: var(--base); font-weight: bold;" : "";
        if (isToday && !isSelected) style = "border: 1px solid var(--mauve);";

        body.innerHTML += `
            <div class="cal-date" 
                 style="${style} cursor:pointer;" 
                 onclick="selectDate(${year}, ${month}, ${d})">
                ${d}
            </div>`;
    }
}

function selectDate(y, m, d) {
    selectedDate = new Date(y, m, d, 12, 0, 0);
    renderCalendar();
    openTodoModal();
}

function moveMonth(offset) {
    currentViewDate.setMonth(currentViewDate.getMonth() + offset);
    renderCalendar();
}

// ============================================
// TODO LOGIC
// ============================================
function renderTodos() {
    const container = document.getElementById("todo-container");
    const label = document.getElementById("todo-date-label");
    if (!container) return;

    const dateKey = getLocalDateString(selectedDate);
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    label.innerText = isToday ? "Today" : selectedDate.toLocaleDateString("id-ID", { 
        day: "numeric", 
        month: "short" 
    });

    container.innerHTML = "";
    const todos = JSON.parse(localStorage.getItem("todos_" + dateKey)) || [];

    todos.forEach((todo, i) => {
        container.innerHTML += `
            <div class="todo-item">
                <div class="todo-content">
                    <input type="checkbox" 
                           ${todo.completed ? "checked" : ""} 
                           onclick="toggleTodo(${i})">
                    <span style="${todo.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                        ${todo.text}
                    </span>
                </div>
                <button onclick="deleteTodo(${i})" class="btn-delete-macos">−</button>
            </div>`;
    });
}

function addTodoModal() {
    openModal("Tambah Tugas", "Apa yang ingin dikerjakan?", "", (text) => {
        if (text && text.trim() !== "") {
            const dateKey = getLocalDateString(selectedDate);
            const todos = JSON.parse(localStorage.getItem("todos_" + dateKey)) || [];
            todos.push({ text: text, completed: false });
            localStorage.setItem("todos_" + dateKey, JSON.stringify(todos));
            renderTodos();
        }
    });
}

function deleteTodo(index) {
    const dateKey = getLocalDateString(selectedDate);
    const todos = JSON.parse(localStorage.getItem("todos_" + dateKey));
    todos.splice(index, 1);
    localStorage.setItem("todos_" + dateKey, JSON.stringify(todos));
    renderTodos();
}

function toggleTodo(index) {
    const dateKey = getLocalDateString(selectedDate);
    const todos = JSON.parse(localStorage.getItem("todos_" + dateKey));
    todos[index].completed = !todos[index].completed;
    localStorage.setItem("todos_" + dateKey, JSON.stringify(todos));
    renderTodos();
}

// ============================================
// TODO MODAL (Calendar View)
// ============================================
function openTodoModal() {
    const modal = document.getElementById("todoModal");
    document.getElementById("todoModalTitle").innerText = selectedDate.toLocaleDateString("id-ID", { 
        day: "numeric", 
        month: "long" 
    });
    modal.style.display = "flex";
    renderTodoInsideModal();
}

function renderTodoInsideModal() {
    const container = document.getElementById("todoModalList");
    const dateKey = getLocalDateString(selectedDate);
    const todos = JSON.parse(localStorage.getItem("todos_" + dateKey)) || [];
    
    container.innerHTML = todos.length ? "" : 
        `<p style="text-align:center; color:var(--subtext); padding:20px;">Kosong.</p>`;
    
    todos.forEach(t => {
        container.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; 
                        background: rgba(255,255,255,0.03); border-radius: 10px; margin-bottom: 5px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; 
                            background: ${t.completed ? "var(--green)" : "var(--mauve)"}"></div>
                <span style="font-size: 0.9rem; 
                             ${t.completed ? "text-decoration: line-through; opacity: 0.5;" : ""}">
                    ${t.text}
                </span>
            </div>`;
    });
}

function closeTodoModal() {
    document.getElementById("todoModal").style.display = "none";
}

// ============================================
// FAVORITES / SHORTCUTS (DRAG & DROP FIXED)
// ============================================
let draggedIndex = null;

function renderFavs() {
    const container = document.getElementById("fav-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    favorites.forEach((fav, i) => {
        const domain = new URL(fav.url).hostname;
        const item = document.createElement("div");
        item.className = "fav-item";
        item.draggable = true;
        item.dataset.index = i;
        
        item.innerHTML = `
            <button onclick="event.preventDefault(); event.stopPropagation(); deleteFav(${i});" class="btn-delete-macos">−</button>
            <div class="fav-content">
                <div class="fav-icon">
                    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=128" draggable="false">
                </div>
                <span class="fav-name">${fav.name}</span>
            </div>`;
        
        // Drag Events
        item.addEventListener("dragstart", handleDragStart);
        item.addEventListener("dragover", handleDragOver);
        item.addEventListener("drop", handleDrop);
        item.addEventListener("dragend", handleDragEnd);
        
        // Click to open URL
        item.addEventListener("click", (e) => {
            if (e.target.tagName !== "BUTTON" && !item.classList.contains("was-dragging")) {
                window.open(fav.url, '_blank');
            }
            // Reset drag flag
            setTimeout(() => item.classList.remove("was-dragging"), 100);
        });
        
        container.appendChild(item);
    });
    
    saveCurrentDashboardData(); // Save to current dashboard
}

function handleDragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    
    // Add dragging class immediately
    e.currentTarget.classList.add("dragging");
    e.currentTarget.classList.add("was-dragging");
    
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    e.dataTransfer.dropEffect = "move";
    
    const draggingItem = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(e.currentTarget.parentElement, e.clientX);
    
    // Remove all drag-over classes
    document.querySelectorAll('.fav-item').forEach(item => {
        if (!item.classList.contains('dragging')) {
            item.classList.remove('drag-over');
        }
    });
    
    // Add drag-over to target
    if (e.currentTarget !== draggingItem) {
        e.currentTarget.classList.add('drag-over');
    }
    
    // Reposition dragging item
    if (afterElement == null) {
        e.currentTarget.parentElement.appendChild(draggingItem);
    } else {
        e.currentTarget.parentElement.insertBefore(draggingItem, afterElement);
    }
    
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    // Remove all drag-over effects
    document.querySelectorAll('.fav-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    const allItems = [...document.querySelectorAll('.fav-item')];
    const newOrder = [];
    
    allItems.forEach(item => {
        const index = parseInt(item.dataset.index);
        newOrder.push(favorites[index]);
    });
    
    favorites = newOrder;
    return false;
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    
    // Remove all visual effects
    document.querySelectorAll('.fav-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    // Re-render to update indices
    setTimeout(() => {
        renderFavs();
    }, 50);
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.fav-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function addFav() {
    openModal("Tambah Shortcut", "Nama Website", "URL (https://...)", (name, url) => {
        if (!url.startsWith("http")) url = "https://" + url;
        favorites.push({ name, url });
        renderFavs();
    });
}

function deleteFav(index) {
    if (confirm("Hapus shortcut ini?")) {
        favorites.splice(index, 1);
        renderFavs();
    }
}

// ============================================
// PLAYLIST
// ============================================
function renderPlaylist() {
    const container = document.getElementById("playlist-container");
    if (!container) return;
    
    container.innerHTML = playlist.map((item, i) => `
        <div class="list-item-macos">
            <button onclick="deletePlaylistItem(${i})" class="btn-delete-macos">−</button>
            <a href="${item.url}" target="_blank" class="list-link-text">${item.name}</a>
        </div>`).join("");
    
    saveCurrentDashboardData(); // Save to current dashboard
}

function addPlaylistItem() {
    openModal("Tambah Playlist", "Nama Lagu", "Link URL", (name, url) => {
        playlist.push({ name, url });
        renderPlaylist();
    });
}

function deletePlaylistItem(index) {
    playlist.splice(index, 1);
    renderPlaylist();
}

// ============================================
// READING MATERIALS
// ============================================
function renderReadings() {
    const container = document.getElementById("reading-container");
    if (!container) return;
    
    container.innerHTML = readings.map((item, i) => `
        <div class="list-item-macos">
            <button onclick="deleteReading(${i})" class="btn-delete-macos">−</button>
            <a href="${item.url}" target="_blank" class="list-link-text">${item.name}</a>
        </div>`).join("");
    
    saveCurrentDashboardData(); // Save to current dashboard
}

function addReading() {
    openModal("Tambah Reading", "Nama Materi", "Link URL", (name, url) => {
        readings.push({ 
            name: name, 
            url: url.includes("http") ? url : "#" 
        });
        renderReadings();
    });
}

function deleteReading(index) {
    readings.splice(index, 1);
    renderReadings();
}

// ============================================
// LEARNING RESOURCES
// ============================================
function renderResources() {
    const container = document.getElementById("resources-container");
    if (!container) return;
    
    container.innerHTML = resources.map((item, i) => `
        <div class="list-item-macos resource-item">
            <button onclick="deleteResource(${i})" class="btn-delete-macos">−</button>
            <a href="${item.url}" target="_blank" class="list-link-text">${item.name}</a>
        </div>`).join("");
    
    saveCurrentDashboardData(); // Save to current dashboard
}

function addResource() {
    openModal("Tambah Learning Resource", "Nama Platform/Course", "Link URL", (name, url) => {
        resources.push({ 
            name: name, 
            url: url.includes("http") ? url : "https://" + url 
        });
        renderResources();
    });
}

function deleteResource(index) {
    resources.splice(index, 1);
    renderResources();
}

// ============================================
// GENERIC MODAL ENGINE
// ============================================
function openModal(title, placeholder1, placeholder2, callback) {
    document.getElementById("modalTitle").innerText = title;
    const input1 = document.getElementById("modalInput1");
    const input2 = document.getElementById("modalInput2");
    
    input1.placeholder = placeholder1;
    input1.value = "";
    
    if (placeholder2) {
        input2.style.display = "block";
        input2.placeholder = placeholder2;
        input2.value = "";
    } else {
        input2.style.display = "none";
    }
    
    document.getElementById("customModal").style.display = "flex";
    modalCallback = callback;
    
    // Auto focus
    setTimeout(() => input1.focus(), 100);
}

function closeModal() {
    document.getElementById("customModal").style.display = "none";
}

document.getElementById("modalConfirmBtn").onclick = function () {
    const val1 = document.getElementById("modalInput1").value;
    const val2 = document.getElementById("modalInput2").value;
    
    if (val1 && modalCallback) {
        modalCallback(val1, val2);
        closeModal();
    }
};

// ============================================
// THEME SYSTEM
// ============================================
const DEFAULT_SETTINGS = {
    theme: 'mocha',
    blurIntensity: 15,
    fontSize: 'medium',
    accentColor: 'mauve',
    background: ''
};

let currentSettings = { ...DEFAULT_SETTINGS };

function loadThemeSettings() {
    const saved = localStorage.getItem('bento_theme_settings');
    if (saved) {
        currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    applyThemeSettings();
}

function applyThemeSettings() {
    // Apply theme
    document.documentElement.setAttribute('data-theme', currentSettings.theme);
    
    // Apply blur intensity
    document.documentElement.style.setProperty('--blur-intensity', `${currentSettings.blurIntensity}px`);
    
    // Apply font size
    const fontSizes = {
        small: '0.875rem',
        medium: '1rem',
        large: '1.125rem'
    };
    document.documentElement.style.setProperty('--font-size-base', fontSizes[currentSettings.fontSize]);
    
    // Apply background
    if (currentSettings.background) {
        document.body.style.backgroundImage = `url('${currentSettings.background}')`;
    } else {
        document.body.style.backgroundImage = '';
    }
    
    // Update active states in UI
    updateSettingsUI();
}

function updateSettingsUI() {
    // Update theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentSettings.theme);
    });
    
    // Update font size buttons
    document.querySelectorAll('.font-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === currentSettings.fontSize);
    });
    
    // Update accent color buttons
    document.querySelectorAll('.accent-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === currentSettings.accentColor);
    });
    
    // Update blur slider
    const blurSlider = document.getElementById('blurSlider');
    const blurValue = document.getElementById('blurValue');
    if (blurSlider) {
        blurSlider.value = currentSettings.blurIntensity;
        if (blurValue) blurValue.textContent = `${currentSettings.blurIntensity}px`;
    }
    
    // Update background input
    const bgInput = document.getElementById('bgInput');
    if (bgInput) {
        bgInput.value = currentSettings.background || '';
    }
}

function changeTheme(theme) {
    currentSettings.theme = theme;
    applyThemeSettings();
    saveThemeSettings();
}

function updateBlur(value) {
    currentSettings.blurIntensity = parseInt(value);
    document.documentElement.style.setProperty('--blur-intensity', `${value}px`);
    document.getElementById('blurValue').textContent = `${value}px`;
}

function changeFontSize(size) {
    currentSettings.fontSize = size;
    applyThemeSettings();
    saveThemeSettings();
}

function changeAccent(color) {
    currentSettings.accentColor = color;
    applyThemeSettings();
    saveThemeSettings();
}

function saveThemeSettings() {
    localStorage.setItem('bento_theme_settings', JSON.stringify(currentSettings));
}

function resetSettings() {
    if (confirm('Reset all settings to default?')) {
        currentSettings = { ...DEFAULT_SETTINGS };
        applyThemeSettings();
        saveThemeSettings();
    }
}

function openSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "flex";
        updateSettingsUI(); // Sync UI with current settings
        
        // Auto focus first time
        setTimeout(() => {
            const firstInput = modal.querySelector('input[type="text"]');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function closeSettings() {
    document.getElementById("settingsModal").style.display = "none";
}

function saveSettings() {
    // Save background URL
    const url = document.getElementById("bgInput").value.trim();
    currentSettings.background = url;
    
    // Save blur intensity (already saved real-time, but ensure it's captured)
    const blurSlider = document.getElementById("blurSlider");
    if (blurSlider) {
        currentSettings.blurIntensity = parseInt(blurSlider.value);
    }
    
    // Apply and save
    applyThemeSettings();
    saveThemeSettings();
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = 'var(--green)';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        closeSettings();
    }, 1000);
}

// ============================================
// EXPORT DATA
// ============================================
function exportData() {
    const data = {
        dashboards: dashboards,
        currentDashboardId: currentDashboardId,
        themeSettings: currentSettings,
        background: localStorage.getItem("bento_bg") || "",
        todos: {},
        version: '2.0'
    };
    
    // Export all todos
    for (let key in localStorage) {
        if (key.startsWith("todos_")) {
            data.todos[key] = JSON.parse(localStorage.getItem(key));
        }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bento-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
