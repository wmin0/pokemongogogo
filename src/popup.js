(() => {

let map = null;
let centerMarker = null;
let markers = [];
let initMapPromise = new Promise((resolve, reject) => {
  window.initMap = () => {
    map = new google.maps.Map(document.querySelector('#map'), {
      clickableIcons: false
    });
    centerMarker = new google.maps.Marker({
      map: map,
      title: chrome.i18n.getMessage('center')
    });
    resolve();
  };
});

const pad = (num, width) => {
  return ('0'.repeat(width) + num.toString()).slice(-width);
};

const mask = () => {
  document.querySelector('#mask').classList.add('show');
};

const unmask = () => {
  document.querySelector('#mask').classList.remove('show');
};

const set = (values) => {
  document.querySelector('#pause').checked = values.pause;
  document.querySelector('#volume').value = values.volume;
  if (values.center.length === 0) {
    document.querySelector('#alert').innerText = chrome.i18n.getMessage('alert_not_setting');
    return;
  }
  map.setCenter({
    lat: values.center[0],
    lng: values.center[1]
  });
  // TODO: cache or calculate
  map.setZoom(15);
  centerMarker.setPosition({
    lat: values.center[0],
    lng: values.center[1]
  });
  draw();
};

const get = () => {
  return {
    pause: document.querySelector('#pause').checked,
    volume: +document.querySelector('#volume').value
  };
};

const save = () => {
  return (
    new Promise((resolve, reject) => {
      mask();
      chrome.storage.sync.set(get(), resolve);
    })
    .then(unmask)
  );
};

const load = () => {
  return (
    new Promise((resolve, reject) => {
      chrome.storage.sync.get({
        pause: false,
        volume: 1,
        center: [],
        bounding: []
      }, resolve)
    })
    .then(set)
  );
};

const draw = () => {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
  let page = chrome.extension.getBackgroundPage();
  document.querySelector('#alert').innerText = chrome.i18n.getMessage(page.statusStr);
  page.pokemons.forEach((pk) => {
    markers.push(new google.maps.Marker({
      map: map,
      title: pokedex[pad(pk.id, 3)].zh_TW,
      icon: `pokedex/${pad(pk.id, 3)}.gif`,
      optimized: false,
      position: {
        lat: pk.lat,
        lng: pk.lng
      }
    }));
  });
  console.error(markers);
};

const destroyEvent = () => {
  chrome.extension.getBackgroundPage().document.removeEventListener('changepokemon', draw);
};

const initEvent = () => {
  document.querySelector('#pause').addEventListener('click', save);
  document.querySelector('#volume').addEventListener('change', save);
  chrome.extension.getBackgroundPage().document.addEventListener('changepokemon', draw);
  window.addEventListener('unload', destroyEvent);
};

document.addEventListener('DOMContentLoaded', () => {
  initMapPromise.then(load).then(initEvent);
});

})();
