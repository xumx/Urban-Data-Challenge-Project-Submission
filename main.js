DDSimulator.MODEL_URL = 'http://localhost:3333/tram/doc.kml';

var dev = {};

var map;
var sql = new cartodb.SQL({
	user: 'xumx'
});

google.load('earth', '1.x')

function initialize(argument) {
	initializeMap(initializeToggle);
	feature2.pullPassengerData();
	draw_graph();
	draw_clock();
	// initializeEarth();
}

var feature1 = {
	torque: null,
	'Visualize Traffic': function() {
		feature1.torque.pause()
	},
	Pause: function() {
		feature1.torque.pause()
	},
	'Show/Hide Routes': function() {
		if (map.overlayMapTypes.getAt(1)) {
			map.overlayMapTypes.removeAt(1);
		} else {
			cartodb.createLayer(map, {
				type: 'cartodb',
				options: {
					table_name: 'routes',
					user_name: 'xumx',
					query: 'select the_geom_webmercator from {{table_name}}',
					interaction: false
				}
			}).done(function(layer) {
				map.overlayMapTypes.setAt(1, layer);
			});
		}
	},
	'Show/Hide Graph': function() {
		$('#graph_container').toggle();
	}
}

var feature2 = {
	showVolume: false,
	markerArray: [],
	passengerData: {},

	'Visualize Volume': function() {
		$('#map_canvas').transition({
			rotateX: '45deg',
			duration: 4000
		});

		feature2.showVolume = true;
	},
	'Reset View': function() {
		$('#map_canvas').transition({
			rotateX: '0deg'
		});
		feature2.Clear();
	},

	pullPassengerData: function() {

		query = "SELECT ST_X(the_geom) AS x, ST_Y(the_geom) as y," +
			"date_trunc('hour',stoptimereal) as time, stopcode," +
			"sum(passengercountstopup) as board," +
			"sum(passengercountstopdown) as alight," +
			"sum(sum(passengercountstopup - passengercountstopdown)) over (partition by stopcode order by date_trunc('hour',stoptimereal)) as difference " +
			"from trips group by stopcode, time, the_geom";

		sql.execute(query).done(function(response) {

			for (d in response.rows) {
				var record = response.rows[d];
				if (feature2.passengerData[record.time] == undefined) {
					feature2.passengerData[record.time] = []
				}

				feature2.passengerData[record.time].push({
					x: record.x,
					y: record.y,
					stopcode: record.stopcode,
					volume: record.difference
				});
			}
		}).error(function(errors) {
			console.log(errors);
		});
	},

	drawFrame: function() {

		feature2.time.setMinutes(0);
		feature2.time.setSeconds(0);

		if (feature2.frame == feature2.time.toISOString()) {
			return;
		} else {
			console.log("Drawing Frame");
			feature2.frame = feature2.time.toISOString();
		}

		var frame = feature2.passengerData[feature2.time.toISOString()];

		if (frame == undefined) {
			console.log(feature2.time.toISOString());
		} else {


			for (var i = 0; i < frame.length; i++) {
				var stop = frame[i];
				var exist = false;

				for (var j = 0; j < feature2.markerArray.length; j++) {
					if (feature2.markerArray[j].stopcode == stop.stopcode) {
						exist = true;
						feature2.markerArray[j].setHeight(stop.volume);
						break;
					}
				}

				if (!exist) {
					if (stop.volume !== 0) {
						overlay = new CustomMarker(map, new google.maps.LatLng(stop.y, stop.x), stop.stopcode, stop.volume);
						feature2.markerArray.push(overlay);
					}
				}
			}
		}
	},
	Clear: function() {
		for (var i = 0; i < feature2.markerArray.length; i++) {
			feature2.markerArray[i].setMap(null);
		}

		feature2.showVolume = false;
	}
}

var feature3 = {
	'Choose a Route': 'A',
	'Tram Speed': 3,
	'Camera Distance': 300,
	uniqueRouteCode: ["1", "2", "03", "5", "04", "06", "07", "08", "10", "11", "12", "12B", "14", "19", "21", "22", "23", "28", "31", "32", "33", "34", "35", "36", "41", "41S", "42", "43", "44", "45", "46", "47", "51", "53", "54", "57", "80", "81", "84", "85", "86", "9", "96", "A", "B", "C", "D", "DN", "E", "Eb", "F", "G", "Gb", "K", "L", "M1", "M2", "M3", "M4", "NA", "NC", "ND", "NE", "NJ", "NK", "NM", "NO", "NP", "NS", "NT", "NV", "O", "S", "T", "TAC1", "TAC2", "TAC3", "TAC4", "TAC5", "TACD3", "V", "VB", "W", "X", "Y", "Z"],
	Simulate: function() {
		$('#map_canvas').transition({
			rotateX:'90deg'
		}, function () {
			this.hide();
		});

		$('#clock_id').hide();
		$('#graph_container').hide();
		$('#earth_canvas').show();

		var children = DS_ge.getFeatures().getChildNodes();
		for (var i = 0; i < children.getLength(); i++) {
			var child = children.item(i);
			if (child.getType() == 'KmlPlacemark') {
				DS_ge.getFeatures().removeChild(child);
			}
		}

		if (DS_simulator) DS_simulator.destroy();

		feature3.fetchRouteAsPath(feature3['Choose a Route'], function(path) {
			DS_ge.getWindow().setVisibility(true);
			DS_simulator = DDSimulator(DS_ge, DS_path);
			DS_controlSimulator('start');
		});

		feature3.fetchStopsOnRoute(feature3['Choose a Route'], function(stops) {
			for (var i = 0; i < stops.length; i++) {
				addStop(stops[i]);
			}

			function addStop(stop) {
				// Create the placemark.
				var placemark = DS_ge.createPlacemark('');
				placemark.setName(stop.name);

				// Define a custom icon.
				var icon = DS_ge.createIcon('');
				icon.setHref('http://www.fixmytransport.com/images/map-icons/map-tram-green-sml.png');
				var style = DS_ge.createStyle(''); //create a new style
				style.getIconStyle().setIcon(icon); //apply the icon to the style
				placemark.setStyleSelector(style); //apply the style to the placemark

				// Set the placemark's location.  
				var point = DS_ge.createPoint('');
				point.setLatitude(stop.y);
				point.setLongitude(stop.x);
				placemark.setGeometry(point);

				// Add the placemark to Earth.
				DS_ge.getFeatures().appendChild(placemark);
			}
		})
	},
	Pause: function() {
		DS_controlSimulator('pause');
	},
	Resume: function() {
		DS_controlSimulator('resume');
	},
	setSpeed: function(speed) {
		DS_simulator.options.speed = speed;
	},
	setRange: function(zoom) {
		DS_simulator.options.zoom = zoom;
	},
	showStops: function(routecode) {
		var where = (routecode) ? 'WHERE routecode = \'' + routecode + '\' AND (routedirection = 1 OR routedirection is null)' : '';

		sql.getBounds('select * from routes ' + where).done(function(bounds) {
			var ne = new google.maps.LatLng(bounds[0][0], bounds[0][1]);
			var sw = new google.maps.LatLng(bounds[1][0], bounds[1][1]);
			var bounds = new google.maps.LatLngBounds(sw, ne);
			map.fitBounds(bounds);

			cartodb.createLayer(map, {
				type: 'cartodb',
				options: {
					table_name: 'routes',
					user_name: 'xumx',
					query: 'SELECT the_geom_webmercator FROM {{table_name}} ' + where,
					interaction: false
				}
			}).done(function(layer) {
				routesLayer = layer;
				map.overlayMapTypes.setAt(1, routesLayer);
			});

			where = (routecode) ? 'WHERE routecode = \'' + routecode + '\' AND routedirection = 1' : '';
			cartodb.createLayer(map, {
				type: 'cartodb',
				options: {
					table_name: 'stops',
					user_name: 'xumx',
					query: 'SELECT * FROM {{table_name}} ' + where,
					interaction: false
				}
			}).done(function(layer) {
				stopsLayer = layer;
				map.overlayMapTypes.setAt(2, stopsLayer);
			});
		});
	},

	fetchRouteAsPath: function(routecode, callback) {
		var query = 'SELECT ST_AsText(ST_LineMerge(the_geom)) AS text FROM routes WHERE routecode = \'' + routecode + '\' AND (routedirection = 1 OR routedirection is null)';
		sql.execute(query, function(response) {
			var pointString = [];
			if (response.rows[0].text[0] == 'M') {
				pointString = response.rows[0].text.split('((')[1].split('))')[0].split(',');
			} else {
				pointString = response.rows[0].text.split('(')[1].split(')')[0].split(',');
			}

			var pointArray = [];

			for (var i = 0; i < pointString.length; i++) {
				pointString[i] = pointString[i].replace(')', '').replace('(', '');
				var p = pointString[i].split(' ');
				if (isNaN(parseFloat(p[0])) || isNaN(parseFloat(p[1]))) {
					console.log('Not a number');
				} else {
					pointArray.push(new google.maps.LatLng(p[1], p[0]));
				}
			}

			for (var i = 0; i < pointArray.length; i++) {
				var loc = pointArray[i];
				var distance = (i == pointArray.length - 1) ? 0 : DS_geHelpers.distance(loc, pointArray[i + 1]);

				DS_path.push({
					loc: loc,
					step: 1,
					distance: distance,
					duration: distance / 20
				});
			}

			callback();
		});
	},
	fetchStopsOnRoute: function(routecode, callback) {
		sql.execute("SELECT ST_X(the_geom) AS x, ST_Y(the_geom) as y, stopname AS name FROM stops WHERE routedirection = 1 AND routecode = \'" + routecode + '\'').done(function(data) {
			callback(data.rows);
		}).error(function(errors) {
			console.log('sql error fetchStopsOnRoute');
		});
	},
	Reset:function () {
		$('#clock_id').show();
		$('#map_canvas').show().transition({
			rotateX:'0deg'
		});

		map.setZoom(12);
		map.setCenter(new google.maps.LatLng(46.20, 6.15));
		map.overlayMapTypes.removeAt(1);
		map.overlayMapTypes.removeAt(2);
	}
};

function initializeMap(callback) {
	map = new google.maps.Map(document.getElementById('map_canvas'), {
		center: new google.maps.LatLng(46.20, 6.15),
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControl: false,
		disableDefaultUI: true,
		styles: [{
			stylers: [{
				invert_lightness: true
			}, {
				weight: 1
			}, {
				saturation: -100
			}, {
				lightness: -40
			}]
		}, {
			elementType: "labels",
			stylers: [{
				visibility: "simplified"
			}]
		}]
	});

	var TorqueOptions = {
		user: 'xumx',
		table: 'trips',
		column: 'stoptimereal',
		blendmode: 'lighter',
		point_type: 'circle',
		resolution: 1,
		fps: 15,
		steps: 1440,
		fitbounds: false,
		cumulative: false,
		trails: true,
		cellsize: 1,
		autoplay: false
	}

	Torque(function(env) {
		Torque.app = new env.app.Instance();
		feature1.torque = new Torque.app.addLayer(map, TorqueOptions);
		Torque.env = env;
	});

	callback(TorqueOptions);
}

function initializeEarth() {
	google.earth.createInstance('earth_canvas', function(ge) {
		DS_ge = ge;
		DS_geHelpers = new GEHelpers(DS_ge);

		ge.getNavigationControl().setVisibility(ge.VISIBILITY_AUTO);
		ge.getNavigationControl().getScreenXY().setXUnits(ge.UNITS_INSET_PIXELS);
		ge.getNavigationControl().getScreenXY().setYUnits(ge.UNITS_PIXELS);

		ge.getLayerRoot().enableLayerById(ge.LAYER_BUILDINGS, true);
		// ge.getLayerRoot().enableLayerById(ge.LAYER_BORDERS, true);
	}, function() {});
}

function initializeToggle(TorqueOptions) {
	dat.GUI.DEFAULT_WIDTH = 300;
	var toggle = new dat.GUI();

	var folder1 = toggle.addFolder('A Day in Geneva');
	folder1.add(feature1, 'Visualize Traffic');
	folder1.add(feature1, 'Pause');
	folder1.add(feature1, 'Show/Hide Routes');
	folder1.add(feature1, 'Show/Hide Graph');
	folder1.add(TorqueOptions, 'fps', 1, 48, false).listen();

	var folder2 = toggle.addFolder('Visualize Passenger Volume by Stop');
	folder2.add(feature2, 'Visualize Volume');
	folder2.add(feature2, 'Reset View');
	folder2.add(feature2, 'Clear');

	var folder3 = toggle.addFolder('Tram Simulation');
	folder3.add(feature3, 'Choose a Route', feature3.uniqueRouteCode).onChange(function(routecode) {
		feature3.showStops(routecode);
	});

	folder3.add(feature3, 'Simulate');
	folder3.add(feature3, 'Pause');
	folder3.add(feature3, 'Resume');
	folder3.add(feature3, 'Tram Speed', 0, 10).onChange(function(value) {
		feature3.setSpeed(value);
	});

	folder3.add(feature3, 'Camera Distance', 100, 1000).onChange(function(value) {
		feature3.setRange(value);
	});

	folder3.add(feature3, 'Reset');
}

function draw_graph() {
	var url = "http://xumx.cartodb.com/api/v2/sql?q="

	query = encodeURIComponent("select date_trunc('hour', stoptimereal) + interval'10 min' * round(date_part('minute', stoptimereal) / 10.0) as time, sum(passengercountstopup) as board, sum(passengercountstopdown) as alight from trips group by date_trunc('hour', stoptimereal) + interval'10 min' * round(date_part('minute', stoptimereal) / 10.0) order by date_trunc('hour',stoptimereal) + interval'10 min' * round(date_part('minute', stoptimereal) / 10.0)");
	url += query;

	var margin = {
		top: 10,
		right: 80,
		bottom: 30,
		left: 40
	}

	w = 960
	h = 140

	var color = d3.scale.category10();

	var x = d3.time.scale()
		.range([0, w]);

	var y = d3.scale.linear()
		.range([h, 0]);

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left");

	var line = d3.svg.line()
		.interpolate("basis")
		.x(function(d) {
		return x(new Date(d.time));
	})
		.y(function(d) {
		return y(d.board);
	});

	var line2 = d3.svg.line()
		.interpolate("basis")
		.x(function(d) {
		return x(new Date(d.time));
	})
		.y(function(d) {
		return y(d.alight);
	});

	var svg = d3.select("#graph").append("svg")
		.attr("width", w + margin.left + margin.right)
		.attr("height", h + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	d3.json(url, function(error, response) {
		data = response.rows;

		var startDate = new Date(data[0].time);
		var endDate = new Date(data[data.length - 1].time);
		var maxY = d3.max(data, function(c) {
			return c.board + 1000
		});

		x.domain([startDate, endDate]);
		y.domain([0, maxY]);

		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + h + ")")
			.call(xAxis)

		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Passenger");

		//Board
		svg.append("path")
			.datum(data)
			.attr("class", "line")
			.attr("d", line)
			.style("stroke", "green");

		//Alight
		svg.append("path")
			.datum(data)
			.attr("class", "line")
			.attr("d", line2)
			.style("stroke", "red");

		// svg.append("text")
		// .datum(function(d) {
		//  return {
		//      name: d.name,
		//      value: d.values[d.values.length - 1]
		//  };
		// })
		// .attr("transform", function(d) {
		//  return "translate(" + x(d.value.date) + "," + y(d.value.temperature) + ")";
		// })
		// .attr("x", 3)
		// .attr("dy", ".35em")
		// .text(function(d) {
		//  return d.name;
		// });
	});
}



//Clock

function draw_clock() {
	canvas = Raphael("clock_id", 150, 150);
	var clock = canvas.circle(75, 75, 70);
	clock.attr({
		"stroke": "#f5f5f5",
		"stroke-width": "5",
		"opacity": "0.7"
	})
	var hour_sign;
	for (i = 0; i < 12; i++) {
		var start_x = 75 + Math.round(55 * Math.cos(30 * i * Math.PI / 180));
		var start_y = 75 + Math.round(55 * Math.sin(30 * i * Math.PI / 180));
		var end_x = 75 + Math.round(65 * Math.cos(30 * i * Math.PI / 180));
		var end_y = 75 + Math.round(65 * Math.sin(30 * i * Math.PI / 180));
		hour_sign = canvas.path("M" + start_x + " " + start_y + "L" + end_x + " " + end_y);
		hour_sign.attr({
			"stroke": "#f5f5f5"
		})
	}
	hour_hand = canvas.path("M75 75L75 50");
	hour_hand.attr({
		stroke: "#f5f5f5",
		"stroke-width": 4
	});
	minute_hand = canvas.path("M75 75L75 40");
	minute_hand.attr({
		stroke: "#f5f5f5",
		"stroke-width": 2
	});
	var pin = canvas.circle(75, 75, 4);
	pin.attr("fill", "#FFFFFF");
}

function update_clock(now) {
	dev.time = feature2.time = new Date(now);

	if (feature2.showVolume) {
		feature2.drawFrame();
	}

	var hours = now.getUTCHours() + 1;
	var minutes = now.getMinutes();
	hour_hand.transform("t0,0r" + (30 * hours + minutes * 0.5) + ",75,75");
	minute_hand.transform("t0,0r" + (minutes * 6) + ",75,75");
}


//=== Custom Marker Class ===//

function CustomMarker(map, latlng, stopcode, height) {
	this.height = height;
	this.latlng_ = latlng;
	this.stopcode = stopcode
	this.setMap(map);
}

CustomMarker.prototype = new google.maps.OverlayView();

CustomMarker.prototype.setHeight = function(height) {
	this.height = height;
	this.draw();
}

CustomMarker.prototype.onRemove = function() {
	this.div_.parentNode.removeChild(this.div_);
	this.div_ = null;
}

CustomMarker.prototype.draw = function() {
	var me = this;

	// Check if the div has been created.
	var div = this.div_;
	// var img = this.img_;

	var panes = this.getPanes();
	var projection = this.getProjection();

	if (!(panes || projection)) return;

	if (!div) {
		// Create a overlay text DIV
		div = this.div_ = document.createElement('DIV');
		// Create the DIV representing our CustomMarker
		div.style.border = "none";
		div.style.position = "absolute";
		div.style.paddingLeft = "0px";
		div.style.width = "1px";
		div.className = 'stop_volume';
		div.id = this.stopcode;

		panes.overlayImage.appendChild(div);
	}

	if (this.height < 0) {
		div.style.background = "#D24367";
	} else {
		div.style.background = "#61ABD4";
	}

	div.style.height = (Math.floor(Math.abs(this.height) / 5) + 1) + 'px';

	// Position the overlay 
	var point = projection.fromLatLngToDivPixel(this.latlng_);
	if (point) {
		div.style.left = point.x + 'px';
		div.style.top = (point.y - (Math.floor(Math.abs(this.height) / 5) + 1)) + 'px';
	}
};