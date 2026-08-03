# keepbreath.ing

My personal site, blog, and resume.

## Design

A dark, terminal-inspired interface: monospace type, a code-editor palette, a
fake shell prompt and window chrome, and CRT touches (scanlines, a matrix-rain
and "phantom code" background, an occasional glitch). The home page plays a
typed SSH "boot" sequence before the content reveals.

## Pages

- init      (index)    — home: boot animation, intro, live stat counters
- whois     (about)    — background, education roadmap, skill areas
- make      (projects) — home lab, security tooling, and small games
- stdout    (blog)     — build notes, filterable by tag
- cat resume.txt       — skills and work history
- sendmail  (contact)  — contact form
- uptime    (journey)  — a timeline of how I got here

## JavaScript

- Matrix-rain and phantom-code canvas backgrounds, and a CRT glitch effect
- A typed SSH boot sequence on the home page
- Live counters: system uptime, graduation countdown, and total GitHub commits
  from the GitHub API
- Blog tag filter and expand/collapse accordion
- Client-side contact-form handling

## Stack

HTML, CSS, and vanilla JavaScript.

## Hosting

Runs on a DigitalOcean VPS behind Cloudflare. Web-server migration to nginx in
Docker is in progress and documented on the blog.

## Local preview

Open any of the HTML files in a browser, or serve the folder with any static
file server.
