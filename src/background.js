(() => {

let timeout = null;
let settings = null;
window.pokemons = [];
window.statusStr = '';

const emit = (dom, name, data) => {
  let event = new CustomEvent(name, {
    detail: data
  });
  dom.dispatchEvent(event);
};

const pad = (num, width) => {
  return ('0'.repeat(width) + num.toString()).slice(-width);
};

const speak = (msg) => {
  let utter = new SpeechSynthesisUtterance(msg);
  let voices = speechSynthesis.getVoices();
  // TODO: configurable
  utter.voice = voices.find((v) => v.lang === 'zh-TW');
  utter.pitch = 1;
  utter.rate = 0.7;
  utter.volume = settings.volume;
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
  return `${pokedex[pad(pk.i, 3)].zh_TW} 距離${getDistance([ pk.a, pk.n ]).toFixed(2)}km 剩下${getLeftTime(pk.t)}`;
};

const handleResponse = (data) => {
  console.error('res', data.pokemons);
  speechSynthesis.cancel();
  statusStr = data.pokemons.length === 0? 'alert_no_response': '';
  // TODO: configurable
  // v-> iv, m->pokemonMoves "v":[1,3,4],"m":[235,62]
  pokemons = data.pokemons.filter((pk) => pokedex[pad(pk.i, 3)].rare > 3);
  emit(document, 'changepokemon');
  pokemons.forEach((pk) => speak(getMsg(pk)));
};

const func = () => {
  let xhr = new XMLHttpRequest();
  let url = `https://poke5566.com/pokemons?lat0=${settings.bounding[1][0]}&lng0=${settings.bounding[1][1]}&lat1=${settings.bounding[0][0]}&lng1=${settings.bounding[0][1]}`;
  xhr.addEventListener('load', (event) => {
    if (xhr.status !== 200) {
      handleResponse({ pokemons: [] });
    } else {
      handleResponse(JSON.parse(xhr.responseText));
    }
    reset();
  });
  xhr.open('get', url, true);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
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
  if (settings.pause) {
    return;
  }
  timeout = setTimeout(func, ms || 60000);
};

const set = (values) => {
  settings = values;
};

const load = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      pause: false,
      volume: 1,
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
  Promise.all([
    new Promise((resolve, reject) => {
      speechSynthesis.addEventListener('voiceschanged', resolve);
    }),
    new Promise((resolve, reject) => {
      chrome.cookies.set({
        url: 'https://poke5566.com',
        name: '_ga',
        value: '1',
      }, resolve);
    }),
    new Promise((resolve, reject) => {
      chrome.cookies.set({
        url: 'https://poke5566.com',
        name: 'ss',
        value: 'poke5566',
      }, resolve);
    }),
    new Promise((resolve, reject) => {
      chrome.cookies.set({
        url: 'https://poke5566.com',
        name: 'star',
        value: '3',
      }, resolve);
    }),
    new Promise((resolve, reject) => {
      chrome.cookies.set({
        url: 'https://poke5566.com',
        name: 'iv',
        value: '82',
      }, resolve);
    })
  ])
  .then(load).then(initEvent);
});

})();
