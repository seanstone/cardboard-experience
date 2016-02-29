function main() {
	var slideout = new Slideout({
		'panel': document.getElementById('panel'),
		'menu': document.getElementById('menu'),
		'padding': 128,
		'tolerance': 70
	});

	var frame = document.getElementById("frame");
	$("#panel").click(function(){slideout.toggle();});
	$("#menu_player").click(function(){ frame.src = "elevr.html"; slideout.toggle(); });
	$("#menu_gallery").click(function(){ frame.src = "gallery.html"; slideout.toggle(); });
}
