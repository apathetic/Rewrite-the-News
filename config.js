
// ----- MongoDB configuration -----
exports.db = [];
exports.db.url = "dbh26.mongolab.com:27267";
exports.db.database = "rewrite2011";
exports.db.username = "admin";
exports.db.password = "surrey2011";


// ----- SMSify configuration -----
exports.smsify = [];
exports.smsify.username = 'NAME';
exports.smsify.password = 'PASSWORD';


// ----- allowedFiles ----- 
// an array of "inbound URL pathnames" mapped to allowed filenames to limit potentially malicious behaviors
exports.allowedFiles = {
	"/index.html" :				"index.html",
	"/all.html" :				"all.html",
	"/" :						"index.html",
};



