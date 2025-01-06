const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Directories
const eventsDir = path.join(__dirname, '../events');
const publicDir = path.join(__dirname, '../public');
const staticDir = path.join(__dirname, '../static');

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
}

function createEventHTML(event, isPreview = false) {
    const content = `
        <h3>${event.title}</h3>
        <p class="date">${formatDate(event.date)}</p>
        ${event.location ? `<p class="location">📍 ${event.location}</p>` : ''}
        ${event.meetup_link ? `<p class="meetup-link">🎟️ <a href="${event.meetup_link}" target="_blank" class="meetup-button">RSVP on Partiful</a></p>` : ''}
        <div class="event-content">${event.body}</div>
    `;

    return isPreview ? 
        `<a href="/events/${event.slug}/" class="event-link"><div class="event-item">${content}</div></a>` :
        `<div class="event-item">${content}</div>`;
}

function createPage(content, title = '') {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title ? `${title} - ` : ''}Fighthaven</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <header>
        <nav>
            <h1><a href="/">Fighthaven</a></h1>
            <ul>
                <li><a href="/events.html">Events</a></li>
                <li><a href="https://discord.gg/SXhm3aQUA3" target="_blank">Discord</a></li>
            </ul>
        </nav>
    </header>
    <main>
        ${content}
    </main>
    <footer>
        <p>&copy; ${year} Fighthaven</p>
    </footer>
</body>
</html>`;
}

function buildSite() {
    // Create directories
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    if (!fs.existsSync(path.join(publicDir, 'css'))) fs.mkdirSync(path.join(publicDir, 'css'));
    if (!fs.existsSync(path.join(publicDir, 'events'))) fs.mkdirSync(path.join(publicDir, 'events'), { recursive: true });

    // Copy static files
    fs.copyFileSync(path.join(staticDir, 'css/style.css'), path.join(publicDir, 'css/style.css'));

    // Process events
    const events = [];
    if (fs.existsSync(eventsDir)) {
        fs.readdirSync(eventsDir).forEach(file => {
            if (file.endsWith('.md')) {
                const filePath = path.join(eventsDir, file);
                const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
                events.push({
                    ...data,
                    body: marked(content),
                    slug: path.basename(file, '.md')
                });
            }
        });
    }

    // Sort events
    const now = new Date();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcomingEvents = events.filter(event => new Date(event.date) >= now);
    const pastEvents = events.filter(event => new Date(event.date) < now);

    // Generate pages
    const homepageContent = `
        <div class="welcome-section">
            <h1>The Bay Area Rationalist Fight Club</h1>
            <p>Welcome to Fighthaven, where mind meets might.</p>
            <div class="cta-buttons">
                <a href="/events.html" class="primary-button">View All Events</a>
                <a href="https://discord.gg/SXhm3aQUA3" class="discord-button" target="_blank">Join Discord</a>
            </div>
        </div>
        ${upcomingEvents.length ? `
        <div id="next-event-container">
            ${createEventHTML(upcomingEvents[0], true)}
        </div>` : ''}`;
    fs.writeFileSync(path.join(publicDir, 'index.html'), createPage(homepageContent));

    const eventsContent = `
        <h1>Events</h1>
        <div id="events-container">
            <h2>Upcoming Events</h2>
            ${upcomingEvents.length ? upcomingEvents.map(event => createEventHTML(event, true)).join('') 
                : '<p>No upcoming events scheduled. Join our Discord to hear about new events first!</p>'}
            
            <h2>Past Events</h2>
            ${pastEvents.length ? pastEvents.reverse().map(event => createEventHTML(event, true)).join('') 
                : '<p>No past events yet.</p>'}
        </div>`;
    fs.writeFileSync(path.join(publicDir, 'events.html'), createPage(eventsContent, 'Events'));

    // Generate individual event pages
    events.forEach(event => {
        const eventDir = path.join(publicDir, 'events', event.slug);
        if (!fs.existsSync(eventDir)) fs.mkdirSync(eventDir, { recursive: true });
        const eventContent = `
            ${createEventHTML(event, false)}
            <p class="back-link"><a href="/events.html">← Back to all events</a></p>`;
        fs.writeFileSync(path.join(eventDir, 'index.html'), createPage(eventContent, event.title));
    });

    // Generate 404 page
    const notFoundContent = `
        <div class="welcome-section">
            <h1>404 - Page Not Found</h1>
            <p>Sorry, we couldn't find the page you're looking for.</p>
            <div class="cta-buttons">
                <a href="/" class="primary-button">Return Home</a>
            </div>
        </div>`;
    fs.writeFileSync(path.join(publicDir, '404.html'), createPage(notFoundContent, 'Page Not Found'));
}

buildSite();
