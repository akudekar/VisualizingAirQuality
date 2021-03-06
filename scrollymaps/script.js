const initCoord = [51.96, 7.63];
const initZoom = 12;

const stationGeist = [51.936482, 7.611609]; // lat lon
const stationWeseler = [51.953275, 7.619379];

const boundsMuensterSmall = [[51.965114, 7.601657], [51.928291, 7.628437]];
const boundsMuenster = [[51.982262, 7.590976], [51.927088, 7.679865]];

const scrollyImg = ["lanuv.jpg", "sensebox.jpg", "bike.jpg", "All.jpg"];

// time formatters
var formatTime = d3.timeFormat("%d/%m/%Y, %H:%M");
var formatTimeHour = d3.timeFormat("%d%m%Y%H");

var t1, t2;

var main = d3.select("main");
var allSteps = d3.selectAll(".step");
var allFigures = d3.selectAll("figure");
var scrollyA = {
	scrolly: d3.select("#scrollyA"),
	img: d3.select("#scrollyA img"),
	step: d3.select("#scrollyA").selectAll(".step")
};

var scrollyB = {
	scrolly: d3.select("#scrollyB"),
	step: d3.select("#scrollyB").selectAll(".step")
};
var timerB1 = {
	div: d3.select("#timeB"),
	start: new Date(2019, 10, 14),
	end: new Date(2019, 10, 14, 23, 59, 59),
	speedFactor: 24 * 60
};

timerB1.scale = d3
	.scaleTime()
	.range([timerB1.start, timerB1.end])
	.domain([0, (timerB1.end - timerB1.start) / timerB1.speedFactor]);

var timerB2 = {
	div: d3.select("#timeB"),
	start: new Date(2019, 10, 14, 14, 25, 0),
	end: new Date(2019, 10, 14, 16, 3, 0),
	speedFactor: 24 * 6
};

timerB2.scale = d3
	.scaleTime()
	.range([timerB2.start, timerB2.end])
	.domain([0, (timerB2.end - timerB2.start) / timerB2.speedFactor]);

var scrollyC = {
	scrolly: d3.select("#scrollyC"),
	step: d3.select("#scrollyC").selectAll(".step")
};

// colour scale for pm10
var colourPM10 = d3
	.scaleSequential()
	.domain([65, 0]) // roughly the range of pm10 values
	.interpolator(d3.interpolateRdBu);

// opacity scale for fading in and out bike dots
var opacityScale = d3
	.scaleLinear()
	.domain([120000, 0]) // 2 minutes are 120000 ms
	.range([0, 1]);

// initialize the scrollama
var scrollerA = scrollama();
var scrollerB = scrollama();
var scrollerC = scrollama();

handleResize();

// setup resize event
window.addEventListener("resize", handleResize);

// initialize two Leaflet maps B and C
var mapB = L.map("mapB", {
	// disable all zoom controls that interfere with scrolling
	// zoomControl: false,
	scrollWheelZoom: false,
	doubleClickZoom: false,
	touchZoom: false
	// boxZoom: false
	// dragging: false
}).setView([51.97, 7.63], 13);
// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
	// attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(mapB);

// SVG overlay for mapB
L.svg().addTo(mapB);
const overlayB = d3.select(mapB.getPanes().overlayPane);
const svgB = overlayB.select("svg");
const gBikePath = svgB.append("g").attr("id", "gBikePath");
const gBikeDots = svgB.append("g").attr("id", "gBikeDots");
const gStationDots = svgB.append("g").attr("id", "gStationDots");
const gSenseBox = svgB.append("g").attr("id", "gSenseBox");

mapB.invalidateSize();

mapB.fitBounds(boundsMuensterSmall);

// DATA
Promise.all([
	d3.csv("data/lanuv_14Nov_modified.csv", parseLANUV),
	d3.csv("data/Sensebox_Geist_14-11-19.csv", function(d) {
		return parseSensebox(d, "2019-11-14-");
	}),
	d3.csv("data/bike_14-11.csv", parseBike)

	// not using the 19 Dec data currently
	// d3.csv("data/lanuv_19Dec_modified.csv", parseLANUV),
	// d3.csv("data/Sensebox_Geist_19-12-19.csv", parseSensebox),
	// d3.csv("data/bike_19-12.csv", parseBike)
])
	.then(function(data) {
		console.log("LANUV: ", data[0], "senseBox: ", data[1], "Bike:", data[2]);

		var data1 = { lanuv: data[0], sensebox: data[1], bike: data[2] };

		// start scrolly
		initScrollyA(data1);
		initScrollyB(data1);
		initScrollyC(data1);
	})
	.catch(function(err) {
		if (err) throw err;
	});

// SCROLLAMA FUNCTIONS

// generic window resize listener event
function handleResize() {
	// 1. update height of step elements
	var stepH = Math.floor(window.innerHeight * 0.75);
	allSteps.style("height", stepH + "px");
	var figureHeight = window.innerHeight * 0.95;
	var figureMarginTop = (window.innerHeight - figureHeight) / 2;
	allFigures
		.style("height", figureHeight + "px")
		.style("top", figureMarginTop + "px");
	// 3. tell scrollama to update new element dimensions
	scrollerA.resize();
	scrollerB.resize();
	scrollerC.resize();
}

////////////////////////////////////////////////////////////////////////////////
// SCROLLY A ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function initScrollyA(data) {
	setupStickyfill();

	scrollerA
		.setup({
			step: "#scrollyA article .step",
			offset: 0.33,
			debug: true
		})
		.onStepEnter(function(r) {
			handleStepEnterA(r, data);
		});
}

// scrollama event handlers
function handleStepEnterA(response, data) {
	// response = { element, direction, index }

	// add color to current step only
	scrollyA.step.classed("is-active", function(d, i) {
		return i === response.index;
	});

	// update image based on step
	scrollyA.img.attr("src", "img/" + scrollyImg[response.index]);
	// update map based on step
	// updateMap(response.index);
	// figure.select("p").text(response.index);
}

////////////////////////////////////////////////////////////////////////////////
// SCROLLY B ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function initScrollyB(data) {
	setupStickyfill();

	scrollerB
		.setup({
			step: "#scrollyB article .step",
			offset: 0.33,
			debug: true
		})
		.onStepEnter(r => handleStepEnterB(r, data))
		.onStepExit(r => handleStepExitB(r));
}

function handleStepExitB(response) {
	if ((response.index === 0) & (response.direction === "up")) {
		console.log("stopping t1");
		t1.stop();
	}

	if ((response.index === 3) & (response.direction === "down")) {
		console.log("stopping t2");
		t2.stop();
	}

	if ((response.index === 2) & (response.direction === "up")) {
		console.log("stopping t2");
		t2.stop();
	}
}

// scrollama event handlers
function handleStepEnterB(response, data) {
	// response = { element, direction, index }

	// add color to current step only
	scrollyB.step.classed("is-active", function(d, i) {
		return i === response.index;
	});

	switch (response.index) {
		case 0:
			// start timer
			var el1_hour = -1; // to store hour of previous elapsed time
			t1 = d3.timer(timer1, 150);
			function timer1(elapsed) {
				var el = timerB1.scale(elapsed);
				timerB1.div.html(formatTime(el));

				updateStationDots(data, el, el1_hour);
				updateSenseboxDots(data, el);
				updateBikeDots(el);

				// update elapsed time
				el1_hour = el.getHours();
				// make timer loop through one day
				if (timerB1.scale(elapsed) > timerB1.end) t1.restart(timer1);
			}

			//  dots for stations
			gStationDots
				.selectAll("circle")
				.data([stationGeist, stationWeseler])
				.enter()
				.append("circle")
				.attr("id", (d, i) => ["ptGeist", "ptWeseler"][i])
				// .attr("fill", ) --> set in timer
				.attr("cx", d => mapB.latLngToLayerPoint(d).x)
				.attr("cy", d => mapB.latLngToLayerPoint(d).y)
				.attr("r", 15);

			break;
		case 1:
			// bike route
			var lineGenerator = d3
				.line()
				.x(d => mapB.latLngToLayerPoint([d.lat, d.lon]).x)
				.y(d => mapB.latLngToLayerPoint([d.lat, d.lon]).y);
			var bikeRoute = lineGenerator(data.bike);

			gBikePath
				.append("path")
				.attr("d", bikeRoute)
				.attr("id", "bikeRoute");

			break;
		case 2:
			// bike route in background
			gBikePath.classed("background", true);

			// add dot for senseBox data
			gSenseBox
				.append("circle")
				.attr("id", "ptSBGeist")
				.attr("class", "senseboxDots")
				// .attr("fill", ) --> set in timer
				.attr("cx", d => mapB.latLngToLayerPoint(stationGeist).x)
				.attr("cy", d => mapB.latLngToLayerPoint(stationGeist).y)
				.attr("r", 10);

			// new timer w/ more limited time span
			t1.stop();

			el1_hour = -1; // to store hour of previous elapsed time
			t2 = d3.timer(timer2, 150);
			function timer2(elapsed) {
				var el = timerB2.scale(elapsed);
				timerB2.div.html(formatTime(el));

				updateStationDots(data, el, el1_hour);
				updateSenseboxDots(data, el);
				updateBikeDots(el);

				// update elapsed time
				el1_hour = el.getHours();
				// make timer loop through one day
				if (timerB2.scale(elapsed) > timerB2.end) t2.restart(timer2);
			}

			break;
		case 3:
			// add all bike dots
			// opacity is changed in timer
			gBikeDots
				.selectAll(".bikeDot")
				.data(data.bike)
				.enter()
				.append("circle")
				.attr("class", "bikeDot")
				.attr("cx", d => mapB.latLngToLayerPoint([d.lat, d.lon]).x)
				.attr("cy", d => mapB.latLngToLayerPoint([d.lat, d.lon]).y)
				.attr("r", 5)
				.attr("fill", d => colourPM10(d.pm10));
			// .attr("opacity", 0.2);

			break;
	}

	// update map based on step
	// updateMap(response.index);
	// figure.select("p").text(response.index);
}

function updateStationDots(data, el, el1_hour) {
	// check if new hour has started, only do stuff if yes
	if (el.getHours() != el1_hour) {
		var datanow = data.lanuv.find(function(d) {
			return formatTimeHour(d.time) === formatTimeHour(el);
		});
		d3.select("#ptGeist").attr("fill", function() {
			return colourPM10(datanow.pm10_Geist);
		});
		d3.select("#ptWeseler").attr("fill", function() {
			return colourPM10(datanow.pm10_Weseler);
		});
	}
}

function updateSenseboxDots(data, el) {
	// check if the dots are there (only in step 3)
	if (!d3.select(".senseboxDots").empty()) {
		var datanow = data.sensebox.find(function(d) {
			return +d.time > +el;
		});
		d3.select("#ptSBGeist").attr("fill", function() {
			return typeof datanow === "undefined"
				? "transparent"
				: colourPM10(datanow.pm10);
		});
	}
}

function updateBikeDots(el) {
	// check if the dots are there (step 4)
	if (!gBikeDots.selectAll("circle").empty()) {
		console.log("update bike dots op");
		gBikeDots
			.selectAll("circle")
			.attr("opacity", d => opacityScale(Math.abs(+d.time - +el)));
	}
}

////////////////////////////////////////////////////////////////////////////////
// SCROLLY C ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function initScrollyC(data) {
	setupStickyfill();

	scrollerC
		.setup({
			step: "#scrollyC article .step",
			offset: 0.33,
			debug: true
		})
		.onStepEnter(function(r) {
			handleStepEnterC(r, data);
		});
}

// scrollama event handlers
function handleStepEnterC(response, data) {
	// response = { element, direction, index }

	// add color to current step only
	scrollyC.step.classed("is-active", function(d, i) {
		return i === response.index;
	});

	// update image based on step
	scrollyC.img.attr("src", "img/" + scrollyImg[response.index]);
	// update map based on step
	// updateMap(response.index);
	// figure.select("p").text(response.index);
}

////////////////////////////////////////////////////////////////////////////////

function setupStickyfill() {
	d3.selectAll(".sticky").each(function() {
		Stickyfill.add(this);
	});
}

// MAP FUNCTIONS

function updateMap(index) {
	switch (index) {
		case 0:
			break;
		case 1:
			window.markerG = L.marker(stationGeist).addTo(mymap);
			markerG.bindPopup("Air Quality Station <br> <b>Geist</b>").openPopup();
			break;
		case 2:
			window.markerW = L.marker(stationWeseler).addTo(mymap);
			markerW
				.bindPopup("Air Quality Station <br> <b>Weseler Straße</b>")
				.openPopup();
			break;
	}
}
