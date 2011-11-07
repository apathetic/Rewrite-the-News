var mongoose = require('mongoose');

exports.initialize = function(username, password, url, database) {

	// Opens connection to MongoDB database, authenticates, logs successful connection.
	mongoose.connection.on("open", function() { console.log("Connected to MongoDB successfully!") });
	mongoose.connect("mongodb://" + username + ":" + password + "@" + url + "/" + database);	  

	return {

		// Queries MongoDB to retrieve data based on properties supplied by json parameter.
		query: function (collectionIdent, json, callback) {
			mongoose.connection.db.collection(collectionIdent, function (err, collection) {
				collection.find(json).toArray(callback);
			});
		},

		// Inserts into MongoDB and returns inserted data
		insert: function(collectionIdent, json, callback) {
			mongoose.connection.db.collection(collectionIdent, function (err, collection) {
				collection.insert(json);
			});
		}

	}

}