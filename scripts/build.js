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
            <h1>🥊 WELCOME TO FIGHTHAVEN 🧠</h1>
            <h2>Where Theory Meets Practice (Somewhere Near Berkeley)</h2>
            
            <div class="cta-buttons">
                <a href="/events.html" class="primary-button">View All Events</a>
                <a href="https://discord.gg/SXhm3aQUA3" class="discord-button" target="_blank">Join Discord</a>
            </div>
        </div>

        <div class="intro-section">
            <h2>DECISION THEORY? HAVE YOU CONSIDERED DECISION PRACTICE!?</h2>
            <blockquote>"Recursive self-improvement is recursive masturbation."</blockquote>
            
            <p>You are not your rationalist blog. You are not your karma score. You are not your prediction track record. You're not your GPT embeddings. You're not the copies of you in other branches of the multiverse who actually exercise.</p>

            <p>The first rule of Fighthaven is: you must actually practice.<br>
            The second rule of Fighthaven is: you MUST actually practice.<br>
            The third rule of Fighthaven is: if someone starts explaining quines during sparring, the fight is over.</p>

            <p>We're just some nerds who think rationality could use more punching. We've all read the sequences. We've all posted on LessWrong. We've all optimized our Anki decks. Now it's time to optimize these hands.</p>

            <p>This is your empiricism on concrete. This is your epistemology in the ring. This is your phenomenological experience of getting punched in the face while trying to explain why actually, from a technical perspective, you already won this fight in theory.</p>
            
            <h3>Step into the ring where:</h3>
            <ul>
                <li>Your decision theory meets a right hook</li>
                <li>Your expected utility calculations meet unexpected left jabs</li>
                <li>Your hypotheticals meet empirical testing</li>
                <li>Your rational agent models meet irrational amounts of sweat</li>
                <li>Your probability estimates meet precise measurements of your unconscious body</li>
                <li>Your novel insights about coordination problems meet my lack of coordination problems</li>
            </ul>
        </div>

        <div class="virtues-section">
            <h2>Our Virtues</h2>
            
            <h3>TSUYOKU NARITAI (BECOMING STRONGER)</h3>
            <p>We're not here to converge on local maxima. We're here to:</p>
            <ul>
                <li>Practice getting stronger, not just theorize about it</li>
                <li>Test our capabilities, not just estimate them</li>
                <li>Push our limits, not just calculate them</li>
                <li>Actually throw hands, not just write proofs about them</li>
                <li>Make yourself stronger today than you were yesterday (no, writing a blog post about getting stronger doesn't count)</li>
            </ul>

            <h3>TOUCHING GRASS</h3>
            <p>I want you to hit me as hard as reality does (which is to say, with complete indifference to your clever arguments):</p>
            <ul>
                <li>Feel the canvas under your feet</li>
                <li>Experience the immediate feedback of a jab</li>
                <li>Learn what no amount of reading could teach you</li>
                <li>Update your priors through direct experience</li>
                <li>Realize that no amount of forum posts will teach you head movement</li>
                <li>Accept that you can't talk your way out of a rear naked choke</li>
            </ul>

            <h3>MAKING CONTACT WITH REALITY</h3>
            <p>Here's where:</p>
            <ul>
                <li>Decision theory becomes decision practice</li>
                <li>Rational agents face rational opponents</li>
                <li>Expected utility meets unexpected reality</li>
                <li>Epistemic uncertainty meets physical certainty</li>
                <li>Your beautiful theory meets my ugly facts</li>
                <li>Your 5000-word explanation of why you won meets the actual scoreboard</li>
            </ul>
        </div>

        <div class="practice-section">
            <h2>Our Practice Grounds</h2>
            
            <h3>BOXING</h3>
            <p>Put your theories to the test:</p>
            <ul>
                <li>Learn what works through direct feedback</li>
                <li>Spar with others who think AND do</li>
                <li>Update your models in real-time</li>
                <li>Practice decisions under pressure</li>
                <li>Discover what you actually believe about pain</li>
                <li>Finally understand what "making beliefs pay rent" means</li>
            </ul>

            <h3>CHESS BOXING</h3>
            <p>The ultimate synthesis of theory and practice:</p>
            <ul>
                <li>3-minute chess rounds (theory under pressure)</li>
                <li>2-minute boxing rounds (practice under pressure)</li>
                <li>Victory by checkmate OR knockout (reality is the judge)</li>
                <li>Finally, a use for all those hours on chess.com</li>
                <li>Test your consciousness is an illusion hypothesis (spoiler: pain is real)</li>
                <li>Bullet chess but with actual bullets (metaphorically speaking)</li>
            </ul>

            <h3>NEWCOMB'S BOXING</h3>
            <p>The ultimate decision theory experiment:</p>
            <ul>
                <li>Box A contains either victory or defeat</li>
                <li>Box B contains certain pain</li>
                <li>Omega has already predicted your performance</li>
                <li>Choose wisely, punch correctly</li>
                <li>Update your decision theory in real-time</li>
                <li>Realize that Omega doesn't care about your clever workarounds</li>
            </ul>

            <h3>COMING SOON</h3>
            <ul>
                <li>Grappling: Brazilian Jiu-Jitsu meets Bayesian inference (now with actual posterior distributions)</li>
                <li>Sword Fighting: Red plastic swords for empirical testing of medieval combat theories (LARP but spicier)</li>
                <li>AI Boxing: Finally, a containment protocol that works (terms and conditions apply)</li>
            </ul>
        </div>

        <div class="join-section">
            <h2>Join Us in Reality</h2>
            <p>Perfect for:</p>
            <ul>
                <li>People ready to practice what they theorize</li>
                <li>Anyone who thinks rationality needs more punching</li>
                <li>Thinkers ready to become doers</li>
                <li>Those who understand that knowledge isn't power - applied knowledge is</li>
                <li>Everyone who's ever written "effortpost" in a title</li>
                <li>That one person who keeps trying to solve alignment with interpretive dance</li>
            </ul>

            <h3>Current Status:</h3>
            <ul>
                <li>Boxing: ACTIVE (Decision Practice 101)</li>
                <li>Chess Boxing: ACTIVE (Advanced Decision Practice)</li>
                <li>Grappling: Loading...</li>
                <li>Sword Fighting: In Beta</li>
                <li>Your Theories: Ready For Testing</li>
                <li>Your Excuses: We've Heard Them All</li>
            </ul>

            <div class="warning">
                ⚠️ WARNING: Side effects may include: realizing how many of your theories don't survive contact with reality, developing actual capabilities, uncontrollable urges to ask "but have you practiced it?" in philosophy discussions, occasional bruises, and a drastically reduced tolerance for people who start sentences with "well, technically..."
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
