const mongoose = require('mongoose');
const orderList = require("../src/models/order_list.model");
const product = require("../src/models/product.model");
const coupon = require("../src/models/coupon_codes.model");
const quickOrders = require("../src/models/quick_orders.model");
const productFeatures = require("../src/models/product_features.model");
const commonService = require("../services/common.service");

exports.validateCustomerOffer = function(customerId, offerDetails) {
    return new Promise((resolve, reject) => {
        orderList.findOne({ customer_id: mongoose.Types.ObjectId(customerId), "offer_details.id": mongoose.Types.ObjectId(offerDetails._id), status: "active" }, function(err, response) {
            if(!err && response) {
                resolve({ status: false, message: "Offer already claimed" });
            }
            else {
                resolve({ status: true, data: offerDetails });
            }
        });
    });
}

exports.validateUsageRestriction = function(customerId, offerDetails) {
    return new Promise((resolve, reject) => {
        if(offerDetails.usage_limit > offerDetails.redeemed_count)
        {
            if(offerDetails.onetime_usage) {
                orderList.findOne({ customer_id: mongoose.Types.ObjectId(customerId), "offer_details.id": mongoose.Types.ObjectId(offerDetails._id), status: "active" }, function(err, response) {
                    if(!err && response) {
                        resolve({ status: false, message: "Offer already claimed" });
                    }
                    else {
                        resolve({ status: true, data: offerDetails });
                    }
                });
            }
            else {
                resolve({ status: true, data: offerDetails });
            }
        }
        else {
            resolve({ status: false, message: "offer Expired" });
        }
    });
}

exports.findCartSubTotal = function(storeId, currencyDetails, modelList, itemList, checkoutSetting) {
    return new Promise((resolve, reject) => {
        let itemIds = []; let updatedItemList = []; let cartQty = 0; let cartWeight = 0;
        let subTotal = 0; let sellingSubTotal = 0; let woDiscSubTotal = 0;
        itemList.forEach(obj => {
            if(itemIds.indexOf(obj.product_id)==-1) itemIds.push(mongoose.Types.ObjectId(obj.product_id));
        });
        if(itemIds.length) {
            product.find({ _id: { $in: itemIds }, store_id: mongoose.Types.ObjectId(storeId), status: 'active' }, function(err, response) {
                if(!err && response && response.length) {
                    let dbProdList = JSON.stringify(response);
                    dbProdList = JSON.parse(dbProdList);
                    if(itemList.findIndex(obj => obj.addon_status) != -1) {
                        // addon exists
                        productFeatures.findOne({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) {
                            if(!err && response) {
                                let addonList = response.addon_list.filter(obj => obj.status=="active");
                                itemList.forEach(element => {
                                    let cartItem = element;
                                    let itemIndex = dbProdList.findIndex(elem => elem._id==cartItem.product_id);
                                    if(itemIndex!=-1) {
                                        let newData = { product_id: cartItem.product_id, quantity: cartItem.quantity, image: cartItem.image, addon_price: 0 };
                                        for(let key in dbProdList[itemIndex]) {
                                            if(dbProdList[itemIndex].hasOwnProperty(key)) { newData[key] = dbProdList[itemIndex][key]; }
                                        }
                                        // addon
                                        newData.addon_status = false;
                                        newData.customization_status = false;
                                        if(cartItem.addon_status && cartItem.addon_id) {
                                            let addonIndex = addonList.findIndex(addon => addon._id==cartItem.addon_id);
                                            if(addonIndex!=-1) {
                                                newData.addon_status = true;
                                                newData.selected_addon = {
                                                    _id: cartItem.addon_id,
                                                    name: addonList[addonIndex].name,
                                                    price: addonList[addonIndex].price
                                                }
                                                newData.addon_price += parseFloat(newData.selected_addon.price);
                                                // customization
                                                if(cartItem.customization_status && cartItem.model_id) {
                                                    let modelIndex = modelList.findIndex(model => model._id==cartItem.model_id);
                                                    if(modelIndex!=-1) {
                                                        newData.customization_status = true;
                                                        newData.customized_model = modelList[modelIndex];
                                                        newData.customized_model.model_id = cartItem.model_id;
                                                        newData.customized_model.custom_list.forEach(cust => {
                                                            cust.value.forEach(element => { newData.addon_price += parseFloat(element.price); });
                                                        });
                                                    }
                                                }
                                                newData.addon_price = commonService.CALC_AC(currencyDetails, newData.addon_price);
                                            }
                                        }
                                        let finalProdData = findProductFinalPrice(dbProdList[itemIndex], cartItem, newData, currencyDetails);
                                        if(finalProdData) {
                                            cartWeight += (finalProdData.weight * finalProdData.quantity);
                                            sellingSubTotal += (finalProdData.selling_price*finalProdData.quantity);
                                            // woDiscSubTotal
                                            if(checkoutSetting.offer_except_disc_products) {
                                                if(!finalProdData.disc_status) { woDiscSubTotal += (finalProdData.final_price*finalProdData.quantity); }
                                            }
                                            else { woDiscSubTotal += (finalProdData.final_price*finalProdData.quantity); }
                                            subTotal += (finalProdData.final_price*finalProdData.quantity);
                                            if(finalProdData.unit!="Pcs") {
                                                cartQty += 1;
                                                sellingSubTotal += finalProdData.addon_price;
                                                // woDiscSubTotal
                                                if(checkoutSetting.offer_except_disc_products) {
                                                    if(!finalProdData.disc_status) { woDiscSubTotal += finalProdData.addon_price; }
                                                }
                                                else { woDiscSubTotal += finalProdData.addon_price; }
                                                subTotal += finalProdData.addon_price;
                                            }
                                            else {
                                                cartQty += finalProdData.quantity;
                                                sellingSubTotal += (finalProdData.addon_price*finalProdData.quantity);
                                            }
                                            updatedItemList.push(finalProdData);
                                        }
                                    }
                                });
                                cartWeight = parseFloat(cartWeight.toFixed(2));
                                resolve({
                                    item_list: updatedItemList, cart_qty: cartQty, cart_weight: cartWeight, sub_total: subTotal,
                                    selling_sub_total: sellingSubTotal, wo_disc_sub_total: woDiscSubTotal
                                });
                            }
                            else {
                                resolve({
                                    item_list: [], cart_qty: cartQty, cart_weight: cartWeight, sub_total: subTotal,
                                    selling_sub_total: sellingSubTotal, wo_disc_sub_total: woDiscSubTotal
                                });
                            }
                        });
                    }
                    else {
                        itemList.forEach(element => {
                            let cartItem = element;
                            let itemIndex = dbProdList.findIndex(elem => elem._id==cartItem.product_id);
                            if(itemIndex!=-1) {
                                let newData = { product_id: cartItem.product_id, quantity: cartItem.quantity, image: cartItem.image, addon_price: 0 };
                                for(let key in dbProdList[itemIndex]) {
                                    if(dbProdList[itemIndex].hasOwnProperty(key)) { newData[key] = dbProdList[itemIndex][key]; }
                                }
                                newData.addon_status = false;
                                newData.customization_status = false;
                                let finalProdData = findProductFinalPrice(dbProdList[itemIndex], cartItem, newData, currencyDetails);
                                if(finalProdData) {
                                    cartWeight += (finalProdData.weight * finalProdData.quantity);
                                    sellingSubTotal += (finalProdData.selling_price*finalProdData.quantity);
                                    // woDiscSubTotal
                                    if(checkoutSetting.offer_except_disc_products) {
                                        if(!finalProdData.disc_status) { woDiscSubTotal += (finalProdData.final_price*finalProdData.quantity); }
                                    }
                                    else { woDiscSubTotal += (finalProdData.final_price*finalProdData.quantity); }
                                    subTotal += (finalProdData.final_price*finalProdData.quantity);
                                    if(finalProdData.unit!="Pcs") {
                                        cartQty += 1;
                                        sellingSubTotal += finalProdData.addon_price;
                                        // woDiscSubTotal
                                        if(checkoutSetting.offer_except_disc_products) {
                                            if(!finalProdData.disc_status) { woDiscSubTotal += finalProdData.addon_price; }
                                        }
                                        else { woDiscSubTotal += finalProdData.addon_price; }
                                        subTotal += finalProdData.addon_price;
                                    }
                                    else {
                                        cartQty += finalProdData.quantity;
                                        sellingSubTotal += (finalProdData.addon_price*finalProdData.quantity);
                                    }
                                    updatedItemList.push(finalProdData);
                                }
                            }
                        });
                        cartWeight = parseFloat(cartWeight.toFixed(2));
                        resolve({
                            item_list: updatedItemList, cart_qty: cartQty, cart_weight: cartWeight, sub_total: subTotal,
                            selling_sub_total: sellingSubTotal, wo_disc_sub_total: woDiscSubTotal
                        });
                    }
                }
                else {
                    resolve({
                        item_list: [], cart_qty: cartQty, cart_weight: cartWeight, sub_total: subTotal, selling_sub_total: sellingSubTotal, wo_disc_sub_total: woDiscSubTotal
                    });
                }
            });
        }
        else {
            resolve({ item_list: [], cart_qty: cartQty, cart_weight: cartWeight, sub_total: subTotal, selling_sub_total: sellingSubTotal, wo_disc_sub_total: woDiscSubTotal });
        }
    });
}

function findProductFinalPrice(dbProdData, cartItem, newData, currencyDetails) {
    // variants
    newData.variant_status = false; newData.variant_types = [];
    if(cartItem.variant_status && cartItem.variant_types) {
        let variants = cartItem.variant_types;
        let filterVariant = [];
        if(variants.length===1) {
            filterVariant = dbProdData.variant_list.filter(object => object[variants[0].name]==variants[0].value);
        }
        else if(variants.length===2) {
            filterVariant = dbProdData.variant_list.filter(object => object[variants[0].name]==variants[0].value && object[variants[1].name]==variants[1].value);
        }
        else if(variants.length===3) {
            filterVariant = dbProdData.variant_list.filter(object => object[variants[0].name]==variants[0].value && object[variants[1].name]==variants[1].value && object[variants[2].name]==variants[2].value);
        }
        if(filterVariant.length) {
            let varProdData = filterVariant[0];
            newData.variant_status = true;
            newData.variant_types = cartItem.variant_types;
            if(varProdData.sku) newData.sku = varProdData.sku;
            if(varProdData.taxrate_id) newData.taxrate_id = varProdData.taxrate_id;
            newData.selling_price = commonService.CALC_AC(currencyDetails, varProdData.selling_price);
            newData.discounted_price = commonService.CALC_AC(currencyDetails, varProdData.discounted_price);
            newData.final_price = parseFloat(newData.discounted_price);
            if(newData.unit=="Pcs") {
                newData.final_price += parseFloat(newData.addon_price);
            }
            return newData;
        }
        else { return null; }
    }
    else {
        newData.selling_price = commonService.CALC_AC(currencyDetails, newData.selling_price);
        newData.discounted_price = commonService.CALC_AC(currencyDetails, newData.discounted_price);
        newData.final_price = parseFloat(newData.discounted_price);
        if(newData.unit=="Pcs") {
            newData.final_price += parseFloat(newData.addon_price);
        }
        return newData;
    }
}

// check product availability
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

exports.checkProductsAvailability = async function(itemList) {
    let updatedItemList = [];
    for(let i=0; i<itemList.length; i++)
    {
        // check product is valid, and update product details
        let updatedProduct = await getProductAvailability(itemList[i]);
        updatedItemList.push(updatedProduct);
    }
    return updatedItemList;
}
// ### check product availability ###

// shipping method section
exports.getShippingPrice = function(shippingMethod, shippingAddress, cartWeight, cartTotal) {
    return new Promise((resolve, reject) => {
        let alertStatus = false;
        if(shippingMethod.alert_status && shippingMethod.free_shipping && shippingMethod.minimum_price) { alertStatus = true; }
        if(shippingMethod.shipping_type=='Domestic') {
            // zone based
            if(shippingMethod.domes_zone_status) {
                findDomesticPrice(shippingMethod.domes_zones, shippingAddress, cartWeight).then((respData) => {
                    if(respData) {
                        if(shippingMethod.free_shipping) {
                            if(cartTotal >= shippingMethod.minimum_price) { respData.shipping_price = 0; }
                        }
                        respData._id = shippingMethod._id;
                        respData.name = shippingMethod.name;
                        respData.tracking_link = shippingMethod.tracking_link;
                        if(alertStatus) { respData.minimum_price = shippingMethod.minimum_price; }
                        resolve(respData);
                    }
                    else {
                        reject("multiplier not exist");
                    }
                });
            }
            // non-zone based
            else {
                if(shippingMethod.free_shipping) {
                    if(cartTotal >= shippingMethod.minimum_price) { shippingMethod.shipping_price = 0; }
                }
                let shipData = {
                    _id: shippingMethod._id, name: shippingMethod.name, tracking_link: shippingMethod.tracking_link,
                    shipping_price: shippingMethod.shipping_price, delivery_time: shippingMethod.delivery_time
                }
                if(alertStatus) { shipData.minimum_price = shippingMethod.minimum_price; }
                resolve(shipData);
            }
        }
        else {
            // zone based
            if(shippingMethod.inter_zone_status) {
                findInternatioanlPrice(shippingMethod.inter_zones, shippingAddress, cartWeight).then((respData) => {
                    if(respData) {
                        if(shippingMethod.free_shipping) {
                            if(cartTotal >= shippingMethod.minimum_price) { respData.shipping_price = 0; }
                        }
                        respData._id = shippingMethod._id;
                        respData.name = shippingMethod.name;
                        respData.tracking_link = shippingMethod.tracking_link;
                        if(alertStatus) { respData.minimum_price = shippingMethod.minimum_price; }
                        resolve(respData);
                    }
                    else {
                        reject("multiplier not exist");
                    }
                });
            }
            // non-zone based
            else {
                if(shippingMethod.free_shipping) {
                    if(cartTotal >= shippingMethod.minimum_price) { shippingMethod.shipping_price = 0; }
                }
                let shipData = {
                    _id: shippingMethod._id, name: shippingMethod.name, tracking_link: shippingMethod.tracking_link,
                    shipping_price: shippingMethod.shipping_price, delivery_time: shippingMethod.delivery_time
                }
                if(alertStatus) { shipData.minimum_price = shippingMethod.minimum_price; }
                resolve(shipData);
            }
        }
    });
}

function findInternatioanlPrice(zones, shippingAddress, cartWeight) {
    return new Promise((resolve, reject) => {
        // zone
        let filterZone = zones.filter(obj => obj.countries.findIndex(x => x == shippingAddress.country)!=-1);
        if(filterZone.length && filterZone[0].rate_multiplier.length) {
            // multiplier
            let rateMultiplier = filterZone[0].rate_multiplier;
            rateMultiplier.sort((a, b) => 0 - (a.weight > b.weight ? -1 : 1));  // sort asc
            let shippingMultiplier = rateMultiplier[rateMultiplier.length - 1].multiplier;
            let filterMultiplier = rateMultiplier.filter(obj => obj.weight>=cartWeight);
            if(filterMultiplier.length) shippingMultiplier = filterMultiplier[0].multiplier;
            // find price
            let zonePrice = Math.round(filterZone[0].price_per_kg*shippingMultiplier);
            resolve({ shipping_price: zonePrice, delivery_time: filterZone[0].delivery_time })
        }
        else {
            resolve(null);
        }
    });
}

function findDomesticPrice(zones, shippingAddress, cartWeight) {
    return new Promise((resolve, reject) => {
        // zone
        let filterZone = zones.filter(obj => obj.states.findIndex(x => x == shippingAddress.state)!=-1);
        if(filterZone.length && filterZone[0].rate_multiplier.length) {
            // multiplier
            let rateMultiplier = filterZone[0].rate_multiplier;
            rateMultiplier.sort((a, b) => 0 - (a.weight > b.weight ? -1 : 1));  // sort asc
            let shippingMultiplier = rateMultiplier[rateMultiplier.length - 1].multiplier;
            let filterMultiplier = rateMultiplier.filter(obj => obj.weight>=cartWeight);
            if(filterMultiplier.length) shippingMultiplier = filterMultiplier[0].multiplier;
            // find price
            let zonePrice = Math.round(filterZone[0].price_per_kg*shippingMultiplier);
            resolve({ shipping_price: zonePrice, delivery_time: filterZone[0].delivery_time })
        }
        else {
            resolve(null);
        }
    });
}
// ### shipping method section ###

// offer code section
exports.calcOfferAmount = function (jsonData) {
    let codeDetails = jsonData.code_details;
    return new Promise((resolve, reject) => {
        let offerAmount = 0;
        if(jsonData.wo_disc_sub_total >= codeDetails.min_order_amt && jsonData.cart_qty >= codeDetails.min_order_qty) {
            if(codeDetails.discount_type=='buy_x_get_y') {
                offerAmount = onFindBuyXGetY(codeDetails, jsonData.checkout_setting, jsonData.item_list);
                resolve({ status: true, amount: offerAmount });
            }
            else {
                if(codeDetails.apply_to=='order') {
                    offerAmount = onCalcOfferAmount(jsonData.wo_disc_sub_total, codeDetails);
                    resolve({ status: true, amount: offerAmount });
                }
                else if(codeDetails.apply_to=='shipping') {
                    if(codeDetails.shipping_type=='all') {
                        offerAmount = onCalcOfferAmount(jsonData.shipping_cost, codeDetails);
                        resolve({ status: true, amount: offerAmount });
                    }
                    else if(codeDetails.shipping_type=='domestic' && jsonData.shipping_type=='domestic') {
                        offerAmount = onCalcOfferAmount(jsonData.shipping_cost, codeDetails);
                        resolve({ status: true, amount: offerAmount });
                    }
                    else if(codeDetails.shipping_type=='international' && jsonData.shipping_type=='international') {
                        offerAmount = onCalcOfferAmount(jsonData.shipping_cost, codeDetails);
                        resolve({ status: true, amount: offerAmount });
                    }
                    else { resolve({ status: false, message: "You are not eligible to redeem this coupon" }); }
                }
                else if(codeDetails.apply_to=='category') {
                    let sumAmount = findCategoryUnderOffer(codeDetails.category_list, jsonData.checkout_setting, jsonData.item_list);
                    if(sumAmount > 0) {
                        offerAmount = onCalcOfferAmount(sumAmount, codeDetails);
                        resolve({ status: true, amount: offerAmount });
                    }
                    else { resolve({ status: false, message: "You are not eligible to redeem this coupon" }); }
                }
                else if(codeDetails.apply_to=='product') {
                    let sumAmount = findProductUnderOffer(codeDetails.product_list, jsonData.checkout_setting, jsonData.item_list);
                    if(sumAmount > 0) {
                        offerAmount = onCalcOfferAmount(sumAmount, codeDetails);
                        resolve({ status: true, amount: offerAmount });
                    }
                    else { resolve({ status: false, message: "You are not eligible to redeem this coupon" }); }
                }
                else {
                    resolve({ status: false, message: "You are not eligible to redeem this coupon" });
                }
            }
        }
        else {
            resolve({ status: false, message: "You are not eligible to redeem this coupon" });
        }
    });
}

function findCategoryUnderOffer(offerCategoryList, checkoutSetting, itemList) {
    let sumOfferProduct = 0;
    itemList.forEach(item => {
        if(checkoutSetting.offer_except_disc_products) {
            if(offerCategoryList.findIndex(obj => !item.disc_status && item.category_id.indexOf(obj.category_id)!=-1) != -1) {
                sumOfferProduct += (item.final_price*item.quantity);
                if(item.unit!="Pcs") { sumOfferProduct += item.addon_price; }
            }
        }
        else {
            if(offerCategoryList.findIndex(obj => item.category_id.indexOf(obj.category_id)!=-1) != -1) {
                sumOfferProduct += (item.final_price*item.quantity);
                if(item.unit!="Pcs") { sumOfferProduct += item.addon_price; }
            }
        }
    });
    return sumOfferProduct;
}

function findProductUnderOffer(offerProductList, checkoutSetting, itemList) {
    let sumOfferProduct = 0;
    itemList.forEach(item => {
        if(checkoutSetting.offer_except_disc_products) {
            if(offerProductList.findIndex(obj => !item.disc_status && item.product_id==obj.product_id) != -1) {
                sumOfferProduct += (item.final_price*item.quantity);
                if(item.unit!="Pcs") { sumOfferProduct += item.addon_price; }
            }
        }
        else {
            if(offerProductList.findIndex(obj => obj.product_id==item.product_id) != -1) {
                sumOfferProduct += (item.final_price*item.quantity);
                if(item.unit!="Pcs") { sumOfferProduct += item.addon_price; }
            }
        }
    });
    return sumOfferProduct;
}

function onCalcOfferAmount(amount, codeDetails) {
    let offerAmt = codeDetails.discount_value;
    if(codeDetails.discount_type=='percentage') {
      offerAmt = Math.round(amount*(codeDetails.discount_value/100));
    }
    if(codeDetails.restrict_discount && offerAmt > codeDetails.discount_upto) {
        offerAmt = codeDetails.discount_upto;
    }
    return offerAmt;
}

function onFindBuyXGetY(codeDetails, checkoutSetting, itemList) {
    let offerAmt = 0; let buyXgetYitemList = [];
    let buyQty = 0; let buyAmount = 0; let getQty = 0;
    // buy products
    if(codeDetails.buy_properties.apply_to=='category') {
      itemList.forEach(item => {
        let itemIndex = codeDetails.buy_properties.category_list.findIndex(obj => item.category_id.indexOf(obj.category_id)!=-1);
        if(checkoutSetting.offer_except_disc_products) {
          itemIndex = codeDetails.buy_properties.category_list.findIndex(obj => !item.disc_status && item.category_id.indexOf(obj.category_id)!=-1);
        }
        if(itemIndex != -1) {
          buyQty += item.quantity;
          buyAmount += (item.final_price*item.quantity);
          if(item.unit!="Pcs") buyAmount += item.addon_price;
          let checkIndex = buyXgetYitemList.findIndex(obj => obj.cart_id==item.cart_id);
          if(checkIndex == -1) {
            item.dup_qty = item.quantity;
            buyXgetYitemList.push(item);
          }
        }
      });
    }
    else if(codeDetails.buy_properties.apply_to=='product') {
      itemList.forEach(item => {
        let itemIndex = codeDetails.buy_properties.product_list.findIndex(obj => item.product_id==obj.product_id);
        if(checkoutSetting.offer_except_disc_products) {
          itemIndex = codeDetails.buy_properties.product_list.findIndex(obj => !item.disc_status && item.product_id==obj.product_id);
        }
        if(itemIndex != -1) {
          buyQty += item.quantity;
          buyAmount += (item.final_price*item.quantity);
          if(item.unit!="Pcs") buyAmount += item.addon_price;
          let checkIndex = buyXgetYitemList.findIndex(obj => obj.cart_id==item.cart_id);
          if(checkIndex == -1) {
            item.dup_qty = item.quantity;
            buyXgetYitemList.push(item);
          }
        }
      });
    }
    else if(codeDetails.buy_properties.apply_to=='all_product') {
      itemList.forEach(item => {
        let itemIndex = 0;
        if(checkoutSetting.offer_except_disc_products) {
          if(item.disc_status) itemIndex = -1;
        }
        if(itemIndex != -1) {
          buyQty += item.quantity;
          buyAmount += (item.final_price*item.quantity);
          if(item.unit!="Pcs") buyAmount += item.addon_price;
          let checkIndex = buyXgetYitemList.findIndex(obj => obj.cart_id==item.cart_id);
          if(checkIndex == -1) {
            item.dup_qty = item.quantity;
            buyXgetYitemList.push(item);
          }
        }
      });
    }
    // get products
    if(codeDetails.get_properties.apply_to=='category') {
      itemList.forEach(item => {
        let itemIndex = codeDetails.get_properties.category_list.findIndex(obj => item.category_id.indexOf(obj.category_id)!=-1);
        if(checkoutSetting.offer_except_disc_products) {
          itemIndex = codeDetails.get_properties.category_list.findIndex(obj => !item.disc_status && item.category_id.indexOf(obj.category_id)!=-1);
        }
        if(itemIndex != -1) {
          getQty += item.quantity;
          let checkIndex = buyXgetYitemList.findIndex(obj => obj.cart_id==item.cart_id);
          if(checkIndex == -1) {
            item.dup_qty = item.quantity;
            buyXgetYitemList.push(item);
          }
        }
      });
    }
    else if(codeDetails.get_properties.apply_to=='product') {
      itemList.forEach(item => {
        let itemIndex = codeDetails.get_properties.product_list.findIndex(obj => item.product_id==obj.product_id);
        if(checkoutSetting.offer_except_disc_products) {
          itemIndex = codeDetails.get_properties.product_list.findIndex(obj => !item.disc_status && item.product_id==obj.product_id);
        }
        if(itemIndex != -1) {
          getQty += item.quantity;
          let checkIndex = buyXgetYitemList.findIndex(obj => obj.cart_id==item.cart_id);
          if(checkIndex == -1) {
            item.dup_qty = item.quantity;
            buyXgetYitemList.push(item);
          }
        }
      });
    }
    else if(codeDetails.get_properties.apply_to=='all_product') {
      itemList.forEach(item => {
        let itemIndex = 0;
        if(checkoutSetting.offer_except_disc_products) {
          if(item.disc_status) itemIndex = -1;
        }
        if(itemIndex != -1) {
          getQty += item.quantity;
          let checkIndex = buyXgetYitemList.findIndex(obj => obj.cart_id==item.cart_id);
          if(checkIndex == -1) {
            item.dup_qty = item.quantity;
            buyXgetYitemList.push(item);
          }
        }
      });
    }
    // end

    if(codeDetails.buy_properties.type=='quantity') {
      let offeredItemsQty = 0
      buyXgetYitemList.forEach(item => { offeredItemsQty += item.quantity; })
      let setItemsCount = codeDetails.buy_properties.value + codeDetails.get_properties.quantity;
      let x = offeredItemsQty%setItemsCount;
      let loopCount = (offeredItemsQty-x)/setItemsCount;
      if(codeDetails.buy_x_get_y_usage_limit>0 && codeDetails.buy_x_get_y_usage_limit<loopCount) loopCount = codeDetails.buy_x_get_y_usage_limit;

      buyXgetYitemList.sort((a, b) => 0 - (a.final_price > b.final_price ? -1 : 1));
      for(let i=0; i<loopCount; i++)
      {
        if(buyQty>=codeDetails.buy_properties.value && getQty>=codeDetails.get_properties.quantity)
        {
          buyQty -= codeDetails.buy_properties.value;
          getQty -= codeDetails.get_properties.quantity;
          for(let j=0; j<codeDetails.get_properties.quantity; j++)
          {
            let offIndex = buyXgetYitemList.findIndex(obj => obj.dup_qty>=1);
            if(offIndex!=-1) {
              let selectedItem = buyXgetYitemList[offIndex];
              selectedItem.dup_qty -= 1;
              if(codeDetails.get_properties.discount_type=='quantity') offerAmt += selectedItem.final_price;
              else offerAmt += Math.round(selectedItem.final_price*(codeDetails.get_properties.discount_value/100));
            }
            else break;
          }
        }
        else break;
      }
    }
    if(codeDetails.buy_properties.type=='amount') {
      let x = buyAmount%codeDetails.buy_properties.value;
      let loopCount = (buyAmount-x)/codeDetails.buy_properties.value;
      if(codeDetails.buy_x_get_y_usage_limit>0 && codeDetails.buy_x_get_y_usage_limit<loopCount) loopCount = codeDetails.buy_x_get_y_usage_limit;
      
      for(let i=0; i<loopCount; i++)
      {
        let maxPrice = codeDetails.buy_properties.value;
        if(buyAmount>=maxPrice && getQty>=codeDetails.get_properties.quantity) {
          buyXgetYitemList.sort((a, b) => 0 - (a.final_price > b.final_price ? 1 : -1));
          for(let i=0; i<buyXgetYitemList.length; i++)
          {
            let item = buyXgetYitemList[i];
            if(maxPrice>0) {
              let loopCount = Math.ceil(item.dup_qty);
              for(let j=0; j<loopCount; j++)
              {
                if(item.dup_qty>0) {
                  if(item.dup_qty>=1) {
                    maxPrice -= item.final_price;
                    item.dup_qty -= 1;
                  }
                  else {
                    maxPrice -= (item.final_price*item.dup_qty);
                    item.dup_qty = 0;
                    break;
                  }
                }
              }
            }
            else break;
          }

          let filteredItemList = buyXgetYitemList.filter(obj => obj.dup_qty>0).sort((a, b) => 0 - (a.final_price > b.final_price ? -1 : 1));
          let remainingQty = 0;
          filteredItemList.forEach(item => { remainingQty += item.quantity });
          if(remainingQty>=codeDetails.get_properties.quantity) {
            for(let i=0; i<codeDetails.get_properties.quantity; i++)
            {
              let offIndex = filteredItemList.findIndex(obj => obj.dup_qty>=1);
              if(offIndex!=-1) {
                let selectedItem = filteredItemList[offIndex];
                selectedItem.dup_qty -= 1;
                getQty -= 1;
                if(codeDetails.get_properties.discount_type=='quantity') offerAmt += selectedItem.final_price;
                else offerAmt += Math.round(selectedItem.final_price*(codeDetails.get_properties.discount_value/100));
              }
              else break;
            }
          }
        }
        else break;
      }
    }

    if(codeDetails.restrict_discount && offerAmt > codeDetails.discount_upto) {
        offerAmt = codeDetails.discount_upto;
    }
    return offerAmt;
}
// ### offer code section ###

// gift card section
exports.processCouponList = async function(storeId, couponList) {
    let updatedCouponList = [];
    for(let i=0; i<couponList.length; i++)
    {
        // check product is valid, and update product details
        let updatedCoupon = await getCouponDetails(storeId, couponList[i]);
        updatedCouponList.push(updatedCoupon);
    }
    return updatedCouponList;
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

exports.calcGiftCardAmount = function (grandTotal, couponList) {
    let tempDiscAmt = couponList.reduce((accumulator, currentValue) => {
        return accumulator + currentValue['price'];
    }, 0);
    if(tempDiscAmt > grandTotal) {
        let dummyGrandTotal = grandTotal;
        couponList.forEach(object => {
            if(object.status == 'valid' && object.price > 0) {
                if(dummyGrandTotal > 0) {
                    if(object.price >= dummyGrandTotal) {
                        object.price = dummyGrandTotal;
                        dummyGrandTotal = 0;
                    }
                    else { dummyGrandTotal = dummyGrandTotal - object.price; }
                }
                else { object.price = 0; }
            };
        });
        return couponList;
    }
    else { return couponList; }
}
// ### gift card section ###

exports.getQuickOrderDetails = function (storeId, orderSessionData) {
    return new Promise((resolve, reject) => {
        if(orderSessionData.quick_order_id) {
            quickOrders.findOne({ store_id: mongoose.Types.ObjectId(storeId), _id: mongoose.Types.ObjectId(orderSessionData.quick_order_id), status: 'active' }, function(err, response) {
                if(!err && response) {
                    if(response.expiry_status && response.expiry_on) {
                        if(new Date(response.expiry_on) > new Date())
                        {
                            resolve(response);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    else { resolve(response); }
                }
                else { resolve(null); }
            });
        }
        else { resolve(null); }
    });
}