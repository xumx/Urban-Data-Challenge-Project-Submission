// index.js
/*
Copyright 2008 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @fileoverview This is the main JavaScript file for the Driving Simulator
 * @author Roman Nurik
 * @supported Tested in IE6+ and FF2+
 */

/**
 * The global Directions object for the currently loaded directions
 * @type {google.maps.Directions}
 */
var DS_directions = null;

/**
 * The list of driving steps loaded from google.maps.Directions
 * @type {Array.<Object>}
 */
var DS_steps = [];

/**
 * The list of path vertices and their metadata for the driving directions
 * @type {Array.<Object>}
 */
var DS_path = []; // entire driving path

/**
 * The global simulator instance that conducts the driving simulation
 * @type {DDSimulator}
 */
var DS_simulator; // instance of the DDSimulator class

/**
 * The car marker that appears on the reference map to the right of the main
 * simulation screen
 * @type {google.maps.Marker}
 */


/**
 * Instead of using the plugin's built-in ID system, which doesn't like when
 * IDs are reused, we will use a separate dictionary mapping ID to placemark
 * object
 * @type {Object}
 */
var DS_placemarks = {};

var DS_ge;

var DS_geHelpers;
/**
 * The callback for when the 'Go!' button is pressed. This uses the Maps API's
 * Directions class to get the route and pull out the individual route steps
 * into a path, which is rendered as a polyline.
 */

function DS_controlSimulator(command, opt_cb) {
  switch (command) {
    case 'reset':
      if (DS_simulator) DS_simulator.destroy();
      // create a DDSimulator object for the current DS_path array
      // on the DS_ge Earth instance
      DS_simulator = new DDSimulator(DS_ge, DS_path);

      // DS_updateSpeedIndicator();
      DS_simulator.initUI(opt_cb);
      break;

    case 'start':
      if (!DS_simulator) DS_controlSimulator('reset', function() {
        DS_simulator.start();
        if (opt_cb) opt_cb();
      });
      else {
        DS_simulator.start();
        if (opt_cb) opt_cb();
      }
      break;

    case 'pause':
      if (DS_simulator) DS_simulator.stop();

      if (opt_cb) opt_cb();
      break;

    case 'resume':
      if (DS_simulator) DS_simulator.start();

      if (opt_cb) opt_cb();
      break;
  }
}