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

     function makeRequest(origin, destination) {
        var request = {
         origin: origin, 
         destination: destination, // add waypoint soon
         travelMode: google.maps.DirectionsTravelMode.DRIVING
       };

       directionsService.route(request, function(response, status) {
         if (status == google.maps.DirectionsStatus.OK) {
           directionsDisplay.setDirections(response);
         }
       });
     }

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