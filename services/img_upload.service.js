const fs = require("fs");
const https = require('https');
const sharp = require('sharp');
const sizeOf = require('image-size');
const request = require('request');
const setupConfig = require("../config/setup.config");

exports.singleFileUpload = function(image, rootPath, resolutionStatus, imgName) {
    return new Promise((resolve, reject) => {
        if(image) {
            let formData = { image: image, root_path: rootPath, resolution_status: resolutionStatus, image_name: imgName };
            request.post({ url: setupConfig.image_api_base+'/file_upload', form: formData }, function (err, response, body) {
                if(!err && body) {
                    let jsonData = JSON.parse(body);
                    resolve(jsonData.file_name);
                }
                else { resolve(null); }
            });
        }
        else {
            resolve(null);
        } 
    });
}

exports.singleFileUploadFromRequest = function(jsonData) {
    return new Promise((resolve, reject) => {
        let image = jsonData.image;
        let rootPath = jsonData.root_path;
        if(image) {
            let fileType = ""; let base64Data = "";
            if(image.indexOf('png;base64') > -1) {
                fileType = ".png";
                base64Data = image.replace(/^data:image\/png;base64,/, "");
            } else {
                fileType = ".jpg";
                base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
            }
            let randomName = new Date().valueOf()+'-'+Math.floor(Math.random() * Math.floor(999999));
            if(jsonData.image_name) { randomName = jsonData.image_name; }
            let fileName = rootPath+'/'+randomName+fileType;
            if(!fs.existsSync(rootPath)) {
                fs.mkdir(rootPath, { recursive: true }, (err) => {
                    if(!err) {
                        fs.writeFile(fileName, base64Data, 'base64', function(err) {
                            if(!err) {
                                if(jsonData.resolution_status && jsonData.resolution_status!='false') {
                                    sizeOf(fileName, function (err, dimensions) {
                                        let width = Math.floor(dimensions.width*(15/100));
                                        let height = Math.floor(dimensions.height*(15/100));
                                        let lowResFileName = rootPath+'/'+randomName+"_s"+fileType;
                                        sharp(fileName).resize(width, height).toFile(lowResFileName, (err, info) => {
                                            resolve(fileName);
                                        });
                                    });
                                }
                                else { resolve(fileName); }
                            }
                            else { resolve(null); }
                        });
                    }
                    else { resolve(null); }
                });
            }
            else {
                fs.writeFile(fileName, base64Data, 'base64', function(err) {
                    if(!err) {
                        if(jsonData.resolution_status && jsonData.resolution_status!='false') {
                            sizeOf(fileName, function (err, dimensions) {
                                let width = Math.floor(dimensions.width*(15/100));
                                let height = Math.floor(dimensions.height*(15/100));
                                let lowResFileName = rootPath+'/'+randomName+"_s"+fileType;
                                sharp(fileName).resize(width, height).toFile(lowResFileName, (err, info) => {
                                    resolve(fileName);
                                });
                            });
                        }
                        else { resolve(fileName); }
                    }
                    else { resolve(null); }
                });
            }
        }
        else {
            resolve(null);
        } 
    });
}

exports.staticFileUpload = function(imgUrl, rootPath, fileName) {
    return new Promise((resolve, reject) => {
        let formData = { image_url: imgUrl, root_path: rootPath, file_name: fileName };
        request.post({ url: setupConfig.image_api_base+'/static_file_upload', form: formData }, function (err, response, body) {
            if(!err && body) { resolve(true); }
            else { resolve(null); }
        });
    });
}

exports.staticFileUploadFromRequest = function(jsonData) {
    return new Promise((resolve, reject) => {
        let imgUrl = jsonData.image_url;
        let rootPath = jsonData.root_path;
        let uploadFileName = rootPath+'/'+jsonData.file_name;
        if(!fs.existsSync(rootPath)) {
            fs.mkdir(rootPath, { recursive: true }, (err) => {
                if(!err) {
                    let file = fs.createWriteStream(uploadFileName);
                    let request = https.get(imgUrl, function(response) {
                        response.pipe(file);
                        resolve(true);
                    });
                }
                else { resolve(false); }
            });
        }
        else {
            let file = fs.createWriteStream(uploadFileName);
            let request = https.get(imgUrl, function(response) {
                response.pipe(file);
                resolve(true);
            });
        }
    });
}

exports.logoUploadFromRequest = function(jsonData) {
    return new Promise((resolve, reject) => {
        let imgData = "";
        if(jsonData.image.indexOf('png;base64') > -1) { imgData = jsonData.image.replace(/^data:image\/png;base64,/, ""); }
        else { imgData = jsonData.image.replace(/^data:image\/jpeg;base64,/, ""); }
        imgData = new Buffer.from(imgData, 'base64');
        // store logo
        sharp(imgData)
        .resize({ height: 100 })
        .png({quality : 100})
        .toFile(jsonData.root_path+"/logo.png")
        .then(() => {
            // _s store logo
            sharp(imgData)
            .resize({ height: 15 })
            .png({quality : 100})
            .toFile(jsonData.root_path+"/logo_s.png")
            .then(() => {
                // social logo
                sharp(imgData)
                .flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } })
                .resize({ width: 200, height: 200, kernel: sharp.kernel.lanczos3, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }) 
                .jpeg({ quality: 100, chromaSubsampling: '4:4:4'})
                .toFile(jsonData.root_path+"/social_logo.jpg")
                .then(() => {
                    // mail logo
                    sharp(imgData)
                    .resize({ height: 80 })
                    .png({quality : 100})
                    .toFile(jsonData.root_path+"/mail_logo.png")
                    .then(() => {
                        // favicon
                        sharp(imgData)
                        .resize({ width: 50, height: 50, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                        .png({quality : 100})
                        .toFile(jsonData.root_path+"/favicon.png")
                        .then(() => {
                            resolve({ status: true });
                        })
                        .catch((err) => { reject({ status: false, error: err, message: "favicon logo" }); });
                    })
                    .catch((err) => { reject({ status: false, error: err, message: "mail logo" }); });
                })
                .catch((err) => { reject({ status: false, error: err, message: "social logo" }); });
            })
            .catch((err) => { reject({ status: false, error: err, message: "_s store logo" }); });;
        })
        .catch((err) => { reject({ status: false, error: err, message: "store logo" }); });
    });
}