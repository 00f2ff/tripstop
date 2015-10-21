/* in future i'd want to let people choose between tolls, ferries, etc, choose alternate routes, etc */
/* I would also want to search for more restaurants, so code in an offset at some point */
/* A smarter version would remove convenience stores and gas stations from results and then query for more (or just query for a lot then remove results) */
/* also add more touch events (directions vs map resizing, etc) */


  $(function() {
    var directionsService = new google.maps.DirectionsService(),
        directionsDisplay = new google.maps.DirectionsRenderer(),
        stoppingPoint,
        businesses,
        transitionSpeed = 500;

    var map = new google.maps.Map(document.getElementById('map'), {
     zoom:7,
     mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('panel'));

    var originInput = (document.getElementById('origin-input'));
    var destinationInput = (document.getElementById('destination-input'));
    // bind autocomplete controls
    var autocompleteOrigin = new google.maps.places.Autocomplete(originInput);
    autocompleteOrigin.bindTo('bounds', map);
    var autocompleteDestination = new google.maps.places.Autocomplete(destinationInput);
    autocompleteDestination.bindTo('bounds', map);

    function removeUndesirableRestaurants(businesses) { // this is so space-inefficient
      var remaining = [];
      var blacklist = ['convenience', 'hotdogs']; // hotdogs is yelp code for fast food
      for (var i = 0; i < businesses.length; i++) {
        var is_blacklisted = false;
        var b = businesses[i];
        var categories = [].concat.apply([], b.categories);
        categories = categories.filter(function(el, index) {
          return (index % 2);
        });
        // mark restaurant if a category is in blacklist
        for (var c = 0; c < categories.length; c++) {
          if (blacklist.indexOf(categories[c]) > -1) {
            is_blacklisted = true;
          }
        }
        if (!is_blacklisted) remaining.push(b);
      }
      return remaining;
    }

    function listRestaurants(result) {
      // remove fast food and convenience stores
      businesses = removeUndesirableRestaurants(JSON.parse(result).businesses);
      // append listings to page
      for (var i = 0; i < businesses.length; i++) {
        var b = businesses[i];
        var lat = b.location.coordinate.latitude,
            lng = b.location.coordinate.longitude;
        var ll = new google.maps.LatLng(lat,lng);
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

        var request = { // this is a crappy way to code it (maybe)
          origin: stoppingPoint, 
          destination: ll,
          travelMode: google.maps.DirectionsTravelMode.DRIVING
        };
        var distance;
        directionsService.route(request, function(response, status) {
          if (status == google.maps.DirectionsStatus.OK) {
            distance = response.routes[0].legs[0].distance.text;
            // since this will finish processing after listing is appended to page, identify location and add
            $('#rest-'+b.id).find('.rest-distance').text(distance);
          }
        });
        console.log(distance);
        var listing = '<div class="rest" id="rest-'+b.id+'">\
                        <div class="rest-name">\
                          <a target="_blank" href="'+b.mobile_url+'">'+b.name+'</a>\
                          <span class="rest-distance"></span>\
                          </div>\
                        <div class="'+closed_class+'">'+closed_message+'</div>\
                        <div class="rest-rating"><img src="'+b.rating_img_url_small+'"/></div>\
                        <div class="rest-image"><img src="'+b.image_url+'" /></div>\
                        <div class="rest-categories">'+categories+'</div>\
                        <div class="rest-select" id="'+b.id+'">Select</div>\
                      </div>';
        $('.restaurants-container').append(listing); 
      }
    }

    function findStopStep(steps) {
      var time = parseInt($('input[name="hours"]').val(),10) * 3600, // conversion to step duration value (seconds)
          index = 0,
          step_proportion, ll_index, ll;
      // this loop stops when it finds the step at which the user wants to stop, or there are no more steps (reached destination)
      while (time > 0 && index < steps.length) {
        time -= steps[index].duration.value;
        index++;
      }
      index -= 1; // go back to step that took time below 0 (so farther along than we want)
      // estimate lat_lng coordinate based on avg freeway/rural speed of 65mph
      if (time < 0) {
        // recall that time is in seconds; needs to be converted to hours
        step_proportion = ((steps[index].duration.value - Math.abs(time)) / 3600.0 * 65 * 1609.34) / steps[index].distance.value;
        ll_index = Math.ceil(step_proportion * steps[index].lat_lngs.length);
        ll = steps[index].lat_lngs[ll_index].toString(); // (...,...)
        ll = ll.substring(1,ll.length-2).replace(' ',''); // remove parentheses
      } else if (time == 0) {
        ll = steps[index].end_location.lat() + ',' + steps[index].end_location.lng();
      } else {
        ll_index = steps[index].lat_lngs.length -1; // last coord of last step
        ll = steps[index].lat_lngs[ll_index].toString(); // (...,...)
        ll = ll.substring(1,ll.length-2).replace(' ',''); // remove parentheses
      }
      stoppingPoint = ll;

      // find yelp data
      var radius_filter = parseInt($('input[name="radius"]').val(),10) * 1609.34; // convert to meters
      $.ajax({
        url: '/stop/'+stoppingPoint+'/'+radius_filter,
        type: "GET",
        success: function(result) {
          listRestaurants(result);
          // animate after restaurants are listed (** add spinner?)
          $('.first').animate({
            left: '-100vw'
          }, transitionSpeed);
          $('.second').animate({
            left: '0vw'
          }, transitionSpeed);
          $('.third').animate({
            left: '100vw'
          }, transitionSpeed);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus, errorThrown);
        }
      });
    }

    // refactor this later
    // function findDistanceAway(restaurantLocation) {
    //   var request = {
    //     origin: stoppingPoint, 
    //     destination: restaurantLocation,
    //     travelMode: google.maps.DirectionsTravelMode.DRIVING
    //   };
    //   directionsService.route(request, function(response, status) {
    //     if (status == google.maps.DirectionsStatus.OK) {
    //       return response.routes[0].legs[0].distance.text;
    //     }
    //   });

    // }


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
      // ev.preventDefault();
    });

    /**
     * Click handler on Select button for restaurant choices.
     * First searches for the business object this button corresponds with and identifies the route and loads the map.
     * Triggers transition to that page (not as a callback to map request, for now
      */
    $(document).on('click', '.rest-select', function() {
      // loop through businesses searching for id
      for (var i = 0; i < businesses.length; i++) {
        var origin, lat, lng, ll, waypoint, destination;
        if (businesses[i].id == $(this).attr('id')) {
          // if user changed these, then too bad (at least for demo version)
          origin = $('input[name="origin"]').val();
          lat = businesses[i].location.coordinate.latitude,
          lng = businesses[i].location.coordinate.longitude;
          ll = new google.maps.LatLng(lat,lng);
          waypoint = [{location: ll, stopover: true}];
          // console.log(waypoint);
          destination = $('input[name="destination"]').val();
          makeRequest(origin, waypoint, destination, true); // show maps and directions now
          // console.log(businesses[i]);
        }
      }
      // transition
      $('.second').animate({
        left: '-100vw'
      }, transitionSpeed);
      $('.third').animate({
        left: '0vw'
      }, transitionSpeed);
    });

    /**
     * Click handler for moving back to search view
     */
    $('.second .header').click(function() {
      $('.second').animate({
        left: '100vw'
      }, transitionSpeed);
      $('.first').animate({
        left: '0vw'
      }, transitionSpeed);
      // empty restaurants
      $('.restaurants-container').empty();
    });

    /**
     * Click handler for moving back to restaurant view
     */
    $('.third .header').click(function() {
      $('.third').animate({
        left: '100vw'
      }, transitionSpeed);
      $('.second').animate({
        left: '0vw'
      }, transitionSpeed);
    });

    
  })