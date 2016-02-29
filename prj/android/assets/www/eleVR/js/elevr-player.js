/**
 * eleVR Web Player: A web player for 360 video on the Oculus
 * Copyright (C) 2014 Andrea Hawksley and Andrew Lutomirski
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Mozilla Public License; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */
/* global controls, projection, util, webGL, webVR */

'use strict';

var currentScreenOrientation = window.orientation || 0; // active default

var timing = {showTiming: false, // Switch to true to show frame times in the console
              frameTime: 0,
              prevFrameTime: 0,
              canvasResized: 0,
              textureLoaded: 0,
              textureTime: 0,
              start: 0,
              end: 0,
              framesSinceIssue: 0
              };

var called = {};
var videoOptions = {};

function resizeContainer() {
  if (!window.container) {
    window.container = document.getElementById('video-container');
  }

  window.container.style.width = window.innerWidth + 'px';
  window.container.style.height = window.innerHeight + 'px';
}

window.addEventListener('resize', resizeContainer);

function setupControls() {
  if (called.setupControls) {
    return;
  }

  resizeContainer();

  window.canvas = document.getElementById('glcanvas');
  window.video = document.getElementById('video');

  controls.create();

  called.setupControls = true;
}

function runEleVRPlayer() {
  if (called.runEleVRPlayer) {
    return;
  }

  setupControls();

  webVR.initWebVR();

  webGL.initWebGL();

  if (webGL.gl) {
    webGL.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    webGL.gl.clearDepth(1.0);
    webGL.gl.disable(webGL.gl.DEPTH_TEST);

    util.setCanvasSize();

    // Keyboard Controls
    controls.enableKeyControls();

    window.shader = new webGL.Shader({
      fragmentShaderName: 'shader-fs',
      vertexShaderName: 'shader-vs',
      attributes: ['aVertexPosition'],
      uniforms: ['uSampler', 'eye', 'projection', 'proj_inv'],
    });

    webGL.initBuffers();
    webGL.initTextures();

    window.video.addEventListener('canplaythrough', controls.loaded);
    window.video.addEventListener('ended', controls.ended);

    // Keep a record of all the videos that are in the drop-down menu.
    Array.prototype.slice.call(window.videoSelect.options).forEach(function(option) {
      videoOptions[option.value] = option;
    });
  }

  initFromSettings(window.location.hash || window.location.search); //load video

  called.runEleVRPlayer = true;
}

function initFromSettings(newSettings) {
  if (!newSettings) {
    controls.show();
    return;
  }

  var settings = util.getTruthyURLSearchParams(newSettings, {
    autoplay: undefined,
    controls: true,
    loop: true,
    sound: true,
    projection: 'mono'
  });

  if (settings.controls) {
    controls.show();
  } else {
    controls.hide();

    if (typeof settings.autoplay === 'undefined') {
      // `autoplay` by default if controls are hidden and no explicit `autoplay` param set.
      settings.autoplay = true;
    }
  }

  if (settings.sound) {
    controls.unmute();
  } else {
    controls.mute();
  }

  settings.projection = util.getCustomProjection(settings.projection);

  if (projection !== settings.projection) {
    projection = settings.projection;

    if (window.projectionSelect) {
      window.projectionSelect.value = settings.projection;
    }
  }

  controls.setLooping(settings.loop);

  if (settings.video) {
    window.video.innerHTML = '';

    if (window.videoSelect) {
      var optionValue = settings.projection + settings.video;

      if (optionValue in videoOptions) {
        videoOptions[optionValue].selected = true;
      } else {
        var option = document.createElement('option');
        option.selected = true;
        option.textContent = settings.title || util.getVideoTitle(settings.video);

        // Note: The controls code expects the filename to be prefixed with '0' or '1'.
        option.value = optionValue;

        if (settings.autoplay) {
          option.dataset.autoplay = '';
        } else {
          delete option.dataset.autoplay;
        }

        videoOptions[optionValue] = option;

        window.videoSelect.appendChild(option);
      }
    }

    controls.loadVideo(settings.video);
  }

  if (settings.autoplay) {
    controls.play();
  } else if (settings.autoplay === false) {
    // If user did not explicitly set `autoplay`, don't pause unnecessarily.
    window.video.pause();
  }
}

window.addEventListener('hashchange', function() {
  // Remove the querystring if there were custom parameters.
  window.history.pushState('', document.title, window.location.pathname + window.location.hash);
  initFromSettings(window.location.hash);
});

window.addEventListener('message', function(e) {
  if (typeof e.data === 'object') {
    window.location.hash = '#' + JSON.stringify(e.data);
  } else if (typeof e.data === 'string') {
    window.location.hash = '#' + e.data;
  } else {
    return;
  }
});
