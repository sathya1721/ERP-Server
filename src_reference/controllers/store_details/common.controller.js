"use strict";
const mongoose = require('mongoose');
const request = require('request');
const store = require("../../models/store.model");
const sections = require("../../models/section.model");
const menus = require("../../models/menu.model");
const banner = require("../../models/banner.model");
const layout = require("../../models/layout.model");
const blog = require("../../models/blog.model");
const products = require("../../models/product.model");
const giftCard = require("../../models/gift_card.model");
const discounts = require("../../models/discounts.model");
const collections = require("../../models/collection.model");
const shipping = require("../../models/shipping_methods.model");
const delivery = require("../../models/delivery_methods.model");
const liveCurrency = require("../../models/live_currency.model");
const currencyList = require("../../models/currency_list.model");
const countryList = require("../../models/country_list.model");
const nlSubscribers = require("../../models/newsletter.model");
const productFeatures = require("../../models/product_features.model");
const storeFeatures = require("../../models/store_features.model");
const sitemap = require("../../models/sitemap.model");
const donationList = require("../../models/donation_list.model");
const vendorEnquiry = require("../../models/vendor_enquiry.model");
const policy = require("../../models/policies.model");
const contactPage = require("../../models/contact_page.model");
const locations = require("../../models/locations.model");
const extraPage = require("../../models/extra_page.model");
const dinamicOffers = require("../../models/dinamic_offers.model");
const ysPackages = require("../../models/ys_packages.model");
const quickOrders = require("../../models/quick_orders.model");
const appointments = require("../../models/appointments.model");
const appointmentServices = require("../../models/appointment_services.model");
const setupConfig = require('../../../config/setup.config');
const mailTemp = require('../../../config/mail-templates');
const mailService = require("../../../services/mail.service");
const validationService = require("../../../services/validation.service");

exports.details = (req, res) => {
    store.aggregate([
        { 
            $match: { _id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }
        },
        {
            $lookup: {
                from: "store_permissions",
                localField: "_id",
                foreignField: "store_id",
                as: "permissions"
            }
        },
        {
            $lookup: {
                from: "sections",
                localField: "_id",
                foreignField: "store_id",
                as: "section_list"
            }
        },
        {
            $lookup: {
                from: "product_features",
                localField: "_id",
                foreignField: "store_id",
                as: "product_features"
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let storeDetails = response[0]; let paymentTypes = [];
            storeDetails.email = null; storeDetails.mobile = null; storeDetails.mail_config = {};
            storeDetails.payment_types.filter(obj => obj.status == 'active').forEach(element => {
                paymentTypes.push({ name: element.name, btn_name: element.btn_name });
            });
            storeDetails.payment_types = paymentTypes;
            // fetch live currency
            let defaultPaymentMethod = storeDetails.currency_types.filter(obj => obj.default_currency);
            if(defaultPaymentMethod.length) {
                liveCurrency.findOne({ base: defaultPaymentMethod[0].country_code }, function(err, response) {
                    if(!err && response) {
                        res.json({ status: true, store_details: storeDetails, live_currency: response.rates });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid currency type" });
                    }
                });
            }
            else {
                res.json({ status: true, message: "Invalid default currency type" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

exports.home = (req, res) => {
    // products
    products.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "active", archive_status: false, stock: { $gt: 0 } }, { description: 0 }, function(err, response) {
        if(!err && response) {
            productList(response, req.query.product_limit).then((respData) => {
                banner.aggregate([
                    { 
                        $match: { store_id: mongoose.Types.ObjectId(req.query.store_id) }
                    },
                    {
                        $lookup: {
                            from: "blogs",
                            localField: "store_id",
                            foreignField: "store_id",
                            as: "blog_list"
                        }
                    }
                ], function(err, response) {
                    if(!err && response[0]) {
                        res.json({
                            status: true,
                            banner_list: response[0].banner_list,
                            new_arrivals: respData.new_arrivals,
                            featured_products: respData.featured,
                            recommended_products: respData.recommended,
                            blog_list: response[0].blog_list.filter(obj => obj.status=='enabled').sort((a, b) => 0 - (a.created_on > b.created_on ? 1 : -1)).slice(0, req.query.blog_limit)
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid store" });
                    }
                });
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

// store details
exports.store = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.query.store_id), status: "active" },
    { name: 1, seo_status: 1, seo_details: 1 }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, details: response });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

exports.details_v1 = (req, res) => {
    store.aggregate([
        { 
            $match: { _id: mongoose.Types.ObjectId(req.query.store_id) }
        },
        {
            $lookup: {
                from: "store_permissions",
                localField: "_id",
                foreignField: "store_id",
                as: "permissions"
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let storeDetails = response[0]; let paymentTypes = [];
            if(storeDetails.status=='active') {
                storeDetails.email = null; storeDetails.mail_config = {};
                storeDetails.payment_types.filter(obj => obj.status == 'active').forEach(element => {
                    paymentTypes.push({ name: element.name, btn_name: element.btn_name, rank: element.rank, mode: element.mode, app_config: element.app_config });
                });
                storeDetails.payment_types = paymentTypes;
                // fetch live currency
                let defaultPaymentMethod = storeDetails.currency_types.filter(obj => obj.default_currency);
                if(defaultPaymentMethod.length) {
                    liveCurrency.findOne({ base: defaultPaymentMethod[0].country_code }, function(err, response) {
                        if(!err && response) {
                            let liveCurrencyRates = response.rates;
                            // section list
                            sections.find({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
                                if(!err && response) {
                                    storeDetails.section_list = response;
                                    res.json({ status: true, store_details: JSON.stringify(storeDetails), live_currency: JSON.stringify(liveCurrencyRates) });
                                }
                                else {
                                    storeDetails.section_list = [];
                                    res.json({ status: true, store_details: JSON.stringify(storeDetails), live_currency: JSON.stringify(liveCurrencyRates) });
                                }
                            });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Invalid currency type" });
                        }
                    });
                }
                else {
                    res.json({ status: false, message: "Invalid default currency type" });
                }
            }
            else {
                res.json({ status: true, store_details: JSON.stringify(storeDetails) });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

exports.details_v2 = (req, res) => {
    store.aggregate([
        { 
            $match: { _id: mongoose.Types.ObjectId(req.query.store_id) }
        },
        {
            $lookup: {
                from: "store_permissions",
                localField: "_id",
                foreignField: "store_id",
                as: "permissions"
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let storeDetails = response[0]; let paymentTypes = [];
            if(storeDetails.status=='active') {
                storeDetails.email = null; storeDetails.mail_config = {};
                storeDetails.payment_types.filter(obj => obj.status == 'active').forEach(element => {
                    paymentTypes.push({ name: element.name, btn_name: element.btn_name, rank: element.rank, mode: element.mode, app_config: element.app_config });
                });
                storeDetails.payment_types = paymentTypes;
                // fetch live currency
                let defaultPaymentMethod = storeDetails.currency_types.filter(obj => obj.default_currency);
                if(defaultPaymentMethod.length) {
                    liveCurrency.findOne({ base: defaultPaymentMethod[0].country_code }, function(err, response) {
                        if(!err && response) {
                            let liveCurrencyRates = response.rates;
                            // section list
                            sections.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }, function(err, response) {
                                if(!err && response) {
                                    storeDetails.section_list = response;
                                    // menu list
                                    storeDetails.menu_list = [];
                                    menus.find({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
                                        if(!err && response) { storeDetails.menu_list = response; }
                                        res.json({ status: true, store_details: JSON.stringify(storeDetails), live_currency: JSON.stringify(liveCurrencyRates) });
                                    });
                                }
                                else {
                                    res.json({ status: false, error: err, message: "Invalid catalog" });
                                }
                            });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Invalid currency type" });
                        }
                    });
                }
                else {
                    res.json({ status: false, message: "Invalid default currency type" });
                }
            }
            else {
                res.json({ status: true, store_details: JSON.stringify(storeDetails) });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

exports.details_v3 = (req, res) => {
    store.aggregate([
        { 
            $match: { _id: mongoose.Types.ObjectId(req.query.store_id) }
        },
        {
            $lookup: {
                from: "store_permissions",
                localField: "_id",
                foreignField: "store_id",
                as: "store_properties"
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let storeDetails = response[0]; let paymentTypes = [];
            if(storeDetails.status=='active') {
                storeDetails.email = null; storeDetails.mail_config = {};
                storeDetails.payment_types.filter(obj => obj.status == 'active').forEach(el => {
                    paymentTypes.push({ name: el.name, btn_name: el.btn_name, rank: el.rank, mode: el.mode, app_config: el.app_config, cod_config: el.cod_config });
                });
                storeDetails.payment_types = paymentTypes;
                // live currency
                currencyList.find({}, function(err, response) {
                    if(!err && response) {
                        let liveCurrencyRates = response;
                        // ys package & features
                        ysPackages.aggregate([
                            { $match: {  _id: mongoose.Types.ObjectId(storeDetails.package_details.package_id), status: "active" } },
                            {
                                $lookup: {
                                    from: "ys_features",
                                    localField: "_id",
                                    foreignField: "linked_packages.package_id",
                                    as: "ys_features"
                                }
                            }
                        ], function(err, response) {
                            if(!err && response[0])
                            {
                                let currIndex = storeDetails.currency_types.findIndex(obj => obj.default_currency);
                                let defaultCurrency = storeDetails.currency_types[currIndex];
                                let featureList = storeDetails.package_details.paid_features;
                                let packageData = response[0];
                                if(packageData.trial_status) {
                                    let trialEndData = new Date(storeDetails.created_on).setDate(new Date(storeDetails.created_on).getDate() + parseFloat(packageData.trial_upto_in_days));
                                    if(new Date(trialEndData).setHours(23,59,59,999) > new Date().setHours(23,59,59,999)) {
                                        packageData.trial_features.forEach(element => { featureList.push(element); });
                                    }
                                }
                                packageData.ys_features.filter(fea => fea.status=='active').forEach(element => {
                                    let packIndex = element.linked_packages.findIndex(obj => obj.package_id.toString()==storeDetails.package_details.package_id);
                                    if(packIndex!=-1) {
                                        element.package_pricing = element.linked_packages[packIndex].currency_types;
                                        if(element.package_pricing && element.package_pricing[defaultCurrency.country_code] && element.package_pricing[defaultCurrency.country_code].price === 0) featureList.push(element.keyword);
                                    }
                                });
                                // section list
                                storeDetails.section_list = [];
                                sections.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }, function(err, response) {
                                    if(!err && response) { storeDetails.section_list = response; }
                                    // menu list
                                    storeDetails.menu_list = [];
                                    menus.find({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
                                        if(!err && response) { storeDetails.menu_list = response; }
                                        res.json({ status: true, store_details: JSON.stringify(storeDetails), ys_features: JSON.stringify(featureList), live_currencies: JSON.stringify(liveCurrencyRates) });
                                    });
                                });
                            }
                            else {
                                res.json({ status: false, error: err, message: "Invalid package" });
                            }
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid currency type" });
                    }
                });
            }
            else {
                res.json({ status: true, store_details: JSON.stringify(storeDetails) });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

// layout list
exports.layouts = (req, res) => {
    layout.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), active_status: true }, function(err, response) {
        if(!err && response) {
            let layoutList = response;
            let layoutProductIndex = layoutList.findIndex(obj => obj.type=='featured_product' || obj.type=='multiple_featured_product');
            if(layoutProductIndex!=-1) {
                // products
                products.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "active", archive_status: false, stock: { $gt: 0 } },
                {
                    _id: 1, category_id: 1, sku: 1, name: 1, stock: 1, rank: 1, unit: 1, image_list: 1, featured: 1, disc_status: 1, selling_price: 1,
                    brand: 1, discounted_price: 1, seo_status: 1, seo_details: 1, created_on: 1
                }, 
                function(err, response) {
                    if(!err && response) {
                        let productList = response;
                        processLayoutList(JSON.stringify(productList), JSON.stringify(layoutList)).then((respData) => {
                            res.json({ status: true, list: JSON.stringify(respData) });
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid store" });
                    }
                });
            }
            else {
                res.json({ status: true, list: JSON.stringify(layoutList) });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

// AI Styling Assistant
exports.ai_styles = (req, res) => {
    storeFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, list: JSON.stringify(response.ai_styles) });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

// Sizing Assistant
exports.sizing_assistant = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), "sizing_assistant._id": mongoose.Types.ObjectId(req.body.sizing_id) }, function(err, response) {
        if(!err && response) {
            let filterList = response.sizing_assistant.filter(obj => obj._id.toString()==req.body.sizing_id);
            if(filterList.length) { res.json({ status: true, data: filterList[0] }); }
            else { res.json({ status: false, error: "Not exist", message: "Failure" }); }
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

// product features
exports.product_features = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, data: JSON.stringify(response) });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

// shipping methods
exports.shipping_methods = (req, res) => {
    shipping.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, list: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

// delivery methods
exports.delivery_methods = (req, res) => {
    delivery.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, data: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

// quick order details
exports.quick_order_details = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            let storeDetails = response;
            let currencyDetails = storeDetails.currency_types.filter(obj => obj.country_code==req.body.currency_type)[0];
            let modelList = []; let checkoutSetting = {}
            quickOrders.findOne({ store_id: mongoose.Types.ObjectId(req.body.store_id), _id: mongoose.Types.ObjectId(req.body._id), status: "active" }, function(err, response) {
                if(!err && response) {
                    let quickOrderData = response;
                    if(response.expiry_status && response.expiry_on) {
                        if(new Date(response.expiry_on) > new Date())
                        {
                            validationService.findCartSubTotal(storeDetails._id, currencyDetails, modelList, quickOrderData.item_list, checkoutSetting).then((respData) => {
                                res.json({ status: true, qo_data: quickOrderData, order_data: respData });
                            });
                        }
                        else {
                            res.json({ status: false, message: "Link was expired" });
                        }
                    }
                    else {
                        validationService.findCartSubTotal(storeDetails._id, currencyDetails, modelList, quickOrderData.item_list, checkoutSetting).then((respData) => {
                            res.json({ status: true, qo_data: quickOrderData, order_data: respData });
                        });
                    }
                }
                else { res.json({ status: false, error: err, message: "Invalid Link" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid Store" });
        }
    });
}

// gift cards
exports.gift_cards = (req, res) => {
    giftCard.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            if(req.query.gc_id) {
                let cardList = response.card_list;
                let index = cardList.findIndex(obj => obj._id.toString() == req.query.gc_id || obj.page_url == req.query.gc_id);
                if(index!=-1) {
                    res.json({ status: true, data: cardList[index] });
                }
                else {
                    res.json({ status: false, message: "Invalid giftcard" });
                }
            }
            else { res.json({ status: true, list: response.card_list }); }
        }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// country list
exports.country_list = (req, res) => {
    if(req.query.country) {
        countryList.findOne({ name: req.query.country }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, data: response });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
    else {
        countryList.find({}, function(err, response) {
            if(!err && response) {
                res.json({ status: true, list: response });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
}

// blogs
exports.blogs = (req, res) => {
    if(req.query.limit) {
        blog.aggregate([
            { $match: { store_id: mongoose.Types.ObjectId(req.query.store_id), status: "enabled" } },
            { $project: { description: 0 } },
            { $sort: { created_on: -1 } },
            { $limit : parseInt(req.query.limit) }
        ], function(err, response) {
            if(!err && response) {
                res.json({ status: true, list: JSON.stringify(response) });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
    else {
        blog.find({ store_id: mongoose.Types.ObjectId(req.query.store_id), status: "enabled" }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, list: response });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
}
exports.blog_details = (req, res) => {
    if(mongoose.Types.ObjectId.isValid(req.query.blog_id))
    {
        blog.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), _id: mongoose.Types.ObjectId(req.query.blog_id) }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, data: response });
            }
            else {
                blog.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), "seo_details.page_url": req.query.blog_id }, function(err, response) {
                    if(!err && response) {
                        res.json({ status: true, data: response });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Failure" });
                    }
                });
            }
        });
    }
    else {
        blog.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), "seo_details.page_url": req.query.blog_id }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, data: response });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
}

// discounts
exports.discounts = (req, res) => {
    discounts.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: true, list: [] }); }
    });
}

// collections
exports.collections = (req, res) => {
    collections.find({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, list: response });
        }
        else {
            res.json({ status: true, list: [] });
        }
    });
}

// appointment services
exports.appointment_services = (req, res) => {
    if(req.query.id) {
        appointmentServices.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), "list._id": mongoose.Types.ObjectId(req.query.id) }, function(err, response) {
            if(!err && response) { res.json({ status: true, data: response.list.filter(object => object._id.toString() == req.query.id)[0] }); }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        });
    }
    else if(req.query.category) {
        appointmentServices.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), page_url: req.query.category }, function(err, response) {
            if(!err && response) { res.json({ status: true, list: response.list }); }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        });
    }
    else {
        appointmentServices.find({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
            if(!err && response) { res.json({ status: true, list: response }); }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        });
    }
}

// appointments
exports.appointments = (req, res) => {
    let fromDate = new Date(req.body.booking_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.booking_date).setHours(23,59,59,999);
    appointments.aggregate([
        { 
            $match: {
                store_id: mongoose.Types.ObjectId(req.body.store_id), service_id: mongoose.Types.ObjectId(req.body.service_id),
                booking_date: { $gte: new Date(fromDate), $lt: new Date(toDate) }, status: { $ne: 'inactive' }
            }
        }
    ], function(err, response) {
        if(!err && response) { res.json({ status: true, list: response }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// newsletter
exports.subscribe_newsletter = (req, res) => {
    nlSubscribers.findOne({ store_id: mongoose.Types.ObjectId(req.body.store_id), "email": req.body.email }, function(err, response) {
        if(!err && !response) {
            nlSubscribers.create(req.body, function(err, response) {
                if(!err && response) { res.json({ status: true }); }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else res.json({ status: true });
    });
}

// enquiry mail
exports.enquiry_mail = (req, res) => {
    if(!req.body.mobile) req.body.mobile = "NA";
    if(!req.body.message) req.body.message = "NA";
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            let storeDetails = response;
            let mailConfig = setupConfig.mail_config;
            if(storeDetails.mail_config.transporter) { mailConfig = storeDetails.mail_config; }
            mailTemp.enquiry(storeDetails).then((body) => {
                let bodyContent = body;
                let filePath = setupConfig.mail_base+storeDetails._id+'/enquiry.html';
                request.get(filePath, function (err, response, body) {
                    if(!err && response.statusCode == 200) { bodyContent = body; }
                    bodyContent = bodyContent.replace("##name##", req.body.name);
                    bodyContent = bodyContent.replace("##email_id##", req.body.email);
                    bodyContent = bodyContent.replace("##mobile##", req.body.mobile);
                    bodyContent = bodyContent.replace("##message##", req.body.message);
                    if(!req.body.subject) req.body.subject = "New Enquiry";
                    if(!req.body.to_mail) req.body.to_mail = storeDetails.mail_config.cc_mail;
                    let sendData = {
                        store_name: storeDetails.name,
                        config: mailConfig,
                        sendTo: req.body.to_mail,
                        subject: req.body.subject,
                        body: bodyContent
                    };
                    // send mail
                    mailService.sendMailFromStore(sendData, function(err, response) {
                        if(!err && response) { res.json({ status: true }); }
                        else { res.json({ status: false, error: err, message: "Email send failed" }); }
                    });
                });
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid store" });
        }
    });
}

// vendor enquiry mail
exports.vendor_enquiry_mail = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            let storeDetails = response;
            vendorEnquiry.create(req.body, function(err, response) {
                let mailConfig = setupConfig.mail_config;
                if(storeDetails.mail_config.transporter) { mailConfig = storeDetails.mail_config; }
                mailTemp.vendor_enquiry(storeDetails).then((body) => {
                    let bodyContent = body;
                    let filePath = setupConfig.mail_base+storeDetails._id+'/vendor_enquiry.html';
                    request.get(filePath, function (err, response, body) {
                        if(!err && response.statusCode == 200) { bodyContent = body; }
                        bodyContent = bodyContent.replace("##name##", req.body.name);
                        bodyContent = bodyContent.replace("##company_name##", req.body.company_name);
                        bodyContent = bodyContent.replace("##email_id##", req.body.email);
                        bodyContent = bodyContent.replace("##mobile##", req.body.mobile);
                        if(!req.body.subject) req.body.subject = "New Vendor Enquiry";
                        if(!req.body.to_mail) req.body.to_mail = storeDetails.mail_config.cc_mail;
                        let sendData = {
                            store_name: storeDetails.name,
                            config: mailConfig,
                            sendTo: req.body.to_mail,
                            subject: req.body.subject,
                            body: bodyContent
                        };
                        // send mail
                        mailService.sendMailFromStore(sendData, function(err, response) {
                            if(!err && response) { res.json({ status: true }); }
                            else { res.json({ status: false, error: err, message: "Email send failed" }); }
                        });
                    });
                });
            });
        }
        else res.json({ status: false, error: err, message: "Invalid store" });
    });
}

// policy
exports.policy_details = (req, res) => {
    policy.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), type: req.query.type }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// contact page
exports.contact_page = (req, res) => {
    contactPage.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// store locations
exports.locations = (req, res) => {
    locations.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// extra page
exports.extra_page = (req, res) => {
    extraPage.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), page_url: req.query.type }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// dinamic offers
exports.dinamic_offers = (req, res) => {
    if(req.query.id) {
        dinamicOffers.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id), "offer_list.page_url": req.query.id }, function(err, response) {
            if(!err && response) {
                let filterList = response.offer_list.filter(obj => obj.page_url==req.query.id);
                res.json({ status: true, data: filterList[0] });
            }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        });
    }
    else {
        dinamicOffers.find({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
            if(!err && response) { res.json({ status: true, list: response }); }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        });
    }
}

// sitemap
exports.sitemap = (req, res) => {
    sitemap.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            res.send(response.content);
        }
        else {
            res.send("<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9' xmlns:xhtml='http://www.w3.org/1999/xhtml'></urlset>");
        }
    });
}

// donations
exports.donation_amt = (req, res) => {
    if(req.query.country_code) {
        donationList.aggregate([
            { $match: { 
                store_id: mongoose.Types.ObjectId(req.query.store_id), status: 'active', payment_success: true,
                "currency_type.country_code": req.query.country_code 
            } },
            { $group: { _id : null, total : { $sum: "$price" }, count: { $sum: 1 } } }
        ], function(err, response) {
            if(!err && response[0]) {
                res.json({ status: true, data: response[0] });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
    else {
        donationList.aggregate([
            { $match: { store_id: mongoose.Types.ObjectId(req.query.store_id), status: 'active', payment_success: true } },
            { $group: { _id : null, total : { $sum: "$price" }, count: { $sum: 1 } } }
        ], function(err, response) {
            if(!err && response[0]) {
                res.json({ status: true, data: response[0] });
            }
            else {
                res.json({ status: false, error: err, message: "Failure" });
            }
        });
    }
}

function filterAvailableProducts(productList) {
    return new Promise((resolve, reject) => {
        let availableProducts = [];
        for(let i=0; i<productList.length; i++)
        {
            if(productList[i].hold_till) {
                let balanceStock = productList[i].stock;
                if(new Date() < new Date(productList[i].hold_till)) balanceStock = productList[i].stock - productList[i].hold_qty;
                if(balanceStock > 0) availableProducts.push(productList[i]);
            }
            else availableProducts.push(productList[i]);
        }
        resolve(availableProducts);
    });
}

async function productList(productList, limit) {
    let availableProducts = await filterAvailableProducts(productList);
    let featuredProducts = availableProducts.filter(obj => obj.featured).sort((a, b) => 0 - (a.rank > b.rank ? -1 : 1)).slice(0, limit);
    let recommendedProducts = availableProducts.sort((a, b) => 0 - (a.ordered_qty > b.ordered_qty ? 1 : -1)).slice(0, limit);
    let newArrivals = availableProducts.sort((a, b) => 0 - (a.created_on > b.created_on ? 1 : -1)).slice(0, limit);
    return { new_arrivals: newArrivals, featured: featuredProducts, recommended: recommendedProducts };
}

// process layout list
function processLayoutList(proList, layList) {
    return new Promise((resolve, reject) => {
        let productList = JSON.parse(proList);
        let layoutList = JSON.parse(layList);
        let featuredProducts = productList.filter(obj => obj.featured).sort((a, b) => 0 - (a.rank > b.rank ? 1 : -1)).slice(0, 10);
        let discountedProducts = productList.filter(obj => obj.disc_status).sort((a, b) => 0 - (a.rank > b.rank ? 1 : -1)).slice(0, 10);
        let newArrivals = productList.sort((a, b) => 0 - (a.created_on > b.created_on ? 1 : -1)).slice(0, 10);
        for(let segment of layoutList) {
            if(segment.type=='featured_product') {
                segment.product_list = productList.filter(obj => obj.category_id.includes(segment.featured_category_id)).sort((a, b) => 0 - (a.rank > b.rank ? 1 : -1)).slice(0, 10);
            }
            else if(segment.type=='multiple_featured_product') {
                for(let tab of segment.multitab_list) {
                    tab.product_list = [];
                    if(tab.type=='featured') { tab.product_list = featuredProducts; }
                    else if(tab.type=='discounted') { tab.product_list = discountedProducts; }
                    else if(tab.type=='new_arrivals') { tab.product_list = newArrivals; }
                    else if(tab.type=='category') {
                        tab.product_list = productList.filter(obj => obj.category_id.indexOf(tab.category_id)!=-1).sort((a, b) => 0 - (a.rank > b.rank ? 1 : -1)).slice(0, 10);
                    }
                }
            }
        }
        resolve(layoutList);
    });
}