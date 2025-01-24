const sqlite3 = require("better-sqlite3");
const Holidays = require("date-holidays");
const ethio = require("ethiopian-calendar-date-converter");
const { execSync } = require("child_process");
const floreal = require("floreal").Date;
const fs = require("fs");
const hebrewDate = require("hebrew-date");
const hijri = require("hijri-converter");
const opn = require("opn");
const os = require("os");
const path = require("path");
const { rrulestr } = require("rrule");
const sentiment = require("sentiment");
const suncalc = require("suncalc");
const tibet = require("tibetan-date-calculator");
const xml2js = require("xml2js");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const config = JSON.parse(fs.readFileSync("config.json"));
const steps = readStepCounts(config.pedometer);
const tvColors = JSON.parse(
  fs.readFileSync(path.join(config.journal.location, "streaming_colors.json")),
);
const [tvMonths, tv] = collateViewing(config.journal, tvColors);
const elements = [
  dateInfo(config.birthday, config.weather),
  listTvShows(),
  holidayList(),
  notes(config.notes.file),
  voaNewscast(),
  blogInfo(config.blogInfo),
  weather(config.weather),
  airQuality(config.airNow, config.weather),
  calendarInfo(config.calendar),
  sleepInfo(config.sleep),
  journalInfo(config.journal),
  chartShows(config.journal, tvMonths, tv, tvColors),
  chartEmoji(config.journal, tvMonths, tv, tvColors),
  chartOpinion(config.journal, tvMonths, tv, tvColors),
  chartStepsByDay(config.pedometer, steps),
  chartStepsByHour(config.pedometer, steps),
  aurora(),
];

const head =
  '<!DOCTYPE html><html lang="en"><head>' +
  '<meta charset="utf-8"><title>' +
  'Morning Dashboard</title><link rel="stylesheet" href="style.css">' +
  '<script type="text/javascript">window.addEventListener("load", (e) => {' +
  'document.getElementById("voa").playbackRate=1.5;});</script>' +
  '<script src="interactive.js" type="text/javascript"></script>' +
  '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' +
  "</head><body>";
const html = elements
  .filter((e) => e)
  .map((e) => `<div class="panel">\n${e}\n</div>\n`)
  .join(" ");
const github =
  '<div class="img-frame"><img src="https://github-readme-' +
  `streak-stats.herokuapp.com/?user=${config.github.user}&` +
  `theme=${config.github.theme}&date_format=${config.github.date}"` +
  "></img></div>";
fs.writeFileSync("morning.html", head + html + github + "</body></html>");
opn("morning.html");
return;

function dateInfo(birthday, wx) {
  const now = new Date();
  const items = [];
  const today = new Date().toLocaleDateString("en-us", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const sun = suncalc.getTimes(new Date(), wx.lat, wx.lon);
  const dateHebrew = hebrewDate(new Date());
  const dateHijri = hijri.toHijri(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const julianDay = Math.floor(Date.now() / 86400000 + 2440587.5);
  const bday = new Date(Date.parse(birthday));
  const holidays = [];
  let date = "<h2>Today Is...</h2>\n<ul>";

  items.push(today);
  items.push(
    `${timeFmt(sun.dawn)} 🌞 ${timeFmt(sun.sunrise)} ➡ ` +
      `${timeFmt(sun.solarNoon)}  ➡ ` +
      `${timeFmt(sun.sunset)} 🌠 ${timeFmt(sun.dusk)}`,
  );
  items.push(
    `Golden hour until ${timeFmt(sun.goldenHourEnd)}, ` +
      `after ${timeFmt(sun.goldenHour)}`,
  );
  items.push(`${execSync("pom")} - ${execSync("moonth")}`);
  items.push(
    `✡ ${dateHebrew.month_name} ${dateHebrew.date}, ${dateHebrew.year}`,
  );
  items.push(
    `☪ ${dateHijri.hy}-${islamicMonth(dateHijri.hm)}-${dateHijri.hd}`,
  );
  items.push(`🇪🇹 ${ethio.EthDateTime.now().toDateWithDayString()}`);
  items.push(`🇫🇷 ${new floreal().toFullDateString()}`);
  items.push(`🏴󠁣󠁮󠀵󠀴󠁿 ${new tibet.TibetanDate().toString()}`);
  items.push(`${julianDay} Julian`);
  items.push(`${Date.now() / 1000} UNIX`);
  items.push(execSync("ccal --date").toString());
  items.push(pataphysicalCalendar(now).string);
  items.push(execSync("ddate").toString());
  items.push(biorhythm(birthday));

  bday.setDate(bday.getDate() + 1);
  if (now.getMonth() === bday.getMonth() && now.getDate() === bday.getDate()) {
    items.push("<b>Happy Birthday! 🎂</b>");
  }

  items.push("System " + execSync("uptime --pretty").toString());
  date += items.map((i) => `<li>${i}</li>\n`).join(" ");
  date += "</ul>";
  return date;
}

function islamicMonth(month) {
  const months = [
    "Muharram",
    "Safar",
    "Rabi`al-Awwal",
    "Rabi`ath-Thani",
    "Jumada l-Ula",
    "Jumada t-Tania",
    "Rajab",
    "Sha`ban",
    "Ramadan",
    "Shawwal",
    "Dhu l-Qa`da",
    "Dhu l-Hijja",
  ];

  return months[month];
}

function holidayList() {
  const hd = new Holidays();
  const now = new Date();
  let holidays = [];

  Object.keys(hd.getCountries()).forEach((cc) => {
    hd.init(cc);
    hd.setLanguages("en");
    let hc = hd.isHoliday(now);
    if (hc) {
      hc.forEach((h) => {
        h.country = cc;
        holidays.push(h);
      });
    }
  });

  if (holidays.length === 0) {
    return "";
  }

  const byName = groupBy(holidays, "name");

  holidays = Object.keys(byName).map((name) => {
    const days = byName[name];
    const type = days
      .map(
        (d) =>
          `<span title="${d.country} ${d.type}">` +
          `${countryToFlag(d.country)}</span>`,
      )
      .join(" ");

    return `${name} (${type})`;
  });
  return (
    "<h2>Today&rsquo;s Holidays</h2><ul>" +
    holidays
      .map(
        (h) =>
          "<li>" +
          (h.indexOf("🇺🇸") > 0 ? "<b>" : "") +
          `${h}` +
          (h.indexOf("🇺🇸") > 0 ? "</b>" : "") +
          "</li>",
      )
      .join("") +
    "</ul>"
  );
}

function groupBy(xs, key) {
  return xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

function countryToFlag(country) {
  if (!country) {
    // No country, no flag...
    return country;
  }

  const cc = country.toUpperCase();
  return Array.from(cc).map(letterToEmoji).join("");
}

function letterToEmoji(l) {
  // The letter emoji code-points are a fixed distance from the letter
  // code-points themselves
  return String.fromCodePoint(l.toLowerCase().charCodeAt() + 127365);
}

function timeFmt(when) {
  return `${when.getHours()}:${("0" + when.getMinutes()).slice(-2)}`;
}

function notes(nightNotesFile) {
  if (fs.existsSync(nightNotesFile)) {
    const nightNotes = fs.readFileSync(nightNotesFile);

    if (nightNotes.length > 0) {
      return "<h2>Notes</h2>\n" + nightNotes.toString().replace(/\n/g, "<br>");
    }
  }

  return null;
}

function blogInfo(blog) {
  const today = new Date();
  const eom = new Date(today.getYear(), today.getMonth() + 1, -1).getDate();
  const datesig = today.toISOString().split("T")[0];
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
      .split("\n");
    const dateline = lines.filter((l) => l.indexOf("date: ") === 0)[0];
    let title = lines.filter((l) => l.indexOf("title: ") === 0)[0];

    if (!dateline) {
      return;
    }

    title = title.split(":").slice(1).join(":").trim();
    if (dateline.indexOf(datesig) > 0) {
      const time = dateline.split(" ")[2];
      const stamp = new Date(dateline.split(":").slice(1).join(":").trim());
      const postTz = dateline.split(":").slice(-1).join(":").slice(2);
      const tz =
        (stamp.getTimezoneOffset() > 0 ? "-" : "") +
        ("0" + Math.abs(stamp.getTimezoneOffset() / 60).toString()).slice(-2) +
        ("0" + (stamp.getTimezoneOffset() % 60).toString()).slice(-2);

      files.push(
        `${f.name} (<i>${title}</i>) ` +
          `&mdash; ${time.split(":").slice(0, 2).join(":")}`,
      );

      if (f.name.indexOf(datesig) < 0) {
        files.push(`${f.name} has a bad date line`);
      }

      if (stamp.getSeconds() > 20) {
        files.push(
          `<i>${title}</i> might want to release earlier in the minute.`,
        );
      }

      if (postTz !== tz) {
        files.push(`<i>${title}</i> needs a timezone of <tt>${tz}</tt>.`);
      }
    }
  });

  if (
    today.getDay() === 6 &&
    (today.getDate() < 7 || today.getDate() === eom)
  ) {
    files.push("The next newsletter issue should go out today.");
  }

  if (files.length === 0) {
    return null;
  }

  result += files.map((f) => `<li>${f}</li>\n`).join(" ");
  result += "</ul>";
  return result;
}

function sleepInfo(sleep) {
  const rows = fs
    .readFileSync(path.join(sleep.length))
    .toString()
    .split("\n")
    .slice(-sleep.days)
    .map((line) => line.split(","))
    .map((row) => ({
      height: Number(row[4]) * 60 + Number(row[5]),
      tip:
        `${row[3]} ${row[1]}/${row[2]}, ` +
        `${row[4]}:${("0" + row[5]).slice(-2)}`,
    }));
  let min = 1000;
  let max = 0;

  fs.readFileSync(path.join(sleep.reaction))
    .toString()
    .split("\n")
    .slice(-sleep.days)
    .map((line) => line.split(","))
    .forEach((line, i) => {
      rows[i].errors = Number(line[6]);
      rows[i].reaction = Number(line[7]) / Number(line[5]);
      rows[i].titleE =
        Number(line[6]) === 0
          ? ""
          : `, ${Number(line[6])} error${Number(line[6]) === 1 ? "" : "s"}`;
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
    .map(
      (r, i) =>
        `<div class="sleep-bar day-${i}" style="height: ` +
        `${(r.height - min) / 2}px; margin-top: ${(max - r.height) / 2}px; ` +
        `opacity: ${(1 - r.reaction + 0.33) * Math.pow(1.1, r.errors)};" ` +
        `title="${r.tip}\n${r.reaction
          .toString()
          .slice(0, 5)}s/char${r.titleE}" ` +
        `onmouseenter="let wx=document.getElementById('sleep');` +
        `wx.innerHTML=event.target.title.replace(/\\n/g, '<br>')" ` +
        `onmouseleave="document.getElementById('sleep').innerHTML=''">` +
        "</div>",
    )
    .join("\n");

  return (
    `<h2>Sleep, Last ${sleep.days} Days</h2>\n` +
    bars +
    '<div id="sleep"></div>'
  );
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = ("00" + (date.getMonth() + 1)).slice(-2);
  const d = ("00" + date.getDate()).slice(-2);

  return `${y}-${m}-${d}`;
}

function journalInfo(journal) {
  const sent = new sentiment();
  const dates = [];
  const entries = [];
  let day = new Date();
  let max = -1000;
  let min = 10000;
  let words = 0;

  for (let i = 0; i < journal.days; i++) {
    day.setDate(day.getDate() - 1);
    dates.push(`${formatDate(day)}.md`);
  }

  dates.reverse().forEach((d) => {
    const file = path.join(journal.location, d);
    let j = null;
    let s = { comparative: null, score: null };

    try {
      j = fs.readFileSync(file, "utf-8");
      s = sent.analyze(j);
    } catch (e) {}

    if (j === null) {
      return;
    }

    const w = j.trim().split(/\s+/).length;

    entries.push({
      comparative: s.comparative,
      file: d,
      sentiment: s.score,
      words: w,
    });

    if (s.comparative > max) {
      max = s.comparative;
    }

    if (s.comparative < min) {
      min = s.comparative;
    }

    if (w > words) {
      words = w;
    }
  });

  const bars = entries
    .map(
      (r, i) =>
        `<div class="journal-bar day-${i}" style="height: ` +
        `${(r.comparative - min) * 200 + 10}px; margin-top: ${(max - r.comparative) * 200}px; ` +
        `opacity: ${0.5 + r.words / words / 2};" ` +
        `title="${r.file}\n${r.sentiment}/${r.words}" ` +
        `onmouseenter="let wx=document.getElementById('journal');` +
        `wx.innerHTML=event.target.title.replace(/\\n/g, '<br>')" ` +
        `onmouseleave="document.getElementById('journal').innerHTML=''">` +
        "</div>",
    )
    .join("\n");

  return (
    `<h2>Journal, Last ${journal.days} Days</h2>\n` +
    bars +
    '<div id="journal"></div>'
  );
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
    0,
  );
  const db = openDatabase(cal.database);
  const eventSql = db.prepare(
    "SELECT e.title, e.event_start, e.event_end, r.icalString FROM " +
      "cal_events e JOIN cal_recurrence r ON r.item_id = e.id;",
  );
  const events = eventSql
    .all()
    .map((e) => ({
      between: rrulestr(
        "DTSTART:" +
          new Date(
            e.event_start / 1000, //- today.getTimezoneOffset() * 60000
          )
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d*/, "") +
          "\n" +
          e.icalString,
      ).between(today, tomorrow, true),
      event_end: new Date(e.event_end / 1000),
      event_start: new Date(e.event_start / 1000),
      icalString: e.icalString,
      recur: rrulestr(e.icalString),
      name: e.title,
    }))
    .filter((e) => e.between.length > 0);

  if (now.getDate() >= new Date(now.getFullYear(), now.getMonth() + 1, -7).getDate()) {
    events.push({
      name: 'Check for Hoopla Bonus borrows'
    });
  }

  if (events.length === 0) {
    return null;
  }

  return (
    "<h2>Calendar</h2>\n<ul>\n" +
    events.map((e) => `<li>${e.name}</li>\n`).join("\n") +
    "</ul>"
  );
}

function voaNewscast() {
  const xhr = new XMLHttpRequest();

  xhr.open("GET", "https://www.voanews.com/podcast/?zoneId=7982", false);
  xhr.send(null);

  const lines = xhr.responseText
    .split("\n")
    .filter((l) => l.indexOf("<enclosure ") >= 0);
  const line = lines[0];
  const start = line.indexOf('"');
  const end = line.indexOf('"', start + 1);
  const url = line.slice(start + 1, end);

  return (
    "<h2>Voice of America Newscast</h2>" +
    `<audio controls id="voa" src=${url}>Uh-oh!</audio>`
  );
}

function weather(weatherCfg) {
  const url =
    "https://forecast.weather.gov/MapClick.php?" +
    `lat=${weatherCfg.lat}&lon=${weatherCfg.lon}&FcstType=digitalDWML`;
  const owUrl =
    "https://api.openweathermap.org/data/2.5/onecall?" +
    `lat=${weatherCfg.lat}&lon=${weatherCfg.lon}&appid=${weatherCfg.apiKey}`;
  const alertUrl = `https://alerts.weather.gov/cap/wwaatmget.php?x=${weatherCfg.area}&y=0`;
  const sun = suncalc.getTimes(new Date(), weatherCfg.lat, weatherCfg.lon);
  const xhr = new XMLHttpRequest();
  const parser = xml2js.Parser();
  const byTime = [];
  let times;
  let weather;
  let min = 175;
  let max = -100;
  let alert;
  let openWeather;
  let rainTotal;
  let snowTotal;
  let qpfTotal;

  xhr.open("GET", owUrl, false);
  xhr.send(null);
  openWeather = JSON.parse(xhr.responseText);
  rainTotal = openWeather.hourly
    .slice(0, 24)
    .map((h) => (h.rain ? h.rain["1h"] : 0))
    .reduce((acc, a) => acc + a, 0);
  snowTotal = openWeather.hourly
    .slice(0, 24)
    .map((h) => (h.snow ? h.snow["1h"] : 0))
    .reduce((acc, a) => acc + a, 0);

  xhr.open("GET", url, false);
  xhr.send(null);
  parser.parseString(xhr.responseText, (e, result) => {
    if (e) {
      console.log("openWeather reponse issue");
      console.log(e);
    }
    times = result.dwml.data[0]["time-layout"][0]["start-valid-time"];
    weather = result.dwml.data[0].parameters[0];
  });
  times.forEach((time, index) => {
    console.log(weather);
    let qpf = weather["hourly-qpf"][0]["$"];
    byTime.push({
      chancePrecip: weather["probability-of-precipitation"][0]["$"],
      clouds: weather["cloud-amount"][0]["$"],
      condition: weather.weather[0]["weather-conditions"][index],
      dewPoint: weather.temperature[0]["$"],
      humidity: weather.humidity[0]["$"],
      qpf: typeof qpf === "number" ? Number(qpf) : 0,
      rain:
        index < openWeather.hourly.length
          ? openWeather.hourly[index].rain
          : null,
      snow:
        index < openWeather.hourly.length
          ? openWeather.hourly[index].snow
          : null,
      temperature: weather.temperature[2].value[index],
      time: new Date(time),
      uvi:
        index < openWeather.hourly.length ? openWeather.hourly[index].uvi : 0,
      windChill: weather.temperature[1].value[index],
      windDirection: weather.direction[0].value[index],
      windGust: weather["wind-speed"][0].value[index],
      windSustained: weather["wind-speed"][0].value[index],
    });
    let t = weather.temperature[2].value[index];
    let temp = typeof t === "number" ? Number(t) : 0;
    if (temp > max) {
      max = temp;
    }
    if (temp < min) {
      min = temp;
    }
  });
  qpfTotal = byTime
    .slice(0, 24)
    .map((h) => h.qpf)
    .reduce((acc, a) => acc + a, 0);

  xhr.open("GET", alertUrl, false);
  xhr.send(null);
  parser.parseString(xhr.responseText, (e, result) => {
    if (e || !result) {
      console.log("Alert response issue");
      console.log(e);
      alert = "";
    } else if (Object.prototype.hasOwnProperty.call(result, "feed")) {
      alert = result.feed.entry.map((e) => e.summary).join("\n<br>\n");
    } else {
      alert = "";
    }
  });
  return (
    "<h2>Hourly Weather</h2>\n" +
    byTime
      .slice(0, weatherCfg.hours)
      .map(
        (hr) =>
          `<div class="${sunClass(sun, hr.time, "temp-bar")}" ` +
          `style="height: ${hr.temperature - min + 50}px; ` +
          `margin-top: ${max - hr.temperature}px;"` +
          `title="${hr.time.toTimeString()}\n${hr.temperature}°F ` +
          `(${typeof hr.windChill === "number" ? hr.windChill : 0}°F)\n` +
          `${hr.windSustained}mph ` +
          (isNaN(hr.windGust) ? "" : `(${Number(hr.windGust)}) `) +
          `${hr.windDirection}° ${dirArrow(hr.windDirection)}\n` +
          `UV Index: ${hr.uvi}\n` +
          (wxCondition(hr.condition) ? `${wxCondition(hr.condition)}` : "") +
          (hr.rain || hr.snow ? " &mdash; " : "") +
          (hr.rain ? `💧 ${hr.rain["1h"]}mm ` : "") +
          (hr.snow ? `❄ ${hr.snow["1h"]}mm` : "") +
          (isNaN(hr.qpf) ? "" : `&mdash; ${Number(hr.qpf)}in QPF\n`) +
          '" ' +
          `onMouseEnter="let wx=document.getElementById('wx-cond');` +
          `wx.innerHTML=event.target.title.replace(/\\n/g, '<br>');"` +
          `onMouseLeave="document.getElementById('wx-cond').innerHTML=''">` +
          `${getWeatherEmoji(hr, sun)}</div>`,
      )
      .join("\n") +
    `\n<div>${Math.round(rainTotal / 0.254) / 100}in 💧 &mdash; ` +
    `${Math.round(snowTotal / 0.254) / 100}in ❄` +
    ` &mdash; ${Math.round(qpfTotal * 1000) / 1000}in QPF</div>` +
    `\n<div id="wx-cond"></div>\n<div>${alert}</div>`
  );
}

function airQuality(aqiKey, weatherCfg) {
  const warn = ["good", "mod", "usg", "unhealthy", "very", "hazard"];
  const aqiUrl =
    "https://www.airnowapi.org/aq/forecast/latLong/?" +
    `format=application/json&latitude=${weatherCfg.lat}&` +
    `longitude=${weatherCfg.lon}&distance=25&API_KEY=${aqiKey}`;
  const xhr = new XMLHttpRequest();
  const results = ["<h2>Air Quality</h2>"];

  xhr.open("GET", aqiUrl, false);
  xhr.send(null);
  aqi = JSON.parse(xhr.responseText);
  aqi.forEach((i) => {
    let html =
      `<p>${i.DateForecast.trim()}: ` +
      `<span class="${warn[i.Category.Number - 1]}` +
      `${i.ActionDay ? " action" : ""}">${i.AQI}, ` +
      `${i.Category.Name} (${i.ParameterName})</span>`;

    if (i.Discussion.length > 0) {
      html += `, ${i.Discussion}`;
    }

    html += "</p>";
    results.push(html);
  });
  return results.join("");
}

function openDatabase(database) {
  let db;

  try {
    db = new sqlite3(database, { verbose: null });
    db.prepare("SELECT COUNT(*) FROM cal_alarms");
  } catch (_) {
    const base = path.basename(database);
    const temp = path.join(os.tmpdir(), base);

    fs.copyFileSync(database, temp);
    db = new sqlite3(temp, { verbose: null });
    db.prepare("SELECT COUNT(*) FROM cal_alarms");
  }

  return db;
}

function wxCondition(condition) {
  if (!Object.prototype.hasOwnProperty.call(condition, "value")) {
    return null;
  }

  const c = condition.value[0]["$"];
  let result = c["weather-type"];

  if (c.coverage) {
    result = `${result} (${c.coverage})`;
  }

  return result;
}

function sunClass(sun, hr, prefix) {
  const time = new Date(hr);
  let type;

  if (time.getHours() < sun.sunrise.getHours()) {
    type = `${prefix}-d`;
  } else if (time.getHours() < sun.sunrise.getHours() + 1) {
    type = `${prefix}-r`;
  } else if (time.getHours() < sun.sunset.getHours()) {
    type = `${prefix}-l`;
  } else if (time.getHours() < sun.sunset.getHours() + 1) {
    type = `${prefix}-s`;
  } else {
    type = `${prefix}-d`;
  }

  return `${prefix} ${type}`;
}

function dirArrow(angle) {
  if (angle < 22.5 || angle >= 337.5) {
    return "⬆️";
  } else if (angle < 67.5) {
    return "↖️";
  } else if (angle < 112.5) {
    return "⬅️";
  } else if (angle < 157.5) {
    return "↙️";
  } else if (angle < 202.5) {
    return "⬇️";
  } else if (angle < 247.5) {
    return "↘️";
  } else if (angle < 292.5) {
    return "➡️";
  } else if (angle < 337.5) {
    return "↗️";
  } else {
    return "?";
  }
}

function pataphysicalCalendar(date) {
  const now = Date.now();
  const months = [
    "Absolu",
    "Haha",
    "As",
    "Sable",
    "Décervelage",
    "Gueules",
    "Pédale",
    "Clinamen",
    "Palotin",
    "Merdre",
    "Gidouille",
    "Tatane",
    "Phalle",
  ];
  const today = new Date(now);
  const doy = Math.floor(
    (date - new Date(today.getFullYear(), 0, 0)) / 86400000,
  );
  const dSep8 = Math.floor(
    (new Date(today.getFullYear(), 8, 8) -
      new Date(today.getFullYear(), 0, 0)) /
      86400000,
  );
  const pataYear = today.getFullYear() - 1872 + (doy >= dSep8 ? 1 : 0);
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
  let emoji = "";
  let lightOut =
    weather.time >= sun.sunrise.setDate(weather.time.getDate()) &&
    weather.time <= sun.sunset.setDate(weather.time.getDate());

  if (Object.prototype.hasOwnProperty.call(weather.condition, "value")) {
    emoji += weatherTypeEmoji(weather.condition.value);
  }

  if (weather.clouds > 80) {
    emoji += "☁<br>";
  } else if (weather.clouds > 60) {
    emoji += "🌥<br>";
  } else if (weather.clouds > 40) {
    emoji += "⛅<br>";
  } else if (weather.clouds > 20) {
    emoji += "🌤<br>";
  } else {
    emoji += lightOut ? "☀<br>" : "🌜<br>";
  }

  return emoji;
}

function weatherTypeEmoji(condition) {
  switch (condition["weather-type"]) {
    case "snow":
      return "❄<br>";
    case "rain":
      return "💧<br>";
    case "freezing rain":
      return "🧊<br>";
    default:
      if (Array.isArray(condition)) {
        return weatherTypeEmoji(condition[0]["$"]);
      } else {
        console.log("Unknown weather condition");
        console.log(condition);
      }
      break;
  }

  return "";
}

function biorhythm(bdayText) {
  const bday = Date.parse(bdayText);
  const now = Date.now();

  if (isNaN(bday)) {
    console.log("Birthday is unreadable.");
    process.exit(-2);
  }

  const days = DaysBetween(bday, now);
  const phys = calculateBio("p", days);
  const emot = calculateBio("e", days);
  const intl = calculateBio("i", days);

  return `${phys} ${emot} ${intl}`;
}

function DaysBetween(startDate, endDate) {
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const oneDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  const end = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );

  return (start - end) / oneDay;
}

function calculateBio(type, days) {
  const rhythms = {
    E: {
      cycle: 28,
      icon: "💓",
    },
    I: {
      cycle: 33,
      icon: "🧠",
    },
    P: {
      cycle: 23,
      icon: "💪",
    },
  };

  const rhythm = rhythms[type.toUpperCase()];
  const value = Math.sin((2 * Math.PI * days) / rhythm["cycle"]).toFixed(2);
  const dir =
    Math.cos((2 * Math.PI * days) / rhythm["cycle"]) < 0 ? "⬇" : "⬆";
  const sign = value > 0 ? "+" : "";
  return `${rhythm["icon"]}${sign}${value}${dir}`;
}

function collateViewing(journal, colors) {
  const files = [];
  const months = [];
  const result = {};
  let length = 0;

  updateViewing(config.journal);
  Object.keys(colors).forEach((k) => {
    result[k] = {
      shows: [],
      emoji: [],
      opinion: [],
    };
  });
  fs.readdirSync(journal.location).forEach((file) => {
    if (file.indexOf(".json") < 0 || file.indexOf("-") < 0) {
      return;
    }

    files.push(file.split(".")[0]);
    months.push(JSON.parse(fs.readFileSync(path.join(journal.location, file))));

    months[months.length - 1].forEach((s) => {
      if (!Object.prototype.hasOwnProperty.call(result, s.service)) {
        result[s.service] = {
          shows: [],
          emoji: [],
          opinion: [],
        };
        while (result[s.service].shows.length < length - 1) {
          result[s.service].shows.push(0);
          result[s.service].emoji.push(0);
          result[s.service].opinion.push(0);
        }
      }

      while (result[s.service].shows.length < length - 1) {
        result[s.service].shows.push(0);
        result[s.service].emoji.push(0);
        result[s.service].opinion.push(0);
      }

      result[s.service].shows.push(s.shows);
      result[s.service].emoji.push(s.emoji);
      result[s.service].opinion.push(s.opinion);
      if (result[s.service].shows.length > length) {
        length = result[s.service].shows.length;
      }
    });
  });
  Object.keys(result).forEach((k) => {
    while (result[k].shows.length < length) {
      result[k].shows.push(0);
      result[k].emoji.push(0);
      result[k].opinion.push(0);
    }
  });
  return [files, result];
}

function updateViewing(journal) {
  const now = new Date();
  const rows = [];
  const sent = new sentiment();
  const services = [];
  const report = [];
  let yy = now.getYear() + 1900;
  let mm = now.getMonth() + 1;

  prefix = `${yy}-${("0" + mm).slice(-2)}-`;
  suffix = ".md";

  fs.readdirSync(journal.location).forEach((file) => {
    if (file.indexOf(prefix) < 0 || file.indexOf(suffix) < 0) {
      return;
    }

    fs.readFileSync(path.join(journal.location, file))
      .toString()
      .split("\n")
      .filter((l) => l.indexOf("|**") === 0)
      .forEach((l) => {
        const columns = l.split("|");

        rows.push(columns);
        if (services.indexOf(columns[2]) < 0) {
          services.push(columns[2]);
        }
      });
  });

  services
    .filter((s) => s.length > 0)
    .sort()
    .forEach((service) => {
      const thoughts = [];
      const emoji = [];
      let count = 0;

      rows
        .filter((r) => r[2] === service)
        .forEach((show) => {
          thoughts.push(show[4]);
          emoji.push(show[3]);
          emoji.push(show[5]);
          count += 1;
        });
      report.push({
        service: service,
        shows: count,
        emoji:
          Math.round(sent.analyze(emoji.join(" ")).comparative * 1000) / 1000,
        opinion:
          Math.round(sent.analyze(thoughts.join(" ")).comparative * 1000) /
          1000,
      });
    });

  fs.writeFileSync(
    path.join(journal.location, `${yy}-${("0" + mm).slice(-2)}.json`),
    JSON.stringify(report, " ", 2),
  );
}

function chartShows(journal, months, watching, colors) {
  const id = "showCountChart";
  const result = [];
  const shows = Object.keys(watching).map((s) => {
    return {
      name: s,
      data: watching[s].shows,
    };
  });

  result.push("<h2>Shows Watched</h2>");
  result.push(`<div style="height: 400px"><canvas id="${id}"></canvas></div>`);
  result.push(chartJsScript(id, months, shows, colors));

  return result.join("");
}

function chartEmoji(journal, months, watching, colors) {
  const id = "showEmojiChart";
  const result = [];
  const shows = Object.keys(watching).map((s) => {
    return {
      name: s,
      data: watching[s].emoji,
    };
  });

  result.push("<h2>Media Emoji Sentiment</h2>");
  result.push(`<div style="height: 350px"><canvas id="${id}"></canvas></div>`);
  result.push(chartJsScript(id, months, shows, colors));

  return result.join("");
}

function chartOpinion(journal, months, watching, colors) {
  const id = "showOpinionChart";
  const result = [];
  const shows = Object.keys(watching).map((s) => {
    return {
      name: s,
      data: watching[s].opinion,
    };
  });

  result.push("<h2>Media Opinion Sentiment</h2>");
  result.push(`<div style="height: 400px"><canvas id="${id}"></canvas></div>`);
  result.push(chartJsScript(id, months, shows, colors));

  return result.join("");
}

function listTvShows() {
  const today = new Date().toISOString().split("T")[0];
  const url = `https://api.tvmaze.com/schedule?country=US&date=${today}`;
  const webUrl = `https://api.tvmaze.com/schedule/web?country=US&date=${today}`;
  const xhr = new XMLHttpRequest();
  let showList, webShowList;

  xhr.open("GET", url, false);
  xhr.send(null);
  showList = JSON.parse(xhr.responseText)
    .filter((s) => s.show.type === "Scripted")
    .filter((s) => s.show.schedule.days.length < 3);
  xhr.open("GET", webUrl, false);
  xhr.send(null);
  webShowList = JSON.parse(xhr.responseText)
    .filter((s) => s._embedded.show.type === "Scripted")
    .filter((s) => s._embedded.show.schedule.days.length < 3);

  if (showList.length + webShowList.length === 0) {
    return '';
  }

  return (
    "<h2>Television</h2><ul>" +
    showList
      .map(
        (s) =>
          `<li><details><b>${s.name}</b>: ${s.summary}<summary>` +
          `${s.show.name} S${s.season}E${s.number} (${s.show.network?.name})` +
          "</summary></details></li>",
      )
      .join("") +
    webShowList
      .map(
        (s) =>
          "<li><details>" +
          `<b>${s.name}</b>: ${s.summary}` +
          "<summary>" +
          `${s._embedded.show.name} S${s.season}E${s.number} (${s._embedded.show.webChannel.name})` +
          "</summary></details></li>",
      )
      .join("") +
    "</ul>"
  );
}

function aurora() {
  return '<a href="https://www.swpc.noaa.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental" style="border: none;"><img src="https://services.swpc.noaa.gov/experimental/images/aurora_dashboard/tonights_static_viewline_forecast.png" style="width: 100%;"></a>';
}

function chartJsScript(id, labels, info, colors) {
  const services = info
    .filter((s) => s.data.reduce((a, b) => a + b, 0) !== 0)
    .map((s) => {
      return {
        backgroundColor: colors[s.name],
        borderColor: colors[s.name],
        borderWidth: 1,
        color: colors[s.name],
        data: s.data,
        label: s.name,
      };
    });
  const data = {
    type: "line",
    data: {
      datasets: services,
      labels: labels,
    },
    options: {
      plugins: {
        legend: {
          position: "right",
        },
      },
      maintainAspectRatio: false,
      title: {
        display: false,
      },
    },
  };
  let script =
    '<script>window.addEventListener("load", () => {' +
    `const ctx = document.getElementById('${id}');` +
    "new Chart(ctx, ";

  script += JSON.stringify(data);
  script += ");});</script>";
  return script;
}

function readStepCounts(ped) {
  return fs
    .readFileSync(ped.location, "utf-8")
    .split("\n")
    .slice(ped.skipLines)
    .map((l) => l.split(","));
}

function chartStepsByDay(ped, steps) {
  const id = "day-steps";
  const result = [
    `<div style="height: 300px"><canvas id="${id}"></canvas></div>`,
  ];
  const data = {
    data: {
      datasets: [
        {
          data: steps
            .reverse()
            .slice(0, ped.maxDays)
            .map((d) =>
              d.slice(1, 25).reduce((a, b) => Number(a) + Number(b), 0),
            )
            .reverse(),
          label: "Daily Steps",
          type: "bar",
        },
        {
          data: steps
            .slice(0, ped.maxDays)
            .map((d) =>
              (
                d.slice(1, 25).reduce((a, b) => Number(a) + Number(b), 0) *
                ped.stepLength / // step length in feet
                5280 // feet per mile
              ) /
              (
                d.slice(25).reduce((a, b) => Number(a) + Number(b), 0) /
                1000 / // milliseconds per second
                3600 // seconds per hour
              ) * 10000, // temporary scale to match steps
            )
            .reverse(),
          label: "Speed",
          type: "line",
        }
      ],
      labels: steps
        .slice(0, ped.maxDays)
        .map((d) => d[0])
        .reverse(),
    },
    options: {
      legend: {
        position: "right",
      },
      maintainAspectRatio: false,
      title: {
        display: false,
      },
    },
  };
  let script =
    '<script>window.addEventListener("load", () => {' +
    `const ctx = document.getElementById('${id}');` +
    "new Chart(ctx, ";

  script += JSON.stringify(data);
  script += ");});</script>";
  result.push(script);
  return result.join("");
}

function chartStepsByHour(ped, steps) {
  const id = "hour-steps";
  const result = [
    `<div style="height: 300px"><canvas id="${id}"></canvas></div>`,
  ];
  const data = {
    type: "bar",
    data: {
      datasets: [],
      labels: Array.from({ length: 24 }, (v, i) => 0 + i),
    },
    options: {
      legend: {
        position: "right",
      },
      maintainAspectRatio: false,
      title: {
        display: false,
      },
    },
  };
  const counts = [];
  let script =
    '<script>window.addEventListener("load", () => {' +
    `const ctx = document.getElementById('${id}');` +
    "new Chart(ctx, ";

  for (let i = 1; i <= 24; i++) {
    counts.push(
      steps
        .reverse()
        .slice(0, ped.maxDays)
        .map((d) => d[i])
        .reduce((a, b) => Number(a) + Number(b), 0) /
        (steps.length > ped.maxDays ? ped.maxDays : steps.length),
    );
  }

  data.data.datasets.push({
    data: counts,
    label: "Hourly Steps",
  });
  script += JSON.stringify(data);
  script += ");});</script>";
  result.push(script);
  return result.join("");
}
