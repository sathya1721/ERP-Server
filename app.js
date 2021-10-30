const express = require("express");
// const helmet = require('helmet');
const port = 4100;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const logger = require("morgan");
const jwt = require("jsonwebtoken");
const schedule = require("node-schedule");
const fileUpload = require("express-fileupload");
const dbConfig = require("./config/db.config");
const jwtConfig = require("./config/jwtsecret");
// const colorThief = require('colorthief');
const app = express();

const environment = "development";
// const environment = 'production';

// app.use(helmet());
app.use(cors());
app.use(logger("dev"));
app.use(fileUpload());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);

mongoose.Promise = global.Promise;

if (environment == "production") {
  console.log("production env");

  /* DB CONNECTION */
  mongoose
    .connect(dbConfig.production.credentials, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("database connected"))
    .catch((err) => console.error("db conn err", err));

  /* CREATE SERVER */
  /* const privateKey = fs.readFileSync('/etc/letsencrypt/live/yourstore.io/privkey.pem');
   	const certificate = fs.readFileSync('/etc/letsencrypt/live/yourstore.io/fullchain.pem');
	const credentials = { key : privateKey , cert: certificate};
	const server = https.createServer(credentials, app); */
  const server = http.createServer(app);

  /* LISTEN PORT */
  server.listen(port, function (err, res) {
    if (err) console.log("port error", err);
    console.log("Running on port " + port + "...");
  });
} else {
  console.log("development env");

  /* DB CONNECTION */
  mongoose
    .connect(dbConfig.development.credentials, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("database connected"))
    .catch((err) => console.error("db conn err", err));

  /* CREATE SERVER */
  const server = http.createServer(app);

  /* LISTEN PORT */
  server.listen(port, function (err, res) {
    if (err) console.log("port error", err);
    console.log("Running on port " + port + "...");
  });
}

const authRoutes = require("./src/routes/auth.route");
const adminRoutes = require("./src/routes/admin.route");
const storeRoutes = require("./src/routes/store.route");
// const storeDetailRoutes = require('./src/routes/store_details.route');
// const userRoutes = require('./src/routes/user.route');
// const guestRoutes = require('./src/routes/guest.route');
// const guestUserRoutes = require('./src/routes/guest_user.route');
const otherRoutes = require("./src/routes/others.route");
// const jenkin = require('./src/controllers/jenkin.controller');

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/store", verifyToken, storeRoutes);
// app.use("/store", storeRoutes);
// app.use('/store_details', storeDetailRoutes);
// app.use('/user', verifyToken, userRoutes);
// app.use('/guest', guestRoutes);
// app.use('/guest_user', verifyToken, guestUserRoutes);
app.use("/others", otherRoutes);
// app.use('/jenkin', jenkin);

app.get("/", function (req, res) {
  res.send({ message: "Welcome to ERP version 0.1" });
});
app.get("/undefined", function (req, res) {
  res.end();
});
app.get("/null", function (req, res) {
  res.end();
});

// const admin = require('./src/models/admin.model');
const store = require("./src/models/store.model");
// const guestUser = require('./src/models/guest_user.model');
// const storeFeatures = require('./src/models/store_features.model');
// const commonService = require("./services/common.service");
const imgUploadService = require("./services/img_upload.service");

app.post("/logo_upload", function (req, res) {
  req.body.root_path = "uploads/" + req.body.store_id;
  if (!fs.existsSync(req.body.root_path)) {
    fs.mkdir(req.body.root_path, { recursive: true }, (err) => {
      if (!err) {
        imgUploadService
          .logoUploadFromRequest(req.body)
          .then((respData) => {
            colorThief
              .getColor(path.join(__dirname, req.body.root_path + "/logo.png"))
              .then((color) => {
                colorThief
                  .getPalette(
                    path.join(__dirname, req.body.root_path + "/logo.png")
                  )
                  .then((colors) => {
                    colors.unshift(color);
                    res.json({
                      status: true,
                      colors: colors.map((color) =>
                        commonService.rgbToHex(color)
                      ),
                    });
                  })
                  .catch((err) => {
                    res.json({ status: false, message: "getcolors error" });
                  });
              })
              .catch((err) => {
                res.json({ status: false, message: "getcolors error" });
              });
          })
          .catch((errData) => {
            res.json(errData);
          });
      } else {
        res.json({ status: false, error: err, message: "mkdir error" });
      }
    });
  } else {
    imgUploadService
      .logoUploadFromRequest(req.body)
      .then((respData) => {
        colorThief
          .getColor(path.join(__dirname, req.body.root_path + "/logo.png"))
          .then((color) => {
            colorThief
              .getPalette(
                path.join(__dirname, req.body.root_path + "/logo.png")
              )
              .then((colors) => {
                colors.unshift(color);
                res.json({
                  status: true,
                  colors: colors.map((color) => commonService.rgbToHex(color)),
                });
              })
              .catch((err) => {
                res.json({ status: false, message: "getcolors error" });
              });
          })
          .catch((err) => {
            res.json({ status: false, message: "getcolors error" });
          });
      })
      .catch((errData) => {
        res.json(errData);
      });
  }
});

app.post("/logo_colors", function (req, res) {
  colorThief
    .getColor(req.body.file_name)
    .then((color) => {
      colorThief
        .getPalette(req.body.file_name)
        .then((colors) => {
          colors.unshift(color);
          res.json({
            status: true,
            colors: colors.map((color) => commonService.rgbToHex(color)),
          });
        })
        .catch((err) => {
          res.json({ status: false, message: "getcolors error" });
        });
    })
    .catch((err) => {
      res.json({ status: false, message: "getcolors error" });
    });
});

app.post("/file_upload", function (req, res) {
  imgUploadService.singleFileUploadFromRequest(req.body).then((fileName) => {
    res.json({ file_name: fileName });
  });
});

app.post("/static_file_upload", function (req, res) {
  imgUploadService.staticFileUploadFromRequest(req.body).then((respData) => {
    res.json({ success: respData });
  });
});

/* Middlewares */
function verifyToken(req, res, next) {
  if (req.headers.authorization) {
    let token = req.headers.authorization.split(" ")[1];
    if (token) {
      jwt.verify(token, jwtConfig.jwtSecretKey, function (err, response) {
        if (!err && response) {
          req.id = response.id;
          req.user_type = response.user_type;
          // admin
          if (response.user_type == "admin") {
            admin.findOne(
              {
                _id: mongoose.Types.ObjectId(response.id),
                status: "active",
                session_key: response.session_key,
              },
              function (err, response) {
                if (!err && response) {
                  next();
                } else {
                  return res.json({
                    status: false,
                    session_end: true,
                    message: "Invalid Login",
                  });
                }
              }
            );
          }
          // store
          else if (response.user_type == "store") {
            req.login_type = response.login_type;
            if (response.login_type == "admin") {
              store.findOne(
                {
                  _id: mongoose.Types.ObjectId(response.id),
                  status: "active",
                  session_key: response.session_key,
                },
                function (err, response) {
                  if (!err && response) {
                    next();
                  } else {
                    return res.json({
                      status: false,
                      session_end: true,
                      message: "Invalid Login",
                    });
                  }
                }
              );
            } else if (response.login_type == "subuser") {
              req.subuser_id = response.subuser_id;
              storeFeatures.findOne(
                {
                  store_id: mongoose.Types.ObjectId(response.id),
                  "sub_users._id": mongoose.Types.ObjectId(response.subuser_id),
                  "sub_users.session_key": response.session_key,
                  "sub_users.status": "active",
                },
                function (err, response) {
                  if (!err && response) {
                    next();
                  } else {
                    return res.json({
                      status: false,
                      session_end: true,
                      message: "Invalid Login",
                    });
                  }
                }
              );
            } else if (response.login_type == "vendor") {
              req.vendor_id = response.vendor_id;
              storeFeatures.findOne(
                {
                  store_id: mongoose.Types.ObjectId(response.id),
                  "vendors._id": mongoose.Types.ObjectId(response.vendor_id),
                  "vendors.session_key": response.session_key,
                  "vendors.status": "active",
                },
                function (err, response) {
                  if (!err && response) {
                    next();
                  } else {
                    return res.json({
                      status: false,
                      session_end: true,
                      message: "Invalid Login",
                    });
                  }
                }
              );
            } else {
              return res.json({ status: false, message: "Invalid Login" });
            }
          }
          // guest
          else if (response.user_type == "guest") {
            guestUser.findOne(
              {
                _id: mongoose.Types.ObjectId(response.id),
                status: "active",
                session_key: response.session_key,
              },
              function (err, response) {
                if (!err && response) {
                  next();
                } else {
                  return res.json({
                    status: false,
                    session_end: true,
                    message: "Invalid User",
                  });
                }
              }
            );
          } else {
            next();
          }
        } else {
          return res.json({
            status: false,
            message: "Failed to authenticate token.",
          });
        }
      });
    } else {
      return res.json({ status: false, message: "Unauthorized request." });
    }
  } else {
    return res.json({ status: false, message: "No token provided." });
  }
}
/* Middlewares end */

/* Scheduler */
// const cronService = require("./services/scheduler.service");

// every hour
// schedule.scheduleJob('59 59 * * * *', function() {
// 	if(environment=='production') {
// 		// abandoned cart
// 		cronService.cartRecovery();
// 	}
// });

// every day on 1 AM
// schedule.scheduleJob('0 0 1 * * *', function() {
// 	if(environment=='production') {
// 		// clear inactive orders
// 		cronService.clearInactiveOrders();
// 	}
// });
/* Scheduler end */
