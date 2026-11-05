const teams = {
  milan: {
    name: 'AC Milan', short: 'MILAN', color: '#e21e2d', abbreviation: ['MIL', 'ACM'],
    matches: ['acmilan', 'milan'], timezone: 'Europe/Rome', source: 'thesportsdb',
    url: 'https://www.thesportsdb.com/team/133667-AC-Milan'
  },
  yankees: {
    name: 'New York Yankees', short: 'YANKEES', color: '#16283d', abbreviation: ['NYY'],
    matches: ['newyorkyankees', 'yankees'], timezone: 'America/New_York', seasonType: 2,
    url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/nyy/schedule'
  },
  giants: {
    name: 'New York Giants', short: 'GIANTS', color: '#17467d', abbreviation: ['NYG'],
    matches: ['newyorkgiants', 'giants'], timezone: 'America/New_York',
    url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/nyg/schedule'
  },
  knicks: {
    name: 'New York Knicks', short: 'KNICKS', color: '#f58426', abbreviation: ['NY', 'NYK'],
    matches: ['newyorkknicks', 'knicks'], timezone: 'America/New_York',
    url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/ny/schedule'
  },
  rangers: {
    name: 'New York Rangers', short: 'RANGERS', color: '#c62d42', abbreviation: ['NYR'],
    matches: ['newyorkrangers', 'rangers'], timezone: 'America/New_York',
    url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/nyr/schedule'
  }
};

const timezoneByTeam = {
  ATL:'America/New_York', BAL:'America/New_York', BOS:'America/New_York', BUF:'America/New_York', CAR:'America/New_York',
  CIN:'America/New_York', CLE:'America/New_York', DET:'America/New_York', IND:'America/Indiana/Indianapolis', JAX:'America/New_York',
  MIA:'America/New_York', NY:'America/New_York', NYG:'America/New_York', NYJ:'America/New_York', NYK:'America/New_York',
  NYM:'America/New_York', NYR:'America/New_York', NYY:'America/New_York', ORL:'America/New_York', PHI:'America/New_York',
  PIT:'America/New_York', TB:'America/New_York', TOR:'America/Toronto', WSH:'America/New_York', WAS:'America/New_York',
  CHC:'America/Chicago', CHI:'America/Chicago', CWS:'America/Chicago', CHW:'America/Chicago', DAL:'America/Chicago',
  GB:'America/Chicago', HOU:'America/Chicago', KC:'America/Chicago', MEM:'America/Chicago', MIL:'America/Chicago',
  MIN:'America/Chicago', NO:'America/Chicago', NOP:'America/Chicago', NSH:'America/Chicago', OKC:'America/Chicago',
  STL:'America/Chicago', SAS:'America/Chicago', TEN:'America/Chicago', TEX:'America/Chicago', WPG:'America/Winnipeg',
  COL:'America/Denver', DEN:'America/Denver', UTA:'America/Denver', ARI:'America/Phoenix', PHX:'America/Phoenix',
  ANA:'America/Los_Angeles', GS:'America/Los_Angeles', GSW:'America/Los_Angeles', LA:'America/Los_Angeles',
  LAA:'America/Los_Angeles', LAC:'America/Los_Angeles', LAD:'America/Los_Angeles', LAK:'America/Los_Angeles',
  LAR:'America/Los_Angeles', LV:'America/Los_Angeles', OAK:'America/Los_Angeles', POR:'America/Los_Angeles',
  SAC:'America/Los_Angeles', SD:'America/Los_Angeles', SEA:'America/Los_Angeles', SF:'America/Los_Angeles', SJS:'America/Los_Angeles',
  VAN:'America/Vancouver', CGY:'America/Edmonton', EDM:'America/Edmonton', FLA:'America/New_York', MTL:'America/Toronto',
  OTT:'America/Toronto', CBJ:'America/New_York', NJ:'America/New_York', NJD:'America/New_York', PHI:'America/New_York'
};

const cityTimezones = {
  london:'Europe/London', munich:'Europe/Berlin', berlin:'Europe/Berlin', frankfurt:'Europe/Berlin',
  madrid:'Europe/Madrid', paris:'Europe/Paris', milan:'Europe/Rome', 'mexico city':'America/Mexico_City',
  'sao paulo':'America/Sao_Paulo', 'são paulo':'America/Sao_Paulo', tokyo:'Asia/Tokyo'
};

const schedule = document.querySelector('.schedule');
const statusBox = document.querySelector('#calendar-status');
const refreshButton = document.querySelector('#refresh-button');
const updatedLabel = document.querySelector('#last-updated');
const filterWrap = document.querySelector('#team-filters');
const homeOnlyButton = document.querySelector('#home-only-button');
const template = document.querySelector('#game-template');
let allGames = [];
let activeTeam = 'all';
let homeOnly = false;

const normalize = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const getTeamName = (competitor) => competitor?.team?.displayName || competitor?.team?.shortDisplayName || competitor?.team?.name || 'Opponent TBD';
const getTeamAbbreviation = (competitor) => (competitor?.team?.abbreviation || '').toUpperCase();
const scoreValue = (competitor) => competitor?.score?.displayValue ?? competitor?.score?.value ?? competitor?.score ?? '—';

function isOurTeam(competitor, config) {
  const name = normalize(getTeamName(competitor));
  const abbreviation = getTeamAbbreviation(competitor);
  return config.matches.some((match) => name === match || name.includes(match)) || config.abbreviation.includes(abbreviation);
}

function venueTimezone(competition, config) {
  if (config.name === 'AC Milan') return 'Europe/Rome';
  const city = normalize(competition?.venue?.address?.city || '');
  const cityEntry = Object.entries(cityTimezones).find(([name]) => normalize(name) === city);
  if (cityEntry) return cityEntry[1];
  const home = competition?.competitors?.find((competitor) => competitor.homeAway === 'home');
  return timezoneByTeam[getTeamAbbreviation(home)] || config.timezone;
}

function formatInZone(date, timezone, options) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }
}

function parseEvent(event, teamKey) {
  const config = teams[teamKey];
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const ours = competitors.find((competitor) => isOurTeam(competitor, config)) || competitors[0];
  const opponent = competitors.find((competitor) => competitor !== ours) || {};
  const date = new Date(competition.date || event.date);
  if (Number.isNaN(date.getTime())) return null;
  const status = competition.status || event.status || {};
  const statusType = status.type || {};
  const state = statusType.state || (statusType.completed ? 'post' : 'pre');
  const venue = competition.venue || {};
  const link = [...(event.links || []), ...(competition.links || [])].find((item) => item.href)?.href || '';
  const localZone = venueTimezone(competition, config);
  const ourScore = scoreValue(ours);
  const opponentScore = scoreValue(opponent);
  const scoreKnown = ourScore !== '—' && opponentScore !== '—';
  let outcome = '';
  if (state === 'post' && scoreKnown) {
    const a = Number(ourScore);
    const b = Number(opponentScore);
    outcome = a > b ? 'W' : a < b ? 'L' : 'D';
  }
  return {
    id: event.id || `${teamKey}-${date.toISOString()}`,
    teamKey, teamName: config.name, teamShort: config.short, teamColor: config.color,
    opponent: getTeamName(opponent), opponentAbbreviation: getTeamAbbreviation(opponent),
    homeAway: ours?.homeAway || 'neutral', date, localZone,
    venue: venue.fullName || 'Venue to be announced',
    location: [venue.address?.city, venue.address?.state || venue.address?.country].filter(Boolean).join(', '),
    state, completed: Boolean(statusType.completed) || state === 'post',
    detail: statusType.shortDetail || statusType.detail || statusType.description || '',
    timeValid: competition.timeValid !== false,
    ourScore, opponentScore, scoreKnown, outcome, link
  };
}

function cachedData() {
  try {
    const value = JSON.parse(localStorage.getItem('ddm-club-calendar-v1'));
    if (!value?.games?.length) return null;
    return { ...value, games: value.games.map((game) => ({ ...game, date: new Date(game.date) })) };
  } catch {
    return null;
  }
}

const monthIndex = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
const europeanCountryTimezones = {
  austria: 'Europe/Vienna', england: 'Europe/London', france: 'Europe/Paris',
  germany: 'Europe/Berlin', italy: 'Europe/Rome', portugal: 'Europe/Lisbon',
  scotland: 'Europe/London', spain: 'Europe/Madrid', switzerland: 'Europe/Zurich'
};
const milanVenueFallbacks = {
  atalanta: { venue: 'Gewiss Stadium', country: 'Italy', timezone: 'Europe/Rome' },
  bologna: { venue: "Stadio Renato Dall'Ara", country: 'Italy', timezone: 'Europe/Rome' },
  bournemouth: { venue: 'Vitality Stadium', country: 'England', timezone: 'Europe/London' },
  inter: { venue: 'Stadio Giuseppe Meazza', country: 'Italy', timezone: 'Europe/Rome' },
  intermilan: { venue: 'Stadio Giuseppe Meazza', country: 'Italy', timezone: 'Europe/Rome' },
  redbullsalzburg: { venue: 'Red Bull Arena', country: 'Austria', timezone: 'Europe/Vienna' },
  sassuolo: { venue: 'Mapei Stadium', country: 'Italy', timezone: 'Europe/Rome' },
  udinese: { venue: 'Bluenergy Stadium', country: 'Italy', timezone: 'Europe/Rome' }
};

function sportsDbFallbackDate(dateText, timeText) {
  const dateMatch = dateText.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/);
  if (!dateMatch) return null;
  const year = Number(dateMatch[3]) < 100 ? 2000 + Number(dateMatch[3]) : Number(dateMatch[3]);
  const month = monthIndex[dateMatch[2].toLowerCase()];
  const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  let hour = timeMatch ? Number(timeMatch[1]) % 12 : 12;
  if (timeMatch?.[3].toLowerCase() === 'pm') hour += 12;
  return new Date(Date.UTC(year, month, Number(dateMatch[1]), hour, timeMatch ? Number(timeMatch[2]) : 0));
}

async function fetchMilan(force) {
  const suffix = force ? `?refresh=${Date.now()}` : '';
  const response = await fetch(`${teams.milan.url}${suffix}`, { cache: force ? 'reload' : 'default' });
  if (!response.ok) throw new Error(`${response.status}`);
  const documentCopy = new DOMParser().parseFromString(await response.text(), 'text/html');
  const rows = [...documentCopy.querySelectorAll('tr')].map((row) => {
    const cells = row.querySelectorAll('td');
    const eventLink = row.querySelector('a[href^="/event/"]');
    if (cells.length < 4 || !eventLink) return null;
    const home = cells[1].querySelector('.team-fixture-name-full')?.textContent?.trim();
    const away = cells[3].querySelector('.team-fixture-name-full')?.textContent?.trim();
    if (!home || !away || ![home, away].some((name) => normalize(name) === 'acmilan')) return null;
    const href = eventLink.getAttribute('href');
    const id = href.match(/\/event\/(\d+)/)?.[1];
    if (!id) return null;
    return {
      id, href, home, away,
      dateText: cells[0].textContent.replace(/\s+/g, ' ').trim(),
      middle: cells[2].textContent.replace(/\s+/g, ' ').trim()
    };
  }).filter(Boolean);
  const uniqueRows = [...new Map(rows.map((row) => [row.id, row])).values()];
  if (!uniqueRows.length) throw new Error('No AC Milan schedule returned');

  const details = await Promise.allSettled(uniqueRows.map(async (row) => {
    const detailResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${row.id}${force ? `&_=${Date.now()}` : ''}`, { cache: force ? 'reload' : 'default' });
    if (!detailResponse.ok) return {};
    const data = await detailResponse.json();
    return data.events?.[0] || {};
  }));

  return uniqueRows.map((row, index) => {
    const detail = details[index].status === 'fulfilled' ? details[index].value : {};
    const date = detail.strTimestamp
      ? new Date(`${detail.strTimestamp}${/[zZ]|[+-]\d\d:?\d\d$/.test(detail.strTimestamp) ? '' : 'Z'}`)
      : sportsDbFallbackDate(row.dateText, row.middle);
    if (!date || Number.isNaN(date.getTime())) return null;
    const completed = /^\d+\s*-\s*\d+$/.test(row.middle) || (detail.intHomeScore != null && detail.intAwayScore != null);
    const homeScore = detail.intHomeScore ?? row.middle.match(/^(\d+)/)?.[1] ?? '—';
    const awayScore = detail.intAwayScore ?? row.middle.match(/(\d+)$/)?.[1] ?? '—';
    const isHome = normalize(row.home) === 'acmilan';
    const opponent = isHome ? row.away : row.home;
    const venueFallback = isHome
      ? { venue: 'Stadio Giuseppe Meazza', country: 'Italy', timezone: 'Europe/Rome' }
      : milanVenueFallbacks[normalize(opponent)] || {};
    const ourScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    const scoreKnown = ourScore !== '—' && opponentScore !== '—';
    const country = detail.strCountry || venueFallback.country || '';
    const countryKey = normalize(country);
    const localZone = europeanCountryTimezones[countryKey] || venueFallback.timezone || 'Europe/Rome';
    let outcome = '';
    if (completed && scoreKnown) outcome = Number(ourScore) > Number(opponentScore) ? 'W' : Number(ourScore) < Number(opponentScore) ? 'L' : 'D';
    return {
      id: `sportsdb-${row.id}`, teamKey: 'milan', teamName: teams.milan.name,
      teamShort: teams.milan.short, teamColor: teams.milan.color,
      opponent, opponentAbbreviation: '',
      homeAway: isHome ? 'home' : 'away', date, localZone,
      venue: detail.strVenue || venueFallback.venue || 'Venue to be announced',
      location: [detail.strCity, country].filter(Boolean).join(', '),
      state: completed ? 'post' : 'pre', completed,
      detail: completed ? 'FT' : (detail.strStatus && detail.strStatus !== 'NS' ? detail.strStatus : 'Scheduled'),
      timeValid: Boolean(detail.strTimestamp || /\d{1,2}:\d{2}\s*(am|pm)/i.test(row.middle)),
      ourScore, opponentScore, scoreKnown, outcome,
      link: `https://www.thesportsdb.com${row.href}`
    };
  }).filter(Boolean);
}

async function fetchTeam(teamKey, force) {
  const config = teams[teamKey];
  if (config.source === 'thesportsdb') return fetchMilan(force);
  const year = new Date().getFullYear();
  // ESPN's team schedule endpoint can default to a short recent-results window.
  // Request the full schedule explicitly and include both possible season labels:
  // US leagues use the calendar year, while European football commonly uses the
  // ending year (for example, 2027 for the 2026/27 season).
  const urls = [
    `${config.url}?limit=1000`,
    `${config.url}?season=${year}&limit=1000`,
    `${config.url}?season=${year + 1}&limit=1000`,
    ...(config.seasonType ? [
      `${config.url}?season=${year}&seasontype=${config.seasonType}&limit=1000`,
      `${config.url}?season=${year + 1}&seasontype=${config.seasonType}&limit=1000`
    ] : [])
  ];
  const responses = await Promise.allSettled(urls.map(async (url) => {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${force ? `${separator}_=${Date.now()}` : ''}`, { cache: force ? 'reload' : 'default' });
    if (!response.ok) throw new Error(`${response.status}`);
    return response.json();
  }));
  const events = responses.filter((item) => item.status === 'fulfilled').flatMap((item) => item.value.events || []);
  if (!events.length) throw new Error(`No schedule returned for ${config.name}`);
  const unique = new Map();
  events.forEach((event) => unique.set(event.id, event));
  return [...unique.values()].map((event) => parseEvent(event, teamKey)).filter(Boolean);
}

async function loadCalendar(force = false) {
  refreshButton.disabled = true;
  refreshButton.classList.add('loading');
  schedule.setAttribute('aria-busy', 'true');
  statusBox.hidden = false;
  statusBox.className = 'calendar-status';
  statusBox.textContent = force ? 'Checking every league for updates…' : 'Loading the club calendar…';

  const results = await Promise.allSettled(Object.keys(teams).map((key) => fetchTeam(key, force)));
  const freshGames = results.filter((item) => item.status === 'fulfilled').flatMap((item) => item.value);
  const failed = results.filter((item) => item.status === 'rejected').length;

  if (freshGames.length) {
    const unique = new Map();
    freshGames.forEach((game) => unique.set(game.id, game));
    allGames = [...unique.values()].sort((a, b) => a.date - b.date);
    const updated = new Date();
    localStorage.setItem('ddm-club-calendar-v1', JSON.stringify({ updated: updated.toISOString(), games: allGames }));
    updatedLabel.textContent = `${failed ? `${5 - failed}/5 feeds updated` : 'All five feeds updated'} · ${formatInZone(updated, 'Europe/Sofia', { dateStyle: 'medium', timeStyle: 'short' })} Sofia`;
    render();
  } else {
    const cached = cachedData();
    if (cached) {
      allGames = cached.games;
      updatedLabel.textContent = `Showing saved data from ${formatInZone(new Date(cached.updated), 'Europe/Sofia', { dateStyle: 'medium', timeStyle: 'short' })} Sofia`;
      render();
      statusBox.hidden = false;
      statusBox.className = 'calendar-status error';
      statusBox.textContent = 'Live feeds are temporarily unavailable. Saved fixtures are shown below.';
    } else {
      statusBox.className = 'calendar-status error';
      statusBox.textContent = 'The live schedule could not be reached. Please try Refresh scores again.';
      updatedLabel.textContent = 'No live data received';
    }
  }

  refreshButton.disabled = false;
  refreshButton.classList.remove('loading');
  schedule.setAttribute('aria-busy', 'false');
}

function balancedLimit(games, perTeam, totalLimit) {
  const counts = {};
  return games.filter((game) => {
    counts[game.teamKey] = counts[game.teamKey] || 0;
    if (counts[game.teamKey] >= perTeam) return false;
    counts[game.teamKey] += 1;
    return true;
  }).slice(0, totalLimit);
}

function render() {
  const now = new Date();
  const teamGames = activeTeam === 'all' ? allGames : allGames.filter((game) => game.teamKey === activeTeam);
  const filtered = homeOnly ? teamGames.filter((game) => game.homeAway === 'home') : teamGames;
  const live = filtered.filter((game) => game.state === 'in').sort((a, b) => a.date - b.date);
  let upcoming = filtered.filter((game) => game.state !== 'in' && !game.completed && game.date >= new Date(now.getTime() - 6 * 60 * 60 * 1000)).sort((a, b) => a.date - b.date);
  let completed = filtered.filter((game) => game.completed || game.state === 'post').sort((a, b) => b.date - a.date);
  if (activeTeam === 'all') {
    upcoming = balancedLimit(upcoming, 12, 60);
    completed = balancedLimit(completed, 5, 25);
  } else {
    upcoming = upcoming.slice(0, 75);
    completed = completed.slice(0, 20);
  }
  renderSection('live', live);
  renderSection('upcoming', upcoming);
  renderSection('results', completed);
  statusBox.hidden = true;
}

function renderSection(type, games) {
  const section = document.querySelector(`#${type}-section`);
  const list = document.querySelector(`#${type}-games`);
  const count = document.querySelector(`#${type}-count`);
  section.hidden = false;
  count.textContent = games.length;
  list.replaceChildren();
  if (!games.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = homeOnly
      ? (type === 'live' ? 'No DDM club is playing at home right now.' : type === 'upcoming' ? 'No upcoming home fixture is available.' : 'No recent home result is available.')
      : (type === 'live' ? 'No DDM club is playing right now.' : type === 'upcoming' ? 'No upcoming fixture has been published yet.' : 'No recent result is available.');
    list.append(empty);
    if (type === 'live') section.hidden = true;
    return;
  }
  games.forEach((game) => list.append(createGameRow(game)));
}

function createGameRow(game) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.classList.toggle('home-game', game.homeAway === 'home');
  const dateDay = row.querySelector('.game-date strong');
  const dateMonth = row.querySelector('.game-date span');
  dateDay.textContent = formatInZone(game.date, game.localZone, { day: '2-digit' });
  dateMonth.textContent = formatInZone(game.date, game.localZone, { month: 'short', weekday: 'short' });

  row.style.setProperty('--team-color', game.teamColor);
  row.querySelector('.team-chip span').textContent = game.teamShort;
  row.querySelector('.game-matchup p').textContent = game.homeAway === 'home' ? 'Home' : game.homeAway === 'away' ? 'Away' : 'Neutral venue';
  row.querySelector('.game-matchup h3').textContent = `${game.teamName} vs ${game.opponent}`;
  const details = row.querySelector('.game-matchup a');
  if (game.link) details.href = game.link; else details.remove();

  row.querySelector('.game-place strong').textContent = game.venue;
  row.querySelector('.game-place small').textContent = game.location || (game.homeAway === 'home' ? 'Home venue' : 'Location pending');

  const localTime = row.querySelector('.game-time.local');
  localTime.querySelector('strong').textContent = game.timeValid ? formatInZone(game.date, game.localZone, { hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBD';
  localTime.querySelector('small').textContent = game.timeValid ? formatInZone(game.date, game.localZone, { timeZoneName: 'short' }).split(' ').pop() : 'Time not confirmed';

  const sofiaTime = row.querySelector('.game-time.sofia');
  sofiaTime.querySelector('strong').textContent = game.timeValid ? formatInZone(game.date, 'Europe/Sofia', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBD';
  sofiaTime.querySelector('small').textContent = formatInZone(game.date, 'Europe/Sofia', { day: '2-digit', month: 'short', timeZoneName: 'short' });

  const result = row.querySelector('.game-result');
  if (game.state === 'in') {
    result.classList.add('live');
    result.querySelector('span').textContent = 'Live';
    result.querySelector('strong').textContent = game.scoreKnown ? `${game.ourScore}–${game.opponentScore}` : game.detail;
    result.querySelector('small').textContent = game.detail;
  } else if (game.completed) {
    result.classList.add(game.outcome === 'W' ? 'win' : game.outcome === 'L' ? 'loss' : 'draw');
    result.querySelector('span').textContent = game.outcome === 'W' ? 'Win' : game.outcome === 'L' ? 'Loss' : 'Final';
    result.querySelector('strong').textContent = game.scoreKnown ? `${game.ourScore}–${game.opponentScore}` : 'Final';
    result.querySelector('small').textContent = game.detail || 'Completed';
  } else {
    result.querySelector('span').textContent = 'Status';
    result.querySelector('strong').textContent = game.detail || 'Scheduled';
    result.querySelector('small').textContent = game.homeAway === 'home' ? 'Home fixture' : 'Away fixture';
  }
  return row;
}

filterWrap.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-team]');
  if (!button) return;
  activeTeam = button.dataset.team;
  filterWrap.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  render();
});

homeOnlyButton.addEventListener('click', () => {
  homeOnly = !homeOnly;
  homeOnlyButton.classList.toggle('active', homeOnly);
  homeOnlyButton.setAttribute('aria-pressed', String(homeOnly));
  render();
});

refreshButton.addEventListener('click', () => loadCalendar(true));
loadCalendar();
