NHL Scores App
The NHL Scores App is a web application that displays NHL game results for a selected team, including today’s games, yesterday’s results, and detailed game summaries. Built with Node.js, Express.js, and EJS, it fetches data from the NHL Score API and supports a test mode for debugging with fixed dates.
Features

Team Selection: Choose from all 32 NHL teams via a dropdown on the homepage.
Today’s Results: View if a selected team won or lost today (/home?team=<TEAM>).
Yesterday’s Results: View results for the previous day (/yesterday?team=<TEAM>).
Game Summary: See detailed stats (scores, goals, assists, etc.) for a specific game (/score?team=<TEAM>&date=<YYYY-MM-DD>).
Test Mode: Use .env to set fixed dates for testing (e.g., 2025-02-23 for today, 2025-02-22 for yesterday).
Responsive Design: Basic styling for desktop and mobile via public/css/style.css.

Architecture
The app follows a standard Node.js/Express.js architecture with server-side rendering using EJS templates:

Backend:
Express.js: Handles routing (/, /home, /yesterday, /score) and serves static files (public/).
Axios: Fetches game data from https://nhl-score-api.herokuapp.com/api/scores.
Dotenv: Loads environment variables from .env for test mode configuration.


Frontend:
EJS Templates: views/home.ejs (results page) and views/score.ejs (game summary).
Static Files: public/index.html (homepage), public/css/style.css (styling), public/js/script.js (client-side logic).


Data Flow:
User selects a team on / (dropdown in index.html).
/home or /yesterday queries the NHL API for games on the specified date (live or test mode).
Results are rendered in home.ejs with a “Game Summary” link to /score if a game exists.
/score fetches and displays detailed game stats in score.ejs, with a dynamic “Back” button to /home or /yesterday.


Test Mode:
Controlled by .env (USE_TEST_DATES, TEST_TODAY_DATE, TEST_YESTERDAY_DATE).
Logs configuration on server startup (e.g., Test Mode: Enabled, Today Date: 2025-02-23).



File Structure
Z:\apps\dmtw\
├── .gitignore              # Excludes node_modules, .env
├── index.js                # Express.js server and API logic
├── package.json            # Node.js dependencies and scripts
├── .env                    # Environment variables (not tracked)
├── public/                 # Static assets
│   ├── css/
│   │   └── style.css       # Styles for the app
│   ├── js/
│   │   └── script.js       # Client-side JavaScript
│   └── index.html          # Homepage with team selection
├── views/                  # EJS templates
│   ├── home.ejs            # Results page (today/yesterday)
│   └── score.ejs           # Game summary page

Prerequisites

Node.js: v14 or higher (includes npm).
Git: For version control.
A text editor (e.g., VS Code) for editing files.

Setup

Clone the Repository (if using a remote repository):
git clone https://github.com/your-username/dmtw.git
cd dmtw

Replace your-username with your GitHub username.

Install Dependencies:
npm install


Configure .env (optional for test mode):Create a .env file in Z:\apps\dmtw:
USE_TEST_DATES=true
TEST_TODAY_DATE=2025-02-23
TEST_YESTERDAY_DATE=2025-02-22


USE_TEST_DATES: Set to true for test mode, false or omit for live mode (current date).
TEST_TODAY_DATE: Date for /home (YYYY-MM-DD, defaults to 2025-02-23).
TEST_YESTERDAY_DATE: Date for /yesterday (defaults to TEST_TODAY_DATE - 1).


Run the App:
npm start


Opens at http://localhost:3000.
Startup log shows test mode and dates (e.g., Test Mode: Enabled, Today Date: 2025-02-23).



Usage

Homepage (http://localhost:3000/):
Select an NHL team from the dropdown (e.g., TOR for Toronto Maple Leafs).
Redirects to /home?team=<TEAM>.


Today’s Results (/home?team=<TEAM>):
Shows if the team won (Yes), lost (No), or had no game (- REST DAY -).
Includes a “Game Summary” link to /score?team=<TEAM>&date=<TODAY> if a game exists.


Yesterday’s Results (/yesterday?team=<TEAM>):
Shows results for the previous day (- NO GAME YESTERDAY - if none).
Links to /score?team=<TEAM>&date=<YESTERDAY> for summaries.


Game Summary (/score?team=<TEAM>&date=<YYYY-MM-DD>):
Displays scores, goals, assists, and stats (shots, hits, etc.).
“Back” button returns to /home or /yesterday based on the date.



Example:

Test mode (USE_TEST_DATES=true):
/home?team=TOR: Shows “Yes” for TOR 5-2 vs. CHI (2025-02-23).
/yesterday?team=TOR: Shows “Yes” for TOR 6-3 vs. CAR (2025-02-22).
/score?team=TOR&date=2025-02-22: Shows game summary with “Back” to /yesterday?team=TOR.


Live mode (no .env):
/home?team=TOR: Queries July 18, 2025 (likely “- REST DAY -”).
/yesterday?team=TOR: Queries July 17, 2025 (likely “- NO GAME YESTERDAY -”).



Test Mode

Enabled by setting USE_TEST_DATES=true in .env.
Uses TEST_TODAY_DATE (e.g., 2025-02-23) for /home and TEST_YESTERDAY_DATE (e.g., 2025-02-22) for /yesterday.
If .env is missing or USE_TEST_DATES=false, defaults to live dates (e.g., July 18, 2025, for today).
Startup log confirms configuration:Server Configuration:
  Test Mode: Enabled
  Today Date: 2025-02-23
  Yesterday Date: 2025-02-22



Deployment
To deploy to Netlify (e.g., as seen at https://dmtw.netlify.app):

Push the repository to GitHub:git remote add origin https://github.com/your-username/dmtw.git
git branch -M main
git push -u origin main


In Netlify, create a new site and link to your GitHub repository.
Set build settings:
Build command: npm install && npm start (or use a production server like pm2).
Publish directory: . (root).


Add environment variables in Netlify for test mode (if needed):
USE_TEST_DATES, TEST_TODAY_DATE, TEST_YESTERDAY_DATE.


Deploy and access at your Netlify URL (e.g., https://dmtw.netlify.app).


TODO

Add a date picker for /score to select custom dates.
Implement caching for API responses to improve performance.
Add a loading spinner for API requests.
Persist favorite team selection via local storage.
Create a custom error page for failed API requests.

Contributing

Fork the repository.
Create a branch: git checkout -b feature-name.
Commit changes: git commit -m "Add feature-name".
Push to branch: git push origin feature-name.
Open a pull request on GitHub.

License
This project is unlicensed. Contact the repository owner for usage permissions.