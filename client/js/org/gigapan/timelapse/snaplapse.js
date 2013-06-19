// Class for managing a snaplapse.
//
// Dependencies:
// * org.gigapan.Util
// * org.gigapan.timelapse.Timelapse
// * Math.uuid (http://www.broofa.com/blog/?p=151)
//
// Copyright 2011 Carnegie Mellon University. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//    conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//    of conditions and the following disclaimer in the documentation and/or other materials
//    provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ''AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those of the
// authors and should not be interpreted as representing official policies, either expressed
// or implied, of Carnegie Mellon University.
//
// Authors:
// Chris Bartley (bartley@cmu.edu)
// Paul Dille (pdille@andrew.cmu.edu)
// Yen-Chia Hsu (legenddolphin@gmail.com)
// Randy Sargent (randy.sargent@cs.cmu.edu)
//
// VERIFY NAMESPACE
//

// Create the global symbol "org" if it doesn't exist.  Throw an error if it does exist but is not an object.
var org;
if (!org) {
  org = {};
} else {
  if ( typeof org != "object") {
    var orgExistsMessage = "Error: failed to create org namespace: org already exists and is not an object";
    alert(orgExistsMessage);
    throw new Error(orgExistsMessage);
  }
}

// Repeat the creation and type-checking for the next level
if (!org.gigapan) {
  org.gigapan = {};
} else {
  if ( typeof org.gigapan != "object") {
    var orgGigapanExistsMessage = "Error: failed to create org.gigapan namespace: org.gigapan already exists and is not an object";
    alert(orgGigapanExistsMessage);
    throw new Error(orgGigapanExistsMessage);
  }
}

// Repeat the creation and type-checking for the next level
if (!org.gigapan.timelapse) {
  org.gigapan.timelapse = {};
} else {
  if ( typeof org.gigapan.timelapse != "object") {
    var orgGigapanTimelapseExistsMessage = "Error: failed to create org.gigapan.timelapse namespace: org.gigapan.timelapse already exists and is not an object";
    alert(orgGigapanTimelapseExistsMessage);
    throw new Error(orgGigapanTimelapseExistsMessage);
  }
}

//
// DEPENDECIES
//

if (!org.gigapan.Util) {
  var noUtilMsg = "The org.gigapan.Util library is required by org.gigapan.timelapse.Snaplapse";
  alert(noUtilMsg);
  throw new Error(noUtilMsg);
}
if (!org.gigapan.timelapse.Timelapse) {
  var noVideosetMsg = "The org.gigapan.timelapse.Videoset library is required by org.gigapan.timelapse.Snaplapse";
  alert(noVideosetMsg);
  throw new Error(noVideosetMsg);
}
if (!Math.uuid) {
  var noMathUUID = "The Math.uuid library is required by org.gigapan.timelapse.Snaplapse";
  alert(noMathUUID);
  throw new Error(noMathUUID);
}

//
// CODE
//

(function() {
  var UTIL = org.gigapan.Util;
  org.gigapan.timelapse.Snaplapse = function(composerDivId, timelapse, settings) {

    var viewer;
    var eventListeners = {};
    var keyframes = [];
    var keyframesById = {};
    var keyframeIntervals = [];
    var currentKeyframeInterval = null;
    var isCurrentlyPlaying = false;
    var warpStartingTime = null;
    var timeCounterIntervalHandle = null;
    var thisObj = this;
    var $composerDivObj = $("#" + composerDivId);

    //var visualizer;
    var loadJSON;
    var loadKeyframesLength;
    var waitFor_timeout;
    var waitForStart = false;
    var waitForEnd = true;
    var currentWaitDuration = {
      start: 0,
      end: 0
    };
    var currentWaitForExtraStart = false;
    var extraWaitForStartDuration = 0;

    var _clearSnaplapse = function() {
      keyframes.length = 0;
      keyframesById = {};
      keyframeIntervals.length = 0;
      currentKeyframeInterval = null;
      warpStartingTime = null;
      timeCounterIntervalHandle = null;
      if (timelapse.getVisualizer())
        timelapse.getVisualizer().deleteAllTags();
    };
    this.clearSnaplapse = _clearSnaplapse;

    this.getComposerDivId = function() {
      return composerDivId;
    };

    //this.setVisualizer = function(theVisualizer) {
    //  visualizer = theVisualizer;
    //};

    //this is used for pausing the video at the beginning or end
    var resetWaitFlags = function() {
      clearTimeout(waitFor_timeout);
      waitForStart = false;
      waitForEnd = true;
    };

    //hide the transition area for the last key frame on the UI
    var hideLastKeyframeTransition = function() {
      var $keyframeItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selectee");
      var numItems = $keyframeItems.size();
      //unhide the transition options
      $keyframeItems_show = $keyframeItems.eq(numItems - 2);
      if ($keyframeItems_show) {
        $keyframeItems_show.find(".transition_table_mask").children().show();
        $keyframeItems_show.find(".snaplapse_keyframe_list_item_play_button").button("option", "disabled", false);
      }
      //hide the transition options and reset the keyframe
      $keyframeItems_hide = $keyframeItems.eq(numItems - 1);
      $keyframeItems_hide.find(".snaplapse_keyframe_list_item_play_button").button("option", "disabled", true);
      $keyframeItems_hide.find(".transition_table_mask").children().hide();
    };
    this.hideLastKeyframeTransition = hideLastKeyframeTransition;

    var updateKeyframeAndUI = function(keyframe, $keyframeItem) {
      if (keyframe != undefined) {
        keyframe['duration'] = null;
      }
      if ($keyframeItem != undefined) {
        $keyframeItem.find(".snaplapse_keyframe_list_item_duration").val("");
      }
    };

    var resetKeyframeAndUI = function(keyframe, $keyframeItem) {
      if (keyframe != undefined) {
        keyframe['duration'] = null;
        keyframe['speed'] = null;
        keyframe['is-loop'] = null;
        keyframe['loopTimes'] = null;
        keyframe['pauseStart'] = null;
        keyframe['pauseEnd'] = null;
      }
      if ($keyframeItem != undefined) {
        $keyframeItem.find(".snaplapse_keyframe_list_item_duration").val("");
        $keyframeItem.find(".snaplapse_keyframe_list_item_speed").val("");
        $keyframeItem.find(".snaplapse_keyframe_list_item_loop_checkbox").prop("checked", false);
        $keyframeItem.find(".snaplapse_keyframe_list_item_loop").val("").prop('disabled', true);
        $keyframeItem.find(".snaplapse_keyframe_list_item_loop_pauseStart").val("0").prop('disabled', true);
        $keyframeItem.find(".snaplapse_keyframe_list_item_loop_pauseEnd").val("0").prop('disabled', true);
      }
    };

    // every time user updates a parameter, try to build the interval
    // TODO: change the function of buildPreviousFlag to buildCurrentAndPreviousFlag
    var tryBuildKeyframeInterval_refreshKeyframeParas = function(keyframeId, constraintParaName, buildPreviousFlag) {
      var idx;
      var isFirstKeyframe = false;
      for (var i = 0; i < keyframes.length; i++) {
        if (keyframeId == keyframes[i]['id']) {
          idx = i;
          break;
        }
      }
      if (buildPreviousFlag) {
        if (idx == 1) {
          isFirstKeyframe = true;
        }
        if ( typeof (keyframes[idx - 1]) != "undefined" && keyframes[idx - 1] != null && typeof (keyframes[idx]) != "undefined" && keyframes[idx] != null) {
          var keyframeInterval = new org.gigapan.timelapse.KeyframeInterval(keyframes[idx - 1], keyframes[idx], null, timelapse.getDuration(), composerDivId, constraintParaName, isFirstKeyframe);
        }
      } else {
        if (idx == 0) {
          isFirstKeyframe = true;
        }
        if ( typeof (keyframes[idx]) != "undefined" && keyframes[idx] != null && typeof (keyframes[idx + 1]) != "undefined" && keyframes[idx + 1] != null) {
          var keyframeInterval = new org.gigapan.timelapse.KeyframeInterval(keyframes[idx], keyframes[idx + 1], null, timelapse.getDuration(), composerDivId, constraintParaName, isFirstKeyframe);
        }
      }
    };

    this.setSpeedForKeyframe = function(keyframeId, speed) {
      if (keyframeId && keyframesById[keyframeId]) {
        keyframesById[keyframeId]['speed'] = speed;
      }
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed");
      return keyframesById[keyframeId];
    };

    this.setIsLoopForKeyframe = function(keyframeId, isLoop) {
      if (keyframeId && keyframesById[keyframeId]) {
        keyframesById[keyframeId]['is-loop'] = isLoop;
      }
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed");
      return keyframesById[keyframeId];
    };

    this.setLoopTimesForKeyframe = function(keyframeId, loopTimes) {
      if (keyframeId && keyframesById[keyframeId]) {
        keyframesById[keyframeId]['loopTimes'] = loopTimes;
      }
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed");
      return keyframesById[keyframeId];
    };

    this.setWaitDurationForKeyframe = function(keyframeId, pauseDuration, flag) {
      if (keyframeId && keyframesById[keyframeId]) {
        if (flag == "start") {
          keyframesById[keyframeId]['waitStart'] = pauseDuration;
        } else if (flag == "end") {
          keyframesById[keyframeId]['waitEnd'] = pauseDuration;
        }
      }
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed");
    };

    timelapse.getVideoset().addEventListener('stall-status-change', function(isStalled) {
      if (isCurrentlyPlaying) {
        if (isStalled) {
          UTIL.log("videoset stall-status-change listener: pausing time warp time counter interval");
          pauseTimeCounterInterval();
        } else {
          UTIL.log("videoset stall-status-change listener: resuming time warp time counter interval");
          stopTimeCounterInterval();
          resumeTimeCounterInterval();
        }
      }
    });

    this.getAsJSON = function() {
      var snaplapseJSON = {};
      var tmJSON = timelapse.getTmJSON();
      snaplapseJSON['snaplapse'] = {};
      if (tmJSON['name']) {
        snaplapseJSON['snaplapse']['dataset-name'] = tmJSON['name'];
      }
      if (tmJSON['projection-bounds']) {
        snaplapseJSON['snaplapse']['projection'] = timelapse.getProjectionType();
        snaplapseJSON['snaplapse']['projection-bounds'] = tmJSON['projection-bounds'];
      }
      snaplapseJSON['snaplapse']['pixel-bounds'] = {
        xmin: 0,
        ymin: 0,
        xmax: timelapse.getPanoWidth(),
        ymax: timelapse.getPanoHeight()
      };
      snaplapseJSON['snaplapse']['source-duration'] = timelapse.getDuration();
      snaplapseJSON['snaplapse']['fps'] = timelapse.getFps();
      snaplapseJSON['snaplapse']['keyframes'] = keyframes;
      for (var i = 0; i < keyframes.length; i++) {
        delete snaplapseJSON['snaplapse']['keyframes'][i]["timeTagBot"];
        delete snaplapseJSON['snaplapse']['keyframes'][i]["timeTagRight"];
        delete snaplapseJSON['snaplapse']['keyframes'][i]["timeTagTimewarp"];
        delete snaplapseJSON['snaplapse']['keyframes'][i]["timeTagNavigation"];
      }
      return JSON.stringify(snaplapseJSON, null, 3);
    };

    this.getAsCaptionXML = function() {
      var intervals = buildKeyframeIntervals(0);

      var xmlPrefix = '<tt xmlns="http://www.w3.org/2006/10/ttaf1" xmlns:tts="http://www.w3.org/2006/04/ttaf1#styling">' + "\n" + '  <head>' + "\n" + '   <styling>' + "\n" + '      <style id="normal" tts:fontSize="13" />' + "\n" + '   </styling>' + "\n" + '  </head>' + "\n" + '  <body>' + "\n" + '    <div>' + "\n";
      var xmlSuffix = '    </div>' + "\n" + '  </body>' + "\n" + '</tt>';

      var xml = xmlPrefix;
      var currentCaption = '';
      for (var i = 0; i < intervals.length; i++) {
        var startTime = UTIL.formatTime(intervals[i].getStartingRunningDurationInMillis() / 1000, true, true);
        var endTime = UTIL.formatTime(intervals[i].getEndingRunningDurationInMillis() / 1000, true, true);
        var startingFrame = intervals[i].getStartingFrame();

        if (startingFrame['is-description-visible']) {
          currentCaption = startingFrame['description'];
        }

        xml += '      <p begin="' + startTime + '" end="' + endTime + '" style="normal">' + currentCaption + '</p>' + "\n";
      }

      xml += xmlSuffix;
      UTIL.log("\n" + xml);
    };

    //the function loads a keyframe everytime it get called
    //e.g. loadFromJSON(json, 0), loadFromJSON(undefined, 1), loadFromJSON(undefined, 2)...
    this.loadFromJSON = function(json, loadIndex) {
      try {
        if (json != undefined) {
          $(document.body).append('<div class="loadingOverlay"></div>');
          loadJSON = JSON.parse(json);
          _clearSnaplapse();
        }
        if ( typeof (loadJSON['snaplapse']) != 'undefined' && typeof (loadJSON['snaplapse']['keyframes']) != 'undefined') {
          UTIL.log("Found [" + loadJSON['snaplapse']['keyframes'].length + "] keyframes in the json:\n\n" + json);
          var keyframe = loadJSON['snaplapse']['keyframes'][loadIndex];
          if (json != undefined)
            loadKeyframesLength = loadJSON['snaplapse']['keyframes'].length;
          if ( typeof keyframe['time'] != 'undefined' && typeof keyframe['bounds'] != 'undefined' && typeof keyframe['bounds']['xmin'] != 'undefined' && typeof keyframe['bounds']['ymin'] != 'undefined' && typeof keyframe['bounds']['xmax'] != 'undefined' && typeof keyframe['bounds']['ymax'] != 'undefined') {
            // NOTE: if is-description-visible is undefined, then we define it as *true* in order to maintain
            // backward compatibility with older time warps which don't have this property.
            this.recordKeyframe(null, keyframe['time'], keyframe['bounds'], keyframe['description'], ( typeof keyframe['is-description-visible'] == 'undefined') ? true : keyframe['is-description-visible'], keyframe['duration'], true, keyframe['is-loop'], keyframe['speed'], keyframe['loopTimes'], keyframe['waitStart'], keyframe['waitEnd'], loadKeyframesLength);
          } else {
            UTIL.error("Ignoring invalid keyframe during snaplapse load.")
          }
        } else {
          UTIL.error("Invalid snaplapse file.");
          $(".loadingOverlay").remove();
          return false;
        }
      } catch(e) {
        UTIL.error("Invalid snaplapse file.\n\n" + e.name + " while parsing snaplapse JSON: " + e.message, e);
        $(".loadingOverlay").remove();
        return false;
      }
      return true;
    };

    this.duplicateKeyframe = function(idOfSourceKeyframe) {
      var keyframeCopy = this.getKeyframeById(idOfSourceKeyframe);
      this.recordKeyframe(idOfSourceKeyframe, keyframeCopy['time'], keyframeCopy['bounds'], keyframeCopy['description'], keyframeCopy['is-description-visible'], keyframeCopy['duration'], false, keyframeCopy['is-loop'], keyframeCopy['speed'], keyframeCopy['loopTimes'], keyframeCopy['waitStart'], keyframeCopy['waitEnd'], undefined);
    };

    this.recordKeyframe = function(idOfKeyframeToAppendAfter, time, bounds, description, isDescriptionVisible, duration, isFromLoad, isLoop, speed, loopTimes, waitStart, waitEnd, loadKeyframesLength) {
      if ( typeof bounds == 'undefined') {
        bounds = timelapse.getBoundingBoxForCurrentView();
      }
      var isKeyframeFromLoad = ( typeof isFromLoad == 'undefined') ? false : isFromLoad;

      // create the new keyframe
      var keyframeId = Math.uuid(20);
      var keyframe = {};
      keyframe['id'] = keyframeId;
      keyframe['is-loop'] = isLoop;
      keyframe['loopTimes'] = loopTimes;
      keyframe['speed'] = speed;
      keyframe['waitStart'] = waitStart;
      keyframe['waitEnd'] = waitEnd;
      keyframe['time'] = org.gigapan.timelapse.Snaplapse.normalizeTime(( typeof time == 'undefined') ? timelapse.getCurrentTime() : time);
      keyframe['captureTime'] = timelapse.getCurrentCaptureTime();
      keyframe['bounds'] = {};
      keyframe['bounds'].xmin = bounds.xmin;
      keyframe['bounds'].ymin = bounds.ymin;
      keyframe['bounds'].xmax = bounds.xmax;
      keyframe['bounds'].ymax = bounds.ymax;
      keyframe['duration'] = sanitizeDuration(duration);
      keyframe['description'] = ( typeof description == 'undefined') ? '' : description;
      keyframe['is-description-visible'] = ( typeof isDescriptionVisible == 'undefined') ? false : isDescriptionVisible;

      // determine where the new keyframe will be inserted
      var insertionIndex = keyframes.length;
      if ( typeof idOfKeyframeToAppendAfter != 'undefined' && idOfKeyframeToAppendAfter != null) {
        for (var j = 0; j < keyframes.length; j++) {
          if (idOfKeyframeToAppendAfter == keyframes[j]['id']) {
            insertionIndex = j + 1;
            break;
          }
        }
      }
      keyframes.splice(insertionIndex, 0, null);
      keyframes[insertionIndex] = keyframe;
      keyframesById[keyframeId] = keyframe;

      if (!isKeyframeFromLoad) {
        var $keyframeItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selectee");
        resetKeyframeAndUI(keyframes[insertionIndex - 1], $keyframeItems.eq(insertionIndex - 1));
      }
      // we build the keyframe and compute all parameters
      // this line builds the current keyframe interval
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed");
      // this line builds the previous keyframe interval
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed", true);
      if (!isKeyframeFromLoad) {
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().addTimeTag(keyframes, insertionIndex);
      }

      //events should be fired at the end of this function
      var eventType = isKeyframeFromLoad ? 'keyframe-loaded' : 'keyframe-added';
      var listeners = eventListeners[eventType];
      if (listeners) {
        for (var i = 0; i < listeners.length; i++) {
          try {
            listeners[i](cloneFrame(keyframe), insertionIndex, keyframes, loadKeyframesLength);
          } catch(e) {
            UTIL.error(e.name + " while calling snaplapse '" + eventType + "' event listener: " + e.message, e);
          }
        }
      }
    };

    this.setTextAnnotationForKeyframe = function(keyframeId, description, isDescriptionVisible) {
      if (keyframeId && keyframesById[keyframeId]) {
        if (description != undefined) {
          keyframesById[keyframeId]['description'] = description;
        }
        keyframesById[keyframeId]['is-description-visible'] = isDescriptionVisible;
        return true;
      }
      return false;
    };

    var sanitizeDuration = function(rawDuration) {
      if ( typeof rawDuration != 'undefined' && rawDuration != null) {
        var rawDurationStr = rawDuration + '';
        if (rawDurationStr.length > 0) {
          var num = parseFloat(rawDurationStr);
          if (!isNaN(num) && (num >= 0)) {
            return num.toFixed(1) - 0;
          }
        }
      }
      return null;
    };

    this.setDurationForKeyframe = function(keyframeId, duration) {
      if (keyframeId && keyframesById[keyframeId]) {
        keyframesById[keyframeId]['duration'] = sanitizeDuration(duration);
      }
      tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "duration");
      return keyframesById[keyframeId];
    };

    this.updateTimeAndPositionForKeyframe = function(keyframeId) {
      if (keyframeId && keyframesById[keyframeId]) {
        var bounds = timelapse.getBoundingBoxForCurrentView();
        var keyframe = keyframesById[keyframeId];
        keyframe['time'] = org.gigapan.timelapse.Snaplapse.normalizeTime(timelapse.getCurrentTime());
        keyframe['captureTime'] = timelapse.getCurrentCaptureTime();
        keyframe['bounds'] = {};
        keyframe['bounds'].xmin = bounds.xmin;
        keyframe['bounds'].ymin = bounds.ymin;
        keyframe['bounds'].xmax = bounds.xmax;
        keyframe['bounds'].ymax = bounds.ymax;

        var index = keyframes.length;
        for (var j = 0; j < keyframes.length; j++) {
          if (keyframeId == keyframes[j]['id']) {
            index = j;
            break;
          }
        }
        var $keyframeItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selectee");
        updateKeyframeAndUI(keyframes[index], $keyframeItems.eq(index));
        updateKeyframeAndUI(keyframes[index - 1], $keyframeItems.eq(index - 1));
        tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed");
        tryBuildKeyframeInterval_refreshKeyframeParas(keyframeId, "speed", true);
        if (timelapse.getVisualizer()) {
          timelapse.getVisualizer().deleteTimeTag(keyframeId, keyframes[index - 1]);
          timelapse.getVisualizer().addTimeTag(keyframes, index);
        }
        var tagColor = timelapse.getTagColor();
        var color_head = "rgba(" + tagColor[0] + "," + tagColor[1] + "," + tagColor[2] + ",";

        //events should be fired at the end of this function
        var listeners = eventListeners['keyframe-modified'];
        if (listeners) {
          for (var i = 0; i < listeners.length; i++) {
            try {
              listeners[i](cloneFrame(keyframe));
            } catch(e) {
              UTIL.error(e.name + " while calling snaplapse 'keyframe-modified' event listener: " + e.message, e);
            }
          }
        }

        return color_head;
      }
    };

    this.deleteKeyframeById = function(keyframeId) {
      if (keyframeId && keyframesById[keyframeId]) {
        var indexToDelete = -1;
        for (var i = 0; i < keyframes.length; i++) {
          if (keyframeId == keyframes[i]['id']) {
            indexToDelete = i;
            break;
          }
        }
        keyframes.splice(indexToDelete, 1);
        delete keyframesById[keyframeId];

        if (keyframes[indexToDelete - 1]) {
          var $keyframeItems = $("#" + composerDivId + " .snaplapse_keyframe_list > .ui-selectee");
          resetKeyframeAndUI(keyframes[indexToDelete - 1], $keyframeItems.eq(indexToDelete - 1));
          tryBuildKeyframeInterval_refreshKeyframeParas(keyframes[indexToDelete-1]['id'], "speed");
        }
        hideLastKeyframeTransition();
        if (timelapse.getVisualizer())
          timelapse.getVisualizer().deleteTimeTag(keyframeId, keyframes[indexToDelete - 1]);
        return true;
      }
      return false;
    };

    this.getKeyframes = function() {
      var keyframesClone = [];
      for (var i = 0; i < keyframes.length; i++) {
        keyframesClone[i] = cloneFrame(keyframes[i]);
      }
      return keyframesClone;
    };

    var buildKeyframeIntervals = function(startingKeyframeIndex) {
      UTIL.log("buildKeyframeIntervals()");
      var intervals = [];
      for (var k = startingKeyframeIndex + 1; k < keyframes.length; k++) {
        var previousKeyframeInterval = (intervals.length > 0) ? intervals[intervals.length - 1] : null;
        var isFirstKeyframe = false;
        if (k == startingKeyframeIndex + 1) {
          isFirstKeyframe = true;
        }
        var keyframeInterval = new org.gigapan.timelapse.KeyframeInterval(keyframes[k - 1], keyframes[k], previousKeyframeInterval, timelapse.getDuration(), composerDivId, undefined, isFirstKeyframe);
        intervals[intervals.length] = keyframeInterval;
        UTIL.log("   buildKeyframeIntervals(): created keyframe interval (" + (intervals.length - 1) + "): between time [" + keyframes[k - 1]['time'] + "] and [" + keyframes[k]['time'] + "]: " + keyframeInterval);
      }
      return intervals;
    };

    this.play = function(startingKeyframeId) {
      UTIL.log("play(): playing time warp!");
      if (keyframes.length > 1) {
        if (!isCurrentlyPlaying) {
          // make sure playback is stopped
          timelapse.pause();

          // find the starting keyframe
          var startingKeyframeIndex = 0;
          for (var j = 0; j < keyframes.length; j++) {
            if (keyframes[j]['id'] == startingKeyframeId) {
              startingKeyframeIndex = j;
              break;
            }
          }

          timelapse.warpToBoundingBox(keyframes[startingKeyframeIndex].bounds);
          timelapse.seek(keyframes[startingKeyframeIndex].time);

          //this is a hack to wait for seeking
          setTimeout(function() {
            isCurrentlyPlaying = true;
            // compute the keyframe intervals
            keyframeIntervals = buildKeyframeIntervals(startingKeyframeIndex);

            // initialize the current keyframe interval
            warpStartingTime = new Date().getTime();
            setCurrentKeyframeInterval(keyframeIntervals[0]);

            // start playback
            UTIL.log("play(): starting time warp playback");
            timelapse.play();

            // Set an interval which calls the timeCounterHandler.  This is much more reliable than adding
            // a listener to the timelapse because the video element doesn't actually fire time change events
            // for every time change.
            startTimeCounterInterval();

            var listeners = eventListeners['play'];
            if (listeners) {
              for (var i = 0; i < listeners.length; i++) {
                try {
                  listeners[i]();
                } catch(e) {
                  UTIL.error(e.name + " while calling snaplapse 'play' event listener: " + e.message, e);
                }
              }
            }
          }, 500);
        }
      }
    };

    var changeTimelapsePlaybackRateUI = function(rate) {
      var speedChoice;
      var timelapseViewerDivId = timelapse.getViewerDivId();
      $("#" + timelapseViewerDivId + " .playbackSpeedOptions li a").each(function() {
        speedChoice = $(this);
        if ((speedChoice.attr("data-speed") - 0) == rate)
          return false;
      });
      $("#" + timelapseViewerDivId + " .playbackSpeed span").text(speedChoice.text());
    };

    var _stop = function(willJumpToLastKeyframe) {
      if (isCurrentlyPlaying) {

        resetWaitFlags();
        currentKeyframeInterval = null;

        isCurrentlyPlaying = false;

        // stop playback
        timelapse.pause();

        // clear the time counter interval
        stopTimeCounterInterval();

        if ( typeof willJumpToLastKeyframe != 'undefined' && willJumpToLastKeyframe) {
          timelapse.warpToBoundingBox(keyframes[keyframes.length - 1]['bounds']);
          timelapse.seek(keyframes[keyframes.length - 1]['time']);
        }

        // the rate changes as a warp plays so reset to the default rate once we stop playback
        timelapse.setPlaybackRate(1)
        changeTimelapsePlaybackRateUI(1);

        var listeners = eventListeners['stop'];
        if (listeners) {
          for (var i = 0; i < listeners.length; i++) {
            try {
              listeners[i]();
            } catch(e) {
              UTIL.error(e.name + " while calling snaplapse 'stop' event listener: " + e.message, e);
            }
          }
        }
      }
    };
    this.stop = _stop;

    this.getKeyframeById = function(keyframeId) {
      if (keyframeId) {
        var keyframe = keyframesById[keyframeId];
        if (keyframe) {
          return cloneFrame(keyframe);
        }
      }
      return null;
    };

    this.getNumKeyframes = function() {
      return keyframes.length;
    };

    this.isPlaying = function() {
      return isCurrentlyPlaying;
    };

    this.addEventListener = function(eventName, listener) {
      if (eventName && listener && typeof (listener) == "function") {
        if (!eventListeners[eventName]) {
          eventListeners[eventName] = [];
        }

        eventListeners[eventName].push(listener);
      }
    };

    this.removeEventListener = function(eventName, listener) {
      if (eventName && eventListeners[eventName] && listener && typeof (listener) == "function") {
        for (var i = 0; i < eventListeners[eventName].length; i++) {
          if (listener == eventListeners[eventName][i]) {
            eventListeners[eventName].splice(i, 1);
            return;
          }
        }
      }
    };

    this.getSnaplapseViewer = function() {
      return viewer;
    };

    var cloneFrame = function(frame) {
      return $.extend({}, frame);
    };

    var setCurrentKeyframeInterval = function(newKeyframeInterval) {
      UTIL.log("setCurrentKeyframeInterval(" + newKeyframeInterval + ")");

      currentKeyframeInterval = newKeyframeInterval;

      if (currentKeyframeInterval != null) {
        var rate = currentKeyframeInterval.getPlaybackRate();
        timelapse.setPlaybackRate(rate);

        // when we set the current keyframe interval
        // ask if we need to do an extra pausing at the beginning of playing the timewarp
        currentWaitForExtraStart = currentKeyframeInterval.getWaitForExtraStartFlag();
        if (currentWaitForExtraStart) {
          // if yes, get the duration
          extraWaitForStartDuration = currentKeyframeInterval.getExtraWaitForStartDuration();
          waitForStart = false;
          waitForEnd = false;
        }
        currentWaitDuration = currentKeyframeInterval.getWaitDuration();
        var currentFrame = currentKeyframeInterval.getStartingFrame();
        if (currentFrame) {
          UTIL.selectSelectableElements($("#" + composerDivId + " .snaplapse_keyframe_list"), $("#" + composerDivId + "_snaplapse_keyframe_" + currentFrame.id))
        }

        var keyframeStartingTime = currentKeyframeInterval.getStartingTime();

        if (keyframeStartingTime) {
          timelapse.seek(keyframeStartingTime);
          // make sure we're on track
          updateWarpStartingTime(keyframeStartingTime);
        }
        // update the warp starting time since we just corrected with a seek
      }

      // notify listeners
      var listeners = eventListeners['keyframe-interval-change'];
      if (listeners) {
        for (var i = 0; i < listeners.length; i++) {
          try {
            listeners[i](cloneFrame( currentKeyframeInterval ? currentKeyframeInterval.getStartingFrame() : keyframes[keyframes.length - 1]));
          } catch(e) {
            UTIL.error(e.name + " while calling snaplapse 'keyframe-interval-change' event listener: " + e.message, e);
          }
        }
      }
    };

    var startTimeCounterInterval = function() {
      // record starting timestamp
      warpStartingTime = new Date().getTime();
      createTimeCounterInterval();
    };

    var stopTimeCounterInterval = function() {
      clearInterval(timeCounterIntervalHandle);
    };

    var resumeTimeCounterInterval = function() {
      // update the starting timestamp since we're resuming from a stall
      //TODO use (warpStartingTime + stalledTime) instead of timelapse.getCurrentTime()
      //updateWarpStartingTime(timelapse.getCurrentTime());
      if (isCurrentlyPlaying)
        createTimeCounterInterval();
    };

    var pauseTimeCounterInterval = function() {
      stopTimeCounterInterval();
    };

    var createTimeCounterInterval = function() {
      timeCounterIntervalHandle = setInterval(function() {
        timeCounterHandler();
      }, 20);
    };

    var updateWarpStartingTime = function(videoTime) {
      if (currentKeyframeInterval.getActualDuration() > 0) {
        var elapsedVideoTimePercentage = Math.abs(videoTime - currentKeyframeInterval.getStartingTime()) / currentKeyframeInterval.getActualDuration();
        var oldWarpStartingTime = warpStartingTime;
        warpStartingTime = new Date().getTime() - (currentKeyframeInterval.getDesiredDurationInMillis() * elapsedVideoTimePercentage + currentKeyframeInterval.getStartingRunningDurationInMillis());
        UTIL.log("updateWarpStartingTime(): adjusted warp starting time by [" + (warpStartingTime - oldWarpStartingTime) + "] millis (videoTime=" + videoTime + ")");
      }
    };

    var timeCounterHandler = function() {
      var currentTime = timelapse.getCurrentTime();
      var videoDuration = timelapse.getDuration();

      // if we need to do an extra pausing at the beginning of playing the timewarp
      if (currentWaitForExtraStart) {
        // set the flag to false to prevent pausing again
        currentWaitForExtraStart = false;
        waitFor_timeout = timelapse.waitFor(extraWaitForStartDuration, function() {
          waitForEnd = true;
          waitForStart = false;
        });
      }

      // when the video time is at the end, we pause the video for a user specified duration and loop it
      // waitForEnd is initially set to true
      if (currentTime >= videoDuration && waitForEnd == true) {
        // we are going to pause the video, so we set the "pausing at the end" flag to false to prevent pausing again
        waitForEnd = false;
        // calculate the overshooting time
        var desync = currentTime - videoDuration;
        // pause at the end
        waitFor_timeout = timelapse.waitFor(currentWaitDuration.end + desync, function() {
          // now we are going to pause at the beginning when we loop the video
          // so we set the "pausing at the beginning" flag to true
          waitForStart = true;
          timelapse.seek(0);
          timelapse.play();
        });
      }

      // when the video time is at the beginning when we looped, we want to pause for a user specified duration
      if (waitForStart == true) {
        // we are going to pause the video, so we set the "pausing at the beginning" flag to false to prevent pausing again
        waitForStart = false;
        waitFor_timeout = timelapse.waitFor(currentWaitDuration.start, function() {
          // reset the "pausing at the end" flag after pausing
          waitForEnd = true;
        });
      }

      // compute how much time (in millis) has already elapsed
      var elapsedTimeInMillis = new Date().getTime() - warpStartingTime;

      //UTIL.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> timeCounterHandler(" + elapsedTimeInMillis + ")");

      // update the current keyframe interval based on the elapsed time
      var foundMatchingInterval = false;
      do {
        if (!currentKeyframeInterval) {
          break;
        }
        var containsElapsedTime = currentKeyframeInterval.containsElapsedTime(elapsedTimeInMillis);
        if (containsElapsedTime) {
          foundMatchingInterval = true;
        } else {
          setCurrentKeyframeInterval(currentKeyframeInterval.getNextKeyframeInterval());
        }
      } while (!foundMatchingInterval && currentKeyframeInterval != null);

      if (currentKeyframeInterval) {
        // compute the frame for the current time
        var frameBounds = currentKeyframeInterval.computeFrameBoundsForElapsedTime(elapsedTimeInMillis);
        if (frameBounds) {
          // warp to the correct view
          timelapse.warpToBoundingBox(frameBounds);
        } else {
          UTIL.error("Failed to compute time warp frame for time [" + elapsedTimeInMillis + "]");
          _stop(true);
        }
      } else {
        UTIL.error("Failed to compute current keyframe interval for time [" + elapsedTimeInMillis + "]");
        _stop(true);
        UTIL.selectSelectableElements($("#" + composerDivId + " .snaplapse_keyframe_list"), $("#" + composerDivId + "_snaplapse_keyframe_" + keyframes[keyframes.length - 1].id))
      }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor code
    //

    org.gigapan.Util.ajax("html", "", "time_warp_composer.html", function(html) {
      $composerDivObj.html(html);
      viewer = new org.gigapan.timelapse.snaplapse.SnaplapseViewer(thisObj, timelapse, settings);
    });

    /*$composerDivObj.load('time_warp_composer.html', function(response, status, xhr) {
     if (status == "error") {
     org.gigapan.Util.error("Error loading time warp composer controls.");
     return;
     }
     viewer = org.gigapan.timelapse.snaplapse.SnaplapseViewer(thisObj,timelapse);
     });*/

  };

  org.gigapan.timelapse.Snaplapse.normalizeTime = function(t) {
    return parseFloat(t.toFixed(6));
  };

  org.gigapan.timelapse.KeyframeInterval = function(startingFrame, endingFrame, previousKeyframeInterval, videoDuration, composerDivId, constraintParaName, isFirstKeyframe) {
    var nextKeyframeInterval = null;
    var playbackRate = null;
    var itemIdHead = composerDivId + "_snaplapse_keyframe_" + startingFrame.id;
    var desiredSpeed = startingFrame['speed'] == null ? 100 : startingFrame['speed'];
    var timeDirection = (startingFrame['time'] <= endingFrame['time']) ? 1 : -1;
    var isLoop = startingFrame['is-loop'];
    var waitDuration = null;
    var waitForExtraStart = false;
    var extraWaitForStartDuration = 0;

    if (isLoop) {
      waitDuration = {
        start: startingFrame['waitStart'] == null ? 0.5 : startingFrame['waitStart'],
        end: startingFrame['waitEnd'] == null ? 0.5 : startingFrame['waitEnd']
      };
      if (isFirstKeyframe == true) {
        if (startingFrame['time'] == 0) {
          waitForExtraStart = true;
          // extraWaitForStartDuration is used when users want to pause the keyframe starting at the begining of the video
          // This is an exception for the loop dwelling math
          // If the first keyframe starts at source time zero, we still need to pause it (using waitForExtraStart flag)
          // we compute the duration in KeyframeInterval class and use it in snaplapse
          extraWaitForStartDuration = waitDuration.start;
        }
      }
    } else {
      //waitDuration is the time that users want to pause the video at the begining or end while looping
      waitDuration = {
        start: 0,
        end: 0
      };
    }

    if (constraintParaName) {
      /////////////////////////////////////////////
      // updating mode: update parameters and UI
      // this mode is for adding, deleting, and refreshing keyframes

      // compute the duration of source time
      var actualDuration = Math.abs(parseFloat(Math.abs(endingFrame['time'] - startingFrame['time'])));
      // compute the duration of playback time (include looping)
      var desiredDuration = startingFrame['duration'] == null ? actualDuration : startingFrame['duration'];
      if (isLoop) {
        /////////////////////////////////////////////
        // if the user want to loop the video
        if (constraintParaName == "speed") {
          // the primary constraint is speed
          // this means we want to fix the speed and compute other parameters
          var loopTimes = startingFrame['loopTimes'] == null ? 1 : startingFrame['loopTimes'];
          if (actualDuration == 0) {
            if (desiredSpeed == 0) {
              // in looping mode, the speed must be greater than 0
              desiredSpeed = 100;
            }
            if (loopTimes == 0) {
              // in looping mode, the minimum times for looping is 1
              loopTimes = 1;
            }
          }
          if (desiredSpeed == 0)
            desiredSpeed = 100;
          playbackRate = desiredSpeed / 100;
          var playbackTime_withoutLooping = actualDuration / playbackRate;
          var playbackTime_eachLoop = videoDuration / playbackRate + waitDuration.start + waitDuration.end;
          if (timeDirection == 1) {
            // this means that the time goes forward
            desiredDuration = extraWaitForStartDuration + loopTimes * playbackTime_eachLoop + playbackTime_withoutLooping;
          } else {
            //if in looping mode and the time goes backwards, need to loop at least once
            if (loopTimes == 0) {
              loopTimes = 1;
            }
            desiredDuration = extraWaitForStartDuration + loopTimes * playbackTime_eachLoop - playbackTime_withoutLooping;
          }
        } else if (constraintParaName == "duration") {
          // the primary constraint is duration
          // this means we want to fix the duration and compute other parameters
          playbackRate = desiredSpeed / 100;
          if (desiredDuration < actualDuration / playbackRate / 100) {
            // set a threshold for the smallest duration
            // so we don't get extremely high speeds like 9999999%
            desiredDuration = actualDuration / playbackRate / 100;
          }
          var loopTimes;
          var playbackTime_withoutLooping = actualDuration / playbackRate;
          var playbackTime_eachLoop = videoDuration / playbackRate + waitDuration.start + waitDuration.end;
          if (timeDirection == 1) {
            // this means that the time goes forward
            loopTimes = Math.round((desiredDuration - playbackTime_withoutLooping - extraWaitForStartDuration) / playbackTime_eachLoop);
            if (actualDuration == 0 && loopTimes == 0) {
              // in looping mode, the minimum times for looping is 1
              loopTimes = 1;
            }
            desiredDuration = loopTimes * playbackTime_eachLoop + playbackTime_withoutLooping + extraWaitForStartDuration;
          } else {
            // this means that the time goes backward
            loopTimes = Math.round((desiredDuration + playbackTime_withoutLooping - extraWaitForStartDuration) / playbackTime_eachLoop);
            if (loopTimes == 0) {
              // in looping mode, the minimum times for looping is 1
              loopTimes = 1;
            }
            desiredDuration = loopTimes * playbackTime_eachLoop - playbackTime_withoutLooping + extraWaitForStartDuration;
          }
        }
      } else {
        /////////////////////////////////////////////
        // if the user don't want to loop the video
        if (actualDuration == 0) {
          // for two identical keyframes with the same source time, the speed should be 0
          desiredSpeed = 0;
        }
        if (constraintParaName == "speed") {
          // the primary constraint is speed
          // this means we want to fix the speed and compute other parameters
          if (desiredSpeed != 0) {
            playbackRate = desiredSpeed / 100;
            desiredDuration = actualDuration / playbackRate;
          }
        } else if (constraintParaName == "duration") {
          // the primary constraint is duration
          // this means we want to fix the duration and compute other parameters
          if (actualDuration != 0) {
            if (desiredSpeed != 0) {
              if (desiredDuration > actualDuration * 1000) {
                // set a threshold for the largest duration
                // so we don't get extremely low speeds like 0.000001%
                desiredDuration = actualDuration * 1000;
              } else if (desiredDuration < actualDuration / 100) {
                // set a threshold for the smallest duration
                // so we don't get extremely high speeds like 9999999%
                desiredDuration = actualDuration / 100;
              }
              playbackRate = actualDuration / desiredDuration;
              desiredSpeed = playbackRate * 100;
            }
          } else {
            desiredSpeed = 0;
          }
        }
      }
      // update the UI and keyframe parameters
      startingFrame['speed'] = desiredSpeed;
      $("#" + itemIdHead + "_speed").val(desiredSpeed);
      startingFrame['loopTimes'] = loopTimes;
      $("#" + itemIdHead + "_loopTimes").val(loopTimes);
      startingFrame['duration'] = desiredDuration;
      $("#" + itemIdHead + "_duration").val(desiredDuration.toFixed(2));
    } else {
      /////////////////////////////////////////////
      // playing mode: playing the timewarp
      // this mode is for playing the timewarp
      var loopTimes = 0;
      if (isLoop) {
        loopTimes = startingFrame['loopTimes'] == null ? 0 : startingFrame['loopTimes'];
      }
      if (timeDirection == -1 && isLoop) {
        timeDirection = 1;
      }
      var startingFrameTimes = startingFrame['time'];
      var endingFrameTimes = endingFrame['time'] + loopTimes * (videoDuration + waitDuration.start + waitDuration.end) + extraWaitForStartDuration;
      var actualDuration = parseFloat(Math.abs(endingFrameTimes - startingFrameTimes).toFixed(6));
      var desiredDuration = startingFrame['duration'] == null ? actualDuration : startingFrame['duration'];

      var desiredDurationInMillis = desiredDuration * 1000;
      var startingRunningDurationInMillis = 0;
      var endingRunningDurationInMillis = desiredDurationInMillis;

      if (previousKeyframeInterval != null) {
        previousKeyframeInterval.setNextKeyframeInterval(this);
        var previousRunningDurationInMillis = previousKeyframeInterval.getEndingRunningDurationInMillis();
        endingRunningDurationInMillis += previousRunningDurationInMillis;
        startingRunningDurationInMillis = previousRunningDurationInMillis
      }
      if (desiredDuration == 0 || actualDuration == 0) {
        playbackRate = 0;
      } else {
        playbackRate = timeDirection * desiredSpeed / 100;
      }
    }

    this.getWaitDuration = function() {
      return waitDuration;
    };

    this.getWaitForExtraStartFlag = function() {
      return waitForExtraStart;
    };

    this.getExtraWaitForStartDuration = function() {
      return extraWaitForStartDuration;
    };

    this.getPreviousKeyframeInterval = function() {
      return previousKeyframeInterval;
    };

    this.getStartingFrame = function() {
      return startingFrame;
    };

    this.getStartingTime = function() {
      return startingFrameTimes;
    };

    this.getEndingTime = function() {
      return endingFrameTimes;
    };

    this.getActualDuration = function() {
      return actualDuration;
    };

    this.getDesiredDurationInMillis = function() {
      return desiredDurationInMillis;
    };

    this.getNextKeyframeInterval = function() {
      return nextKeyframeInterval;
    };

    this.setNextKeyframeInterval = function(theNextKeyframeInterval) {
      nextKeyframeInterval = theNextKeyframeInterval;
    };

    this.getPlaybackRate = function() {
      return playbackRate;
    };

    this.getStartingRunningDurationInMillis = function() {
      return startingRunningDurationInMillis;
    };

    this.getEndingRunningDurationInMillis = function() {
      return endingRunningDurationInMillis;
    };

    this.containsElapsedTime = function(millis) {
      return startingRunningDurationInMillis <= millis && millis <= endingRunningDurationInMillis;
    };

    this.computeFrameBoundsForElapsedTime = function(elapsedMillis) {
      if (this.containsElapsedTime(elapsedMillis)) {
        var timeRatio = (elapsedMillis - startingRunningDurationInMillis) / desiredDurationInMillis;
        var bounds = timelapse.computeMotion(startingFrame['bounds'], endingFrame['bounds'], timeRatio);
        return bounds;
      }
      return null;
    };

    this.toString = function() {
      return 'KeyframeInterval' + '[startTime=' + startingFrame['time'] + ',endTime=' + endingFrame['time'] + ',actualDuration=' + actualDuration + ',desiredDuration=' + desiredDuration + ',playbackRate=' + playbackRate + ',timeDirection=' + timeDirection + ',startingRunningDurationInMillis=' + startingRunningDurationInMillis + ',endingRunningDurationInMillis=' + endingRunningDurationInMillis + ']';
    };

  };
})();
