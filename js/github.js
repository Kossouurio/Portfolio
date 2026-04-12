// This file handles interactions with the GitHub API to fetch and display projects from your GitHub account.

const gitHubUsername = 'Kossouurio'; // Replace with your GitHub username
const projectsContainer = document.getElementById('projects-container'); // Ensure this element exists in your HTML

async function fetchGitHubProjects() {
    try {
        const response = await fetch(`https://api.github.com/users/${gitHubUsername}/repos?sort=updated&per_page=12`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const projects = await response.json();
        // Filter out forked repos and sort by stars
        const ownProjects = projects
            .filter(p => !p.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count);
        displayProjects(ownProjects);
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

// Try to fetch a preview image from the repo
async function getProjectImage(project) {
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
        
        projectElement.innerHTML = `
            ${imageContent}
            <div class="project-content">
                <h3 class="project-title">${project.name}</h3>
                <p class="project-description">${project.description || 'No description available.'}</p>
                <div class="project-meta">
                    ${project.language ? `<span class="project-lang">${getLanguageIcon(project.language)} ${project.language}</span>` : ''}
                </div>
                <div class="project-buttons">
                    <a href="${project.html_url}" target="_blank" class="btn btn-primary btn-sm">
                        <span>GitHub</span>
                    </a>
                    <a href="readme.html?repo=${project.name}" class="btn btn-outline btn-sm">
                        <span>View Details</span>
                    </a>
                </div>
            </div>
        `;
        projectsContainer.appendChild(projectElement);
    }
}

// Call the function to fetch and display projects when the page loads
document.addEventListener('DOMContentLoaded', fetchGitHubProjects);