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
    var resetTrackingButton = document.getElementById('resetTracking');
    var distanceElement = document.getElementById('distance');
    var timeElement = document.getElementById('time');
    var speedElement = document.getElementById('speed');
    var averageElement = document.getElementById('average');

    var map;
    var startMarker;
    var endMarker;
    var currentCenter;
    var path = new google.maps.MVCArray;
    var latestPosition;
    var previousPosition;
    var lastDistanceTimeTemp = 0;

    // setup js based map
    (function initMap() {
        // wait for starting position
        if (!latestPosition) {
            setTimeout(initMap, 500);
            return;
        }

        map = new google.maps.Map(
            document.getElementById("map-canvas"),
            {
                center: currentCenter,
                zoom: 16,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: false
            }
        );

        startMarker = new google.maps.Marker({
            position: currentCenter,
            map: map,
            title: 'Start',
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                strokeColor: "#df3020",
                scale: 4
            }
        });

        endMarker = new google.maps.Marker({
            position: currentCenter,
            map: map,
            title: 'End',
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                strokeColor: "#30df20",
                scale: 4
            }
        });

        new google.maps.Polyline({
            path: path,
            strokeColor: '#0000ff',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: map
        });
    })();

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
    if (window.touchevent) {
        resetTrackingButton.addEventListener('touchup', resetTracking);
    }
    else {
        resetTrackingButton.addEventListener('click', resetTracking);
    }

    function resetTracking() {
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
    }

    // rwd: if turning device, do update
    window.addEventListener('orientationchange', function () {
        update(latestPosition, {onlyUpdateUI: true});
    });

    // update UI
    function update(position, options) {
        if (!options) {
            options = {};
        }

        if (!options.onlyUpdateUI) {
            if (latestPosition &&
                position.coords.latitude === latestPosition.coords.latitude &&
                position.coords.longitude === latestPosition.coords.longitude) {
                return;
            }

            latestPosition = position;

            Globals.cntUpdates++;

            // calculate total distance
            if (previousPosition) {
                Globals.latestDistance = distance(latestPosition.coords, previousPosition.coords);
                Globals.totalDistance += Globals.latestDistance;
            }

            var totalDistanceString;
            if (this.totalDistance > 1) {
                totalDistanceString = Math.round(Globals.totalDistance * 1000) / 1000 + " km";
            }
            else {
                totalDistanceString = Math.round(Globals.totalDistance * 1000) + " m";
            }

            // update path
            currentCenter = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

            var l = path.length;

            if (l < 3 || Globals.latestDistance > .02) {
                path.push(currentCenter);

                previousPosition = latestPosition;
            }
            else {
                path.setAt(path.length - 1, currentCenter);

                previousPosition.coords.latitude = path.getAt(l - 2).lat();
                previousPosition.coords.longitude = path.getAt(l - 2).lng();
            }
        }

        distanceElement.innerHTML = "Distance: " + totalDistanceString;

        // time
        var t = Date.now() - Globals.startTime;
        Globals.latestDistanceTime = t - lastDistanceTimeTemp;
        lastDistanceTimeTemp = t;

        if (map && endMarker) {
            // put marker at start and end of route
            endMarker.setPosition(currentCenter);

            // pan to new position
            map.panTo(currentCenter);
        }
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

        return d ? d : 0;
    }

    // update every frame
    function updateTime(dt) {
        requestAnimationFrame(updateTime);

        // update time
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
            if (!latestPosition) return;

            update({
                coords: {
                    latitude: latestPosition.coords.latitude + Math.random() / 10000,
                    longitude: latestPosition.coords.longitude + Math.random() / 10000
                }
            })
        }, speedInMilliseconds);
    }

    //createFakePositions(1000);
})();