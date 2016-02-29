function elevr_main() {
	runEleVRPlayer();
	window.postMessage({video: 'mars.webm', controls: false, autoplay: true, loop: true}, '*')
}
