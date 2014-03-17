function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

self.addEventListener('message', function(e) {
  var data = e.data;
  var v_meta = JSON.parse(httpGet(data.url));
  self.close();
  v_meta['worker_id'] = data.worker_id
  self.postMessage(v_meta);
}, false);
