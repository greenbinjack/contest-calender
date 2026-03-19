const API_KEY = "b0bd94ec61ea41cbbdedbf1ee28835ecfbaa8bff";
const USERNAME = "greenbinjack";
const BASE_URL = "https://clist.by/api/v4/contest/";

// Strict platforms requirement
const ALLOWED_PLATFORMS = [
    'codeforces', 'gym', 'atcoder', 'codechef', 'lightoj', 
    'google', 'leetcode', 'eolymp', 'kattis'
];

// DOM Elements
const calendarWrapper = document.querySelector('.calendar-wrapper');
const calendarGrid = document.getElementById('calendar-grid');
const themeToggleBtn = document.getElementById('theme-toggle');
const refreshBtn = document.getElementById('refresh-btn');
const statusPanel = document.getElementById('status-container');
const weekTitle = document.getElementById('week-title');
const weekDateRange = document.getElementById('week-date-range');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');

const scrollTopBtn = document.getElementById('scroll-top-btn');
const scrollLeftBtn = document.getElementById('scroll-left');
const scrollRightBtn = document.getElementById('scroll-right');

let currentWeekStart = new Date();
let allContests = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    // Theme Management
    const savedTheme = localStorage.getItem('theme') || 'theme-dark';
    document.documentElement.className = savedTheme;
    
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.className === 'theme-dark';
        const newTheme = isDark ? 'theme-light' : 'theme-dark';
        document.documentElement.className = newTheme;
        localStorage.setItem('theme', newTheme);
    });

    // Scroll Handlers
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (scrollLeftBtn && scrollRightBtn) {
        scrollLeftBtn.addEventListener('click', () => {
            calendarWrapper.scrollBy({ left: -300, behavior: 'smooth' });
        });
        scrollRightBtn.addEventListener('click', () => {
            calendarWrapper.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }

    // Determine current Start of Week (Monday)
    currentWeekStart = getMonday(new Date());

    refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        fetchWeekContests();
    });

    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        fetchWeekContests();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        fetchWeekContests();
    });

    renderEmptyCalendar();
    fetchWeekContests();
});

// Utility to get Monday of the current week
function getMonday(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
}

function showStatus(message, isError = false) {
    statusPanel.classList.remove('hidden');
    statusPanel.innerHTML = `
        <i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-info'}" 
           style="color: ${isError ? 'var(--danger)' : 'var(--accent-primary)'}"></i>
        <span style="color: ${isError ? 'var(--danger)' : 'var(--text-primary)'}">${message}</span>
    `;
    if (!isError) {
        setTimeout(() => statusPanel.classList.add('hidden'), 3000);
    }
}

function renderEmptyCalendar() {
    calendarGrid.innerHTML = '';
    
    const endOfWeek = new Date(currentWeekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    // Format Header Date Range
    const startStr = currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endStr = endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    weekDateRange.textContent = `${startStr} — ${endStr}`;
    
    // Check if we're in the current week to highlight 'Today'
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < 7; i++) {
        const colDate = new Date(currentWeekStart);
        colDate.setDate(colDate.getDate() + i);
        
        const isToday = colDate.getTime() === today.getTime();
        const dayName = colDate.toLocaleDateString(undefined, { weekday: 'short' });
        const dateNum = colDate.getDate();

        const col = document.createElement('div');
        col.className = 'calendar-col';
        col.dataset.dateString = colDate.toDateString();
        
        col.innerHTML = `
            <div class="col-header ${isToday ? 'is-today' : ''}">
                <div class="day-name">${dayName}</div>
                <div class="date-number">${dateNum}</div>
            </div>
            <div class="col-body" id="col-${i}">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
        calendarGrid.appendChild(col);
    }
}

// Convert Date strings to explicit GMT+6 mapping
// We use the Intl.DateTimeFormat with Asia/Dhaka which is exactly GMT+6
function formatToGMT6Time(dateString) {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    }).format(d);
}

// Map contest start date adjusted for GMT+6 explicitly to determine which column it falls in
function getGMT6DateString(dateString) {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d); // usually MM/DD/YYYY
}

async function fetchWeekContests() {
    renderEmptyCalendar(); // show skeletons
    
    try {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 7); // To capture the whole sunday

        const startIso = currentWeekStart.toISOString().slice(0, 19);
        const endIso = weekEnd.toISOString().slice(0, 19);

        // Fetch using the API structure mapping to their Authorization spec
        const url = `${BASE_URL}?username=${USERNAME}&api_key=${API_KEY}&start__gte=${startIso}&start__lt=${endIso}&order_by=start&limit=300`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `ApiKey ${USERNAME}:${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }

        const data = await response.json();
        
        // Filter strictly by requested platforms and exclude AtCoder training contests
        allContests = (data.objects || []).filter(c => {
            const resName = c.resource.toLowerCase();
            const eventName = c.event.toLowerCase();
            
            // Exclude AtCoder Daily Training contests
            if (resName.includes('atcoder') && eventName.includes('training')) {
                return false;
            }
            
            return ALLOWED_PLATFORMS.some(plat => resName.includes(plat));
        });
        
        populateCalendar();
        showStatus(`Loaded ${allContests.length} selected platform contests for this week`);
        
    } catch (error) {
        console.error("Failed to fetch contests:", error);
        showStatus(`Error: ${error.message}. Checking API connection...`, true);
        clearSkeletons();
    } finally {
        setTimeout(() => refreshBtn.querySelector('i').classList.remove('fa-spin'), 500);
    }
}

function clearSkeletons() {
    for (let i = 0; i < 7; i++) {
        document.getElementById(`col-${i}`).innerHTML = '';
    }
}

function populateCalendar() {
    clearSkeletons();
    
    // Group contests by day index (0-6)
    const grouped = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[]};

    allContests.forEach(contest => {
        // Find which column this belongs to using GMT+6 date mappings
        const contestGMT6DateStr = getGMT6DateString(contest.start); // MM/DD/YYYY
        
        for (let i = 0; i < 7; i++) {
            const colDate = new Date(currentWeekStart);
            colDate.setDate(colDate.getDate() + i);
            
            // Format column date as MM/DD/YYYY to match perfectly
            const colDateStr = new Intl.DateTimeFormat('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(colDate);
            
            if (contestGMT6DateStr === colDateStr) {
                grouped[i].push(contest);
                break;
            }
        }
    });

    // Render cards into columns
    for (let i = 0; i < 7; i++) {
        const colBody = document.getElementById(`col-${i}`);
        
        if (grouped[i].length === 0) {
            colBody.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding-top: 2rem; font-size: 0.9rem;">
                    <i class="fa-solid fa-mug-hot" style="font-size: 1.5rem; opacity: 0.5; margin-bottom: 0.5rem"></i><br>
                    No contests
                </div>
            `;
            continue;
        }

        colBody.innerHTML = grouped[i].map(contest => {
            // Apply strict GMT+6 format
            const timeStr = formatToGMT6Time(contest.start);
            
            const durationHours = Math.round(contest.duration / 3600);
            const durationStr = durationHours < 24 ? `${durationHours}h` : `${Math.round(durationHours/24)}d`;
            
            // Extract core domain name for icon parsing
            const resourceDomain = contest.resource.replace('www.', '');
            
            return `
                <a href="${contest.href}" target="_blank" class="contest-card">
                    <div class="card-top">
                        <span class="time-badge">${timeStr} GMT+6</span>
                        <img class="platform-icon" src="https://clist.by/media/sizes/32x32/resources/${resourceDomain.replace('.','_')}.png" onerror="this.src='https://ui-avatars.com/api/?name=${resourceDomain.charAt(0)}&background=random'" alt="${resourceDomain}">
                    </div>
                    <div class="contest-title">${contest.event}</div>
                    <div class="card-bottom">
                        <span style="text-transform: capitalize; font-weight: 500">${resourceDomain.split('.')[0]}</span>
                        <span class="duration"><i class="fa-regular fa-clock"></i> ${durationStr}</span>
                    </div>
                </a>
            `;
        }).join('');
    }
}
