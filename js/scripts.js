(function ($, Drupal, once) {
  // Drupal.behaviors.custom_redirect = {
  //   attach: function() {
  //     // Replace he form id and the select id in selecotor below.
  //     $("form.node-icon-form").change(function(e) {
  //       e.stopPropagation();
  //       // Path where you want to redirect.
  //       // var redirect_url = '';
  //       // window.location.pathname = redirect_url;
  //     });
  //   }
  // };


  $(document).ready(function() {
    console.log("Questwalker theme ready.");
    initLeaflet();
  });


  function initLeaflet() {
    if ($('.view-locations-on-this-tour-leaflet').length > 0) {
      console.log("We are on a Tour node and can see the list of Location nodes.");

      // 1. Add the map container
      if ($('#map').length == 0) {
        $('.view-locations-on-this-tour-leaflet').append('<div id="map"><div id="map-inner"></div></div>');
      }
      else {
        console.log("Warning: There's already a #map div. Figure out why.");
      }

      // 2. Start map at location
      var leaflet_map = L.map('map-inner', {
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: 'topleft'
        }
      }).setView([51.505, -0.09], 13);

      // 3. Add tiles to the map.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(leaflet_map);

      // 4. Iterate through markers and add to map.
      var marker_locations = [];
      // var number_of_locations = $('.view-locations-on-this-tour-leaflet .views-row').length;
      $('.view-locations-on-this-tour-leaflet .views-row').each(function() {
        var location_title = $(this).find('.views-field-title').text().trim();
        // var lat_and_long = $(this).find('.views-field-field-coordinates div').text().trim().split(',');
        // marker_locations.push(lat_and_long);
        // console.log("Lat and long: " + lat_and_long[0]);
        // var marker = new L.marker([lat_and_long[0], lat_and_long[1]])
        //   .addTo(map)
        //   .bindPopup(location_title)
        //   .on('click', function(e) {
        //     console.log(e.latlng);
        //   });


        // Remember that GeoJSON does Longitude, Latitude, and Leaflet wants Latitude, Longitude!
        var coordinates_geojson = JSON.parse($(this).find('.views-field-field-coordinates-1').text().trim());
        if (coordinates_geojson.type == "Point") {
          console.log(location_title + " is a point. Adding a marker at " + coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]);
          var marker = new L.marker([coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]])
            .addTo(leaflet_map)
            .bindPopup(location_title)
            .on('click', function(e) {
              console.log(e.latlng);
            });
          marker_locations.push([coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]]);

        }
        else if (coordinates_geojson.type == "Polygon") {
          var latlng = [];
          latlng = coordinates_geojson.coordinates;

          // GeoJSON expects Longitude/Latitude, so we have to iterate through the latlng array to fix it.
          for (let i = 0; i < latlng[0].length; i++) {
            console.log("Reformatting lat/long " + latlng[0][i]);
            latlng[0][i].reverse();
            console.log("Reformatted to GeoJSON long/lat: " + latlng[0][i]);
          }

          console.log(location_title + " is a polygon. Adding a polygon: " + JSON.stringify(latlng));

          var polygon = L.polygon(latlng, { color: 'red'})
            .addTo(leaflet_map)
            .bindPopup(location_title)
            .on('click', function(e) {
              console.log(e.latlng);
            });

          // Iterate through all the coordinates of the polygon in order to get the marker bounds.
          for (let i = 0; i < latlng.length; i++) {
            marker_locations.push([latlng[i]]);
          }
          console.log(marker_locations);
        }
      });

      // 5. Reposition view over the markers. (If there are markers.);
      if (marker_locations.length > 0) {
        leaflet_map.fitBounds(marker_locations);

        // 5a. Add the "zoom to markerclusters" easybutton
        L.easyButton('fa-refresh', function(btn, map){
          leaflet_map.fitBounds(marker_locations);
        }).addTo(leaflet_map);
      }

      // 6. Add the "Zoom to current location" button.
      L.control.locate().addTo(leaflet_map);

      // 7. Add the "fill viewport" button
      L.easyButton('fa-window-maximize', function(btn, map){
        $('body').toggleClass('leaflet-full-viewport');
      }).addTo(leaflet_map);


      // 9. Resize the map when its container resizes.
      const resizeObserver = new ResizeObserver(() => {
        leaflet_map.invalidateSize();
      });
      resizeObserver.observe(map);


      // Add MarkerCluster
      // var markercluster = L.markerClusterGroup();
      // markercluster.addLayer(marker_locations);
      // leaflet_map.addLayer(markercluster);
    }


    // TODO: insert other cases where we would want to initialize Leaflet
  }

  // set the view back to normal (exit AR mode, etc.)
  function resetView() {
    console.log("View resetting.");
    // 1. Close fullscreen map
    // (It just does this, we don't have to do anything.)

    // 2. Close full-size viewport map
    $('body').removeClass('leaflet-full-viewport');

    // 3. turn off AR mode
    // TODO: do this.
  }

  // run anywhere
  $(document).keyup(function(e) {
    if(e.key === "Escape") {
      console.log("Pressed escape.")
      resetView();
    }
  });


})(jQuery, Drupal, once);
