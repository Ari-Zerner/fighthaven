# Fighthaven Website

This is the website for Fighthaven, the Bay Area Rationalist Fight Club.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser
   - The site will automatically rebuild when you:
     - Add or modify event files in the `events/` directory
     - Change any HTML files
     - Change any files in the `static/` directory

## Adding or Updating Events

1. Create a new Markdown file in the `events/` directory
2. Name the file using the format: `YYYY-MM-DD.md`
3. Add the following frontmatter at the top of the file:
   ```yaml
   ---
   title: "Event Title"
   date: YYYY-MM-DDTHH:MM:SS-08:00
   location: "Location Name"
   meetup_link: "https://partiful.com/..."  # Optional: Link to registration
   ---
   ```
4. Add the event description below the frontmatter
5. If running locally, the site will automatically rebuild
6. Commit and push your changes to deploy