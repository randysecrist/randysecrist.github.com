---
layout: post
title:  "Chicago Hackathon"
date:   2014-02-15 09:49:14
type:   primary
---

#### Fun With Data & Maps

This actually happened months ago, but I finally got around to making it work like
a real API would with the proper [CORS](http://www.w3.org/TR/cors) and
[CSRF](http://en.wikipedia.org/wiki/Cross-site_request_forgery) settings.

The hackathon was focused on using [city data](https://data.cityofchicago.org/), so
myself and another guy grabbed a bunch of data and started seeing what we could do
with it.  I had been reading about [GeoJSON](http://geojson.org), 
[leaflet.js](http://leafletjs.com), 
[marker cluster](https://github.com/Leaflet/Leaflet.markercluster), and 
[cloudmade](http://cloudmade.com/documentation/map-tiles) prior to this.  We
decided to mash these together with the data the city gave us, and ended up with
the simple map app below.

This particular data set shows all the `green spaces` in the city.  With a bit more
effort, I'm sure I could make it more functional and nice.

<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular.min.js"></script>

<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.6.2/leaflet.css" />
<script src="http://cdn.leafletjs.com/leaflet-0.6.2/leaflet.js"></script>

<link rel="stylesheet" href="/assets/css/markercluster.css" />

<script src="/assets/js/leaflet.markercluster-src.js"></script>

<script type="text/javascript">
var map = null;

function FetchCtrl($scope, $http, $templateCache) {
  $scope.method = 'GET';
  $scope.url = 'http-geojson.html';

  $scope.fetch = function() {
    $scope.code = null;
    $scope.response = null;

    $http({method: $scope.method, url: $scope.url, headers: {'Authorization': 'OAuth mhealthv3-t6aiY7BJo64oytyDPDHXrg-S55f8IoyHdYsBeKquaQrYQ'}, cache: $templateCache}).
      success(function(data, status) {
        $scope.status = status;
        $scope.data = data;

        if (data == null) {
          return;
        }

        // http://cloudmade.com/documentation/map-tiles
        // http://cloudmade.com/documentation/auth
        // curl -X POST 'http://auth.cloudmade.com/token/d42764c2031943b8967bd982c2d6122d?userid=randy.secrist@gmail.com&deviceid=web'
        var cloudmade = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/999@2x/256/{z}/{x}/{y}.png?token={token}', {
          maxZoom: 18,
          attribution: 'Map data &copy; 2014 OpenStreetMap contributors, Imagery &copy; 2014 CloudMade',
          key: 'd42764c2031943b8967bd982c2d6122d',
          token: 'd1ab8aa7b4974c7f965449030f7e4c63'
        });

        try {
          map = L.map('map')
            .addLayer(cloudmade);
        }
        catch (Exception) {
          map.remove();
        }

        var markers = L.markerClusterGroup();

        var geoJsonLayer = L.geoJson(data, {
          pointToLayer: function(f, latlon) {
            var sizes = {
              small: [20, 50],
              medium: [30, 70],
              large: [35, 90]
            };

            var fp = f.properties || {};
            var size = fp['marker-size'] || 'medium';
            var symbol = (fp['marker-symbol']) ? '-' + fp['marker-symbol'] : '';
            var color = fp['marker-color'] || '7e7e7e';
            color = color.replace('#', '');

            var url = 'http://a.tiles.mapbox.com/v3/marker/' +
              'pin-' +
              // Internet Explorer does not support the `size[0]` syntax.
              size.charAt(0) + symbol + '+' + color +
              ((window.devicePixelRatio === 2) ? '@2x' : '') +
              '.png';

            return new L.Marker(latlon, {
              icon: new L.icon({
                iconUrl: url,
                iconSize: sizes[size],
                iconAnchor: [sizes[size][0] / 2, sizes[size][1] / 2],
                popupAnchor: [sizes[size][0] / 2, 0]
              })
            });
          },
          onEachFeature: function(feature, layer) {
            var keys = Object.keys(feature.properties)
            if (keys.length > 0) {
              var popup_string = '';
              for (var i = 0; i < keys.length; i++) {
                if (keys[i].substring(0, 'marker-'.length) != 'marker-') {
                  popup_string = popup_string + keys[i] + ":   " +  feature.properties[keys[i]] + "\n";
                }
              }
              layer.bindPopup(popup_string);
            }
          }
        });

        markers.addLayer(geoJsonLayer);

        map.addLayer(markers);
        map.fitBounds(markers.getBounds());
      }).
      error(function(data, status) {
        $scope.data = data || "Request failed";
        $scope.status = status;
    });
  };

  $scope.updateModel = function(method, url) {
    $scope.method = method;
    $scope.url = url;
  };
}
</script>

<div ng-app="">
  <div ng-controller="FetchCtrl">
    <select ng-model="method">
      <option>GET</option>
      <option>JSONP</option>
    </select>
    <input type="text" ng-model="url" size="80"/>
    <button ng-click="fetch()">fetch</button><br>
    
    <button ng-click="updateModel('GET', 'https://api-mhealth.dev.attcompute.com/v3/ownership/GgVEp0xY37emkWi8Pq8Ot4bQO8H/document/chicago_green_roofs')">Chicago Green Roof</button>

    <!--
    <button ng-click="updateModel('GET', '/assets/green_roof.json')">Chicago Green Roof Local</button>
    -->
  </div>
  
  <!-- http-hello.html -->
  <script type="text/ng-template" id="http-geojson.html">
    { "type": "FeatureCollection",
      "features": [
        { "type": "Feature",
          "geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
          "properties": {"prop0": "value0"}
          },
        { "type": "Feature",
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]
              ]
            },
          "properties": {
            "prop0": "value0",
            "prop1": 0.0
            }
          },
        { "type": "Feature",
           "geometry": {
             "type": "Polygon",
             "coordinates": [
               [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
                 [100.0, 1.0], [100.0, 0.0] ]
               ]
           },
           "properties": {
             "prop0": "value0",
             "prop1": {"this": "that"}
             }
           }
      ]
    }
  </script>
</div>

<div id="map" style="margin: auto; display: block;"/>

<script type="text/javascript">
(function() {
  console.log("On Load:");
}).call(this);
</script>