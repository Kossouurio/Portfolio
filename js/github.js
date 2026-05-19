// This file handles interactions with the GitHub API to fetch and display projects tagged with "portfolio" from your GitHub account.

const gitHubUsername = 'Kossouurio';
const projectsContainer = document.getElementById('projects-container');
let loadedProjects = [];

// Cache for asset existence checks
const _assetExistsCache = new Map();

async function assetExists(url) {
    if (!url) return false;
    if (_assetExistsCache.has(url)) return _assetExistsCache.get(url);
    try {
        const head = await fetch(url, { method: 'HEAD' });
        if (head && head.ok) {
            _assetExistsCache.set(url, true);
            return true;
        }
    } catch (e) {
        // ignore and try GET
    }
    try {
        const getResp = await fetch(url, { method: 'GET' });
        const ok = getResp && getResp.ok;
        _assetExistsCache.set(url, ok);
        return ok;
    } catch (e) {
        _assetExistsCache.set(url, false);
        return false;
    }
}

// Try loading an image by creating an Image and waiting for load/error
function tryLoadImage(url, timeout = 3000) {
    return new Promise((resolve) => {
        if (!url) return resolve(false);
        if (_assetExistsCache.has(url)) return resolve(_assetExistsCache.get(url));
        const img = new Image();
        let done = false;
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            _assetExistsCache.set(url, false);
            resolve(false);
        }, timeout);
        img.onload = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            _assetExistsCache.set(url, true);
            resolve(true);
        };
        img.onerror = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            _assetExistsCache.set(url, false);
            resolve(false);
        };
        img.decoding = 'async';
        img.src = url;
    });
}

// Try loading a video by creating a <video> element and waiting for loadeddata/error
function tryLoadVideo(url, timeout = 4000) {
    return new Promise((resolve) => {
        if (!url) return resolve(false);
        if (_assetExistsCache.has(url)) return resolve(_assetExistsCache.get(url));
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        let done = false;
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            _assetExistsCache.set(url, false);
            resolve(false);
        }, timeout);
        const success = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            _assetExistsCache.set(url, true);
            // cleanup
            v.pause();
            v.removeAttribute('src');
            v.load();
            resolve(true);
        };
        v.onloadeddata = success;
        v.oncanplay = success;
        v.onerror = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            _assetExistsCache.set(url, false);
            resolve(false);
        };
        v.src = url;
        // try to play briefly to trigger loading in some browsers
        v.play().then(() => v.pause()).catch(() => {});
    });
}

function buildLocalAssetUrl(relativePath) {
    return new URL(relativePath, document.baseURI).href;
}

function getLocalRepoPreviewCandidates(projectName) {
    const safeName = (projectName || '').trim();
    const variants = new Set([
        safeName,
        safeName.toLowerCase(),
        safeName.replace(/\s+/g, '-'),
        safeName.toLowerCase().replace(/\s+/g, '-'),
        safeName.replace(/\s+/g, '_'),
        safeName.toLowerCase().replace(/\s+/g, '_'),
    ]);

    const paths = [];
    for (const variant of variants) {
        if (!variant) continue;
        paths.push(
            `${variant}/assets/preview.png`,
        );
    }

    return paths.map(path => buildLocalAssetUrl(path));
}

function getLocalRepoVideoCandidates(projectName) {
    const safeName = (projectName || '').trim();
    const variants = new Set([
        safeName,
        safeName.toLowerCase(),
        safeName.replace(/\s+/g, '-'),
        safeName.toLowerCase().replace(/\s+/g, '-'),
        safeName.replace(/\s+/g, '_'),
        safeName.toLowerCase().replace(/\s+/g, '_'),
    ]);

    const paths = [];
    for (const variant of variants) {
        if (!variant) continue;
        paths.push(
            `${variant}/assets/preview.mp4`
        );
    }

    return paths.map(path => buildLocalAssetUrl(path));
}

async function fetchGitHubProjects() {
    try {
        let allProjects = [];
        let page = 1;
        let hasMorePages = true;

        // Fetch all repositories from the user
        while (hasMorePages) {
            const response = await fetch(`https://api.github.com/users/${gitHubUsername}/repos?page=${page}&per_page=100&sort=updated`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const projects = await response.json();
            if (projects.length === 0) {
                hasMorePages = false;
            } else {
                allProjects = allProjects.concat(projects);
                page++;
            }
        }

        console.debug('Fetched total repos:', allProjects.length);

        // Filter projects with "portfolio" topic/tag
        const portfolioProjects = allProjects.filter(project => {
            // Check if the project has "portfolio" in its topics
            return project.topics && project.topics.includes('portfolio');
        });

        if (portfolioProjects.length === 0) {
            console.warn('No repositories with "portfolio" topic found');
            // Fallback: use most recently updated repos to populate the portfolio area
            const fallback = allProjects.slice(0, 6);
            if (fallback.length > 0) {
                console.info('Falling back to most recent repositories for display.');
                loadedProjects = fallback;
                displayProjects(loadedProjects);
                return;
            }
        }

        console.debug('Portfolio-filtered projects:', portfolioProjects.length);

        loadedProjects = portfolioProjects;
        displayProjects(loadedProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        projectsContainer.innerHTML = '<p class="error-text">Failed to load projects. Please try again later.</p>';
    }
}

// Generate a gradient background based on the repo name (for repos without images)
function generateProjectGradient(name) {
    const colors = [
        ['#FFD700', '#FFA500'], // Gold to Orange
        ['#FF6B6B', '#FF8E53'], // Coral to Orange
        ['#667eea', '#764ba2'], // Purple gradient
        ['#f093fb', '#f5576c'], // Pink gradient
        ['#4facfe', '#00f2fe'], // Blue gradient
        ['#43e97b', '#38f9d7'], // Green gradient
    ];
    
    // Use name hash to pick consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// Use a single global preview video located at `assets/video_preview.mp4` when present
async function getLocalPreviewVideo() {
    if (typeof getLocalPreviewVideo._cache !== 'undefined') return getLocalPreviewVideo._cache;
    const candidates = [
        buildLocalAssetUrl('assets/video_preview.mp4'),
    ];
    for (const url of candidates) {
        if (await tryLoadVideo(url)) {
            console.debug('Global preview video found at', url);
            getLocalPreviewVideo._cache = url;
            return url;
        }
    }
    console.debug('No global preview video found');
    getLocalPreviewVideo._cache = null;
    return null;
}
 
// Cache for global preview image lookup
let _cachedGlobalPreviewImage = undefined;
async function getGlobalPreviewImage() {
    if (_cachedGlobalPreviewImage !== undefined) return _cachedGlobalPreviewImage;
    const candidates = [
        buildLocalAssetUrl('assets/preview.png'),
    ];
    for (const url of candidates) {
        if (await tryLoadImage(url)) {
            _cachedGlobalPreviewImage = url;
            console.debug('Global preview image found at', url);
            return url;
        }
    }
    _cachedGlobalPreviewImage = null;
    console.debug('No global preview image found');
    return null;
}

async function getRepoPreviewImage(project) {
    // Memoize per-repo results to avoid repeated network checks
    if (!getRepoPreviewImage._cache) getRepoPreviewImage._cache = new Map();
    const cacheKey = project.full_name || project.name;
    if (getRepoPreviewImage._cache.has(cacheKey)) return getRepoPreviewImage._cache.get(cacheKey);

    // Prefer remote raw.githubusercontent.com (few, common locations) to minimize calls
    const remoteCandidates = [
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/assets/preview.png`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/master/assets/preview.png`,
    ];

    for (const url of remoteCandidates) {
        try {
            if (await tryLoadImage(url)) {
                console.debug('Found remote repo image candidate:', url);
                getRepoPreviewImage._cache.set(cacheKey, url);
                return url;
            }
        } catch (e) {
            // ignore
        }
    }

    getRepoPreviewImage._cache.set(cacheKey, null);
    return null;
}

async function getRepoPreviewVideo(project) {
    // Memoize per-repo results
    if (!getRepoPreviewVideo._cache) getRepoPreviewVideo._cache = new Map();
    const cacheKey = project.full_name || project.name;
    if (getRepoPreviewVideo._cache.has(cacheKey)) return getRepoPreviewVideo._cache.get(cacheKey);

    const remoteVideoCandidates = [
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/assets/video_preview.mp4`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/master/assets/video_preview.mp4`,
    ];
    for (const url of remoteVideoCandidates) {
        try {
            if (await tryLoadVideo(url)) {
                console.debug('Found remote repo video candidate:', url);
                getRepoPreviewVideo._cache.set(cacheKey, url);
                return url;
            }
        } catch (e) {
            // ignore
        }
    }

    getRepoPreviewVideo._cache.set(cacheKey, null);
    return null;
}

// Create a placeholder with gradient and icon
function createPlaceholder(project) {
    const [color1, color2] = generateProjectGradient(project.name);
    return `
        <div class="project-placeholder" style="background: linear-gradient(135deg, ${color1}, ${color2});">
            <span class="project-placeholder-icon">${getLanguageIcon(project.language)}</span>
        </div>
    `;
}

// Get an icon based on the programming language
function getLanguageIcon(language) {
    const icons = {
        'C++': '⚙️',
        'C#': '🎮',
        'C': '💾',
        'Python': '🐍',
        'JavaScript': '⚡',
        'TypeScript': '📘',
        'HTML': '🌐',
        'CSS': '🎨',
        'Rust': '🦀',
        'Go': '🐹',
        'Java': '☕',
        'Lua': '🌙',
        'GDScript': '🎮',
    };
    return icons[language] || '📁';
}

// Enhance a <video> element with custom controls (play/pause, seek)
function enhanceVideoPlayer(video) {
    if (!video) return;
    const wrapper = video.closest('.video-wrapper');
    if (!wrapper) return;

    const playBtn = wrapper.querySelector('.v-play');
    const seek = wrapper.querySelector('.seek');
    const timeLabel = wrapper.querySelector('.time');
    const centerPlay = wrapper.querySelector('.center-play');
    const controls = wrapper.querySelector('.video-controls');

    const formatTime = (s) => {
        if (!isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    // Update UI when metadata loaded
    const onLoaded = () => {
        if (seek && video.duration) seek.max = 100;
        if (timeLabel) timeLabel.textContent = formatTime(0);
    };

    const onTimeUpdate = () => {
        if (seek && video.duration) {
            const pct = (video.currentTime / video.duration) * 100 || 0;
            seek.value = pct;
        }
        if (timeLabel) timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);

    // Play / Pause
    const togglePlay = () => {
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    };

    playBtn && playBtn.addEventListener('click', togglePlay);
    centerPlay && centerPlay.addEventListener('click', () => { video.play().catch(()=>{}); centerPlay.style.display = 'none'; });

    video.addEventListener('play', () => {
        if (playBtn) playBtn.textContent = '❚❚';
        if (centerPlay) centerPlay.style.display = 'none';
        if (controls) controls.classList.remove('hidden');
    });
    video.addEventListener('pause', () => {
        if (playBtn) playBtn.textContent = '▶';
        if (centerPlay) centerPlay.style.display = '';
        if (controls) controls.classList.remove('hidden');
    });

    // Seek
    if (seek) {
        let seeking = false;
        seek.addEventListener('input', () => {
            seeking = true;
            const pct = Number(seek.value) / 100;
            if (video.duration) video.currentTime = pct * video.duration;
        });
        seek.addEventListener('change', () => { seeking = false; });
    }

    // Show/hide controls on mouse
    let hideTimer = null;
    const showControls = () => { controls && controls.classList.remove('hidden'); clearTimeout(hideTimer); hideTimer = setTimeout(()=>{ if (!video.paused) controls && controls.classList.add('hidden'); }, 2500); };
    wrapper.addEventListener('mousemove', showControls);
    wrapper.addEventListener('mouseleave', () => { if (!video.paused) controls && controls.classList.add('hidden'); });
}

async function displayProjects(projects) {
    projectsContainer.innerHTML = ''; // Clear existing content

    if (projects.length === 0) {
        projectsContainer.innerHTML = '<p class="error-text">No portfolio projects found.</p>';
        return;
    }

    // Pre-resolve global assets once to avoid repeated checks
    const globalVideo = await getLocalPreviewVideo();
    const globalImage = await getGlobalPreviewImage() || buildLocalAssetUrl('assets/preview.svg');

    // Render each project as a full-width row: description on the left, media on the right
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const projectRow = document.createElement('div');
        projectRow.classList.add('project-row');

        // Prefer per-repo preview video -> global preview video -> per-repo image -> global image
        const repoVideo = await getRepoPreviewVideo(project);
        let mediaContent;
        if (repoVideo) {
            mediaContent = `
                <div class="project-row__media">
                    <div class="video-wrapper">
                        <video src="${repoVideo}" preload="metadata" playsinline></video>
                        <div class="center-play">▶</div>
                        <div class="video-controls">
                            <button class="vbtn v-play">▶</button>
                            <div class="progress"><input class="seek" type="range" min="0" max="100" value="0"></div>
                            <span class="time">0:00</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (globalVideo) {
            mediaContent = `
                <div class="project-row__media">
                    <div class="video-wrapper">
                        <video src="${globalVideo}" preload="metadata" playsinline></video>
                        <div class="center-play">▶</div>
                        <div class="video-controls">
                            <button class="vbtn v-play">▶</button>
                            <div class="progress"><input class="seek" type="range" min="0" max="100" value="0"></div>
                            <span class="time">0:00</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const repoImgUrl = await getRepoPreviewImage(project);
            const imgUrl = repoImgUrl || globalImage;
            mediaContent = `<div class="project-row__media"><img src="${imgUrl}" alt="${project.name} preview" loading="lazy"></div>`;
        }

        const descriptionText = project.description || 'No description available.';

        const liveButton = project.homepage ? `<a href="${project.homepage}" target="_blank" class="btn btn-outline">See Live</a>` : '';
        const sourceButton = `<a href="${project.html_url}" target="_blank" class="btn btn-primary">Source Code</a>`;

        projectRow.innerHTML = `
            <div class="project-row__content">
                <h3 class="project-row__title">${project.name}</h3>
                <p class="project-row__description">${descriptionText}</p>
                <div class="project-row__actions">
                    ${liveButton}
                    ${sourceButton}
                </div>
            </div>
            ${mediaContent}
        `;

        projectsContainer.appendChild(projectRow);
        // Enhance video elements with custom controls
        const videoEl = projectRow.querySelector('video');
        if (videoEl) {
            videoEl.muted = true; // start muted until user interacts
            videoEl.playsInline = true;
            videoEl.loop = true;
            videoEl.setAttribute('preload', 'metadata');
            // Attach custom controls behaviour
            enhanceVideoPlayer(videoEl);
        }
    }
}

// Call the function to fetch and display projects when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubProjects();
});