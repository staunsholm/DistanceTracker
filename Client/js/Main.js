(function () {
    var resetTracking = document.getElementById('resetTracking');
    var output = document.getElementById('output');
    var map1 = document.getElementById('map1');
    var map2 = document.getElementById('map2');

    var cntUpdates = 0;
    var totalDistance = 0;

    var path = [];
    var latestPosition;

    // setup two images that can fade from one to the other when new maps are loaded
    var visibleMap = map1;
    var hiddenMap = map2;

    map1.addEventListener('load', function () {
        map1.style.opacity = 1;
        map1.style.transitionDelay = 0;
        map2.style.opacity = 0;
        map2.style.transitionDelay = "0.3s";

        visibleMap = map1;
        hiddenMap = map2;
    });
    map2.addEventListener('load', function () {
        map2.style.opacity = 1;
        map2.style.transitionDelay = 0;
        map1.style.opacity = 0;
        map1.style.transitionDelay = "0.3s";

        visibleMap = map2;
        hiddenMap = map1;
    });

    // setup geolocation
    navigator.geolocation.watchPosition(update, locationError, {
        enableHighAccuracy: true,
        timeout: Infinity,
        maximumAge: 10000
    });

    // click reset to start tracking new route from current position
    resetTracking.addEventListener('click', function () {
        if (!latestPosition) {
            alert('Location not yet obtained. This can a while...');
            return;
        }

        if (confirm('Reset recorded route?')) {
            path = [];
            cntUpdates = 0;
            totalDistance = 0;

            update(latestPosition)
        }
    });

    function update(position) {
        latestPosition = position;
        path.push(latestPosition.coords);

        cntUpdates++;

        // current position
        var pos = position.coords.latitude + "," + position.coords.longitude;

        // calculate total distance
        if (cntUpdates > 1) {
            totalDistance += distance(path[cntUpdates - 1], path[cntUpdates - 2]);
        }

        if (totalDistance > 1) {
            totalDistance = Math.round(totalDistance * 1000) / 1000 + " km";
        }
        else {
            totalDistance = Math.round(totalDistance * 1000) + " m";
        }

        // show some text info
        output.innerHTML =
            "Updates: " + cntUpdates + "<br>" +
                pos + "<br>" +
                "Distance: " + totalDistance;

        // find screen size (show biggest possible map for device)
        var screenSize = window.innerWidth + "x" + window.innerHeight;

        // setup map
        var src = "http://maps.googleapis.com/maps/api/staticmap?size=" + screenSize + "&sensor=false&path=";

        // add path to map
        for (var i = 0; i < cntUpdates; i++) {
            if (i !== 0) src += "|";
            src += path[i].latitude + "," + path[i].longitude;
        }

        // put marker at start and end of route
        src += "&markers=" + path[0].latitude + "," + path[0].longitude + "|" +
            path[path.length - 1].latitude + "," + path[path.length - 1].longitude;

        // load map, when loaded it will fade in
        hiddenMap.src = src;
    }

    // handle geolocation errors
    function locationError(err) {
        console.log(err);
    }

    // calculate distance between two positions
    var R = 6371; // km
    var toRad = Math.PI / 180;

    function distance(pos1, pos2) {
        var lat1 = pos1.latitude;
        var lon1 = pos1.longitude;
        var lat2 = pos2.latitude;
        var lon2 = pos2.longitude;

        var dLat = (lat2 - lat1) * toRad;
        var dLon = (lon2 - lon1) * toRad;
        var lat1 = lat1 * toRad;
        var lat2 = lat2 * toRad;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;

        return d;
    }

    // debug: creates new positions at a specified interval
    function createFakePositions(speedInMilliseconds) {
        setInterval(function () {
            if (cntUpdates === 0) return;

            update({
                coords: {
                    latitude: path[cntUpdates - 1].latitude + Math.random() / 1000,
                    longitude: path[cntUpdates - 1].longitude + Math.random() / 1000
                }
            })
        }, speedInMilliseconds);
    }
})();