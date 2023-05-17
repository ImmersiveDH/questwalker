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
        $('.view-locations-on-this-tour-leaflet').append('<div id="map"></div>');
      }
      else {
        console.log("Warning: There's already a #map div. Figure out why.");
      }

      // 2. Start map at location
      var map = L.map('map', {
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: 'topleft'
        }
      }).setView([51.505, -0.09], 13);

      // 3. Add tiles to the map.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

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
            .addTo(map)
            .bindPopup(location_title)
            .on('click', function(e) {
              console.log(e.latlng);
            });
          marker_locations.push([coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]]);

        }
        else if (coordinates_geojson.type == "Polygon") {
          console.log(location_title + " is a polygon. Adding a polygon.");
        }
      });

      // 5. Reposition view over the markers.
      map.fitBounds(marker_locations);


      // 6. Add the "Zoom to current location" button.
      L.control.locate().addTo(map);

      // 7. Add the "Reset view" button
      var customControl = L.Control.extend({ options: {position: 'topleft'},onAdd: function (map) {
      var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

      onAdd: function (map) {
          var container = L.DomUtil.create('input','my-button btn');
          container.type="button";
          container.title="x";
          container.value = "x";
          container.label = "x";

          container.style.backgroundColor = 'white';

          container.style.backgroundSize = "30px 30px";
          container.style.width = '40px';
          container.style.height = '40px';
          container.style.borderRadius = "25px";
          container.style.padding = "0";
          container.style.margin = "10px";

      container.onclick = function(){
        console.log('buttonClicked');
      }

      return container;}});

      // Add MarkerCluster
      // var markercluster = L.markerClusterGroup();
      // markercluster.addLayer(marker_locations);
      // map.addLayer(markercluster);
    }


    // TODO: insert other cases where we would want to initialize Leaflet
  }

})(jQuery, Drupal, once);
