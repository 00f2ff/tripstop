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
      // this loop stops when it finds the step at which the user wants to stop, or there are no more steps (reached destination)
      while (time > 0 && index < steps.length) {
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

    function makeRequest(origin, waypoints, destination, finalRoute) {
      var request = {
        origin: origin, 
        waypoints: waypoints,
        destination: destination, // add waypoint soon
        travelMode: google.maps.DirectionsTravelMode.DRIVING
      };

      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          var steps = response.routes[0].legs[0].steps; // this would differ if there were more routes/legs
          console.log(steps)
          var stopStep = findStopStep(steps);
          if (finalRoute) { // not initial find
            directionsDisplay.setDirections(response); 
          }
        }
      });
    }

    // Hardcoded buttons
    $('.hours-input .minus').click(function() {
      if (parseInt($('input[name="hours"]').val(),10) > 1) {
        $('input[name="hours"]').val(parseInt($('input[name="hours"]').val(),10)-1);
      }
    });
    $('.hours-input .plus').click(function() {
      if (parseInt($('input[name="hours"]').val(),10) < 12) {
        $('input[name="hours"]').val(parseInt($('input[name="hours"]').val(),10)+1);
      }
    });
    $('.radius-input .minus').click(function() {
      if (parseInt($('input[name="radius"]').val(),10) > 1) {
        $('input[name="radius"]').val(parseInt($('input[name="radius"]').val(),10)-1);
      }
    });
    $('.radius-input .plus').click(function() {
      if (parseInt($('input[name="radius"]').val(),10) < 25) {
        $('input[name="radius"]').val(parseInt($('input[name="radius"]').val(),10)+1);
      }
    });

    $('button#find-restaurants').click(function(ev) {
      var origin = $('input[name="origin"]').val(), 
          destination = $('input[name="destination"]').val();
      // generate map
      // makeRequest(origin, destination);
      makeRequest('washington dc',[],'pittsburgh pa', false); // no waypoints, not final route
      // ev.preventDefault();
    })
    
  })