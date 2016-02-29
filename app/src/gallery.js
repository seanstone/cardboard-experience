function yt_init() {
    gapi.client.setApiKey("AIzaSyDbnwh_pVyVqWN5LTFmlUptly6kQlEdShM");
    gapi.client.load("youtube", "v3", function() {
        yt_search();
    });

	window.addEventListener('hashchange', function() {
		yt_load(window.location.hash.substr(1));
	});
}

function yt_search() {
	// prepare the request
	var request = gapi.client.youtube.playlistItems.list({
	    part: "snippet,id",
		playlistId: "PLU8wpH_LfhmvMokgsfQtiHNsP96bU7cnr",
	    maxResults: 30,
	    order: "viewCount"
	});
	// execute the request
	request.execute(function(response) {
		var results = response.result;
	  	$.each(results.items, function(index, item) {
	        yt_add(item);
	  	});
	});
}

function yt_add(item) {
	gallery.innerHTML +=
		"<div class='item'>" +
			'<a href="#' + item.snippet.resourceId.videoId + '">' +
				"<img src='" + item.snippet.thumbnails.high.url + "' />" +
			"</a>" +
			"<div class='title'>" + item.snippet.title + "</div>" +
		"</div>";
}

function yt_load(id) {
	YoutubeVideo(id, function(video){
		try {
			var webm = video.getSource("video/webm", "medium");
			//var mp4 = video.getSource("video/mp4", "medium");
			var url = 'elevr.html#{"controls": "false", "autoplay": "true", "loop": "true", "video": "' + webm.url + '"}';
			window.location.replace(url);
		} catch(err) {};
	});
}
