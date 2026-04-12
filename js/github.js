// This file handles interactions with the GitHub API to fetch and display projects from your GitHub account.

const gitHubUsername = 'Kossouurio'; // Replace with your GitHub username
const projectsContainer = document.getElementById('projects-container'); // Ensure this element exists in your HTML
const projectsSortSelect = document.getElementById('projects-sort');
const featuredProjectsConfigPath = 'assets/projects.json';
let loadedProjects = [];

function normalizeFeaturedProjectEntry(entry) {
    if (typeof entry === 'string') {
        return { url: entry };
    }

    if (entry && typeof entry.url === 'string') {
        const normalizedType = typeof entry.type === 'string' ? entry.type : null;
        const normalizedLabel = typeof entry.label === 'string' ? entry.label : null;

        return {
            url: entry.url,
            label: normalizedLabel || normalizedType,
            demoUrl: typeof entry.demoUrl === 'string' ? entry.demoUrl : null,
            description: typeof entry.description === 'string' ? entry.description : null,
            imageUrl: typeof entry.imageUrl === 'string' ? entry.imageUrl : null,
            tags: Array.isArray(entry.tags) ? entry.tags.filter((tag) => typeof tag === 'string') : [],
        };
    }

    return null;
}

function extractRepoInfoFromUrl(repoUrl) {
    // Supports URL formats like https://github.com/owner/repo and strips optional .git suffix.
    const match = repoUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
    if (!match) {
        return null;
    }

    return {
        owner: match[1],
        name: match[2],
    };
}

async function loadFeaturedProjectsConfig() {
    try {
        const response = await fetch(featuredProjectsConfigPath);
        if (!response.ok) {
            throw new Error('Failed to load featured projects JSON');
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.repositories)) {
            throw new Error('Invalid featured projects JSON format');
        }

        return data.repositories
            .map(normalizeFeaturedProjectEntry)
            .filter(Boolean);
    } catch (error) {
        console.warn('Using API fallback because featured projects JSON could not be loaded:', error);
        return [];
    }
}

async function fetchReposFromConfig(projectEntries) {
    const parsedEntries = projectEntries
        .map((entry) => ({ entry, repoInfo: extractRepoInfoFromUrl(entry.url) }))
        .filter((item) => Boolean(item.repoInfo));

    if (parsedEntries.length === 0) {
        return [];
    }

    const owners = [...new Set(parsedEntries.map((item) => item.repoInfo.owner))];
    const repoLookup = new Map();

    for (const owner of owners) {
        try {
            const response = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`);
            if (!response.ok) {
                throw new Error(`Unable to fetch repositories for ${owner}`);
            }

            const repos = await response.json();
            repos.forEach((repo) => {
                repoLookup.set(`${repo.owner.login.toLowerCase()}/${repo.name.toLowerCase()}`, repo);
            });
        } catch (error) {
            console.warn('Skipping owner repository fetch:', error.message);
        }
    }

    return parsedEntries
        .map(({ entry, repoInfo }) => {
            const key = `${repoInfo.owner.toLowerCase()}/${repoInfo.name.toLowerCase()}`;
            const repo = repoLookup.get(key);

            if (!repo) {
                // Fallback to JSON data when API data is unavailable (rate limit/network).
                return {
                    name: repoInfo.name,
                    html_url: entry.url,
                    owner: { login: repoInfo.owner },
                    language: null,
                    stargazers_count: 0,
                    updated_at: null,
                    description: entry.description || 'No description available.',
                    featuredMeta: {
                        label: entry.label,
                        demoUrl: entry.demoUrl,
                        description: entry.description,
                        imageUrl: entry.imageUrl,
                        tags: entry.tags || [],
                    },
                };
            }

            return {
                ...repo,
                featuredMeta: {
                    label: entry.label,
                    demoUrl: entry.demoUrl,
                    description: entry.description,
                    imageUrl: entry.imageUrl,
                    tags: entry.tags || [],
                },
            };
        })
        .filter(Boolean);
}

async function fetchGitHubProjects() {
    try {
        const configuredProjects = await loadFeaturedProjectsConfig();

        if (configuredProjects.length > 0) {
            const featuredProjects = await fetchReposFromConfig(configuredProjects);
            if (featuredProjects.length > 0) {
                loadedProjects = featuredProjects;
                refreshProjectView();
                return;
            }
        }

        const response = await fetch(`https://api.github.com/users/${gitHubUsername}/repos?sort=updated&per_page=12`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const projects = await response.json();
        // Fallback: filter out forked repos and sort by stars.
        const ownProjects = projects
            .filter((p) => !p.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count);
        loadedProjects = ownProjects;
        refreshProjectView();
    } catch (error) {
        console.error('Error fetching projects:', error);
        projectsContainer.innerHTML = '<p class="error-text">Failed to load projects. Please try again later.</p>';
    }
}

function sortProjects(projects, sortBy) {
    const sortedProjects = [...projects];
    const getLabel = (project) => (project.featuredMeta && project.featuredMeta.label ? project.featuredMeta.label : '');
    const getLanguage = (project) => (project.language || 'zzz');

    switch (sortBy) {
    case 'updated':
        sortedProjects.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        break;
    case 'name':
        sortedProjects.sort((a, b) => a.name.localeCompare(b.name));
        break;
    case 'language':
        sortedProjects.sort((a, b) => {
            const primary = getLanguage(a).localeCompare(getLanguage(b));
            return primary !== 0 ? primary : a.name.localeCompare(b.name);
        });
        break;
    case 'label':
        sortedProjects.sort((a, b) => {
            const primary = getLabel(a).localeCompare(getLabel(b));
            return primary !== 0 ? primary : a.name.localeCompare(b.name);
        });
        break;
    case 'default':
    default:
        // Keep the original order from JSON/API fetch.
        break;
    }

    return sortedProjects;
}

function refreshProjectView() {
    const activeSort = projectsSortSelect ? projectsSortSelect.value : 'default';
    const sortedProjects = sortProjects(loadedProjects, activeSort);
    displayProjects(sortedProjects);
}

function initProjectsSort() {
    if (!projectsSortSelect) {
        return;
    }

    projectsSortSelect.addEventListener('change', refreshProjectView);
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

// Try to fetch a preview image from the repo
async function getProjectImage(project) {
    if (project.featuredMeta && project.featuredMeta.imageUrl) {
        return project.featuredMeta.imageUrl;
    }

    // Check common image locations in the repo
    const possibleImages = [
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/preview.png`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/preview.jpg`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/screenshot.png`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/screenshot.jpg`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/master/preview.png`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/master/preview.jpg`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/assets/preview.png`,
        `https://raw.githubusercontent.com/${gitHubUsername}/${project.name}/main/images/preview.png`,
    ];

    for (const url of possibleImages) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                return url;
            }
        } catch {
            continue;
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

async function displayProjects(projects) {
    projectsContainer.innerHTML = ''; // Clear existing content
    
    for (const project of projects) {
        const projectElement = document.createElement('div');
        projectElement.classList.add('project-card');
        
        // Try to get a preview image
        const imageUrl = await getProjectImage(project);
        
        const imageContent = imageUrl 
            ? `<div class="project-image"><img src="${imageUrl}" alt="${project.name} preview" loading="lazy"></div>`
            : createPlaceholder(project);

        const descriptionText = (project.featuredMeta && project.featuredMeta.description)
            ? project.featuredMeta.description
            : (project.description || 'No description available.');

        const tagsMarkup = (project.featuredMeta && project.featuredMeta.tags && project.featuredMeta.tags.length > 0)
            ? `<div class="project-meta">${project.featuredMeta.tags.map((tag) => `<span class="project-lang">#${tag}</span>`).join('')}</div>`
            : '';

        const projectType = (project.featuredMeta && project.featuredMeta.label)
            ? project.featuredMeta.label
            : 'Repository';

        const labelMarkup = `<span class="project-lang">Type: ${projectType}</span>`;

        const demoButton = (project.featuredMeta && project.featuredMeta.demoUrl)
            ? `<a href="${project.featuredMeta.demoUrl}" target="_blank" class="btn btn-outline btn-sm"><span>Live Demo</span></a>`
            : '';
        
        projectElement.innerHTML = `
            ${imageContent}
            <div class="project-content">
                <h3 class="project-title">${project.name}</h3>
                <p class="project-description">${descriptionText}</p>
                <div class="project-meta">
                    ${project.language ? `<span class="project-lang">${getLanguageIcon(project.language)} ${project.language}</span>` : ''}
                    <span class="project-stars">⭐ ${project.stargazers_count || 0}</span>
                    ${labelMarkup}
                </div>
                ${tagsMarkup}
                <div class="project-buttons">
                    <a href="${project.html_url}" target="_blank" class="btn btn-primary btn-sm">
                        <span>GitHub</span>
                    </a>
                    ${demoButton}
                    <a href="readme.html?owner=${project.owner.login}&repo=${project.name}" class="btn btn-outline btn-sm">
                        <span>View Details</span>
                    </a>
                </div>
            </div>
        `;
        projectsContainer.appendChild(projectElement);
    }
}

// Call the function to fetch and display projects when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initProjectsSort();
    fetchGitHubProjects();
});