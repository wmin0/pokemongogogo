(() => {

let map = null;
let centerMarker = null;
let boundingBox = null;

let initMapPromise = new Promise((resolve, reject) => {
  window.initMap = () => {
    map = new google.maps.Map(document.querySelector('#map'), {
      clickableIcons: false
    });
    centerMarker = new google.maps.Marker({
      map: map,
      title: chrome.i18n.getMessage('center')
    });
    boundingBox = new google.maps.Rectangle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      clickable: false,
      map: map,
    });
    resolve();
  };
});

const latlngAdd = (latlng, kms) => {
  let latUnit = 110.574;
  let lngUnit = 111.320 * (Math.cos(latlng[0]) + Math.cos(latlng[1])) / 2;
  return [
    latlng[0] + kms[0] / latUnit,
    latlng[1] + kms[1] / lngUnit
  ];
}

const mask = () => {
  document.querySelector('#mask').classList.add('show');
};

const unmask = () => {
  document.querySelector('#mask').classList.remove('show');
};

const set = (values) => {
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
  boundingBox.setBounds({
    west: values.bounding[0][1],
    north: values.bounding[0][0],
    east: values.bounding[1][1],
    south: values.bounding[1][0]
  });
};

const get = () => {
  let center = centerMarker.getPosition();
  let bounding = boundingBox.getBounds();
  let p1 = bounding.getSouthWest();
  let p2 = bounding.getNorthEast();
  return {
    center: [ center.lat(), center.lng() ],
    bounding: [
      [ p1.lat(), p1.lng() ],
      [ p2.lat(), p2.lng() ]
    ]
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
    Promise.all([
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve);
      }),
      new Promise((resolve, reject) => {
        chrome.storage.sync.get({
          center: [],
          bounding: [],
        }, resolve)
      })
    ])
    .then((result) => {
      let geo = result[0];
      let values = result[1];
      if (values.center.length === 0) {
        values.center = [ geo.coords.latitude, geo.coords.longitude ]
      }
      if (values.bounding.length === 0) {
        values.bounding = [
          latlngAdd(values.center, [ 0.1, -0.1 ]),
          latlngAdd(values.center, [ -0.1, 0.1 ])
        ];
      }
      return set(values);
    })
  );
};

let zoneP1 = null;

const onZoneMouseDown = (event) => {
  zoneP1 = event.latLng;
};

const onZoneMouseMove = (event) => {
  if (!zoneP1) {
    return;
  }
  let bounds = {};
  if (event.latLng.lat() > zoneP1.lat()) {
    bounds.north = event.latLng.lat();
    bounds.south = zoneP1.lat();
  } else {
    bounds.south = event.latLng.lat();
    bounds.north = zoneP1.lat();
  }

  if (event.latLng.lng() > zoneP1.lng()) {
    bounds.east = event.latLng.lng();
    bounds.west = zoneP1.lng();
  } else {
    bounds.west = event.latLng.lng();
    bounds.east = zoneP1.lng();
  }

  boundingBox.setBounds(bounds);
};

const onBodyMouseUp = (event) => {
  zoneP1 = null;
};

const onCenterClick = (event) => {
  centerMarker.setPosition(event.latLng);
};

const onEditChange = (event) => {
  [ onZoneMouseDown, onZoneMouseMove, onCenterClick ].forEach((handler) => {
    google.maps.event.removeListener(handler.instance);
    handler.instance = null;
  });
  document.removeEventListener('mouseup', onBodyMouseUp);
  switch (event.target.value) {
    case 'none':
      map.setOptions({ draggable: true, zoomControl: true, scrollwheel: true, disableDoubleClickZoom: false });
      break;
    case 'zone':
      map.setOptions({ draggable: false, zoomControl: false, scrollwheel: false, disableDoubleClickZoom: true });
      onZoneMouseDown.instance = google.maps.event.addListener(map, 'mousedown', onZoneMouseDown);
      onZoneMouseMove.instance = google.maps.event.addListener(map, 'mousemove', onZoneMouseMove);
      document.addEventListener('mouseup', onBodyMouseUp);
      break;
    case 'center':
      map.setOptions({ draggable: true, zoomControl: true, scrollwheel: true, disableDoubleClickZoom: false });
      onCenterClick.instance = google.maps.event.addListener(map, 'click', onCenterClick);
      break;
  }
};

const initEvent = () => {
  document.querySelector('#edit').addEventListener('change', onEditChange);
  document.querySelector('#confirm').addEventListener('click', save);
};

document.addEventListener('DOMContentLoaded', () => {
  initMapPromise.then(load).then(initEvent);
});

})();
