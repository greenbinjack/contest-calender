const API_KEY = "b0bd94ec61ea41cbbdedbf1ee28835ecfbaa8bff";
const USERNAME = "greenbinjack";
const BASE_URL = "https://clist.by/api/v4/contest/";

const ALLOWED_PLATFORMS = [
    'codeforces', 'gym', 'atcoder', 'codechef', 'lightoj', 
    'google', 'leetcode', 'eolymp', 'kattis'
];

const listContainer = document.getElementById('contest-list');
const statusPanel = document.getElementById('status-container');

let allContests = [];
let timerInterval = null;

// PWA & Notification State
let swRegistration = null;
let triggeredNotifs = JSON.parse(localStorage.getItem('triggered_notifs') || '{}');

document.addEventListener("DOMContentLoaded", () => {
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            swRegistration = reg;
            console.log("Service Worker Registered");
        }).catch(err => console.error("SW Registration Failed", err));
    }

    /*
    // Set up master notification toggle
    const enableAlertsBtn = document.getElementById('enable-alerts-btn');
    let alertsEnabled = localStorage.getItem('alerts_enabled') === 'true';

    function updateAlertBtnState() {
        if (alertsEnabled) {
            enableAlertsBtn.innerHTML = `<i class="fa-solid fa-bell"></i> Alerts: ON`;
            enableAlertsBtn.classList.add('active');
        } else {
            enableAlertsBtn.innerHTML = `<i class="fa-regular fa-bell-slash"></i> Alerts: OFF`;
            enableAlertsBtn.classList.remove('active');
        }
    }

    function resetToggle(errorMsg) {
        if (errorMsg) showStatus(errorMsg, true);
        alertsEnabled = false;
        localStorage.setItem('alerts_enabled', 'false');
        updateAlertBtnState();
    }

    // Initialize UI on load
    updateAlertBtnState();

    enableAlertsBtn.addEventListener('click', () => {
        if (alertsEnabled) {
            alertsEnabled = false;
            localStorage.setItem('alerts_enabled', 'false');
            updateAlertBtnState();
            showStatus("Alerts paused.");
        } else {
            // Optimistic UI Update so the button responds instantly
            alertsEnabled = true;
            localStorage.setItem('alerts_enabled', 'true');
            updateAlertBtnState();

            if (!("Notification" in window)) {
                return resetToggle("Notifications not supported in this browser.");
            }

            if (Notification.permission === 'granted') {
                showStatus("Alerts enabled for all contests!");
            } else if (Notification.permission !== 'denied') {
                const handlePermission = (perm) => {
                    if (perm !== 'granted') resetToggle("Notification permission denied.");
                    else showStatus("Alerts enabled for all contests!");
                };
                
                try {
                    Notification.requestPermission().then(handlePermission);
                } catch(e) {
                    // Fallback for older Safari
                    Notification.requestPermission(handlePermission);
                }
            } else {
                resetToggle("Notifications are blocked in your browser settings.");
            }
        }
    });
    */

    // GSAP Registration
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        initCodeParticles();
    }
    
    fetchUpcomingContests().finally(() => {
        setTimeout(() => {
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen) {
                splashScreen.classList.add('hidden');
                setTimeout(() => splashScreen.remove(), 500);
            }
        }, 1200); // 1.2s delay so the splash screen is visible momentarily
    });
});

function sendPush(title, body) {
    if (swRegistration && Notification.permission === "granted") {
        swRegistration.showNotification(title, {
            body: body,
            icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Circle-icons-calendar.svg/1024px-Circle-icons-calendar.svg.png",
            vibrate: [200, 100, 200]
        });
    } else if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}

function checkNotifications(contest, diffSeconds) {
    if (localStorage.getItem('alerts_enabled') !== 'true') return;

    // ALL contests are now subscribed globally
    const id = contest.id.toString();
    
    if (!triggeredNotifs[id]) triggeredNotifs[id] = { h2: false, m30: false };
    const state = triggeredNotifs[id];
    
    // 2h = 7200s, 30m = 1800s
    if (diffSeconds > 0 && diffSeconds <= 7200 && diffSeconds >= 7100 && !state.h2) {
        sendPush(`${contest.event}`, `Starts in exactly 2 hours! Get ready.`);
        state.h2 = true;
        localStorage.setItem('triggered_notifs', JSON.stringify(triggeredNotifs));
    }
    
    if (diffSeconds > 0 && diffSeconds <= 1800 && diffSeconds >= 1700 && !state.m30) {
        sendPush(`🔴 ${contest.event}`, `Starts in 30 minutes! Good luck!`);
        state.m30 = true;
        localStorage.setItem('triggered_notifs', JSON.stringify(triggeredNotifs));
    }
}

function initCodeParticles() {
    const container = document.getElementById('code-particles');
    const symbols = ['{ }', ';', '++', '=>', '#include', 'for( )', 'return', '0101', 'main()'];
    const colors = ['cyan', 'violet', ''];
    
    for (let i = 0; i < 30; i++) {
        const span = document.createElement('span');
        span.className = `floating-code ${colors[Math.floor(Math.random() * colors.length)]}`;
        span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        
        span.style.left = `${Math.random() * 100}vw`;
        span.style.top = `${Math.random() * 100}vh`;
        span.style.fontSize = `${Math.random() * 1.5 + 0.8}rem`;
        
        container.appendChild(span);
        
        // GSAP Anti-Gravity Float
        gsap.to(span, {
            y: `random(-100, 100)`,
            x: `random(-50, 50)`,
            opacity: `random(0.1, 0.5)`,
            duration: `random(15, 30)`,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true
        });
    }
}

function showStatus(message, isError = false) {
    statusPanel.classList.remove('hidden');
    statusPanel.innerHTML = `<span style="color: ${isError ? '#e11d48' : 'var(--text-primary)'}">${message}</span>`;
    if (!isError) setTimeout(() => statusPanel.classList.add('hidden'), 3000);
}

async function fetchUpcomingContests() {
    listContainer.innerHTML = '';
    showStatus("Compiling live and upcoming contests...");

    try {
        const now = new Date();
        const nowIso = now.toISOString().slice(0, 19);
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthIso = nextMonth.toISOString().slice(0, 19);

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
        showStatus(`Compiled ${allContests.length} upcoming events`);
    } catch (error) {
        console.error("Fetch failed:", error);
        showStatus(`Failed to compile data.`, true);
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
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No upcoming logic detected.</div>`;
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
                displayHeaderStr = `<i class="fa-solid fa-fire" style="margin-right: 0.5rem; color: var(--neon-cyan)"></i> Today`;
            } else if (contestDateKey === tomorrowStr) {
                displayHeaderStr = `<i class="fa-solid fa-code" style="margin-right: 0.5rem; color: var(--neon-violet)"></i> Tomorrow`;
            } else {
                displayHeaderStr = `<i class="fa-regular fa-calendar" style="margin-right: 0.5rem; opacity: 0.6"></i> ` + 
                                   new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', weekday: 'short' }).format(startDate);
            }

            currentGroupContainer = document.createElement('div');
            currentGroupContainer.className = 'day-group';
            
            const header = document.createElement('div');
            header.className = 'date-header';
            header.innerHTML = displayHeaderStr;
            currentGroupContainer.appendChild(header);

            listContainer.appendChild(currentGroupContainer);
        }

        const card = document.createElement('div');
        card.className = "contest-card";
        card.style.cursor = "pointer";
        card.onclick = () => window.open(contest.href, '_blank');

        const resourceDomain = contest.resource.replace('www.', '').split('.')[0];
        const dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(startDate) + ' GMT+6';

        if (typeof gsap !== 'undefined' && window.ScrollTrigger) {
            gsap.fromTo(card, { opacity: 0, scale: 0.95 }, {
                opacity: 1, scale: 1, duration: 0.5, delay: (index % 10) * 0.05, ease: "power2.out"
            });
        }

        card.innerHTML = `
            <div class="card-content-row">
                <div class="card-left">
                    <span class="contest-platform">${resourceDomain}</span>
                    <span class="contest-series">${contest.event}</span>
                </div>
                <div class="card-right">
                    <div class="timer-badge" id="timer-${contest.id}">--</div>
                    <span class="contest-start-date">${dateStr}</span>
                </div>
            </div>
        `;
        currentGroupContainer.appendChild(card);
    });

    if (typeof gsap !== 'undefined') {
        gsap.utils.toArray('.date-header').forEach(header => {
            gsap.fromTo(header, 
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0, duration: 1, ease: "slow(0.7, 0.7, false)",
                    scrollTrigger: {
                        trigger: header,
                        start: "top 90%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });
    }

    updateTimers();
    timerInterval = setInterval(updateTimers, 1000);
}

function updateTimers() {
    const now = new Date().getTime();
    
    allContests.forEach(contest => {
        const badge = document.getElementById(`timer-${contest.id}`);
        if (!badge) return;
        
        const utcStartStr = contest.start.endsWith('Z') ? contest.start : contest.start + 'Z';
        const utcEndStr = contest.end.endsWith('Z') ? contest.end : contest.end + 'Z';
        const start = new Date(utcStartStr).getTime();
        const end = new Date(utcEndStr).getTime();
        
        const diffSeconds = Math.floor((start - now) / 1000);

        if (now >= start && now <= end) {
            badge.innerHTML = `<i class="fa-solid fa-circle-dot"></i> Live Now`;
            if (!badge.classList.contains('live')) badge.classList.add('live');
        } else if (now > end) {
            badge.innerHTML = `Finished`;
            badge.classList.remove('live');
            badge.style.opacity = '0.3';
            badge.style.background = 'transparent';
            badge.style.borderColor = 'var(--text-secondary)';
            badge.style.color = 'var(--text-secondary)';
            badge.style.boxShadow = 'none';
        } else {
            badge.innerHTML = `<i class="fa-regular fa-clock"></i> ${formatCountdown(start - now)}`;
            badge.classList.remove('live');
            
            // Trigger 2h and 30m background notifications automatically
            // checkNotifications(contest, diffSeconds);
        }
    });
}
