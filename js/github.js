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

// Fetch a raw text file from a given URL and return trimmed content, or null
async function fetchTextContent(url) {
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const txt = await resp.text();
        return txt ? txt.trim() : null;
    } catch (e) {
        return null;
    }
}

// Try reading a youtube.md from the repo's assets to get a YouTube embed URL
async function getRepoYouTubeEmbedUrl(project) {
    if (!getRepoYouTubeEmbedUrl._cache) getRepoYouTubeEmbedUrl._cache = new Map();
    const cacheKey = project.full_name || project.name;
    if (getRepoYouTubeEmbedUrl._cache.has(cacheKey)) return getRepoYouTubeEmbedUrl._cache.get(cacheKey);

    const candidates = [
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/assets/youtube.md`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/master/assets/youtube.md`,
    ];

    for (const url of candidates) {
        try {
            const txt = await fetchTextContent(url);
            if (!txt) continue;
            // Accept plain URLs or pasted iframe snippets and return a usable embed URL
            const youtubeEmbedUrl = extractYouTubeEmbedUrl(txt);
            if (youtubeEmbedUrl) {
                getRepoYouTubeEmbedUrl._cache.set(cacheKey, youtubeEmbedUrl);
                return youtubeEmbedUrl;
            }
        } catch (e) {
            // ignore
        }
    }

    getRepoYouTubeEmbedUrl._cache.set(cacheKey, null);
    return null;
}

// Extract a YouTube embed URL from a URL, iframe snippet, or plain video URL/id
function extractYouTubeEmbedUrl(input) {
    if (!input) return null;
    const s = input.trim();

    const iframeMatch = s.match(/src\s*=\s*['"]([^'"]+)['"]/i);
    if (iframeMatch && iframeMatch[1]) {
        return normalizeYouTubeEmbedUrl(iframeMatch[1]);
    }

    return normalizeYouTubeEmbedUrl(s);
}

function normalizeYouTubeEmbedUrl(value) {
    if (!value) return null;

    const s = value.trim();
    const directEmbedMatch = s.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i);
    if (directEmbedMatch && directEmbedMatch[1]) {
        return s;
    }

    const patterns = [
        /(?:v=)([A-Za-z0-9_-]{11})/, // watch?v=ID
        /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/, // youtu.be/ID
        /(?:embed\/)([A-Za-z0-9_-]{11})/, // embed/ID
    ];
    for (const p of patterns) {
        const m = s.match(p);
        if (m && m[1]) {
            return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
        }
    }

    try {
        const u = new URL(s);
        const seg = u.pathname.split('/').filter(Boolean).pop();
        if (seg && seg.length === 11) {
            return `https://www.youtube-nocookie.com/embed/${seg}?rel=0&modestbranding=1`;
        }
    } catch (e) {
        if (s.length === 11) {
            return `https://www.youtube-nocookie.com/embed/${s}?rel=0&modestbranding=1`;
        }
    }

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

// Custom video controls removed

async function displayProjects(projects) {
    projectsContainer.innerHTML = ''; // Clear existing content

    if (projects.length === 0) {
        projectsContainer.innerHTML = '<p class="error-text">No portfolio projects found.</p>';
        return;
    }
    // Pre-resolve global image once to avoid repeated checks
    const globalImage = await getGlobalPreviewImage() || buildLocalAssetUrl('assets/preview.svg');

    // Render each project as a full-width row: description on the left, image on the right
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const projectRow = document.createElement('div');
        projectRow.classList.add('project-row');

        // Prefer a youtube embed (from assets/youtube.md) -> repo image -> global image
        const repoYouTubeEmbed = await getRepoYouTubeEmbedUrl(project);
        let mediaContent;
        if (repoYouTubeEmbed) {
            mediaContent = `<div class="project-row__media"><iframe class="youtube-embed" src="${repoYouTubeEmbed}" title="${project.name} video preview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>`;
        } else {
            const repoImgUrl = await getRepoPreviewImage(project);
            const imgUrl = repoImgUrl || globalImage;
            mediaContent = `<div class="project-row__media"><img src="${imgUrl}" alt="${project.name} preview" loading="lazy"></div>`;
        }

        const descriptionText = project.description || 'No description available.';

        const liveButton = project.homepage ? `<a href="${project.homepage}" target="_blank" class="btn btn-outline">See Live</a>` : '';
        const youtubeButton = project.youtubeUrl ? `<a href="${project.youtubeUrl}" target="_blank" class="btn btn-outline">YouTube</a>` : '';
        const sourceButton = `<a href="${project.html_url}" target="_blank" class="btn btn-primary">Source Code</a>`;

        projectRow.innerHTML = `
            <div class="project-row__content">
                <h3 class="project-row__title">${project.name}</h3>
                <p class="project-row__description">${descriptionText}</p>
                <div class="project-row__actions">
                    ${liveButton}
                    ${youtubeButton}
                    ${sourceButton}
                </div>
            </div>
            ${mediaContent}
        `;

        projectsContainer.appendChild(projectRow);
    }
}

// Call the function to fetch and display projects when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubProjects();
});