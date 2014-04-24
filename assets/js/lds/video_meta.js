function updateMeta() {
	var url_base = "http://secrist.io:8888";
	var url_resource = "/remote/headers/http%3A%2F%2Fs3.amazonaws.com%2Fcopper-hills-seventh%2F";

	var worker_1 = new Worker('/assets/js/lds/video_worker.js');
	var worker_2 = new Worker('/assets/js/lds/video_worker.js');

	var event_handler = function(e) {
	  result = e.data;
	  if (result['title'] != null) {
	    document.getElementById("video_title_" + result['worker_id']).innerHTML =
	      result['title'];
	  }
	  if (result['description'] != null) {
	    document.getElementById("video_desc_" + result['worker_id']).innerHTML =
	      result['description'];
	  }
	  document.getElementById("video_date_" + result['worker_id']).innerHTML =
	    new Date(result['last_modified'] * 1000).toLocaleDateString();
	}

	worker_1.addEventListener('message', event_handler, false);
	worker_2.addEventListener('message', event_handler, false);

	worker_1.postMessage({'worker_id': '1', 'url': url_base + url_resource + "001.mp4"});
	worker_2.postMessage({'worker_id': '2', 'url': url_base + url_resource + "002.mp4"});

}
