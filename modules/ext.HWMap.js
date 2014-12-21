/*
* Hitchwiki Maps
*/

// Defaults
var defaultCenter = [48.6908333333, 9.14055555556], // Europe
defaultZoom = 5;

// Mapbox settings
var mapboxUser = "trustroots",
mapboxStyle = "ce8bb774",
mapboxAccessToken = "pk.eyJ1IjoidHJ1c3Ryb290cyIsImEiOiJVWFFGa19BIn0.4e59q4-7e8yvgvcd1jzF4g";

// Setup variables
var hwmap,
spotsLayer,
newSpotMarker,
newSpotLayer,
icons = {},
lastZoom = 0,
lastBounds = { NElat:'0', NElng:'0', SWlat:'0', SWlng:'0' },
apiRoot = mw.config.get("wgServer") + mw.config.get("wgScriptPath"),
extensionRoot = mw.config.get("wgExtensionAssetsPath") + "/HWMap/";

/*
* Initialize map
*/
function initHWMap() {
  mw.log('->HWMap->initHWMap');

  // Give up if no element on the page
  if(!document.getElementById("hwmap") || ($.inArray(mw.config.get("wgAction"), ["view", "purge", "submit"]) == -1) ) return;

  L.Icon.Default.imagePath = extensionRoot + 'modules/vendor/leaflet/dist/images';

  // Icons
  icons.country = L.icon({
    iconUrl:  extensionRoot + 'icons/city.png',
    iconRetinaUrl: extensionRoot + 'icons/city@2x.png'
  });
  icons.city = L.icon({
    iconUrl:  extensionRoot + 'icons/city.png',
    iconRetinaUrl: extensionRoot + 'icons/city@2x.png'
  });
  icons.unknown = L.icon({
    iconUrl:  extensionRoot + 'icons/0-unknown.png',
    iconRetinaUrl: extensionRoot + 'icons/0-unknown@2x.png'
  });
  icons.verygood = L.icon({
    iconUrl:  extensionRoot + 'icons/1-very-good.png',
    iconRetinaUrl: extensionRoot + 'icons/1-very-good@2x.png'
  });
  icons.good = L.icon({
    iconUrl:  extensionRoot + 'icons/2-good.png',
    iconRetinaUrl: extensionRoot + 'icons/2-good@2x.png'
  });
  icons.average = L.icon({
    iconUrl:  extensionRoot + 'icons/3-average.png',
    iconRetinaUrl: extensionRoot + 'icons/3-average@2x.png'
  });
  icons.bad = L.icon({
    iconUrl:  extensionRoot + 'icons/4-bad.png',
    iconRetinaUrl: extensionRoot + 'icons/4-bad@2x.png'
  });
  icons.senseless = L.icon({
    iconUrl:  extensionRoot + 'icons/5-senseless.png',
    iconRetinaUrl: extensionRoot + 'icons/5-senseless@2x.png'
  });
  icons.new = L.icon({
    iconUrl:  extensionRoot + 'icons/new.png',
    iconRetinaUrl: extensionRoot + 'icons/new@2x.png',
    shadowUrl: extensionRoot + 'icons/new-shadow.png',
    iconSize:     [25, 35], // size of the icon
    shadowSize:   [33, 33], // size of the shadow
    iconAnchor:   [12, 35], // point of the icon which will correspond to marker's location
    shadowAnchor: [5, 34],  // the same for the shadow
    popupAnchor:  [-3, -17] // point from which the popup should open relative to the iconAnchor
  });

  //Setting up the map
  hwmap = L.map('hwmap', {
    center: defaultCenter,
    zoom: defaultZoom
  });

  // Using a map tiles developed for Trustroots/Hitchwiki
  // https://github.com/Trustroots/Trustroots-map-styles/tree/master/Trustroots-Hitchmap.tm2
  // If we ever start using https, add this to the tiles url: &secure=1
  L.tileLayer('//{s}.tiles.mapbox.com/v4/'+mapboxUser+'.'+mapboxStyle+'/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
    attribution: '<a href="http://www.openstreetmap.org/" target="_blank">OSM</a>',
    maxZoom: 18,
    continuousWorld: true
  }).addTo(hwmap);

  // New spot marker
  newSpotMarker = L.marker(defaultCenter, {icon: icons.new}).bindPopup('Drag me!');

  // Layers
  newSpotLayer = new L.layerGroup([newSpotMarker]).addTo(hwmap);
  spotsLayer = new L.MarkerClusterGroup().addTo(hwmap);

  //Check if map is called from the special page
  if (mw.config.get("wgCanonicalSpecialPageName") == "HWMap") {
    setupSpecialPageMap();
  }
  //Check if map is called from a city page
  else if($.inArray("Cities", mw.config.get('wgCategories')) != -1) {
    setupCityMap();
  }
  //Check if map is called from a country page
  else if($.inArray("Countries", mw.config.get('wgCategories')) != -1) {
    setupCountryMap();
  }
}

/*
* Setup big map at Special:HWMap
*/
function setupSpecialPageMap() {
  mw.log('->HWMap->setupSpecialPageMap');
  //Set map view
  hwmap.setView([45, 10], 6);

  //Getting spots in bounding box
  getBoxSpots();

  //Fire event to check when map move
  hwmap.on('moveend', function() {
    mw.log(spotsLayer);
    mw.log(spotsLayer._topClusterLevel._childcount);
    //Get spots when zoom is bigger than 6
    if(hwmap.getZoom() > 5) {
      getBoxSpots();
    }
    //When zoom is smaller than 6 we clear the markers if not already cleared
    else if(spotsLayer._topClusterLevel._childCount > 0){
      //Clear the markers and last boundings
      spotsLayer.clearLayers();
      lastBounds = {
        NElat:'0',
        NElng:'0',
        SWlat:'0',
        SWlng:'0'
      };
    }
  });
}

/*
* Setup big map at city article
*/
function setupCityMap() {
  mw.log('->HWMap->setupCityMap');

  //Getting the current coordinate
  $.get( apiRoot + "/api.php?action=query&prop=coordinates&titles=" + mw.config.get("wgTitle") + "&format=json", function( data ) {
    for (var i in data.query.pages) {
      page = data.query.pages[i];
      break;
    }
    //Add city marker
    var marker = L.marker([page.coordinates[0].lat, page.coordinates[0].lon], {icon: icons.city});
    spotsLayer.addLayer(marker);
    //Set Map View
    hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 12);
  });


  //Getting related spots
  $.get( apiRoot + "/api.php?action=ask&query=[[Category:Spots]][[Cities::" + mw.config.get("wgTitle") + "]]|%3FLocation&format=json", function( data ) {
    //Add Markers to the map
    for (var i in data.query.results) {
      var marker = buildSpotMarker(spots[i].averageRating, spots[i].location);
      spotsLayer.addLayer(marker);
    }
  });
}

/*
* Setup big map at city article
*/
function setupCountryMap() {
  // @todo
}

/*
*
* return L.marker
*/
var buildSpotMarker = function (averageRating, latLon) {
  if(averageRating == 5) {
    return L.marker(latLon, {icon: icons.verygood});
  }
  else if(averageRating == 4) {
    return L.marker(latLon, {icon: icons.good});
  }
  else if(averageRating == 3) {
    return L.marker(latLon, {icon: icons.average});
  }
  else if(averageRating == 2) {
    return L.marker(latLon, {icon: icons.bad});
  }
  else if(averageRating == 1) {
    return L.marker(latLon, {icon: icons.senseless});
  }
  else if(averageRating == null) {
    return L.marker(latLon, {icon: icons.unknown});
  }
};


// Get markers in the current bbox
var getBoxSpots = function () {
  mw.log('->HWMap->getBoxSpots');
  bounds = hwmap.getBounds();
  if(bounds._northEast.lat > lastBounds.NElat || bounds._northEast.lng > lastBounds.NElng || bounds._southWest.lat < lastBounds.SWlat || bounds._southWest.lng < lastBounds.SWlng) {

    //Make the bounds a bit bigger
    lastBounds.NElat = parseInt(bounds._northEast.lat) + 1;
    lastBounds.NElng = parseInt(bounds._northEast.lng) + 1;
    lastBounds.SWlat = parseInt(bounds._southWest.lat) - 1;
    lastBounds.SWlng = parseInt(bounds._southWest.lng) - 1;

    // Query HWCoordinateAPI
    $.get( apiRoot + "/api.php?action=hwcoordapi&SWlat=" + lastBounds.SWlat + "&SWlon=" + lastBounds.SWlng + "&NElat=" + lastBounds.NElat + "&NElon=" + lastBounds.NElng + "&format=json", function( data ) {

      if(data.error) {
        mw.log.warn(data.error);
      }
      else {
        //Clear the current markers
        spotsLayer.clearLayers();

        //Add the new markers
        var spots = data.query.spots;
        for (var i in spots) {
          if(spots[i].category == 'Spots') {
            return L.marker([spots[i].location[0],spots[i].location[1]], {icon: icons.verygood});
            spotsLayer.addLayer(marker);
          }
          else if(spots[i].category == 'Cities') {
            return L.marker([spots[i].location[0],spots[i].location[1]], {icon: icons.city});
            spotsLayer.addLayer(marker);
          }
        }
      }

    });
  }
}

jQuery( function( $ ) {

  // Let's roll!
  initHWMap();

});//jQuery
