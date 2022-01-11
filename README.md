# dash

**Dash** may have an insipid name, but it's what I rely on to start my morning.  It gathers a bunch of information that either informs me or amuses me, and presents it on a single page.

Please note that this probably isn't *generally* useful for most people, except maybe as inspiration to develop your own, or maybe as a project to rip apart for pieces to use elsewhere.  For example, I run an unpublished script overnight that records (a first approximation of) how long I sleep and gives me a place to type anything that occurs to me if I wake up, among other things.  I also have a blog and mailing list to update periodically, and I maintain my calendar in Thunderbird.  You probably don't have all those details lined up the same way, if at all, and it wouldn't be smart to try to reinvent all of it just to use this.

As I write this, it includes the following:

 * Information about the day, including:
   - The date
   - Sunrise and sunset information
   - Moon phase
   - The date on the [Hebrew calendar](https://en.wikipedia.org/wiki/Hebrew_calendar)
   - The [Julian day](https://en.wikipedia.org/wiki/Julian_day)
   - The [UNIX time](https://en.wikipedia.org/wiki/Unix_time)
   - The date on the [Common calendar](https://github.com/jcolag/CommonCalendar/)
   - The date on the [Pataphysical calendar](https://en.wikipedia.org/wiki/'Pataphysics#Pataphysical_calendar)
   - The date on the [Discordian calendar](https://en.wikipedia.org/wiki/Discordian_calendar)
   - Biorhythms, because I find it funny to see how far off the values are, day-to-day
 * Notes that I may have written myself overnight, usually a comment if something woke me up in the middle of the night or I remember a dream
 * Voice of America's [latest newscast](https://www.voanews.com/a/6364216.html), a five-minute news update, set to play at 1&frac12;x speed
 * Any blog post or newsletter issue that might be ready for publication for the day, along with some quick testing
 * A visualization of the hourly weather for the upcoming day
 * Events from my calendar
 * A visualization of sleep data for the last stretch of days
 * Information on my "streaks" publishing to GitHub

In the future, I plan to add unread notifications from social media sites that might be worth knowing about early, overnight voicemail, and maybe job board searches.

The default styling uses the [Solarized](https://ethanschoonover.com/solarized/) color palette and [OpenMoji](https://ethanschoonover.com/solarized/) font for any emoji display.

You might ask why this just generates a static page, rather than running as a server.  It's a legitimate question, since it does make some sense to just keep updating data and serve up the latest versions, especially if there's a network outage.  However, I only look at this information once a day, when I wake up, and the benefits don't outweigh the added overhead to keep everything updated.  Or rather, that's how I feel about it now.  I might change my mind down the road.

