---
layout: post
title:  "Chicago Hackathon"
date:   2014-02-15 09:49:14
type:   primary
---

#### Fun With Data & Maps

This actually happened in July of 2013, and I finally got around to learning more
of the parts, storing the actual map data in Riak somewhere, and hosting the map
bits on real servers so I could see how to properly deal with
[CORS](http://www.w3.org/TR/cors) and 
[CSRF](http://en.wikipedia.org/wiki/Cross-site_request_forgery) related issues.

The hackathon was focused on using [Chigaco city data](https://data.cityofchicago.org/).
During some downtime (my job was to help the attendees with technical questions),
myself and another coach grabbed a bunch of the data people were working with and
started seeing what we could do with it.  After watching my partner convert the
data from tabular format into JSON, and noticing geo spacial coordinates within,
we decides to just make it into [GeoJSON](http://geojson.org).

I then grabbed [angular js](http://angularjs.org/), [leaflet.js](http://leafletjs.com), 
[marker cluster](https://github.com/Leaflet/Leaflet.markercluster), and
[open street map](http://www.openstreetmap.org/).

A few ten's of minutes later, I had mashed these together with the data the city
gave us, and ended up with the simple map control below.  Afterward, we had a few
conversations with people on the *Internet of Things*, that left me feeling like I
should know the client side application stuff better.

I particularly like the marker cluster combination effect at max zoom levels.  This
particular data set shows all the green spaces in the city.  With a bit more
effort it may be possible to reduce the amount of data pulled across if I can map it
to access patterns that make sense for the changing zoom levels.

Will have to think & learn more on this.

<!-- ######################################################### -->

<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.0.7/angular.min.js"></script>

<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.6.2/leaflet.css" />
<script src="http://cdn.leafletjs.com/leaflet-0.6.2/leaflet.js"></script>

<link rel="stylesheet" href="/assets/css/markercluster.css" />

<script src="/assets/js/leaflet.markercluster-src.js"></script>

<script type="text/javascript">
var map = null;

function FetchCtrl($scope, $http, $templateCache) {
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

        var map_style = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          minZoom: 8,
          attribution: 'Map data &copy; 2014 OpenStreetMap contributors'
        });

        try {
          map = L.map('map')
            .addLayer(map_style);
        }
        catch (Exception) {
          if (map != null) {
            map.remove();
          }
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

        if (map != null) {
          map.addLayer(markers);
          map.fitBounds(markers.getBounds());
        }
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

  // Init scope, used when page loads
  $scope.init = function () {
    $scope.method = 'GET';
    $scope.url = 'https://api-mhealth.dev.attcompute.com/v3/ownership/GgVEp0xY37emkWi8Pq8Ot4bQO8H/document/chicago_green_roofs';
    $scope.fetch();
  };
}
</script>

<div ng-app="">
  <div ng-controller="FetchCtrl" data-ng-init="init()">
    <!-- Angular JS Things
    <select ng-model="method">
      <option>GET</option>
      <option>JSONP</option>
    </select>
    <button ng-click="fetch()">Load Map</button><br>
    <input type="text" ng-model="url" size="80"/>
    <button ng-click="updateModel('GET', 'https://api-mhealth.dev.attcompute.com/v3/ownership/GgVEp0xY37emkWi8Pq8Ot4bQO8H/document/chicago_green_roofs')">Chicago Green Roof</button>
    -->
  </div>
  
</div>

<div id="map" style="margin: auto; display: block;"/>
