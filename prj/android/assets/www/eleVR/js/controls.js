/* global canvas, fullScreenButton, loopButton, muteButton, playL, playR, playButton, projectionSelect, quat, seekBar, webGL, video, videoSelect, vrHMD, vrSensor */

/*
controls.playPause();
controls.toggleLooping();
controls.mute();
*/


var reqAnimFrameID = 0;
var projection = 0;
var manualRotation = quat.create(),
    degtorad = Math.PI / 180;  // Degree-to-Radian conversion

  'use strict';

  var videoObjectURL;

var controls = {
manualControls: {
  'a' : {index: 1, sign: 1, active: 0},
  'd' : {index: 1, sign: -1, active: 0},
  'w' : {index: 0, sign: 1, active: 0},
  's' : {index: 0, sign: -1, active: 0},
  'q' : {index: 2, sign: -1, active: 0},
  'e' : {index: 2, sign: 1, active: 0},
},

manualRotateRate: new Float32Array([0, 0, 0]),  // Vector, camera-relative

create: function() {

	window.videoControls = document.getElementById('video-controls');
    window.messageL = document.getElementById('message-l');
    window.messageR = document.getElementById('message-r');

    resizeContainer();

    window.leftLoad = document.getElementById('left-load');
    window.rightLoad = document.getElementById('right-load');
    window.leftPlay = document.getElementById('left-play');
    window.rightPlay = document.getElementById('right-play');

    // Buttons
    window.playButton = document.getElementById('play-pause');
    window.playL = document.getElementById('play-l');
    window.playR = document.getElementById('play-r');
    window.muteButton = document.getElementById('mute');
    window.loopButton = document.getElementById('loop');
    window.recenterButton = document.getElementById('recenter');
    window.fullScreenButton = document.getElementById('full-screen');

    // Sliders
    window.seekBar = document.getElementById('seek-bar');

    // Selectors
    window.videoSelect = document.getElementById('video-select');
    window.projectionSelect = document.getElementById('projection-select');

	document.getElementById('title-l').style.fontSize = window.outerHeight / 20 + 'px';
	document.getElementById('title-r').style.fontSize = window.outerHeight / 20 + 'px';

	window.messageL.style.fontSize = window.outerHeight / 30 + 'px';
	window.messageR.style.fontSize = window.outerHeight / 30 + 'px';

  playButton.addEventListener('click', function() {
    controls.playPause();
  });

  playL.addEventListener('click', function() {
    controls.playPause();
  });

  playR.addEventListener('click', function() {
    controls.playPause();
  });

  loopButton.addEventListener('click', function() {
    controls.toggleLooping();
  });

  muteButton.addEventListener('click', function() {
    if (video.muted === false) {
      controls.mute();
    } else {
      controls.unmute();
    }
  });

  fullScreenButton.addEventListener('click', function() {
    controls.fullscreen();
  });

  recenterButton.addEventListener('click', function() {
    if (typeof vrSensor !== 'undefined') {
      vrSensor.zeroSensor(); // Untested
    }
    else {
      quat.invert(manualRotation, webGL.getPhoneVR().rotationQuat());
    }
  });

  seekBar.addEventListener('change', function() {
    // Calculate the new time
    var time = video.duration * (seekBar.value / 100);
    video.currentTime = time;
  });

  video.addEventListener('timeupdate', function() {
    // don't update if paused,
    // we get last time update after seekBar mousedown pauses
    if (!video.paused) {
      // Calculate the slider value
      var value = (100 / video.duration) * video.currentTime;
      seekBar.value = value;
    }
  });

  // Pause the video when the slider handle is being dragged
  var tempPause = false;
  seekBar.addEventListener('mousedown', function() {
    if (!video.paused) {
      video.pause();
      tempPause = true;
    }
  });

  seekBar.addEventListener('mouseup', function() {
    if (tempPause) {
      video.play();
    }
  });

  videoSelect.addEventListener('change', function() {
    projection = videoSelect.value[0];
    projectionSelect.value = projection;

    // Remove the hash/querystring if there were custom video parameters.
    window.history.pushState('', document.title, window.location.pathname);

    controls.loadVideo(videoSelect.value.substring(1));

    var selectedOption = videoSelect.options[videoSelect.selectedIndex];
    if ('autoplay' in selectedOption.dataset) {
      controls.play();
    }
  });


  projectionSelect.addEventListener('change', function() {
    projection = projectionSelect.value;
  });

  document.getElementById('select-local-file').addEventListener('click', function(event) {
    event.preventDefault();
    controls.selectLocalVideo();
  });
},

enableKeyControls: function() {
  function key(event, sign) {
    var control = controls.manualControls[String.fromCharCode(event.keyCode).toLowerCase()];
    if (!control)
      return;
    if (sign === 1 && control.active || sign === -1 && !control.active)
      return;
    control.active = (sign === 1);
    controls.manualRotateRate[control.index] += sign * control.sign;
  }

  function onkey(event) {
    switch (String.fromCharCode(event.charCode)) {
    case 'f':
      controls.fullscreen();
      break;
    case 'z':
      if (typeof vrSensor !== 'undefined') {
        vrSensor.zeroSensor();
      }
      else {
        quat.invert(manualRotation, webGL.getPhoneVR().rotationQuat());
      }
      break;
    case 'p':
      controls.playPause();
      break;
    case ' ': //spacebar
      controls.playPause();
      break;
    case 'g':
      controls.fullscreenIgnoreHMD();
      break;
    case 'l':
      controls.toggleLooping();
      break;
    }
  }

  document.addEventListener('keydown', function(event) { key(event, 1); },
          false);
  document.addEventListener('keyup', function(event) { key(event, -1); },
          false);
  window.addEventListener('keypress', onkey, true);
},

/**
 * Video Commands
 */
loaded: function() {
  window.leftLoad.classList.add('hidden');
  window.rightLoad.classList.add('hidden');
  if (video.paused) {
    window.leftPlay.classList.remove('hidden');
    window.rightPlay.classList.remove('hidden');
  }
},

play: function() {
  if (video.ended) {
    video.currentTime = 0.1;
  }

  video.play();
  if (!video.paused) { // In case somehow hitting play button doesn't work.
    window.leftPlay.classList.add('hidden');
    window.rightPlay.classList.add('hidden');

    window.playButton.className = 'fa fa-pause icon';
    window.playButton.title = 'Pause';

    if (!reqAnimFrameID) {
      reqAnimFrameID = requestAnimationFrame(webGL.drawScene);
    }
  }
},

pause: function() {
  video.pause();

  window.playButton.className = 'fa fa-play icon';
  window.playButton.title = 'Play';

  window.leftPlay.classList.remove('hidden');
  window.rightPlay.classList.remove('hidden');
},

playPause: function() {
  if (video.paused === true) {
    controls.play();
  } else {
    controls.pause();
  }
},

setLooping: function(loop) {
  loop = !!loop;
  if (video.loop !== loop) {
    controls.toggleLooping();
  }
},

toggleLooping: function() {
  if (video.loop === true) {
    loopButton.className = 'fa fa-refresh icon';
    loopButton.title = 'Start Looping';
    video.loop = false;
  } else {
    loopButton.className = 'fa fa-chain-broken icon';
    loopButton.title = 'Stop Looping';
    video.loop = true;
  }
},

ended: function() {
  controls.pause();
  if (reqAnimFrameID) {
    cancelAnimationFrame(reqAnimFrameID);
    reqAnimFrameID = 0;
  }
},

mute: function() {
  	if (video.muted) {
    	return;
  	}
  	video.muted = true;
  	window.muteButton.className = 'fa fa-volume-off icon';
  	window.muteButton.title = 'Unmute';
},

unmute: function() {
  	if (!video.muted) {
    	return;
  	}
  	video.muted = false;
  	window.muteButton.className = 'fa fa-volume-up icon';
  	window.muteButton.title = 'Mute';
},

selectLocalVideo: function() {
  	var input = document.createElement('input');
  	input.type = 'file';
  	input.accept = 'video/*';

  	input.addEventListener('change', function () {
    	var files = input.files;
    	if (!files.length) {
      		// The user didn't select anything.  Sad.
      		console.log('File selection canceled');
      		return;
    	}

    	videoObjectURL = URL.createObjectURL(files[0]);
    	console.log('Loading local file ', files[0].name, ' at URL ', videoObjectURL);
    	videoSelect.value = '';
    	controls.loadVideo(videoObjectURL);
  	});

  	input.click();
},

loadVideo: function(videoFile) {
  	controls.pause();
  	window.leftPlay.classList.add('hidden');
  	window.rightPlay.classList.add('hidden');
  	window.leftLoad.classList.remove('hidden');
  	window.rightLoad.classList.remove('hidden');

  	webGL.gl.clear(webGL.gl.COLOR_BUFFER_BIT);

  	if (reqAnimFrameID) {
    	cancelAnimationFrame(reqAnimFrameID);
    	reqAnimFrameID = 0;
  		}

    manualRotation = quat.create();

  	var oldObjURL = videoObjectURL;
  	videoObjectURL = null;

	// MediaSource
  	var mediaSource = new MediaSource();
	videoObjectURL = window.URL.createObjectURL(mediaSource);
  	video.src = videoObjectURL;
  	mediaSource.addEventListener('sourceopen', function(e) {
		var sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8,vorbis"');
        sourceBuffer.addEventListener('updateend', function () {
            //alert("Ready");
			controls.play();
        }, false);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', videoFile, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function (e) {
            if (xhr.status !== 200) {
                //alert("Failed to download video data");
                //self.clearUp();
            } else {
                var arr = new Uint8Array(xhr.response);
                if (!sourceBuffer.updating) {
					sourceBuffer.appendBuffer(arr);
					//alert("Appending video data to buffer");
					//alert(arr);
                } else {
                    //alert("Source Buffer failed to update");
                }
            }
        };
        xhr.onerror = function () {
            //alert("Failed to download video data");
            //self.clearUp();
        };
        xhr.send();
        //alert("Downloading video data");

  	}, false);
	//

  	//video.src = videoFile;

  	if (videoObjectURL && videoObjectURL !== videoFile) {
    	URL.removeObjectURL(oldObjURL);
  		}
},

fullscreen: function() {
  	if (canvas.mozRequestFullScreen) {
    	canvas.mozRequestFullScreen({ vrDisplay: vrHMD }); // Firefox
  	} else if (canvas.webkitRequestFullscreen) {
    	canvas.webkitRequestFullscreen({ vrDisplay: vrHMD }); // Chrome and Safari
  	} else if (canvas.requestFullScreen){
    	canvas.requestFullscreen();
  	}
},

fullscreenIgnoreHMD: function() {
  	if (canvas.mozRequestFullScreen) {
    	canvas.mozRequestFullScreen(); // Firefox
  	} else if (canvas.webkitRequestFullscreen) {
    	canvas.webkitRequestFullscreen(); // Chrome and Safari
  	} else if (canvas.requestFullScreen){
    	canvas.requestFullscreen();
  	}
},

hide: function() {
  	window.videoControls.classList.add('hidden');
  	window.messageL.classList.add('hidden');
  	window.messageR.classList.add('hidden');
},

show: function() {
  	window.videoControls.classList.remove('hidden');
  	window.messageL.classList.remove('hidden');
  	window.messageR.classList.remove('hidden');
}
};

  window.controls = controls;
