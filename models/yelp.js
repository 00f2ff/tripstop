var yelp = {


/* yelp code from https://arian.io/how-to-use-yelps-api-with-node/ (not using node-yelp) */
/* Function for yelp call
 * ------------------------
 * set_parameters: object with params to search
 * callback: callback(error, response, body)
 */
  request_yelp: function(set_parameters, callback) {

  var oauthSignature = require('oauth-signature'),
  n = require('nonce')(),
  request = require('request'),
  qs = require('querystring'),
  _ = require('lodash');

  /* The type of request */
  var httpMethod = 'GET';

  /* The url we are using for the request */
  var url = 'http://api.yelp.com/v2/search';

  /* We can setup default parameters here */
  var default_parameters = {
    sort: '2', // highest rated
    limit: '20' 
  };

  /* We set the require parameters here */
  var required_parameters = {
    oauth_consumer_key : "Jdzrr09o_fLl4hfbRmKe3Q",
    oauth_token : "RtAveBhaLtQbiuqtzpCzIBVTX8OZ4LDL",
    oauth_nonce : n(),
    oauth_timestamp : n().toString().substr(0,10),
    oauth_signature_method : 'HMAC-SHA1',
    oauth_version : '1.0'
  };

  /* We combine all the parameters in order of importance */ 
  var parameters = _.assign(default_parameters, set_parameters, required_parameters);

  /* We set our secrets here */
  var consumerSecret = "C9EyHjKAxzYQYkocUvRiYE8cL7k";
  var tokenSecret = "1JsZoBxncqbki0pNs_xvouu0ysU";

  /* Then we call Yelp's Oauth 1.0a server, and it returns a signature */
  /* Note: This signature is only good for 300 seconds after the oauth_timestamp */
  var signature = oauthSignature.generate(httpMethod, url, parameters, consumerSecret, tokenSecret, { encodeSignature: false});

  /* We add the signature to the list of paramters */
  parameters.oauth_signature = signature;

  /* Then we turn the paramters object, to a query string */
  var paramURL = qs.stringify(parameters);

  /* Add the query string to the url */
  var apiURL = url+'?'+paramURL;

  /* Then we use request to send make the API Request */
  request(apiURL, function(error, response, body){
    return callback(error, response, body);
  });

}

}

module.exports = yelp;