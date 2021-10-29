const mongoose = require('mongoose');
const request = require('request');
const store = require("../src/models/store.model");
const customer = require("../src/models/customer.model");
const orderList = require('../src/models/order_list.model');
const couponList = require('../src/models/coupon_codes.model');
const donationList = require('../src/models/donation_list.model');
const restoredSection = require("../src/models/restored_section.model");
const ysOrders = require("../src/models/ys_orders.model");
const mailService = require("../services/mail.service");
const setupConfig = require('../config/setup.config');
const mailTemp = require('../config/mail-templates');

/** cart recovery **/
exports.cartRecovery = function() {

    store.find({ status: 'active', abandoned_status: true }, function(err, response) {
        if(!err && response) {
            abandonedStores(response).then((respData) => {
                return true;
            });
        }
    });

}

function abandonedCustomers(storeDetails) {
    return new Promise((resolve, reject) => {
        let mailConfig = setupConfig.mail_config;
        if(storeDetails.mail_config.transporter) { mailConfig = storeDetails.mail_config; }
        // get prev 2 hrs time
        let newDate = new Date().setHours( new Date().getHours() - 2 ); 
        customer.find({
            store_id: mongoose.Types.ObjectId(storeDetails._id), status: 'active', 'cart_list.0': { $exists: true },
            cart_recovery: true, cart_updated_on: { $lte: new Date(newDate) }
        }, { name: 1, email: 1 }, function(err, customerList) {
            if(!err && customerList) {
                for(let customerDetails of customerList)
                {
                    let copyYear = new Date().getFullYear();
                    mailTemp.abandoned(storeDetails).then((body) => {
                        let bodyContent = body;
                        let filePath = setupConfig.mail_base+storeDetails._id+'/abandoned.html';
                        request.get(filePath, function (err, response, body) {
                            if(!err && response.statusCode == 200) { bodyContent = body; }
                            bodyContent = bodyContent.replace("##customer_name##", customerDetails.name);
                            bodyContent = bodyContent.replace("##copy_year##", copyYear);
                            let sendData = {
                                store_name: storeDetails.name,
                                config: mailConfig,
                                sendTo: customerDetails.email,
                                subject: "Your cart is waiting. Complete your order today.",
                                body: bodyContent
                            };
                            mailService.sendMailFromStore(sendData, function(err, response) {
                                customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(customerDetails._id) },
                                { $set: { cart_recovery: false } }, function(err, response) { });
                                // if(!err && response) {
                                //     let mailResp = { status: 'send', updated_on: new Date() };
                                //     customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(customerDetails._id) },
                                //     { $set: { cart_recovery: false, mail_response: mailResp } }, function(err, response) { });
                                // }
                                // else {
                                //     let mailResp = { err: JSON.stringify(err), resp: JSON.stringify(response), updated_on: new Date() };
                                //     customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(customerDetails._id) },
                                //     { $set: { cart_recovery: false, mail_response: mailResp } }, function(err, response) { });
                                // }
                            });
                        });
                    });
                }
                resolve(true);
            }
            else { resolve(true); }
        });   
    });
}

async function abandonedStores(storeList) {
    for(let storeDetails of storeList)
    {
        await abandonedCustomers(storeDetails);
    }
}
/** cart recovery end **/

/** clear inactive orders **/
exports.clearInactiveOrders = function() {
    // restored sections
    let sectionClearDate = new Date().setDate(new Date().getDate() - 30);
    restoredSection.deleteMany({ created_on: { $lte: new Date(sectionClearDate) } }, function(err, response) { });
    // order list
    let clearDate = new Date().setDate(new Date().getDate() - 30);
    orderList.deleteMany({ status: "inactive", created_on: { $lte: new Date(clearDate) } }, function(err, response) {
        // coupon codes
        couponList.deleteMany({ status: "inactive", created_on: { $lte: new Date(clearDate) } }, function(err, response) {
            // donation list
            donationList.deleteMany({ status: "inactive", created_on: { $lte: new Date(clearDate) } }, function(err, response) {
                // ys client payments
                ysOrders.deleteMany({ status: "inactive", created_on: { $lte: new Date(clearDate) } }, function(err, response) {
                    return "success";
                });
            });
        });
    });
}
/** clear inactive orders end **/