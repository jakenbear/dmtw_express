require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// NHL team abbreviations for validation
const NHL_TEAMS = {
    'ANA': 'Anaheim Ducks',
    'BOS': 'Boston Bruins',
    'BUF': 'Buffalo Sabres',
    'CAR': 'Carolina Hurricanes',
    'CBJ': 'Columbus Blue Jackets',
    'CGY': 'Calgary Flames',
    'CHI': 'Chicago Blackhawks',
    'COL': 'Colorado Avalanche',
    'DAL': 'Dallas Stars',
    'DET': 'Detroit Red Wings',
    'EDM': 'Edmonton Oilers',
    'FLA': 'Florida Panthers',
    'LAK': 'Los Angeles Kings',
    'MIN': 'Minnesota Wild',
    'MTL': 'Montreal Canadiens',
    'NJD': 'New Jersey Devils',
    'NSH': 'Nashville Predators',
    'NYI': 'New York Islanders',
    'NYR': 'New York Rangers',
    'OTT': 'Ottawa Senators',
    'PHI': 'Philadelphia Flyers',
    'PIT': 'Pittsburgh Penguins',
    'SEA': 'Seattle Kraken',
    'SJS': 'San Jose Sharks',
    'STL': 'St. Louis Blues',
    'TBL': 'Tampa Bay Lightning',
    'TOR': 'Toronto Maple Leafs',
    'UTA': 'Utah Mammoth',
    'VAN': 'Vancouver Canucks',
    'VGK': 'Vegas Golden Knights',
    'WPG': 'Winnipeg Jets',
    'WSH': 'Washington Capitals'
};

// Format date for API requests
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Validate and parse date from .env
function parseEnvDate(dateStr, defaultDate) {
    if (!dateStr) return defaultDate;
    const date = new Date(dateStr + 'T00:00:00-05:00');
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date format in .env: ${dateStr}. Using default date.`);
        return defaultDate;
    }
    return date;
}

// Get date string (YYYY-MM-DD) for comparison
function getDateString(date) {
    return formatDate(date);
}

// Log test mode and dates on startup
const useTestDates = process.env.USE_TEST_DATES === 'true';
const defaultToday = useTestDates ? new Date('2025-02-23T00:00:00-05:00') : new Date();
const testToday = useTestDates ? parseEnvDate(process.env.TEST_TODAY_DATE, defaultToday) : new Date();
const defaultYesterday = new Date(testToday);
defaultYesterday.setDate(testToday.getDate() - 1);
const testYesterday = useTestDates ? parseEnvDate(process.env.TEST_YESTERDAY_DATE, defaultYesterday) : new Date(new Date().setDate(new Date().getDate() - 1));
console.log('Server Configuration:');
console.log(`  Test Mode: ${useTestDates ? 'Enabled' : 'Disabled (Live Mode)'}`);
console.log(`  Today Date: ${formatDate(testToday)}`);
console.log(`  Yesterday Date: ${formatDate(testYesterday)}`);

// Route for the homepage (team selection)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the team results page (today)
app.get('/home', async (req, res) => {
    const team = NHL_TEAMS[req.query.team] ? req.query.team : 'TOR';
    const today = useTestDates ? parseEnvDate(process.env.TEST_TODAY_DATE, defaultToday) : new Date();
    const startDate = formatDate(today);
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    const endDate = formatDate(nextDay);
    const url = `https://nhl-score-api.herokuapp.com/api/scores?startDate=${startDate}&endDate=${endDate}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        console.log(`API response for /home?team=${team}:`, JSON.stringify(data, null, 2));
        let gameStatus = '- REST DAY -';
        let showSummaryButton = false;

        let games = [];
        if (data.length > 0) {
            data.forEach(day => {
                if (day.games && day.games.length > 0) {
                    games = [...games, ...day.games];
                }
            });
        }
        console.log(`All games for ${startDate} to ${endDate}:`, games);

        const teamGames = games.filter(game => {
            const isAway = game.teams.away.abbreviation === team;
            const isHome = game.teams.home.abbreviation === team;
            console.log(`Game check for ${team}: away=${game.teams.away.abbreviation}, home=${game.teams.home.abbreviation}, isAway=${isAway}, isHome=${isHome}`);
            return isAway || isHome;
        });
        console.log(`Filtered teamGames for ${team} on ${startDate}:`, teamGames);

        if (teamGames.length > 0) {
            const latestGame = teamGames[0]; // Use first game in range
            console.log(`Selected game for ${team}:`, latestGame);
            switch (latestGame.status.state) {
                case 'FINAL':
                    const teamGoals = latestGame.scores[team];
                    const oppTeam = latestGame.teams.away.abbreviation === team ?
                        latestGame.teams.home.abbreviation : latestGame.teams.away.abbreviation;
                    const oppGoals = latestGame.scores[oppTeam];
                    gameStatus = teamGoals > oppGoals ? 'Yes' : 'No';
                    showSummaryButton = true;
                    break;
                case 'PREVIEW':
                    const startTime = new Date(latestGame.startTime);
                    gameStatus = `${latestGame.teams.away.teamName} vs ${latestGame.teams.home.teamName}\n` +
                        `${startTime.toLocaleDateString()}\n` +
                        `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                    break;
                case 'LIVE':
                    gameStatus = `Live - ${latestGame.status.progress.currentPeriodOrdinal} Period: ` +
                        `${latestGame.status.progress.currentPeriodTimeRemaining.pretty}`;
                    break;
            }
        }

        res.render('home', { team, gameStatus, showSummaryButton, date: formatDate(today), isYesterday: false });
    } catch (error) {
        console.error('Error fetching game data:', error.message);
        res.render('home', { team, gameStatus: 'Error loading game data', showSummaryButton: false, date: formatDate(today), isYesterday: false });
    }
});

// Route for game summary
app.get('/score', async (req, res) => {
    const team = NHL_TEAMS[req.query.team] ? req.query.team : 'TOR';
    const date = req.query.date || '2025-02-22';
    const yesterday = useTestDates ? parseEnvDate(process.env.TEST_YESTERDAY_DATE, defaultYesterday) : new Date(new Date().setDate(new Date().getDate() - 1));
    const isYesterday = date === formatDate(yesterday);
    const startDate = date;
    const nextDay = new Date(date + 'T00:00:00-05:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = formatDate(nextDay);
    const url = `https://nhl-score-api.herokuapp.com/api/scores?startDate=${startDate}&endDate=${endDate}`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        console.log(`API response for /score?team=${team}&date=${date}:`, JSON.stringify(data, null, 2));
        let games = [];
        if (data && data.length > 0) {
            data.forEach(day => {
                if (day.games && day.games.length > 0) {
                    games = [...games, ...day.games];
                }
            });
        }
        console.log(`All games for ${startDate} to ${endDate}:`, games);

        const teamGames = games.filter(game => {
            const isAway = game.teams.away.abbreviation === team;
            const isHome = game.teams.home.abbreviation === team;
            console.log(`Game check for ${team}: away=${game.teams.away.abbreviation}, home=${game.teams.home.abbreviation}, isAway=${isAway}, isHome=${isHome}`);
            return isAway || isHome;
        });
        console.log(`Filtered teamGames for ${team} on ${date}:`, teamGames);

        if (teamGames.length > 0) {
            const selectedGame = teamGames[0]; // Use first game in range
            console.log(`Selected game for ${team} on ${date}:`, selectedGame);

            const homeTeam = selectedGame.teams.home.teamName;
            const awayTeam = selectedGame.teams.away.teamName;
            const homeAbbr = selectedGame.teams.home.abbreviation;
            const awayAbbr = selectedGame.teams.away.abbreviation;
            const homeScore = selectedGame.scores[homeAbbr] || 0;
            const awayScore = selectedGame.scores[awayAbbr] || 0;
            const videoRecapLink = selectedGame.links?.videoRecap;

            let scoreHTML = `<div class="score">` +
                `<span class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${homeTeam}</span> ${homeScore} - ` +
                `${awayScore} <span class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${awayTeam}</span>` +
                `</div>`;

            const periods = {};
            if (selectedGame.goals && selectedGame.goals.length > 0) {
                selectedGame.goals.forEach(goal => {
                    if (!periods[goal.period]) periods[goal.period] = [];
                    periods[goal.period].push(goal);
                });
                for (const period in periods) {
                    scoreHTML += `<div class="period">Period ${period} Goals</div>`;
                    periods[period].forEach(goal => {
                        const minutes = goal.min < 10 ? `0${goal.min}` : goal.min;
                        const seconds = goal.sec < 10 ? `0${goal.sec}` : goal.sec;
                        const time = `${minutes}:${seconds}`;
                        scoreHTML += `<div class="scorer-entry ${goal.team === team ? 'team-selected' : 'team-opponent'}">`;
                        scoreHTML += `<span class="scorer">${goal.scorer.player}</span> (${time})`;
                        if (goal.assists && goal.assists.length > 0) {
                            scoreHTML += ` - Assists: ${goal.assists.map(assist => assist.player).join(', ')}`;
                        }
                        scoreHTML += `</div>`;
                    });
                }
            }

            scoreHTML += `<div class="game-stats">`;
            scoreHTML += `<table>`;
            scoreHTML += `<tr><th class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${homeTeam} (${homeAbbr})</th><th></th><th class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${awayTeam} (${awayAbbr})</th></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.blocked?.[homeAbbr] || 0}</td><td>Blocked Shots</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.blocked?.[awayAbbr] || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.giveaways?.[homeAbbr] || 0}</td><td>Giveaways</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.giveaways?.[awayAbbr] || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.hits?.[homeAbbr] || 0}</td><td>Hits</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.hits?.[awayAbbr] || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.pim?.[homeAbbr] || 0}</td><td>Penalty Minutes</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.pim?.[awayAbbr] || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.powerPlay?.[homeAbbr]?.goals || 0}</td><td>Power Play Goals</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.powerPlay?.[awayAbbr]?.goals || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.powerPlay?.[homeAbbr]?.opportunities || 0}</td><td>Power Play Opportunities</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.powerPlay?.[awayAbbr]?.opportunities || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.shots?.[homeAbbr] || 0}</td><td>Shots</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.shots?.[awayAbbr] || 0}</td></tr>`;
            scoreHTML += `<tr><td class="${homeAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.takeaways?.[homeAbbr] || 0}</td><td>Takeaways</td><td class="${awayAbbr === team ? 'team-selected' : 'team-opponent'}">${selectedGame.gameStats?.takeaways?.[awayAbbr] || 0}</td></tr>`;
            scoreHTML += `</table>`;
            scoreHTML += `</div>`;

            res.render('score', { team, summary: scoreHTML, videoRecapLink, NHL_TEAMS, isYesterday });
        } else {
            res.render('score', { team, summary: `No recent games found for ${NHL_TEAMS[team]}`, videoRecapLink: null, NHL_TEAMS, isYesterday });
        }
    } catch (error) {
        console.error('Error fetching game summary:', error.message);
        res.render('score', { team, summary: `Unable to fetch game data for ${NHL_TEAMS[team]}. Please try again later.`, videoRecapLink: null, NHL_TEAMS, isYesterday });
    }
});

// Route for yesterday's results
app.get('/yesterday', async (req, res) => {
    const team = NHL_TEAMS[req.query.team] ? req.query.team : 'TOR';
    const yesterday = useTestDates ? parseEnvDate(process.env.TEST_YESTERDAY_DATE, defaultYesterday) : new Date(new Date().setDate(new Date().getDate() - 1));
    const startDate = formatDate(yesterday);
    const nextDay = new Date(yesterday);
    nextDay.setDate(yesterday.getDate() + 1);
    const endDate = formatDate(nextDay);
    const url = `https://nhl-score-api.herokuapp.com/api/scores?startDate=${startDate}&endDate=${endDate}`;
    console.log(`YESTERDAY ROUTE: startDate=${startDate}, endDate=${endDate}`);

    try {
        const response = await axios.get(url);
        const data = response.data;
        console.log(`API response for /yesterday?team=${team}:`, JSON.stringify(data, null, 2));
        let gameStatus = '- NO GAME YESTERDAY -';
        let showSummaryButton = false;

        let games = [];
        if (data && data.length > 0) {
            data.forEach(day => {
                if (day.games && day.games.length > 0) {
                    games = [...games, ...day.games];
                }
            });
        }
        console.log(`All games for ${startDate} to ${endDate}:`, games);

        const teamGames = games.filter(game => {
            const isAway = game.teams.away.abbreviation === team;
            const isHome = game.teams.home.abbreviation === team;
            console.log(`Game check for ${team}: away=${game.teams.away.abbreviation}, home=${game.teams.home.abbreviation}, isAway=${isAway}, isHome=${isHome}`);
            return isAway || isHome;
        });
        console.log(`Filtered teamGames for ${team} on ${startDate}:`, teamGames);

        if (teamGames.length > 0) {
            const selectedGame = teamGames.find(game => {
                const gameDate = new Date(game.startTime);
                return getDateString(gameDate) === startDate;
            }) || teamGames[0];
            console.log(`Selected game for ${team} on ${startDate}:`, selectedGame);

            const gameDate = new Date(selectedGame.startTime);
            console.log(`Game startTime: ${selectedGame.startTime}, parsed gameDate: ${gameDate}`);
            const isWithinYesterday = getDateString(gameDate) === startDate;
            console.log(`isWithinYesterday check: gameDate=${getDateString(gameDate)}, startDate=${startDate}, result=${isWithinYesterday}`);

            if (isWithinYesterday) {
                switch (selectedGame.status.state) {
                    case 'FINAL':
                        const teamGoals = selectedGame.scores[team];
                        const oppTeam = selectedGame.teams.away.abbreviation === team ?
                            selectedGame.teams.home.abbreviation : selectedGame.teams.away.abbreviation;
                        const oppGoals = selectedGame.scores[oppTeam];
                        gameStatus = teamGoals > oppGoals ? 'Yes' : 'No';
                        showSummaryButton = true;
                        break;
                    case 'PREVIEW':
                    case 'LIVE':
                        gameStatus = 'No final results for yesterday.';
                        break;
                }
            } else {
                gameStatus = '- NO GAME YESTERDAY -';
            }
        }

        res.render('home', { team, gameStatus, showSummaryButton, date: formatDate(yesterday), isYesterday: true });
    } catch (error) {
        console.error('Error fetching yesterday\'s data:', error.message);
        res.render('home', { team, gameStatus: 'Error loading yesterday\'s data', showSummaryButton: false, date: formatDate(yesterday), isYesterday: true });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`NHL Scores app running at http://localhost:${port}`);
});