/* in future i'd want to let people choose between tolls, ferries, etc, choose alternate routes, etc */
/* I would also want to search for more restaurants, so code in an offset at some point */
/* A smarter version would remove convenience stores and gas stations from results and then query for more (or just query for a lot then remove results) */
/* also add more touch events (directions vs map resizing, etc) */
/* Updated algorithm: I decided that I'm just going to assume an average mph of 65 since I don't think it's possible to get
reliable data from a source other than the Roads API which is only for businesses. This means that the more time a user spends
on a single road, the less accurate our suggestion will be. I'm going with 65mph because I don't know if users will be on
freeways or rural roads, which range from 75-55 mph usually (according to wikipedia)
https://en.wikipedia.org/wiki/Speed_limits_in_the_United_States
*/

  $(function() {
    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer();
    var stoppingPoint;

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

    function listRestaurants(result) {
      businesses = JSON.parse(result).businesses;
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
            // console.log(waypoint);
            var destination = $('input[name="destination"]').val();
            makeRequest(origin, waypoint, destination, true); // show maps and directions now
            // console.log(businesses[i]);
          }
        }
      })
    }

    function findStopStep(steps) {
      var time = parseInt($('input[name="hours"]').val(),10) * 3600, // conversion to step duration value (seconds)
          index = 0,
          step_proportion,
          ll_index,
          ll;
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
      }

      stoppingPoint = ll;

      // find yelp data
      var radius_filter = parseInt($('input[name="radius"]').val(),10) * 1609.34; // convert to meters
    
      $.ajax({
        url: '/stop/'+ll+'/'+radius_filter,
        type: "GET",
        success: function(result) {
          // call external function on results
          // console.log(ll, steps[index].end_location.lat() + ',' + steps[index].end_location.lng());
          // console.log(result);
          listRestaurants(result);
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
      // makeRequest('washington dc',[],'pittsburgh pa', false); 
      // ev.preventDefault();
    })
    
  })