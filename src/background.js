(() => {

let timeout = null;
let settings = null;
window.pokemons = [];

const emit = (dom, name, data) => {
  let event = new CustomEvent(name, {
    detail: data
  });
  dom.dispatchEvent(event);
};

const speak = (msg) => {
  let utter = new SpeechSynthesisUtterance(msg);
  let voices = speechSynthesis.getVoices();
  // TODO: configurable
  utter.voice = voices.find((v) => v.lang === 'zh-TW');
  utter.pitch = 1;
  utter.rate = 0.7;
  utter.volume = 1;
  speechSynthesis.speak(utter);
};

const getDistance = (latlng) => {
  let latUnit = 110.574;
  let lngUnit = 111.320 * (Math.cos(settings.center[1]) + Math.cos(latlng[1])) / 2;
  return Math.sqrt(
    Math.pow((settings.center[0] - latlng[0]) * latUnit, 2) +
    Math.pow((settings.center[1] - latlng[1]) * lngUnit, 2)
  );
};

const getLeftTime = (ts) => {
  let diff = new Date(ts - new Date().valueOf());
  let str = '';
  if (diff.getMinutes() !== 0) {
    str += `${diff.getMinutes()}分`;
  }
  str += `${diff.getSeconds()}秒`;
  return str;
};

const getMsg = (pk) => {
  return `${pk.nameZhTw} 距離${getDistance([ pk.lat, pk.lng ]).toFixed(2)}km 剩下${getLeftTime(pk.time)}`;
};

const handleResponse = (data) => {
  console.error('res', data.pokemons);
  // TODO: configurable
  pokemons = data.pokemons.filter((pk) => pk.stars.length > 2);
  emit(document, 'changepokemon');
  pokemons.forEach((pk) => speak(getMsg(pk)));
};

const func = () => {
  let xhr = new XMLHttpRequest();
  let url = `https://poke5566.com/pokemons?lat0=${settings.bounding[1][0]}&lng0=${settings.bounding[1][1]}&lat1=${settings.bounding[0][0]}&lng1=${settings.bounding[0][1]}`;
  xhr.addEventListener('load', (event) => {
    handleResponse(JSON.parse(xhr.responseText));
    reset();
  });
  xhr.open('get', url, true);
  xhr.send();
};

const clear = () => {
  clearTimeout(timeout);
  timeout = null;
};

const reset = (ms) => {
  clear();
  if (settings.center.length === 0) {
    return;
  }
  if (!settings.pause) {
    timeout = setTimeout(func, ms || 60000);
  }
};

const set = (values) => {
  settings = values;
};

const load = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      pause: false,
      center: [],
      bounding: []
    }, resolve)
  })
  .then(set);
};

const initEvent = () => {
  chrome.storage.onChanged.addListener((changes) => {
    Object.keys(changes).forEach((key) => {
      settings[key] = changes[key].newValue;
    });
    reset(1);
  });

  reset(1);
};

document.addEventListener('DOMContentLoaded', () => {
  new Promise((resolve, reject) => {
    speechSynthesis.addEventListener('voiceschanged', resolve);
  })
  .then(load).then(initEvent);
});

})();
