const API_KEY = "b0bd94ec61ea41cbbdedbf1ee28835ecfbaa8bff";
const USERNAME = "greenbinjack";
const BASE_URL = "https://clist.by/api/v4/contest/";

const ALLOWED_PLATFORMS = [
    'codeforces', 'gym', 'atcoder', 'codechef', 'lightoj', 
    'google', 'leetcode', 'eolymp', 'kattis'
];

const listContainer = document.getElementById('contest-list');
const themeToggleBtn = document.getElementById('theme-toggle');
const statusPanel = document.getElementById('status-container');

let allContests = [];
let timerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('theme') || 'theme-dark';
    document.documentElement.className = savedTheme;
    
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.className === 'theme-dark';
        const newTheme = isDark ? 'theme-light' : 'theme-dark';
        document.documentElement.className = newTheme;
        localStorage.setItem('theme', newTheme);
    });

    fetchUpcomingContests();
});

function showStatus(message, isError = false) {
    statusPanel.classList.remove('hidden');
    statusPanel.innerHTML = `<span style="color: ${isError ? '#ef4444' : 'var(--text-primary)'}">${message}</span>`;
    if (!isError) setTimeout(() => statusPanel.classList.add('hidden'), 3000);
}

async function fetchUpcomingContests() {
    listContainer.innerHTML = '';
    showStatus("Fetching live and upcoming contests...");

    try {
        const now = new Date();
        const nowIso = now.toISOString().slice(0, 19);
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthIso = nextMonth.toISOString().slice(0, 19);

        // Fetch contests up to 1 month ahead, increasing limit to 300
        const url = `${BASE_URL}?username=${USERNAME}&api_key=${API_KEY}&end__gte=${nowIso}&start__lt=${nextMonthIso}&order_by=start&limit=300`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `ApiKey ${USERNAME}:${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`API returned status: ${response.status}`);
        const data = await response.json();
        
        allContests = (data.objects || []).filter(c => {
            const resName = c.resource.toLowerCase();
            const eventName = c.event.toLowerCase();
            if (resName.includes('atcoder') && eventName.includes('training')) return false;
            return ALLOWED_PLATFORMS.some(plat => resName.includes(plat));
        });

        renderList();
        showStatus(`Loaded ${allContests.length} upcoming contests`);
    } catch (error) {
        console.error("Fetch failed:", error);
        showStatus(`Failed to load data.`, true);
    }
}

function formatCountdown(ms) {
    if (ms <= 0) return "Live Now";
    
    const totalSeconds = Math.floor(ms / 1000);
    const d = Math.floor(totalSeconds / (3600*24));
    const h = Math.floor(totalSeconds % (3600*24) / 3600);
    const m = Math.floor(totalSeconds % 3600 / 60);
    const s = Math.floor(totalSeconds % 60);
    
    if (d > 0) return `In ${d}d ${h}h ${m}m`;
    if (h > 0) return `In ${h}h ${m}m ${s}s`;
    return `In ${m}m ${s}s`;
}

function renderList() {
    if (timerInterval) clearInterval(timerInterval);
    listContainer.innerHTML = '';

    if (allContests.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No upcoming contests found.</div>`;
        return;
    }

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);

    let currentGroupContainer = null;
    let currentHeaderDateStr = null;

    allContests.forEach((contest, index) => {
        const utcStartStr = contest.start.endsWith('Z') ? contest.start : contest.start + 'Z';
        const startDate = new Date(utcStartStr);
        
        const contestDateKey = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(startDate);

        if (contestDateKey !== currentHeaderDateStr) {
            currentHeaderDateStr = contestDateKey;
            
            let displayHeaderStr = "";
            if (contestDateKey === todayStr) {
                displayHeaderStr = `<i class="fa-solid fa-bolt" style="margin-right: 0.5rem; color: var(--accent-primary)"></i> Today`;
            } else if (contestDateKey === tomorrowStr) {
                displayHeaderStr = `<i class="fa-solid fa-rocket" style="margin-right: 0.5rem; color: var(--orb-2)"></i> Tomorrow`;
            } else {
                displayHeaderStr = `<i class="fa-regular fa-calendar" style="margin-right: 0.5rem; opacity: 0.6"></i> ` + 
                                   new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', month: 'long', day: 'numeric', weekday: 'long' }).format(startDate);
            }

            currentGroupContainer = document.createElement('div');
            currentGroupContainer.className = 'day-group';
            
            const header = document.createElement('div');
            header.className = 'date-header';
            header.innerHTML = displayHeaderStr;
            currentGroupContainer.appendChild(header);

            listContainer.appendChild(currentGroupContainer);
        }

        const card = document.createElement('a');
        card.href = contest.href;
        card.target = "_blank";
        card.className = "contest-card";
        card.style.animationDelay = `${(index % 20) * 0.05}s`;

        const resourceDomain = contest.resource.replace('www.', '').split('.')[0];
        
        const dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dhaka',
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(startDate) + ' GMT+6';

        card.innerHTML = `
            <div class="card-left">
                <span class="contest-platform">${resourceDomain}</span>
                <span class="contest-series">${contest.event}</span>
            </div>
            <div class="card-right">
                <div class="timer-badge" id="timer-${contest.id}">--</div>
                <span class="contest-start-date">${dateStr}</span>
            </div>
        `;
        currentGroupContainer.appendChild(card);
    });

    updateTimers();
    timerInterval = setInterval(updateTimers, 1000);
}

function updateTimers() {
    const now = new Date().getTime();
    
    allContests.forEach(contest => {
        const badge = document.getElementById(`timer-${contest.id}`);
        if (!badge) return;
        
        // Ensure UTC parsing for precise countdown
        const utcStartStr = contest.start.endsWith('Z') ? contest.start : contest.start + 'Z';
        const utcEndStr = contest.end.endsWith('Z') ? contest.end : contest.end + 'Z';
        
        const start = new Date(utcStartStr).getTime();
        const end = new Date(utcEndStr).getTime();
        
        if (now >= start && now <= end) {
            badge.innerHTML = `<i class="fa-solid fa-circle-dot"></i> Live Now`;
            if (!badge.classList.contains('live')) badge.classList.add('live');
        } else if (now > end) {
            badge.innerHTML = `Finished`;
            badge.classList.remove('live');
            badge.style.opacity = '0.5';
            badge.style.background = 'transparent';
            badge.style.borderColor = 'var(--text-secondary)';
            badge.style.color = 'var(--text-secondary)';
            badge.style.boxShadow = 'none';
        } else {
            badge.innerHTML = `<i class="fa-regular fa-clock"></i> ${formatCountdown(start - now)}`;
            badge.classList.remove('live');
        }
    });
}
