// map.js

function initMap(lat, lon) {
	var map = L.map('map').setView([lat, lon], 8);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
	    maxZoom: 18,
	    id: 'mapbox.streets',
	    accessToken: 'pk.eyJ1IjoidGF5bG9ybXV0Y2giLCJhIjoiY2oxZWdtOHFhMDAwdzJ4cDM3cTF6YzdkOSJ9.V6tb7qDkG0MezhEYWwlsGQ'
	}).addTo(map);
	map.dragging.disable();
	L.marker([lat, lon]).addTo(map)
}
