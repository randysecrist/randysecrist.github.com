function updateMeta() {
	var url_base = "http://secristfamily.com:4000";
	var url_resource = "/remote/headers/http%3A%2F%2Fdata.riakcs.net%3A8080%2Fshared_files%2F";

	var worker_1 = new Worker('/assets/js/lds/video_worker.js');
	var worker_2 = new Worker('/assets/js/lds/video_worker.js');

	var event_handler = function(e) {
	  result = e.data;
	  document.getElementById (
	    result['date_node']).innerHTML = new Date(result['last_modified'] * 1000
	  ).toLocaleDateString();
	}

	worker_1.addEventListener('message', event_handler, false);
	worker_2.addEventListener('message', event_handler, false);

	worker_1.postMessage({'date_node': 'video_date_1', 'url': url_base + url_resource + "001.mp4"});
	worker_2.postMessage({'date_node': 'video_date_2', 'url': url_base + url_resource + "002.mp4"});

	// Replace Video Descriptions and Text
	// document.getElementById("video_desc_1").innerHTML = 
	// document.getElementById("video_text_1").innerHTML = 
	// document.getElementById("video_desc_2").innerHTML = 
	// document.getElementById("video_text_2").innerHTML = 
}