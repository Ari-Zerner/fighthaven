const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Directories
const eventsDir = path.join(__dirname, '../events');
const publicDir = path.join(__dirname, '../public');
const staticDir = path.join(__dirname, '../static');

function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayOfWeek = days[date.getUTCDay()];
    const month = months[date.getUTCMonth()];
    const dayOfMonth = date.getUTCDate();
    const year = date.getUTCFullYear();

    return `${dayOfWeek}, ${month} ${dayOfMonth}, ${year}`;
}

function formatTime(time) {
    // time is given as minutes since midnight
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
}

function createEventHTML(event, isPreview = false) {
    const content = `
        <h3>${event.title ? event.title : 'Fighthaven Meetup'}</h3>
        <div class="event-details">
            <p class="date">${formatDate(event.date)} at ${formatTime(event.time)}</p>
            ${event.location ? `<p class="location">📍 ${event.location}</p>` : ''}
        </div>
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

    // Sort events and filter into upcoming/past
    const now = new Date();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Convert event time (minutes since midnight) to full date-time
    const getEventDateTime = (event) => {
        const eventDate = new Date(event.date);
        const hours = Math.floor(event.time / 60);
        const minutes = event.time % 60;
        eventDate.setUTCHours(hours, minutes);
        return eventDate;
    };

    // If event.duration exists, add it to the end time, otherwise default to 2 hours
    const getEventEndTime = (event) => {
        const endTime = getEventDateTime(event);
        const durationInMinutes = event.duration || 120; // Default 2 hours if not specified
        endTime.setUTCMinutes(endTime.getUTCMinutes() + durationInMinutes);
        return endTime;
    };

    const upcomingEvents = events.filter(event => getEventEndTime(event) >= now);
    const pastEvents = events.filter(event => getEventEndTime(event) < now);

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
