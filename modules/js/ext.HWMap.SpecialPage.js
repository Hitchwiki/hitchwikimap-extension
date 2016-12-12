/*
 * Return fragment identifier of the current URL
 */
$.fn.urlHash = function() {
  // unlike window.location.hash, this one's IE-friendly
  return document.URL.substr(document.URL.indexOf('#') + 1);
};




/*
 * Setup big map at Special:HWMap
 */
var setupSpecialPageMap = function (urlParamSpot) {
  mw.log('->HWMap->setupSpecialPageMap');

  //Set map view
  hwmap.setView(defaultCenter, defaultZoom);

  var updateURL = function() {
    var center = hwmap.getCenter(), zoom = hwmap.getZoom();
    var state = {
      'lat': center.lat,
      'lng': center.lng,
      'zoom': zoom
    };
    history.pushState(state, null, pageLocationUrl + '?' + $.param( state ));
  };

  //Fire event to check when map move
  hwmap.on('moveend', function() {
    $('.tipsy').remove();
    //mw.log(spotsLayer._topClusterLevel._childcount);
    //Get spots when zoom is bigger than 6
    var zoom = hwmap.getZoom();
    if(zoom > 6 && zoom < 8) {
      getBoxSpots('Cities', zoom);
    }
    else if(zoom > 7) {
      getBoxSpots('', zoom);
    }
    //When zoom is smaller than 6 we clear the markers if not already cleared
    else if(spotsLayer._objectsOnMap.length > 0 || cityLayer._objectsOnMap.length > 0){
      //Clear the markers and last boundings
      spotsLayer.RemoveMarkers();
      cityLayer.RemoveMarkers();
      spotsLayer.ProcessView();
      cityLayer.ProcessView();
      lastBounds = {
        NElat: 0,
        NElng: 0,
        SWlat: 0,
        SWlng: 0
      };
    }

    updateURL();
  });

  hwmap.on('zoomend', function() {
    updateURL();
  });

  initSpecialPageTemplate(urlParamSpot);

  // Button for adding new spot (show only for logged in users)
  // wgUserId returns null when not logged in
  if(mw.config.get('wgUserId')) {
    $newSpotInit.show().click(function(e){
      e.preventDefault();
      e.stopPropagation();//Prevent clicks ending up to map layer
      setupNewSpot();
    });

    // Link at the sidebar, so that we wouldn't have unessessary page-refresh
    $('#n-New-spot a').click(function(e){
      e.preventDefault();
      setupNewSpot();
    });

    if ($(this).urlHash() == 'add') {
      setupNewSpot();
    }
  }

  //Getting spots in bounding box
  hwmap.fireEvent('moveend');
}

var initSpecialPageTemplate = function (urlParamSpot) {
  var spot = {};
  $.get( extensionRoot +'modules/templates/ext.HWMap.SpecialPageSpot.template.html' ).then( function ( template ) {
    ractive = new Ractive({
      el: 'hwspot',
      template: template,
      data: {userId: userId}
    });
    if(urlParamSpot) {
      openSpecialPageSpot(urlParamSpot, true);
    }
  });
};

window.closeSpecialPageSpot = function () {
  $('#hwspot').removeClass('hw-open-spot');
  $('#hwmap').removeClass('hw-open-spot-map');
  stopAnimateSpot();
};

window.openSpecialPageSpot = function (id, moveTo) {
  animateSpot(id);
  ractive.set({spot: null});
  $('#hw-special-page-spinner').show();
  $.get( mw.util.wikiScript('api') + '?action=hwspotidapi&format=json&user_id=' + userId + '&properties=Location,Country,CardinalDirection,CitiesDirection,RoadsDirection&page_id=' + id, function( data ) {
    data.query.spot.id = id;
    data.query.spot.average_label = getRatingLabel(data.query.spot.rating_average);
    if(data.query.spot.timestamp_user){
      data.query.spot.timestamp_user = parseTimestamp(data.query.spot.timestamp_user);
    }
    if(data.query.spot.rating_user){
      data.query.spot.rating_user_label = getRatingLabel(data.query.spot.rating_user);
    }
    ractive.set({spot: data.query.spot});
    if(moveTo) {
      moveToSpot('spot', id);
    }
    loadComments(id, false, 'spot', true);
    $('#hw-special-page-spinner').hide();

    $('.hw-spot-edit-button').click(function(evt) {
      evt.preventDefault();
      var $form = $('#spot-edit-form-wrap form');
      $form.find('input[name="page_name"]').val($(this).data('title'));
      $form.submit();
    });

    $('.your-rate').hide();

    $('.rating-widget .rate').click(function(evt) {
      $('.your-rate').hide();
      $('.rate').show();
      evt.preventDefault();
      $(this).hide();
      var id = $(this).attr('id').replace(/rate_/, '');

      $('#your_rate_' + id).show();
    });

    $(document).mouseup(function (e) {
      var container = $('.rating-widget .rate');

      if (!container.is(e.target) // if the target of the click isn't the container...
          && container.has(e.target).length === 0) // ... nor a descendant of the container
      {
        $('.your-rate').hide();
        $('.rate').show();
      }
    });

  });
  $('#hwspot').addClass('hw-open-spot');
  $('#hwmap').addClass('hw-open-spot-map');
};
