/* in future i'd want to let people choose between tolls, ferries, etc, choose alternate routes, etc */
/* I would also want to search for more restaurants, so code in an offset at some point */
/* A smarter version would remove convenience stores and gas stations from results and then query for more (or just query for a lot then remove results) */
/* also add more touch events (directions vs map resizing, etc) */
  $(function() {
    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer();

    var map = new google.maps.Map(document.getElementById('map'), {
     zoom:7,
     mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('panel'));

    function listRestaurants(result) {
      businesses = JSON.parse(result).businesses;
      // append listings to page
      for (var i = 0; i < businesses.length; i++) {
        var b = businesses[i];
        var closed_class, closed_message;
        if (b.is_closed) {
          closed_class = 'rest-closed';
          closed_message = 'Closed';
        } else {
          closed_class = 'rest-open';
          closed_message = 'Open';
        }
        // flatten categories nested array, remove every other element (tag), and turn into string
        var categories = [].concat.apply([], b.categories);
        categories = categories.filter(function(el, index) {
          return !(index % 2);
        }).slice(0,2).join(', '); // trim down

        var listing = '<div class="rest">\
                        <div class="rest-name"><a target="_blank" href="'+b.mobile_url+'">'+b.name+'</a></div><div class="'+closed_class+'">'+closed_message+'</div>\
                        <div class="rest-rating"><img src="'+b.rating_img_url_small+'"/></div>\
                        <div class="rest-image"><img src="'+b.image_url+'" /></div>\
                        <div class="rest-categories">'+categories+'</div>\
                        <div class="rest-select" id="'+b.id+'">Select</div>\
                      </div>';
        $('.restaurants-container').append(listing);
      }
      // apply click handler that sends mapping information
      $('.rest-select').click(function() {
        // loop through businesses searching for id
        for (var i = 0; i < businesses.length; i++) {
          if (businesses[i].id == $(this).attr('id')) {
            // if user changed these, then too bad (at least for demo version)
            var origin = $('input[name="origin"]').val();
            var lat = businesses[i].location.coordinate.latitude,
                lng = businesses[i].location.coordinate.longitude;
            var ll = new google.maps.LatLng(lat,lng);
            var waypoint = [{location: ll, stopover: true}];
            console.log(waypoint);
            var destination = $('input[name="destination"]').val();
            makeRequest(origin, waypoint, destination, true); // show maps and directions now
            console.log(businesses[i]);
          }
        }
      })
    }

    function findStopStep(steps) {
      var time = parseInt($('input[name="hours"]').val(),10) * 60 * 60; // conversion to step duration value (seconds)
      var index = 0;
      // this loop stops when it finds the step at which the user wants to stop, or there are no more steps (reached destination)
      while (time > 0 && index < steps.length) {
        time -= steps[index].duration.value;
        index++;
      }
      index -= 1; // go back to step that took time below 0 (so farther along than we want)
      // find yelp data
      var radius_filter = parseInt($('input[name="radius"]').val(),10) * 1609.34; // convert to meters
      var ll = steps[index].end_location.lat() + ',' + steps[index].end_location.lng();

      $.ajax({
        url: '/stop/'+ll+'/'+radius_filter,
        type: "GET",
        success: function(result) {
          // call external function on results
          listRestaurants(result);
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
          if (finalRoute) { // show directions
            directionsDisplay.setDirections(response); 
          } else { // find yelp data based on response information
            var steps = response.routes[0].legs[0].steps; // this would differ if there were more routes/legs
            var stopStep = findStopStep(steps);
          }
        }
      });
    }

    // ------  Hardcoded buttons
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
    // ------   End hardcoded buttons

    $('button#find-restaurants').click(function(ev) {
      // empty existing restaurants
      $('.restaurants-container').empty();
      var origin = $('input[name="origin"]').val(), 
          destination = $('input[name="destination"]').val();
      // generate map
      makeRequest(origin, [], destination, false); // no waypoints, not final route
      // makeRequest('washington dc',[],'pittsburgh pa', false); 
      // ev.preventDefault();
    })
    
  })