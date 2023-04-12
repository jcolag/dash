window.addEventListener('load', (e) => {
  classArray('journal-bar').forEach((b) => syncBars(b));
  classArray('sleep-bar').forEach((b) => syncBars(b));
});

function syncBars(b) {
  const classes = b.className.split(' ');
  const dayClass = classes.filter((c) => c.indexOf('day-') == 0);

  b.addEventListener('mouseenter', (e) => {
    classArray(dayClass).forEach((el) => {
      el.classList.add('bar-hover');
    });
  });
  b.addEventListener('mouseleave', (e) => {
    classArray(dayClass).forEach((el) => {
      el.classList.remove('bar-hover');
    });
  });
}

function classArray(name) {
  return Array.from(document.getElementsByClassName(name));
}

