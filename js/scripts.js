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

    stylePage($('.field--name-field-css .field__item').text());
    addQRcode();
    startTourNodes();
    startTourEditor();


    // delete this
    var distance_between_london_and_paris = distance(51.5112139, -0.119824, 48.8567, 2.3508, 'K');
    //round to 3 decimal places
    console.log('London and Paris are ' + roundDistanceToKilometres(distance_between_london_and_paris) + ' kilometres and ' + roundDistanceToMetres(distance_between_london_and_paris) + ' metres apart.');
    // console.log(Math.round(distance_between_london_and_paris*1000)/1000);  //displays 343.548
    //end delete this

  });

  // add the CSS.
  function stylePage(css_code) {
    if (css_code != undefined) {
      $('head').append('<style>' + css_code + '</style>');
    }
    else {
      console.log("Warning: I tried to add CSS code, but didn't get any.");
    }
  }

  // Run on the "view" version of tour nodes.
  function startTourNodes() {
    getTourJSON();
  }

  // Run on the "edit" version of tour nodes.
  function startTourEditor() {
    startTourNodeEditInlineForm();
    updateInlineLocationField();
  }


  function updateInlineLocationField() {
    // 1. Make sure the container is cleaned out.
    $('#locations-editor ul').empty();
    
    // 2. Add the new locations.
    $('form .field--name-field-locations .form-text').each(function() {
      // var someText="Get the contents of the last brackets from: This is a (test) node (11)";
      // console.log(someText.match(/\(([^)]*)\)[^(]*$/)[1]);
      var node_id = $(this).val();
      if (node_id != "") {
        node_id = node_id.match(/\(([^)]*)\)[^(]*$/)[1];
        // Returns the JSON for a location node at /node/12 with:
        // https://questwalker.wintersandassociates.com/jsonapi/node/location/?filter[nid]=12
        var json_to_import = '/jsonapi/node/location/?filter[nid]=' + node_id;
        var json_response = $.getJSON(json_to_import, function() {
        }).done(function() {
          console.log(json_response.responseJSON);

          // We assume startTourNodeEditInlineForm() has run, which means #locations-editor exists.
          $('#locations-editor ul').append('<li>' + json_response.responseJSON.data[0].attributes.title + '</li>');
        });
      }
    });
  }

  function startTourNodeEditInlineForm() {
    if ($('#node-tour-edit-form .field--name-field-locations').length > 0) {

      // 1. Add the container for the inline editor.
      $('#node-tour-edit-form .field--name-field-locations').after('<div id="locations-editor"><h4 class="label">Locations editor</h4><ul></ul></div>')

      // 2. Monitor "Locations on this tour" ordering on Tour nodes
      const locations_on_this_tour_form_field = document.querySelector("#node-tour-edit-form .field--name-field-locations table");
      const locations_on_this_tour_observer = new MutationObserver(() => {
        console.log("The 'Locations on this Tour' field changed.");
        updateInlineLocationField();
      });
      locations_on_this_tour_observer.observe(locations_on_this_tour_form_field, {subtree: true, childList: true, characterData: true});
    }
  }

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
        });

        var tilelayer_Stadia_OSMBright = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        });

        var tilelayer_stamen_toner = new L.StamenTileLayer("toner");
        // leaflet_map.addLayer(stamen_toner);

        // 2. Start map at location
        var leaflet_map = L.map('map-inner', {
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: 'topleft'
          },
          layers: [tilelayer_osm] // this only needs to be the default. (Can we get it from the node as a preset?)
        }).setView([51.505, -0.09], 13);

        var baseMaps = {
          "OpenStreetMap": tilelayer_osm,
          "Stamen Toner": tilelayer_stamen_toner,
          "Stadia OSM Bright": tilelayer_Stadia_OSMBright
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
          var location_nid = location.attributes.drupal_internal__nid;

          // Coordinates:
          // location.field_coordinates
          // todo: iterate through this part.
          var location_type = location.attributes.field_coordinates.geo_type;
          console.log("this is a " + location_type);

          // Content 
          var location_body = location.attributes.body;
          // Todo: add other field types here.

          if (location_type == "Point") {
            var location_lat = location.attributes.field_coordinates.lat;
            var location_long = location.attributes.field_coordinates.lon;
            console.log("Adding point marker at " + location_lat + ", " + location_long);

            var marker = new L.marker([location_lat, location_long], {name: location_title, nid: location_nid})
              .addTo(leaflet_map)
              .bindPopup(location_title)
              .on('click', function(e) {
                handleClicksOnMarkers(e);
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
            var polygon_data_array =  polygon_data.split('|||');
            
            // // GeoJSON expects Longitude/Latitude, so we have to iterate through the latlng array to fix it.
            for (let i = 0; i < polygon_data_array.length; i++) {
              // console.log("Reformatting lat/long " + latlng[0][i]);
              // console.log("Reformatted to GeoJSON long/lat: " + latlng[0][i]);
              polygon_data_array[i] = polygon_data_array[i].split('|').reverse();
            }

            
            // B. Actually add it to the map.
            var polygon = L.polygon(polygon_data_array, {color: 'red', name: location_title, nid: location_nid})
              .addTo(leaflet_map)
              .bindPopup(location_title)
              .on('click', function(e) {
                handleClicksOnMarkers(e);
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
              var marker = new L.marker([location_lat, location_long], {name: location_title, nid: location_nid})
               .addTo(leaflet_map)
                .bindPopup(location_title)
                .on('click', function(e) {
                  handleClicksOnMarkers(e);
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


        // When an object on the map is clicked, this fires.
        function handleClicksOnMarkers(e) {
          // console.log(e);
          var nid = e.target.options.nid;

          if ($('.view-locations-on-this-tour .node-' + nid).hasClass('active')) {
            console.log("Closing location " + nid);
            $('.view-locations-on-this-tour .views-row').removeClass('active'); // todo: do we also want "selected"?
          }
          else {
            console.log("Opening details for this location: " + nid);
            $('.view-locations-on-this-tour .views-row').removeClass('active'); // todo: do we also want "selected"?
            $('.view-locations-on-this-tour .node-' + nid).addClass('active');
          }
        }


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
        L.control.locate().addTo(leaflet_map);

        // 7. Add the "fill viewport" button
        L.easyButton('fa-window-maximize', function(btn, map){
          $('body').toggleClass('leaflet-full-viewport');
        }).addTo(leaflet_map);

        // 8. Add the compass.
        // L.control.compass().addTo(leaflet_map);
        // todo: make it rotate the map based on this.
        // (Yes, that is super, super complicated.)


        // 9. Resize the map when its container resizes.
        //    (For example. when the browser is resized or the screen rotates.)
        const resizeObserver = new ResizeObserver(() => {
          leaflet_map.invalidateSize();
        });
        resizeObserver.observe(map);

        addLeafletSidebar();
        // Add the sidebar to the map.
        // var sidebar = L.control.sidebar('leaflet-sidebar').addTo(leaflet_map);
        var sidebar = L.control.sidebar({
          autopan: true,       // whether to maintain the centered map point when opening the sidebar
          closeButton: true,    // whether t add a close button to the panes
          container: 'leaflet-sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
          position: 'left',     // left or right
      }).addTo(leaflet_map);

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

  function addLeafletSidebar() {
    // Add the Leaflet sidebar container.
    $('#map-inner').before('<div id="leaflet-sidebar" class="leaflet-sidebar collapsed"></div>');

    // Add the leaflet sidebar tabs.
    $('#leaflet-sidebar').append('<div class="leaflet-sidebar-tabs"><ul role="tablist"><li><a href="#home" role="tab"><i class="fa fa-bars"></i></a></li><li><a href="#profile" role="tab"><i class="fa fa-user"></i></a></li><li class="disabled"><a href="#messages" role="tab"><i class="fa fa-envelope"></i></a></li><li><a href="https://github.com/Turbo87/sidebar-v2" role="tab" target="_blank"><i class="fa fa-github"></i></a></li></ul><ul role="tablist"><li><a href="#settings" role="tab"><i class="fa fa-gear"></i></a></li></ul></div>');

    // Add the leaflet sidebar content.
    $('#leaflet-sidebar').append('<div class="leaflet-sidebar-content"></div>');
    
    // Add each pane to the sidebar. 
    // todo: iterate through this stuff.
    $('#leaflet-sidebar .leaflet-sidebar-content').append('<div class="leaflet-sidebar-pane" id="home"><h1 class="leaflet-sidebar-header">sidebar-v2<span class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></span></h1><p>A responsive sidebar for mapping libraries like <a href="http://leafletjs.com/">Leaflet</a> or <a href="http://openlayers.org/">OpenLayers</a>.</p></div>');
    $('#leaflet-sidebar .leaflet-sidebar-content').append('<div class="leaflet-sidebar-pane" id="profile"><h1 class="leaflet-sidebar-header">Profile<span class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></span></h1></div>');
    $('#leaflet-sidebar .leaflet-sidebar-content').append('<div class="leaflet-sidebar-pane" id="messages"><h1 class="vsidebar-header">Messages<span class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></span></h1></div>');
    $('#leaflet-sidebar .leaflet-sidebar-content').append('<div class="leaflet-sidebar-pane" id="settings"><h1 class="leaflet-sidebar-header">Settings<span class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></span></h1>');
  }


  function tourNodeEditInlineForm() {
    $('#edit-field-locations-wrapper').append('<div class="locations-inline-form"></div>');

    // each 
    // #lo
    // <div class="drag-drawflow" draggable="true" ondragstart="drag(event)" data-node="template"><i class="fas fa-code"></i><span> Template</span></div>
  }


function testCSSinjection() {
  $('body').attr('style', 'color: red !important;');
}


  
  // add a QR code (Defaults to the current page.)
  function addQRcode(url) {
    if (url == undefined) {
      url = window.location.href;
    }
    if ($('#qrcode').length == 0) {
      $('footer').after('<div id="qrcode"></div>');
      new QRCode(document.getElementById("qrcode"), url);
    }
  }

  function distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var radlon1 = Math.PI * lon1/180;
    var radlon2 = Math.PI * lon2/180;
    var theta = lon1-lon2;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist
  }

  // 487.41 km turns into 487 km
  // 5.41km turns into 5.4 km
  // 0.551km turns into 551 m
  function roundDistanceToKilometres(distance_in_km) {
    return Math.round(distance_in_km);
  }
  function roundDistanceToMetres(distance_in_km) {
    return Math.round(distance_in_km % 1 * 1000);
  }

  // Translation:
  // this is to handle internationalization and localization correctly.
  // 487.41 turns into [487, 410].
  function getDistanceAsArray(distance_in_km) {
    var km = roundDistanceToKilometres(distance_in_km);
    var m = roundDistanceToMetres(distance_in_km);
    return [km, m];
  }

  // return distance in miles and feet


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
