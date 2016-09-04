(() => {

let map = null;
let centerMarker = null;
let markers = [];
let overlays = [];

const pad = (num, width) => {
  return ('0'.repeat(width) + num.toString()).slice(-width);
};

const getLeftTime = (ts) => {
  let diff = ts - new Date().valueOf();
  diff = new Date(diff < 0? 0: diff);
  return `${pad(diff.getMinutes(), 2)}:${pad(diff.getSeconds(), 2)}`;
};

const define = () => {
  class TimeOverlay extends google.maps.OverlayView {
    constructor(options) {
      super();
      this._position = options.position;
      this._time = options.time;
      this._div = null;
      this._timeout = null;
      this.setMap(options.map);
    }
    update() {
      this._div.innerText = getLeftTime(this._time);
      this._timeout = setTimeout(() => this.update(), 1000);
    }
    onAdd() {
      this._div = document.createElement('div');
      this._div.classList.add('time-overlay');
      this.getPanes().overlayLayer.appendChild(this._div);
      this.update();
    }
    draw() {
      let overlayProjection = this.getProjection();
      let position = overlayProjection.fromLatLngToDivPixel(this._position);
      this._div.style.left = `${position.x}px`;
      this._div.style.top = `${position.y}px`;
    }
    onRemove() {
      this._div.parentNode.removeChild(this._div);
      this._div = null;
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  };
  window.TimeOverlay = TimeOverlay;
};

let initMapPromise = new Promise((resolve, reject) => {
  window.initMap = () => {
    map = new google.maps.Map(document.querySelector('#map'), {
      clickableIcons: false
    });
    centerMarker = new google.maps.Marker({
      map: map,
      title: chrome.i18n.getMessage('center')
    });
    define();
    resolve();
  };
});

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
  overlays.forEach((overlay) => overlay.setMap(null));
  overlays = [];
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
    overlays.push(new TimeOverlay({
      map: map,
      time: pk.time,
      position: new google.maps.LatLng(pk.lat, pk.lng)
    }));
  });
  //console.error(markers, overlays);
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
