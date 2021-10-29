"use strict";
const mongoose = require('mongoose');
const request = require('request');
const store = require("../../models/store.model");
const product = require("../../models/product.model");
const coupon = require("../../models/coupon_codes.model");
const offers = require("../../models/offer_codes.model");
const storeFeatures = require("../../models/store_features.model");

// update cart list
exports.update_cart_list = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id) }, function(err, response) {
        if(!err && response) {
            processCartList(req.body.store_id, req.body.cart_list).then((updatedCartList) => {
                res.json({ status: true, list: updatedCartList });
            });
        } else {
            res.json({ status: false, message: "Invalid store" });
        }
    });
}

// check product stock availability
exports.check_stock_availabilty = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id) }, function(err, response) {
        if(!err && response) {
            checkProductsAvailability(req.body.item_list).then((updatedItemList) => {
                res.json({ status: true, list: updatedItemList });
            });
        } else {
            res.json({ status: false, message: "Invalid store" });
        }
    });
}

// check coupon availability
exports.validate_coupons = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id) }, function(err, response) {
        if(!err && response) {
            checkCouponValid(req.body.store_id, req.body.coupon_list).then((updatedCouponList) => {
                res.json({ status: true, list: updatedCouponList });
            });
        } else {
            res.json({ status: false, message: "Invalid store" });
        }
    });
}

// validate offer code
exports.validate_offer_code = (req, res) => {
    offers.findOne({ store_id: mongoose.Types.ObjectId(req.body.store_id), code: req.body.code, status: "active", enable_status: true, valid_from: { $lte: new Date() } }, function(err, response) {
        if(!err && response) {
            let codeDetails = response;
            if(codeDetails.valid_to)
            {
                if(new Date(codeDetails.valid_to) >= new Date()) {
                    res.json({ status: true, data: codeDetails });
                }
                else {
                    res.json({ status: false, message: "Offer expired" });
                }
            }
            else {
                res.json({ status: true, data: codeDetails });
            }
        }
        else {
            res.json({ status: false, message: "Invalid code" });
        }
    });
}

// check dunzo service availability
exports.check_dunzo_availabilty = (req, res) => {
    storeFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            let dunzoIndex = response.courier_partners.findIndex(obj => obj.name=='Dunzo');
            if(dunzoIndex!=-1) {
                let dunzoConfig = response.courier_partners[dunzoIndex];
                let formData = {
                    pickup_details: [{ lat: req.body.pickup_lat, lng: req.body.pickup_lng, reference_id: "pickup1" }],
                    drop_details: [{ lat: req.body.drop_lat, lng: req.body.drop_lng, reference_id: "drop1" }]
                };
                const options = {
                    method: 'POST',
                    url: dunzoConfig.base_url+'/api/v2/quote',
                    headers: {
                        'Content-Type': 'application/json', 'Accept-Language': 'en_US', 'client-id': dunzoConfig.metadata.client_id,
                        'Authorization': dunzoConfig.token
                    },
                    body: formData,
                    json: true
                };
                request(options, function(err, response, body) {
                    if(!err) {
                        if(response.statusCode == 200) {
                            res.json({ status: true, data: { estimated_price: body.estimated_price } });
                        }
                        else { res.json({ status: false, error: response.statusCode, message: body.message }); }
                    }
                    else { res.json({ status: false, error: err, message: "Unable to reach dunzo server." }); }
                });
            }
            else { res.json({ status: false, message: "Dunzo service unavailable." }); }
        }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

function getCartProductDetails(storeId, productDetails) {
    return new Promise((resolve, reject) => {
        product.findOne({ store_id: mongoose.Types.ObjectId(storeId), _id: mongoose.Types.ObjectId(productDetails.product_id), status: "active", archive_status: false }, function(err, response) {
            if(!err && response) {
                productDetails.category_id = response.category_id;
                productDetails.sku = response.sku;
                productDetails.name = response.name;
                productDetails.weight = response.weight;
                productDetails.unit = response.unit;
                productDetails.disc_status = response.disc_status;
                productDetails.disc_percentage = response.disc_percentage;
                productDetails.image = response.image_list[0].image;
                productDetails.seo_status = response.seo_status;
                productDetails.seo_details = response.seo_details;
                if(response.hsn_code) { productDetails.hsn_code = response.hsn_code; }
                if(response.slot_details) { productDetails.slot_details = response.slot_details; }
                // if variant based product
                if(productDetails.variant_status)
                {
                    let variants = productDetails.variant_types;
                    if(variants.length)
                    {
                        let filterVariant = [];
                        if(variants.length===1) {
                            filterVariant = response.variant_list.filter(object => object[variants[0].name]==variants[0].value);
                            if(response.image_tag_status) {
                                let filterImgList = response.image_list.filter(obj => obj.tag==variants[0].value);
                                if(filterImgList.length) { productDetails.image = filterImgList[0].image; }
                            }
                        }
                        else if(variants.length===2) {
                            filterVariant = response.variant_list.filter(object => object[variants[0].name]==variants[0].value && object[variants[1].name]==variants[1].value);
                            if(response.image_tag_status) {
                                let filterImgList = response.image_list.filter(obj => obj.tag==variants[0].value || obj.tag==variants[1].value);
                                if(filterImgList.length) { productDetails.image = filterImgList[0].image; }
                            }
                        }
                        else if(variants.length===3) {
                            filterVariant = response.variant_list.filter(object => object[variants[0].name]==variants[0].value && object[variants[1].name]==variants[1].value && object[variants[2].name]==variants[2].value);
                            if(response.image_tag_status) {
                                let filterImgList = response.image_list.filter(obj => obj.tag==variants[0].value || obj.tag==variants[1].value || obj.tag==variants[2].value);
                                if(filterImgList.length) { productDetails.image = filterImgList[0].image; }
                            }
                        }
                        // selected variant exist
                        if(filterVariant.length) {
                            if(filterVariant[0].sku) { productDetails.sku = filterVariant[0].sku; }
                            if(filterVariant[0].taxrate_id) { productDetails.taxrate_id = filterVariant[0].taxrate_id; }
                            if(filterVariant[0].image_list && filterVariant[0].image_list.length) { productDetails.image = filterVariant[0].image_list[0].image; }
                            productDetails.selling_price = filterVariant[0].selling_price;
                            productDetails.discounted_price = filterVariant[0].discounted_price;
                            productDetails.final_price = parseFloat(productDetails.discounted_price);
                            if(productDetails.unit=="Pcs") {
                                productDetails.final_price = parseFloat(productDetails.discounted_price)+parseFloat(productDetails.addon_price);
                            }
                            productDetails.stock = filterVariant[0].stock;
                            resolve(productDetails);
                        }
                        else resolve(null);
                    }
                    else resolve(null);
                }
                else {
                    productDetails.selling_price = response.selling_price;
                    productDetails.discounted_price = response.discounted_price;
                    productDetails.final_price = parseFloat(productDetails.discounted_price);
                    if(productDetails.unit=="Pcs") {
                        productDetails.final_price = parseFloat(productDetails.discounted_price)+parseFloat(productDetails.addon_price);
                    }
                    productDetails.stock = response.stock;
                    resolve(productDetails);
                }
            }
            else resolve(null);
        });
    });
}

function getProductAvailability(productDetails) {
    return new Promise((resolve, reject) => {
        let variants = productDetails.variant_types;
        if(variants.length)
        {
            let queryParams = {};
            if(variants.length===1) {
                queryParams = { _id: mongoose.Types.ObjectId(productDetails.product_id), status: "active", archive_status: false,
                    variant_list: {
                        "$elemMatch": {
                            [variants[0].name]: variants[0].value
                        }
                    }
                };
            }
            else if(variants.length===2) {
                queryParams = { _id: mongoose.Types.ObjectId(productDetails.product_id), status: "active", archive_status: false,
                    variant_list: {
                        "$elemMatch": {
                            [variants[0].name]: variants[0].value,
                            [variants[1].name]: variants[1].value
                        }
                    }
                };
            }
            else if(variants.length===3) {
                queryParams = { _id: mongoose.Types.ObjectId(productDetails.product_id), status: "active", archive_status: false,
                    variant_list: {
                        "$elemMatch": {
                            [variants[0].name]: variants[0].value,
                            [variants[1].name]: variants[1].value,
                            [variants[2].name]: variants[2].value
                        }
                    }
                };
            }
            product.findOne(queryParams, function(err, response) {
                if(!err && response) {
                    let variantInfo = [];
                    if(variants.length===1) {
                        variantInfo = response.variant_list.filter(element => 
                            element[variants[0].name]==variants[0].value
                        );
                    }
                    else if(variants.length===2) {
                        variantInfo = response.variant_list.filter(element => 
                            element[variants[0].name]==variants[0].value && element[variants[1].name]==variants[1].value
                        );
                    }
                    else if(variants.length===3) {
                        variantInfo = response.variant_list.filter(element => 
                            element[variants[0].name]==variants[0].value && element[variants[1].name]==variants[1].value && element[variants[2].name]==variants[2].value
                        );
                    }
                    if(variantInfo.length) {
                        let variantDetails = variantInfo[0];
                        if(variantDetails.stock >= productDetails.quantity)
                        {
                            productDetails.hold_till = variantDetails.hold_till;
                            productDetails.hold_qty = variantDetails.hold_qty;
                            if(variantDetails.hold_till) {
                                // if hold time expired
                                if(new Date() > new Date(variantDetails.hold_till)) {
                                    productDetails.unavailable = false;
                                    resolve(productDetails);
                                }
                                else {
                                    if((variantDetails.stock-variantDetails.hold_qty) >= productDetails.quantity) {
                                        productDetails.unavailable = false;
                                        resolve(productDetails);
                                    }
                                    else {
                                        productDetails.available_qty = variantDetails.stock-variantDetails.hold_qty;
                                        productDetails.unavailable = true;
                                        resolve(productDetails);
                                    }
                                }
                            }
                            else {
                                productDetails.unavailable = false;
                                resolve(productDetails);
                            }
                        }
                        else {
                            productDetails.available_qty = variantDetails.stock;
                            productDetails.unavailable = true;
                            resolve(productDetails);
                        }
                    }
                    else {
                        productDetails.available_qty = 0;
                        productDetails.unavailable = true;
                        resolve(productDetails);
                    }
                } else {
                    productDetails.available_qty = 0;
                    productDetails.unavailable = true;
                    resolve(productDetails);
                }
            });
        }
        else {
            product.findOne({ _id: mongoose.Types.ObjectId(productDetails.product_id), status: "active", archive_status: false }, function(err, response) {
                if(!err && response) {
                    if(response.stock >= productDetails.quantity)
                    {
                        productDetails.hold_till = response.hold_till;
                        productDetails.hold_qty = response.hold_qty;
                        if(response.hold_till) {
                            // if hold time expired
                            if(new Date() > new Date(response.hold_till)) {
                                productDetails.unavailable = false;
                                resolve(productDetails);
                            }
                            else {
                                if((response.stock-response.hold_qty) >= productDetails.quantity) {
                                    productDetails.unavailable = false;
                                    resolve(productDetails);
                                }
                                else {
                                    productDetails.available_qty = response.stock-response.hold_qty;
                                    productDetails.unavailable = true;
                                    resolve(productDetails);
                                }
                            }
                        }
                        else {
                            productDetails.unavailable = false;
                            resolve(productDetails);
                        }
                    }
                    else {
                        productDetails.available_qty = response.stock;
                        productDetails.unavailable = true;
                        resolve(productDetails);
                    }
                }
                else {
                    productDetails.available_qty = 0;
                    productDetails.unavailable = true;
                    resolve(productDetails);
                }
            });
        }
    });
}

function getCouponDetails(storeId, couponDetails) {
    return new Promise((resolve, reject) => {
        coupon.findOne({
            store_id: mongoose.Types.ObjectId(storeId), code: couponDetails.code, status: 'active',
            expiry_on: { $gte: new Date() }, balance: { $gt: 0 }, hold_till: { $lte: new Date() }
        }, { code: 0 }, function(err, response) {
            if(!err && response) {
                couponDetails.coupon_id = response._id;
                couponDetails.price = response.balance;
                couponDetails.status = 'valid';
                resolve(couponDetails);
            } else {
                couponDetails.price = 0;
                couponDetails.status = 'invalid';
                resolve(couponDetails);
            }
        });
    });
}

async function processCartList(storeId, cartList) {
    let updatedCartList = [];
    for(let i=0; i<cartList.length; i++)
    {
        // check product is valid, and update product details
        let updatedProduct = await getCartProductDetails(storeId, cartList[i]);
        // if valid
        if(updatedProduct) updatedCartList.push(updatedProduct);
    }
    return updatedCartList;
}

async function checkProductsAvailability(itemList) {
    let updatedItemList = [];
    for(let i=0; i<itemList.length; i++)
    {
        // check product is valid, and update product details
        let updatedProduct = await getProductAvailability(itemList[i]);
        updatedItemList.push(updatedProduct);
    }
    return updatedItemList;
}

async function checkCouponValid(storeId, couponList) {
    let updatedCouponList = [];
    for(let i=0; i<couponList.length; i++)
    {
        // check product is valid, and update product details
        let updatedCoupon = await getCouponDetails(storeId, couponList[i]);
        updatedCouponList.push(updatedCoupon);
    }
    return updatedCouponList;
}