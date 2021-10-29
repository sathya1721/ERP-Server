const express = require('express');
const port = 4100;
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");
const fs = require('fs');
const http = require('http');
const https = require('https');
const logger = require('morgan');
const jwt = require('jsonwebtoken');
const schedule = require('node-schedule');
const fileUpload = require('express-fileupload');
const dbConfig = require('./config/db.config');
const jwtConfig = require('./config/jwtsecret');
const app = express();

const environment = 'development';
// const environment = 'production';

app.use(cors());
app.use(logger('dev'));
app.use(fileUpload());
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({ extended: false, limit:'50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose.Promise = global.Promise;

if(environment === 'production')
{
	console.log('production env');

	/* DB CONNECTION */
	mongoose.connect(dbConfig.production.credentials, {useNewUrlParser: true, useUnifiedTopology: true})
	.then(() => console.log('database connected'))
	.catch((err) => console.error('db conn err', err));

	/* CREATE SERVER */
	// const privateKey = fs.readFileSync('/etc/letsencrypt/live/yourstore.io/privkey.pem');
    // const certificate = fs.readFileSync('/etc/letsencrypt/live/yourstore.io/fullchain.pem');
	// const credentials = { key : privateKey , cert: certificate};
	// const server = https.createServer(credentials, app);
	const server = http.createServer(app);

	/* LISTEN PORT */
	server.listen(port, function (err, res) {
	    if (err) console.log('port error', err);
	    console.log('Running on port '+port+'...');
	});
}
else
{
	console.log('development env');

	/* DB CONNECTION */
	mongoose.connect(dbConfig.development.credentials, {useNewUrlParser: true, useUnifiedTopology: true})
	.then(() => console.log('database connected'))
	.catch((err) => console.error('db conn err', err));

	/* CREATE SERVER */
	const server = http.createServer(app);

	/* LISTEN PORT */
	server.listen(port, function (err, res) {
	    if (err) console.log('port error', err);
	    console.log('Running on port '+port+'...');
	});
}

const authRoutes = require('./src/routes/auth.route');
const adminRoutes = require('./src/routes/admin.route');
const storeRoutes = require('./src/routes/store.route');
const webRoutes = require('./src/routes/web.route');
const userRoutes = require('./src/routes/user.route');
const storeDetailRoutes = require('./src/routes/store_details.route');

app.use('/auth', authRoutes);
app.use('/admin', verifyToken, adminRoutes);
app.use('/store', verifyToken, storeRoutes);
app.use('/web', webRoutes);
app.use('/user', verifyToken, userRoutes);
app.use('/store_details', storeDetailRoutes);

app.get('/', function(req, res) { res.send({ message : 'Welcome to yourstore version 0.7' }); });

/* Middlewares */
const admin = require('./src/models/admin.model');
const store = require('./src/models/store.model');
const storeFeatures = require('./src/models/store_features.model');

function verifyToken(req, res, next) {
    if(req.headers.authorization) {
    	let token = req.headers.authorization.split(' ')[1];
    	if(token) {
    		jwt.verify(token, jwtConfig.jwtSecretKey, function(err, response) {
	            if(!err && response) {
					req.id = response.id;
					req.user_type = response.user_type;
					// admin
					if(response.user_type=='admin') {
						admin.findOne({ _id: mongoose.Types.ObjectId(response.id), status: "active", session_key: response.session_key }, function(err, response) {
							if(!err && response) {
								next();
							}
							else {
								return res.json({ status: false, session_end: true, message: 'Invalid Login' });
							}
						});
					}
					// store
					else if(response.user_type=='store') {
						req.login_type = response.login_type;
						store.findOne({ _id: mongoose.Types.ObjectId(response.id), status: "active", session_key: response.session_key }, function(err, response) {
							if(!err && response) {
								next();
							}
							else {
								return res.json({ status: false, session_end: true, message: 'Invalid Login' });
							}
						});
					}
					else { next(); }
	            }
	            else {
	                return res.json({ status: false, message: 'Failed to authenticate token.' });
	            }
	        });
    	}
	    else {
	        return res.json({ status: false, message: 'Unauthorized request.' });
	    }
    }
    else {
        return res.json({ status: false, message: 'No token provided.' });
    }
}
/* Middlewares end */

/* Scheduler */
const cronService = require("./services/scheduler.service");

// every hour
schedule.scheduleJob('59 59 * * * *', function() {
	// abandoned cart
	cronService.cartRecovery();
});

// every day on 1 AM
schedule.scheduleJob('0 0 1 * * *', function() {
	// generate sitemap
	cronService.sitemapGenerator();
	cronService.clearInactiveOrders();
});
/* Scheduler end */