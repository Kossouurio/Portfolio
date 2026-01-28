// This file handles interactions with the GitHub API to fetch and display projects from your GitHub account.

const gitHubUsername = 'Kossouurio'; // Replace with your GitHub username
const projectsContainer = document.getElementById('projects-container'); // Ensure this element exists in your HTML

async function fetchGitHubProjects() {
    try {
        const response = await fetch(`https://api.github.com/users/${gitHubUsername}/repos`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const projects = await response.json();
        displayProjects(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        projectsContainer.innerHTML = '<p>Failed to load projects. Please try again later.</p>';
    }
}

function displayProjects(projects) {
    projectsContainer.innerHTML = ''; // Clear existing content
    projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.classList.add('project');
        projectElement.innerHTML = `
            <h3>${project.name}</h3>
            <p>${project.description || 'No description available.'}</p>
            <a href="${project.html_url}" target="_blank">View Project</a>
        `;
        projectsContainer.appendChild(projectElement);
    });
}

// Call the function to fetch and display projects when the page loads
document.addEventListener('DOMContentLoaded', fetchGitHubProjects);