---
layout: lds
title:  "Relief Society Videos"
type:   success
---

#### Description (TBD)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. 
  
<section class="panel panel-{{ page.type }}">
  <div class="panel-heading">
    <p>
      <span class="pull-right"><i class="fa fa-clock-o"></i>&nbsp;<span id="video_1" class="pull-right">Video 1 Date (TBD)</span></span>
    </p>
  </div>
  <div class="panel-body">
    <video height="270" id="001" src="http://data.riakcs.net:8080/shared_files/001.mp4" type="video/mp4" controls style="margin: auto; display: block;"></video>
  </div>
</section>

#### Description (TBD)

Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. 

<section class="panel panel-{{ page.type }}">
  <div class="panel-heading">
    <p>
      <span class="pull-right"><i class="fa fa-clock-o"></i>&nbsp;<span id="video_2" class="pull-right">Video 2 Date (TBD)</span></span>
    </p>
  </div>
  <div class="panel-body">
    <video height="270" id="001" src="http://data.riakcs.net:8080/shared_files/002.mp4" type="video/mp4" controls style="margin: auto; display: block;"></video>
  </div>
</section>

<script>
function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
var video_one = JSON.parse(httpGet("http://secristfamily.com:4000/remote/headers/http%3A%2F%2Fdata.riakcs.net%3A8080%2Fshared_files%2F001.mp4"));
var video_two = JSON.parse(httpGet("http://secristfamily.com:4000/remote/headers/http%3A%2F%2Fdata.riakcs.net%3A8080%2Fshared_files%2F002.mp4"));
document.getElementById("video_1").innerHTML=video_one['meta'][1][1];
document.getElementById("video_2").innerHTML=video_two['meta'][1][1];
</script>
