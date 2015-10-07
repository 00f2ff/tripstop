/* in future i'd want to let people choose between tolls, ferries, etc, choose alternate routes, etc */
  $(function() {
    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer();

    var map = new google.maps.Map(document.getElementById('map'), {
     zoom:7,
     mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('panel'));

    function findStopStep(steps) {
      var time = parseInt($('input[name="hours"]').val(),10) * 60 * 60; // conversion to step duration value (seconds)
      var index = 0;
      while (time > 0) {
        time -= steps[index].duration.value;
        index++;
      }
      index -= 1; // go back to step that took time below 0 (so farther along than we want)
      console.log(steps[index]);
      // find yelp data
      var radius_filter = parseInt($('input[name="radius"]').val(),10) * 1609.34; // convert to meters
      var ll = steps[index].end_location.lat() + ',' + steps[index].end_location.lng();
      $.ajax({
        url: '/stop/'+ll+'/'+radius_filter,
        type: "GET",
        success: function(result) {
          stuff = JSON.parse(result);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus, errorThrown);
        }
      });
    }

    function makeRequest(origin, destination, finalRoute) {
      var request = {
        origin: origin, 
        destination: destination, // add waypoint soon
        travelMode: google.maps.DirectionsTravelMode.DRIVING
      };

      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          var steps = response.routes[0].legs[0].steps; // this would differ if there were more routes/legs
          var stopStep = findStopStep(steps);
          if (finalRoute) { // not initial find
            directionsDisplay.setDirections(response); 
          }
        }
      });
    }

    $('button#find-restaurants').click(function(ev) {
      var hours = $('input[name="hours"]').val(),
          radius = $('input[name="radius"]').val(),
          origin = $('input[name="origin"]').val(), 
          destination = $('input[name="destination"]').val();
      // generate map
      // makeRequest(origin, destination);
      makeRequest('washington dc','pittsburgh pa', false);
      ev.preventDefault();
    })

    $('input[name="rest-button"]').click(function(ev) {
      ev.preventDefault();
      var location = $('input[name="location"]').val(),
      radius_filter = $('input[name="radius"]').val();
      // ll = '[latitude],[longitude]';
      $.ajax({
        url: '/stop/'+location+'/'+radius_filter,
        type: "GET",
        success: function(result) {
          stuff = JSON.parse(result);
        }
      });
    });

    $('button#route-button').click(function(ev) { // add waypoint soon
        makeRequest($('input[name="origin"]').val(), $('input[name="destination"]').val());
        ev.preventDefault();
      });
    
  })