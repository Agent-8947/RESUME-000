# Telegram Form Integration

This project includes a secure contact form integration with Telegram using a Node.js server-side proxy.

## Setup Instructions

### 1. Simple Setup (Single File)

Your form is now configured with the credentials you provided. You can simply open `index.html` in your browser or upload it to any hosting service (like GitHub Pages, Netlify Drop, or standard hosting).

**⚠️ SECURITY WARNING:** Your Telegram Bot Token is now embedded directly in the `index.html` file. Anyone who views the source code of your website will be able to see this token.

If you deploy the server to a different URL (e.g., Heroku, Vercel, or a VPS), update the `API_URL` constant inside the `ContactFormBlock` component in `index.html` (approx. line 866).
