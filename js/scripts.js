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
    // initLeaflet();
    getTourJSON();
  });


  // For tours
  function getTourJSON() {
    var uuid_of_this_node = $('.page-node-type-tour article').data('uuid');
    if (uuid_of_this_node !== undefined) {
      // console.log(uuid_of_this_node);
      var json_to_import = '/jsonapi/node/tour/' + uuid_of_this_node + '?include=field_locations';
      var json_response = $.getJSON(json_to_import, function() {
      }).done(function() {
        console.log(json_response.responseJSON);
        initLeaflet(json_response.responseJSON);
      });
    }
    else {
      // there isn't a UUID assigned here.
    }
  }


  function initLeaflet(json_locations) {
    if ($('.page-node-type-tour .views-field-uuid').length > 0) {
      console.log("We are on a Tour node and can see the URL of the tour's JSON file.");

      // 1. Add the map container
      if ($('#map').length == 0) {
        $('main').after('<div id="map"><div id="map-inner"></div></div>');
        
                // 3. Add tiles to the map.
        var tilelayer_osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        });//.addTo(leaflet_map);

        // var tilelayer_Stadia_OSMBright = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', {
        //   maxZoom: 20,
        //   attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        // }).addTo(leaflet_map);

        var tilelayer_stamen_toner = new L.StamenTileLayer("toner");
        // leaflet_map.addLayer(stamen_toner);

        // 2. Start map at location
        var leaflet_map = L.map('map-inner', {
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: 'topleft'
          },
          layers: [tilelayer_osm, tilelayer_stamen_toner]
        }).setView([51.505, -0.09], 13);

        var baseMaps = {
          "OpenStreetMap": tilelayer_osm,
          "Stamen Toner": tilelayer_stamen_toner,
          // "Stadia OSM Bright": tilelayer_Stadia_OSMBright
        };
        
        var overlayMaps = {
        };
        
        var layerControl = L.control.layers(baseMaps).addTo(leaflet_map);

        // NEW
        // console.log(json_locations);
        var marker_locations = [];
        json_locations.included.forEach(drawLocationFromJSON);

        function drawLocationFromJSON(location) {
          var location_title = location.attributes.title;
    
          // Coordinates:
          // location.field_coordinates
          // todo: iterate through this part.
          var location_type = location.attributes.field_coordinates.geo_type;
          console.log("this is a " + location_type);

          // Content 
          var location_body = location.attributes.body;
          // Todo: add other field types here.

          if (location_type == "Point") {
            // console.log(location_title + " is a point. Adding a marker at " + coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]);
            var location_lat = location.attributes.field_coordinates.lat;
            var location_long = location.attributes.field_coordinates.lon;
            console.log("Adding point marker at " + location_lat + ", " + location_long);

            var marker = new L.marker([location_lat, location_long])
              .addTo(leaflet_map)
              .bindPopup(location_title)
              .on('click', function(e) {
                console.log(e.latlng);
              });
            marker_locations.push([location_lat, location_long]);
          }

          else if (location_type == "Polygon") {
            var polygon_data = location.attributes.field_coordinates.value;

            // A. Make the array of polygon vertices:
            // This turns...
            // POLYGON ((0.101935 0.263673, 0.091722 0.262777, 0.096271 0.256615, 0.105884 0.259136, 0.101935 0.263673))
            // into...
            // [0.101935 0.263673],[0.091722 0.262777],[0.096271 0.256615],[0.105884 0.259136],[0.101935 0.263673]
            polygon_data = polygon_data.replaceAll('POLYGON ((','');
            polygon_data = polygon_data.replaceAll('))','');
            polygon_data = polygon_data.replaceAll(', ','|||'); 
            polygon_data = polygon_data.replaceAll(' ','|');  //todo: should this be |||| ? 
            // console.log(polygon_data);

            var polygon_data_array =  polygon_data.split('|||');
            // // GeoJSON expects Longitude/Latitude, so we have to iterate through the latlng array to fix it.
            for (let i = 0; i < polygon_data_array.length; i++) {
              // console.log("Reformatting lat/long " + latlng[0][i]);
              // console.log("Reformatted to GeoJSON long/lat: " + latlng[0][i]);
              polygon_data_array[i] = polygon_data_array[i].split('|').reverse();
            }

            
            // B. Actually add it to the map.
            var polygon = L.polygon(polygon_data_array, { color: 'red'})
              .addTo(leaflet_map)
              .bindPopup(location_title)
              .on('click', function(e) {
                console.log(e.polygon_data_array);
              });

            // 3. Iterate through all the coordinates of the polygon in order to get the marker bounds.
            for (let i = 0; i < polygon_data_array.length; i++) {
              marker_locations.push([polygon_data_array[i]]);
            }
            console.log(marker_locations);
          }

          else if (location_type == "LineString") {
          
          }

          else if (location_type == "MultiPoint") {
            var multipoint_data = location.attributes.field_coordinates.value;
            console.log(multipoint_data);

            // A. Make the array of polygon vertices:
            // This turns...
            // POLYGON ((0.101935 0.263673, 0.091722 0.262777, 0.096271 0.256615, 0.105884 0.259136, 0.101935 0.263673))
            // into...
            // [0.101935 0.263673],[0.091722 0.262777],[0.096271 0.256615],[0.105884 0.259136],[0.101935 0.263673]
            multipoint_data = multipoint_data.replaceAll('MULTIPOINT ((','');
            multipoint_data = multipoint_data.replaceAll('))','');
            multipoint_data = multipoint_data.replaceAll('), (','|||'); 
            multipoint_data = multipoint_data.replaceAll(' ','|'); 
            console.log(multipoint_data);

            var multipoint_data_array =  multipoint_data.split('|||');
            console.log(multipoint_data_array);
            // // GeoJSON expects Longitude/Latitude, so we have to iterate through the latlng array to fix it.
            for (let i = 0; i < multipoint_data_array.length; i++) {
              console.log(multipoint_data_array[i]);
              // console.log("Reformatting lat/long " + latlng[0][i]);
              // console.log("Reformatted to GeoJSON long/lat: " + latlng[0][i]);
              
              // multipoint_data_array[i] = .reverse();
              var this_point_only = multipoint_data_array[i].split('|');
              var location_lat = this_point_only[1];
              var location_long = this_point_only[0];
              console.log(location_lat);
              var marker = new L.marker([location_lat, location_long])
               .addTo(leaflet_map)
                .bindPopup(location_title)
                .on('click', function(e) {
                  // console.log(e.latlng);
                });
              marker_locations.push([location_lat, location_long]);
            }

            
            // B. Actually add it to the map.
            // var multipoint = L.marker(multipoint_data_array, { color: 'red'})
            //   .addTo(leaflet_map)
            //   .bindPopup(location_title)
            //   .on('click', function(e) {
            //     console.log(e.multipoint_data_array);
            //   });

            // // 3. Iterate through all the coordinates of the polygon in order to get the marker bounds.
            // for (let i = 0; i < multipoint_data_array.length; i++) {
            //   marker_locations.push([multipoint_data_array[i]]);
            // }
            // console.log(marker_locations);
          }

          else if (location_type == "MultiLineString") {
          
          }

          else if (location_type == "MultiPolygon") {
          
          }

          else if (location_type == "GeometryCollection") {
          
          }

          else {
            console.warn("Invalid location type '" + location_type + "' specified. See here for more: " + json_to_import);
          }
        }
        // END NEW



        // 4. Iterate through markers and add to map.
        // var number_of_locations = $('.view-locations-on-this-tour-leaflet .views-row').length;
        // $('.view-locations-on-this-tour-leaflet .views-row').each(function() {
        //   var location_title = $(this).find('.views-field-title').text().trim();

        //   // Remember that GeoJSON does Longitude, Latitude, and Leaflet wants Latitude, Longitude!
        //   var coordinates_geojson = JSON.parse($(this).find('.views-field-field-coordinates-1').text().trim());
        //   if (coordinates_geojson.type == "Point") {
        //     // console.log(location_title + " is a point. Adding a marker at " + coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]);
        //     // var marker = new L.marker([coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]])
        //     //   .addTo(leaflet_map)
        //     //   .bindPopup(location_title)
        //     //   .on('click', function(e) {
        //     //     console.log(e.latlng);
        //     //   });
        //     // marker_locations.push([coordinates_geojson.coordinates[1], coordinates_geojson.coordinates[0]]);

        //   }
        //   else if (coordinates_geojson.type == "Polygon") {
        //     // var latlng = [];
        //     // latlng = coordinates_geojson.coordinates;

        //     // // GeoJSON expects Longitude/Latitude, so we have to iterate through the latlng array to fix it.
        //     // for (let i = 0; i < latlng[0].length; i++) {
        //     //   console.log("Reformatting lat/long " + latlng[0][i]);
        //     //   latlng[0][i].reverse();
        //     //   console.log("Reformatted to GeoJSON long/lat: " + latlng[0][i]);
        //     // }

        //     // console.log(location_title + " is a polygon. Adding a polygon: " + JSON.stringify(latlng));

        //     // var polygon = L.polygon(latlng, { color: 'red'})
        //     //   .addTo(leaflet_map)
        //     //   .bindPopup(location_title)
        //     //   .on('click', function(e) {
        //     //     console.log(e.latlng);
        //     //   });

        //     // // Iterate through all the coordinates of the polygon in order to get the marker bounds.
        //     // for (let i = 0; i < latlng.length; i++) {
        //     //   marker_locations.push([latlng[i]]);
        //     // }
        //     // console.log(marker_locations);
        //   }
        // });

        // 5. Reposition view over the markers. (If there are markers.);
        if (marker_locations.length > 0) {
          leaflet_map.fitBounds(marker_locations);

          // 5a. Add the "zoom to markerclusters" easybutton
          L.easyButton('fa-refresh', function(btn, map){
            leaflet_map.fitBounds(marker_locations);
          }).addTo(leaflet_map);
        }

        // 6. Add the "Zoom to current location" button.
        // L.control.locate().addTo(leaflet_map);

        // 7. Add the "fill viewport" button
        L.easyButton('fa-window-maximize', function(btn, map){
          $('body').toggleClass('leaflet-full-viewport');
        }).addTo(leaflet_map);

        // 8. Add the compass.
        // L.control.compass().addTo(leaflet_map);
        // todo: make it rotate the map based on this.
        // (Yes, that is super, super complicated.)


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
      else {
        console.log("Warning: There's already a #map div. Figure out why.");
      }
    // TODO: insert other cases where we would want to initialize Leaflet
    }
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
