var yelp = require('../models/yelp.js');

exports.findRestaurants = function(request, response) {
	var set_parameters = {
		location: request.params.location, // will change to ll later
		term: 'restaurants', // default for now, but could be changed in future to param
		radius_filter: request.params.radius_filter // needs to be converted to meters
	}
	yelp.request_yelp(set_parameters, function(err, res, body) { 
		response.end(body);
	});
}