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

function buildSite() {
    // Create public directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
    }

    // Create css directory in public
    if (!fs.existsSync(path.join(publicDir, 'css'))) {
        fs.mkdirSync(path.join(publicDir, 'css'));
    }

    // Create events directory in public
    const publicEventsDir = path.join(publicDir, 'events');
    if (!fs.existsSync(publicEventsDir)) {
        fs.mkdirSync(publicEventsDir, { recursive: true });
    }

    // Copy static files
    fs.copyFileSync(
        path.join(staticDir, 'css/style.css'),
        path.join(publicDir, 'css/style.css')
    );

    // Process events
    const events = [];

    if (fs.existsSync(eventsDir)) {
        fs.readdirSync(eventsDir).forEach(file => {
            if (file.endsWith('.md')) {
                const filePath = path.join(eventsDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const { data, content } = matter(fileContent);
                
                events.push({
                    ...data,
                    body: marked(content),
                    slug: path.basename(file, '.md')
                });
            }
        });
    }

    // Sort events by date
    const now = new Date();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcomingEvents = events.filter(event => new Date(event.date) >= now);
    const pastEvents = events.filter(event => new Date(event.date) < now);

    // Copy and process HTML files
    ['index.html', 'events.html'].forEach(file => {
        const template = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
        let processedHtml = template;
        
        if (file === 'events.html') {
            processedHtml = template.replace(
                '<div id="events-container">Loading events...</div>',
                `<div id="events-container">
                    <h2>Upcoming Events</h2>
                    ${upcomingEvents.length ? upcomingEvents.map(event => createEventHTML(event, true)).join('') 
                        : '<p>No upcoming events scheduled. Join our Discord to hear about new events first!</p>'}
                    
                    <h2>Past Events</h2>
                    ${pastEvents.length ? pastEvents.reverse().map(event => createEventHTML(event, true)).join('') 
                        : '<p>No past events yet.</p>'}
                </div>`
            );
        } else if (file === 'index.html') {
            processedHtml = template.replace(
                '<div id="next-event-container"></div>',
                upcomingEvents.length ? `
                <div id="next-event-container">
                    ${createEventHTML(upcomingEvents[0], true)}
                </div>` : ''
            );
        }
        
        fs.writeFileSync(path.join(publicDir, file), processedHtml);
    });

    // Copy and process 404 page
    const notFoundTemplate = fs.readFileSync(path.join(__dirname, '..', '404.html'), 'utf8');
    fs.writeFileSync(
        path.join(publicDir, '404.html'),
        notFoundTemplate.replace('href="/static/css/style.css"', 'href="/css/style.css"')
    );

    // Generate RSS feed
    const rssContent = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Fighthaven Events</title>
    <link>https://fighthaven.club</link>
    <description>The latest events from Fighthaven</description>
    ${events
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(event => `
    <item>
        <title>${event.title}</title>
        <link>https://fighthaven.club/events/${event.slug}/</link>
        <pubDate>${new Date(event.date).toUTCString()}</pubDate>
        <description><![CDATA[${event.body}]]></description>
        ${event.location ? `<location>${event.location}</location>` : ''}
        ${event.meetup_link ? `<meetupLink>${event.meetup_link}</meetupLink>` : ''}
    </item>`
        )
        .join('\n')}
</channel>
</rss>`;

    fs.writeFileSync(path.join(publicDir, 'rss.xml'), rssContent);

    // Copy robots.txt
    fs.copyFileSync(
        path.join(staticDir, 'robots.txt'),
        path.join(publicDir, 'robots.txt')
    );

    // Generate sitemap
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://fighthaven.club/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://fighthaven.club/events.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    ${events.map(event => `
    <url>
        <loc>https://fighthaven.club/events/${event.slug}.html</loc>
        <lastmod>${new Date(event.date).toISOString().split('T')[0]}</lastmod>
        <priority>0.8</priority>
    </url>`).join('')}
</urlset>`;

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent);

    // Generate individual event pages with pretty URLs
    events.forEach(event => {
        const eventDir = path.join(publicEventsDir, event.slug);
        if (!fs.existsSync(eventDir)) {
            fs.mkdirSync(eventDir, { recursive: true });
        }
        const eventHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${event.title} - Fighthaven</title>
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
        ${createEventHTML(event, false)}
        <p class="back-link"><a href="/events.html">← Back to all events</a></p>
    </main>
    <footer>
        <p>&copy; 2024 Fighthaven</p>
    </footer>
</body>
</html>`;
        fs.writeFileSync(path.join(eventDir, 'index.html'), eventHtml);
    });

    console.log('Build completed successfully!');
}

// If running in watch mode, watch for changes
if (process.argv.includes('--watch')) {
    console.log('Watching for changes...');
    
    // Initial build
    buildSite();
    
    // Watch events directory
    fs.watch(eventsDir, (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
            console.log(`Event file changed: ${filename}`);
            buildSite();
        }
    });
    
    // Watch static files
    fs.watch(staticDir, { recursive: true }, (eventType, filename) => {
        if (filename) {
            console.log(`Static file changed: ${filename}`);
            buildSite();
        }
    });
    
    // Watch HTML files
    fs.watch(path.join(__dirname, '..'), (eventType, filename) => {
        if (filename && filename.endsWith('.html')) {
            console.log(`HTML file changed: ${filename}`);
            buildSite();
        }
    });
} else {
    // Just do a single build
    buildSite();
}
