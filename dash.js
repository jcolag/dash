const sqlite3 = require('better-sqlite3');
const { execSync } = require("child_process");
const fs = require('fs');
const hebrewDate = require('hebrew-date');
const opn = require('opn');
const path = require('path');
const { rrulestr } = require('rrule');
const suncalc = require('suncalc');
const xml2js = require('xml2js');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('config.json'));
const elements = [
  dateInfo(config.birthday, config.weather),
  notes(config.notes.file),
  voaNewscast(),
  blogInfo(config.blogInfo),
  weather(config.weather),
  calendarInfo(config.calendar),
  sleepInfo(config.sleep),
];

const head = '<!DOCTYPE html><html lang="en"><head>' +
  '<meta charset="utf-8"><title>' +
  'Morning Dashboard</title><link rel="stylesheet" href="style.css">' +
  '<script type="text/javascript">window.addEventListener("load", (e) => {' +
  'document.getElementById("voa").playbackRate=1.5;});</script>' +
  '</head><body>';
const html = elements
  .filter((e) => e)
  .map((e) => `<div class="panel">\n${e}\n</div>\n`)
  .join(' ');
const github = '<div class="img-frame"><img src="https://github-readme-' +
  `streak-stats.herokuapp.com/?user=${config.github.user}&` +
  `theme=${config.github.theme}&date_format=${config.github.date}"` +
  '></img></div>';
fs.writeFileSync('morning.html', head + html + github + '</body></html>');
opn('morning.html');
return;

function dateInfo(birthday, wx) {
  const now = new Date();
  const items = [];
  const today = Date().toString().split(' ').slice(0,4).join(' ');
  const sun = suncalc.getTimes(new Date(), wx.lat, wx.lon);
  const dateHebrew = hebrewDate(new Date());
  const julianDay = Math.floor(Date.now() / 86400000 + 2440587.5);
  const bday = new Date(Date.parse(birthday));
  let date = '<h2>Today Is...</h2>\n<ul>';

  items.push(today);
  items.push(
    `🌞 ${sun.sunrise.getHours()}:${sun.sunrise.getMinutes()} ➡ ` +
    `${sun.sunset.getHours()}:${sun.sunset.getMinutes()} 🌠`
  );
  items.push(`${execSync('pom')} - ${execSync('moonth')}`);
  items.push(
    `✡ ${dateHebrew.month_name} ${dateHebrew.date}, ${dateHebrew.year}`
  );
  items.push(`${julianDay} Julian`);
  items.push(`${Date.now() / 1000} UNIX`);
  items.push(execSync('ccal --date').toString());
  items.push(pataphysicalCalendar(now).string);
  items.push(execSync('ddate').toString());
  items.push(biorhythm(birthday));

  bday.setDate(bday.getDate() + 1);
  if (
    now.getMonth() === bday.getMonth() && now.getDate() === bday.getDate()
  ) {
    items.push('<b>Happy Birthday! 🎂</b>');
  }

  date += items.map((i) => `<li>${i}</li>\n`).join(' ');
  date += '</ul>';
  return date;
}

function notes(nightNotesFile) {

  if (fs.existsSync(nightNotesFile)) {
    const nightNotes = fs.readFileSync(nightNotesFile);

    if (nightNotes.length > 0) {
      return '<h2>Notes</h2>\n' +
        nightNotes.toString().replace(/\n/g, '<br>');
    }
  }
  
  return null;
}

function blogInfo(blog) {
  const today = new Date();
  const eom = new Date(today.getYear(), today.getMonth() + 1, -1).getDate()
  const datesig = today.toISOString().split('T')[0];
  const filenames = fs.readdirSync(blog.posts, { withFileTypes: true });
  const files = [];
  let result = `<h2>${blog.title}</h2>\n<ul>\n`;

  filenames.forEach((f) => {
    if (f.isDirectory()) {
      return;
    }

    const lines = fs
      .readFileSync(path.join(blog.posts, f.name))
      .toString()
      .split('\n');
    const dateline = lines.filter((l) => l.indexOf('date: ') === 0)[0];
    const title = lines
      .filter((l) => l.indexOf('title: ') === 0)[0];

    if (!dateline) {
      return;
    }

    if (dateline.indexOf(datesig) > 0) {
      const time = dateline.split(' ')[2];

      files.push(`${f.name} (<i>${title.split(':')[1].trim()}</i>) ` +
        `&mdash; ${time.split(':').slice(0,2).join(':')}`);
    }

    if (dateline.indexOf(datesig) > 0 && f.name.indexOf(datesig) < 0) {
      files.push(`${f.name} has a bad date line`);
    }

    if (
      dateline.indexOf(datesig) > 0 &&
      Number(dateline.split(':')[3].slice(0,2)
    ) > 20) {
      files.push(
        `<i>${title}</i> might want to release earlier in the minute.`
      );
    }
  });

  if (today.getDay() === 6 && (
    today.getDate() < 7 || today.getDate() === eom
  )) {
    files.push('The next newsletter issue should go out today.');
  }

  if (files.length === 0) {
    return null;
  }

  result += files.map((f) => `<li>${f}</li>\n`).join(' ');
  result += '</ul>';
  return result;
}

function sleepInfo(sleep) {
  const rows = fs
    .readFileSync(path.join(sleep.length))
    .toString()
    .split('\n')
    .slice(-sleep.days)
    .map((line) => line.split(','))
    .map((row) => ({
      height: Number(row[4]) * 60 + Number(row[5]),
      tip: `${row[3]} ${row[1]}/${row[2]}, ` +
        `${row[4]}:${('0'+row[5]).slice(-2)}`,
    }));
  let min = 1000;
  let max = 0;

  fs
    .readFileSync(path.join(sleep.reaction))
    .toString()
    .split('\n')
    .slice(-sleep.days)
    .map((line) => line.split(','))
    .forEach((line, i) => {
      rows[i].errors = Number(line[6]);
      rows[i].reaction = Number(line[7]) / Number(line[5]);
      rows[i].titleE = Number(line[6]) === 0 ?
        '' :
        `, ${Number(line[6])} error${Number(line[6]) === 1 ? '' : 's'}`;
    });
  rows.forEach((r) => {
    if (r.height > max) {
      max = r.height;
    }

    if (r.height < min) {
      min = r.height;
    }
  });

  min -= 25;
  const bars = rows
    .map((r) => '<div class="sleep-bar" style="height: ' +
      `${(r.height - min)/2}px; margin-top: ${(max - r.height)/2}px; ` +
      `opacity: ${1 - r.reaction * Math.pow(1.1, r.errors)};" ` +
      `title="${r.tip}\n${
        r.reaction.toString().slice(0,5)
      }s/char${r.titleE}" ` +
      `onmouseenter="let wx=document.getElementById('sleep');`+
      `wx.innerHTML=event.target.title.replace(/\\n/g, '<br>')" ` +
      `onmouseleave="document.getElementById('sleep').innerHTML=''">` +
      '</div>')
    .join('\n')

  return `<h2>Sleep, Last ${sleep.days} Days</h2>\n` + bars +
    '<div id="sleep"></div>';
}

function calendarInfo(cal) {
  const now = new Date();
  const today = new Date(now.setHours(0, -now.getTimezoneOffset(), 0, 0));
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
    today.getHours(),
    today.getMinutes(),
    0,
    0
  );
  const db = openDatabase(cal.database);
  const eventSql = db.prepare(
    'SELECT e.title, e.event_start, e.event_end, r.icalString FROM ' +
    'cal_events e JOIN cal_recurrence r ON r.item_id = e.id;'
  );
  const events = eventSql
    .all()
    .map((e) => ({
      between: rrulestr(
        'DTSTART:' +
        new Date(
          e.event_start / 1000 //- today.getTimezoneOffset() * 60000
        )
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d*/, '') +
        '\n' +
        e.icalString
      )
        .between(today, tomorrow, true),
      event_end: new Date(e.event_end / 1000),
      event_start: new Date(e.event_start / 1000),
      icalString: e.icalString,
      recur: rrulestr(e.icalString),
      name: e.title,
    }))
    .filter((e) => e.between.length > 0);

  if (events.length === 0) {
    return null;
  }

  return '<h2>Calendar</h2>\n<ul>\n' +
    events.map((e) => `<li>${e.name}</li>\n`).join('\n') +
    '</ul>';
}

function voaNewscast() {
  const xhr = new XMLHttpRequest();

  xhr.open('GET', 'https://www.voanews.com/api/zym_oeq$_o', false);
  xhr.send(null);

  const lines = xhr
    .responseText
    .split('\n')
    .filter((l) => l.indexOf('/clips/') >= 0);
  const line = lines[0];
  const start = line.indexOf('>');
  const end = line.indexOf('<', start);
  const url = line.slice(start + 1, end);

  return '<h2>Voice of America Newscast</h2>' +
    `<audio controls id="voa" src=${url}>Uh-oh!</audio>`;
}

function weather(weatherCfg) {
  const url = 'https://forecast.weather.gov/MapClick.php?' +
    `lat=${weatherCfg.lat}&lon=${weatherCfg.lon}&FcstType=digitalDWML`;
  const alertUrl =
    `https://alerts.weather.gov/cap/wwaatmget.php?x=${weatherCfg.area}&y=0`;
  const sun = suncalc.getTimes(new Date(), weatherCfg.lat, weatherCfg.lon);
  const xhr = new XMLHttpRequest();
  const parser = xml2js.Parser();
  const byTime = [];
  let times;
  let weather;
  let min = 175;
  let max = -100;
  let alert;

  xhr.open('GET', url, false);
  xhr.send(null);
  parser
    .parseString(xhr.responseText, (e, result) => {
      if (e) {
        console.log(e);
      }
      times = result.dwml.data[0]['time-layout'][0]['start-valid-time'];
      weather = result.dwml.data[0].parameters[0];
    });
  times
    .forEach((time, index) => {
      byTime.push({
        chancePrecip: weather['probability-of-precipitation'][0].value[index],
        clouds: weather['cloud-amount'][0].value[index],
        condition: weather.weather[0]['weather-conditions'][index],
        dewPoint: weather.temperature[0].value[index],
        humidity: weather.humidity[0].value[index],
        qpf: Number(weather['hourly-qpf'][0].value[index]),
        temperature: weather.temperature[2].value[index],
        time: new Date(time),
        windChill: weather.temperature[1].value[index],
        windDirection: weather.direction[0].value[index],
        windGust: Number(weather['wind-speed'][1].value[index]),
        windSustained: weather['wind-speed'][0].value[index],
      });
      let temp = Number(weather.temperature[2].value[index]);
      if (temp > max) {
        max = temp;
      }
      if (temp < min) {
        min = temp;
      }
    });
  xhr.open('GET', alertUrl, false);
  xhr.send(null);
  parser
    .parseString(xhr.responseText, (e, result) => {
      if (e) {
        console.log(e);
      }
      alert = result.feed.entry[0].summary;
    });
  return '<h2>Hourly Weather</h2>\n' +
    byTime
      .slice(0, weatherCfg.hours)
      .map((hr) =>
        `<div class="temp-bar-${
          (
            hr.time >= sun.sunrise.setDate(hr.time.getDate()) &&
            hr.time <= sun.sunset.setDate(hr.time.getDate())
          ) ? 'l' : 'd'
        }" ` +
        `style="height: ${hr.temperature}px; ` +
        `margin-top: ${max - hr.temperature}px;"` +
        `title="${hr.time.toTimeString()}\n${hr.temperature}°F ` +
        `(${Number(hr.windChill)}°F)\n` +
        `${hr.windSustained}mph (${Number(hr.windGust)}) ` +
        `${hr.windDirection}°\n` +
        `${wxCondition(hr.condition)}" ` +
        `onMouseEnter="let wx=document.getElementById('wx-cond');`+
        `wx.innerHTML=event.target.title.replace(/\\n/g, '<br>');"` +
        `onMouseLeave="document.getElementById('wx-cond').innerHTML=''">` +
       `${getWeatherEmoji(hr, sun)}</div>`
      )
      .join('\n') +
    `\n<div id="wx-cond"></div>\n<div>${alert}</div>`;
}

function openDatabase(database) {
  let db;

  try {
    db = new sqlite3(database, { verbose: null });
    db.prepare('SELECT COUNT(*) FROM cal_alarms');
  } catch(_) {
    const base = path.basename(database);

    fs.copyFileSync(database, base);
    db = new sqlite3(base, { verbose: null });
    db.prepare('SELECT COUNT(*) FROM cal_alarms');
  }
  
  return db;
}

function wxCondition(condition) {
  if (!Object.prototype.hasOwnProperty.call(condition, 'value')) {
    return null;
  }

  const c = condition.value[0]['$'];
  return `${c['weather-type']} (${c.coverage})`;
}

function pataphysicalCalendar(date) {
  const now = Date.now();
  const months = [
    'Absolu',
    'Haha',
    'As',
    'Sable',
    'Décervelage',
    'Gueules',
    'Pédale',
    'Clinamen',
    'Palotin',
    'Merdre',
    'Gidouille',
    'Tatane',
    'Phalle',
  ];
  const today = new Date(now);
  const doy = Math.floor(
    (date - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
  const dSep8 = Math.floor(
    (new Date(today.getFullYear(), 8, 8) - new Date(today.getFullYear(), 0, 0))
    / 86400000
  );
  const pataYear = (today.getFullYear() - 1872) + (doy >= dSep8 ? 1 : 0);
  let pataMonth = 0;
  let pataDay = doy;

  if (doy >= dSep8) {
    pataDay = doy - dSep8;
  } else {
    pataDay += 3;
    pataMonth = 4;
  }

  while (pataDay > 28) {
    pataDay -= 28;
    pataMonth += 1;
  }

  return {
    day: pataMonth,
    month: pataMonth + 1,
    monthName: months[pataMonth],
    string: `${pataDay} ${months[pataMonth]} ${pataYear} EP`,
    year: pataYear,
  };
}

function getWeatherEmoji(weather, sun) {
  let emoji = '';
  let lightOut = (
    weather.time >= sun.sunrise.setDate(weather.time.getDate()) &&
    weather.time <= sun.sunset.setDate(weather.time.getDate())
  );

  if (Object.prototype.hasOwnProperty.call(weather.condition, 'value')) {
    emoji += weatherTypeEmoji(weather.condition.value);
  }
  
  if (weather.clouds > 80) {
    emoji += '☁<br>';
  } else if (weather.clouds > 60) {
    emoji += '🌥<br>';
  } else if (weather.clouds > 40) {
    emoji += '⛅<br>';
  } else if (weather.clouds > 20) {
    emoji += '🌤<br>';
  } else {
    emoji += lightOut ? '☀<br>' : '🌜<br>';
  }

  return emoji;
}

function weatherTypeEmoji(condition) {
  switch (condition['weather-type']) {
    case 'snow':
      return '❄<br>';
    case 'rain':
      return '💧<br>';
    default:
      if (Array.isArray(condition)) {
        return weatherTypeEmoji(condition[0]['$']);
      } else {
        console.log(condition);
      }
      break;
  }
  
  return '';
}

function biorhythm(bdayText) {
  const bday = Date.parse(bdayText);
  const now = Date.now();

  if (isNaN(bday)) {
    console.log('Birthday is unreadable.');
    process.exit(-2);
  }

  const days = DaysBetween(bday, now);
  const phys = calculateBio('p', days);
  const emot = calculateBio('e', days);
  const intl = calculateBio('i', days);

  return `${phys} ${emot} ${intl}`;
}

function DaysBetween(startDate, endDate) {
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const oneDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  const end = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  return (start - end) / oneDay;
}

function calculateBio(type, days) {
  const rhythms = {
    'E': {
      'cycle': 28,
      'icon': '💓',
    },
    'I': {
      'cycle': 33,
      'icon': '🧠',
    },
    'P': {
      'cycle': 23,
      'icon': '💪',
    },
  }

  const rhythm = rhythms[type.toUpperCase()];
  const value = Math.sin(2 * Math.PI * days / rhythm['cycle']).toFixed(2);
  const dir = Math.cos(2 * Math.PI * days / rhythm['cycle']) < 0 ? '⬇' : '⬆';
  const sign = value > 0 ? '+' : '';
  return `${rhythm['icon']}${sign}${value}${dir}`;
}


