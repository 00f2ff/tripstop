/* in future i'd want to let people choose between tolls, ferries, etc, choose alternate routes, etc */
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
        }).slice(0,1).join(', '); // trim down (this isn't particularly helpful, but does fix UI issues)

        var request = { // this is a crappy way to code it (maybe)
          origin: stoppingPoint, 
          destination: ll,
          travelMode: google.maps.DirectionsTravelMode.DRIVING
        };
        var listing = '<div class="rest" id="rest-'+b.id+'">\
                        <div class="rest-name">\
                          <a target="_blank" href="'+b.mobile_url+'">'+b.name+'</a>\
                        </div>\
                        <div class="'+closed_class+'">'+closed_message+'&nbsp;&nbsp;&nbsp;<span class="rest-distance"></span></div>\
                        <div class="rest-rating"><img src="'+b.rating_img_url_small+'"/></div>\
                        <div class="rest-image">\
                          <img src="'+b.image_url+'" />\
                          <div class="image-overlay" id="'+b.id+'"><div>Select</div></div>\
                        </div>\
                        <div class="rest-categories">'+categories+'</div>\
                      </div>';
        $('.restaurants-container').append(listing); 
        findDistanceAway(request, b.id);
        // console.log(distance);
      }
    }

    function findDistanceAway(request, businessId) {
      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          var distance = response.routes[0].legs[0].distance.text;
          $('#rest-'+businessId).find('.rest-distance').text('('+distance+' from stop)');
        }
      });
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
      if (time < 0) {
        // My previous equation far-overcomplicated this problem. This proportion implicitly includes speed limit since 
        // Google Maps time accounts for speed and distance. This is far more accurate than previously.
        step_proportion = (steps[index].duration.value - Math.abs(time)) / steps[index].duration.value;
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
        timeout: 7000,
        beforeSend: function() {
          $('.spinner').css('visibility','visible');
        },
        complete: function() {
          $('.spinner').css('visibility','hidden');
        },
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
          // if (jqXHR.status === 408 || jqXHR.status === 504) {
          // This isn't a great way to handle all errors, but I've only found timeouts to exist
          alert("Sorry, but this request timed out. Please try again or choose a larger radius.");
          // }
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

    // This doesn't work and takes too long to process. I removed the corresponding HTML tag
    // Geolocation code modified from Google documentation
    // $('#geo').click(function() {
    //   if (navigator.geolocation) {
    //     navigator.geolocation.getCurrentPosition(function(position) {
    //       var pos = {
    //         lat: position.coords.latitude,
    //         lng: position.coords.longitude
    //       };
    //       console.log(pos);
    //       var geocoder = new google.maps.Geocoder;
    //       geocoder.geocode({'location':pos, function(results, status) {
    //           if (status === google.maps.GeocoderStatus.OK) {
    //             if (results[1]) $('input[name="origin"]').val(results[1].formatted_address);
    //           }
    //         }
    //       });          
    //     });
    //   }
    // });

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
    $(document).on('click', '.image-overlay', function() {
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