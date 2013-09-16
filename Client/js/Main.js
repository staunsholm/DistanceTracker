var Globals = {
    totalDistance: 0,
    latestDistance: 0,
    latestTime: 0,
    cntUpdates: 0,
    startTime: Date.now(),
    latestDistanceTime: 0
};

var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;

var devicePixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;

(function () {
    var resetTracking = document.getElementById('resetTracking');
    var distanceElement = document.getElementById('distance');
    var timeElement = document.getElementById('time');
    var speedElement = document.getElementById('speed');
    var averageElement = document.getElementById('average');
    var map1 = document.getElementById('map1');
    var map2 = document.getElementById('map2');

    var path = [];
    var latestPosition;
    var lastDistanceTimeTemp = 0;

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
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    navigator.geolocation.watchPosition(update, locationError, {
        enableHighAccuracy: true,
        timeout: Infinity,
        maximumAge: 10000
    });

    // click reset to start tracking new route from current position
    resetTracking.addEventListener('click', function () {
        if (!latestPosition) {
            alert('Location not yet obtained. This can take a while...');
            return;
        }

        if (confirm('Reset recorded route?')) {
            path = [];
            Globals.cntUpdates = 0;
            Globals.totalDistance = 0;
            Globals.startTime = Date.now();
            Globals.latestTime = 0;
            Globals.latestDistanceTime = 0;

            update(latestPosition)
        }
    });

    function update(position) {
        if (latestPosition &&
            position.coords.latitude === latestPosition.coords.latitude &&
            position.coords.longitude === latestPosition.coords.longitude) {
            return;
        }

        latestPosition = position;
        path.push(latestPosition.coords);

        Globals.cntUpdates++;

        // calculate total distance
        if (Globals.cntUpdates > 1) {
            Globals.latestDistance = distance(path[Globals.cntUpdates - 1], path[Globals.cntUpdates - 2]);
            Globals.totalDistance += Globals.latestDistance;
        }

        var totalDistanceString;
        if (this.totalDistance > 1) {
            totalDistanceString = Math.round(Globals.totalDistance * 1000) / 1000 + " km";
        }
        else {
            totalDistanceString = Math.round(Globals.totalDistance * 1000) + " m";
        }

        distanceElement.innerHTML = "Distance: " + totalDistanceString;

        // time
        var t = Date.now() - Globals.startTime;
        Globals.latestDistanceTime = t - lastDistanceTimeTemp;
        lastDistanceTimeTemp = t;

        // find screen size (show biggest possible map for device)
        var screenSize = window.innerWidth + "x" + window.innerHeight;

        // setup map
        var src = "http://maps.googleapis.com/maps/api/staticmap?size=" + screenSize + "&sensor=true&path=";

        // add path to map
        for (var i = 0; i < Globals.cntUpdates; i++) {
            if (i !== 0) src += "|";
            src += path[i].latitude + "," + path[i].longitude;
        }

        // put marker at start and end of route
        src += "&markers=" + path[0].latitude + "," + path[0].longitude + "|" +
            path[path.length - 1].latitude + "," + path[path.length - 1].longitude;

        // key
        src += "&key=AIzaSyBV0yKqrMLMHwfmqEbKVR0xj7qreibCc2M";

        // load map, when loaded it will fade in
        hiddenMap.src = src;
    }

    // handle geolocation errors
    function locationError() {
        alert("Could not find your position. Did you allow the app to use geo location?");
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
        lat1 = lat1 * toRad;
        lat2 = lat2 * toRad;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;

        return d;
    }

    function updateTime(dt) {
        requestAnimationFrame(updateTime);

        var t = Date.now() - Globals.startTime;
        if (t === Globals.latestTime) return;
        Globals.latestTime = t;

        // calculate speed
        var speed = 0;
        var averageSpeed = 0;

        if (Globals.cntUpdates > 1 && Globals.latestTime > 0 && dt > 0) {
            averageSpeed = Math.round(Globals.totalDistance / Globals.latestTime * 1000000);
            speed = Math.round(Globals.latestDistance / Globals.latestDistanceTime * 1000000);
        }

        speedElement.innerHTML = "Speed: " + speed + " km/h";
        averageElement.innerHTML = "Average: " + averageSpeed + " km/h";

        var time = new Date(t);

        var hh = time.getHours() - 1;
        if (hh < 10) hh = "0" + hh;
        var mm = time.getMinutes();
        if (mm < 10) mm = "0" + mm;
        var ss = time.getSeconds();
        if (ss < 10) ss = "0" + ss;
        var ms = time.getMilliseconds() / 100 | 0;

        timeElement.innerHTML = "Time: " + hh + ":" + mm + ":" + ss + "." + ms;
    }

    updateTime();

    // debug: creates new positions at a specified interval
    function createFakePositions(speedInMilliseconds) {
        setInterval(function () {
            if (Globals.cntUpdates === 0) return;

            update({
                coords: {
                    latitude: path[Globals.cntUpdates - 1].latitude + Math.random() / 1000,
                    longitude: path[Globals.cntUpdates - 1].longitude + Math.random() / 1000
                }
            })
        }, speedInMilliseconds);
    }

    //createFakePositions(1000);
})();