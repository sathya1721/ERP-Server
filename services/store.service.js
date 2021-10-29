"use strict";
const mongoose = require('mongoose');

const store = require("../src/models/store.model");
const menus = require("../src/models/menu.model");
const section = require("../src/models/section.model");
const layout = require("../src/models/layout.model");
const products = require("../src/models/product.model");

const productFeatures = require("../src/models/product_features.model");
const storeFeatures = require("../src/models/store_features.model");
const deployDetails = require("../src/models/deploy_details.model");

const locations = require("../src/models/locations.model");
const policies = require("../src/models/policies.model");
const contactPage = require("../src/models/contact_page.model");
const sitemap = require("../src/models/sitemap.model");
const archive = require("../src/models/archive.model");
const extraPage = require("../src/models/extra_page.model");
const guestUser = require("../src/models/guest_user.model");

const feedback = require("../src/models/feedback.model");
const newsletter = require("../src/models/newsletter.model");
const vendorEnquiry = require("../src/models/vendor_enquiry.model");

const storeProperties = require("../src/models/store_properties.model");
const restoredSection = require("../src/models/restored_section.model");
const banner = require("../src/models/banner.model");

const giftCard = require("../src/models/gift_card.model");
const blogs = require("../src/models/blog.model");
const collection = require("../src/models/collection.model");
const discounts = require("../src/models/discounts.model");

const deliveryMethods = require("../src/models/delivery_methods.model");
const shippingMethods = require("../src/models/shipping_methods.model");

const customer = require("../src/models/customer.model");
const offerCodes = require("../src/models/offer_codes.model");

const orderList = require('../src/models/order_list.model');
const couponList = require('../src/models/coupon_codes.model');
const donationList = require('../src/models/donation_list.model');
const couponCodes = require("../src/models/coupon_codes.model");
const quotation = require("../src/models/quotation.model");
const paymentDetails = require("../src/models/payment_details.model");
const ysOrders = require("../src/models/ys_orders.model");

const appointments = require("../src/models/appointments.model");
const appointmentServices = require("../src/models/appointment_services.model");
const dinamicOffers = require("../src/models/dinamic_offers.model");
const dinamicRewards = require("../src/models/dinamic_rewards.model");

const mailTemp = require('../config/mail-templates');
const defaultSetup = require('../config/default.setup');
const mailService = require("../services/mail.service");
const imgUploadService = require("../services/img_upload.service");

// delete store
exports.deleteStorePermanently = function(storeId) {
    return new Promise((resolve, reject) => {
        store.findOne({ _id: mongoose.Types.ObjectId(storeId), status: "inactive" }, function(err, response) {
            if(!err && response) {
                store.deleteOne({ _id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                storeFeatures.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                productFeatures.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                deployDetails.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                layout.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                section.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                menus.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                products.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                storeProperties.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                restoredSection.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                banner.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                locations.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                policies.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                contactPage.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                sitemap.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                archive.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                extraPage.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                guestUser.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                feedback.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                newsletter.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                vendorEnquiry.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                giftCard.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                blogs.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                collection.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                discounts.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                deliveryMethods.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                shippingMethods.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                customer.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                offerCodes.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                orderList.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                couponList.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                donationList.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                couponCodes.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                quotation.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                paymentDetails.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                ysOrders.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                appointments.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                appointmentServices.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                dinamicOffers.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });
                dinamicRewards.deleteMany({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) { });

                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    });
}

// create store
exports.createStore = function(storeDetails, adminDetails) {
    return new Promise((resolve, reject) => {
        let storeId = storeDetails._id;
        let siteMapData = "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9' xmlns:xhtml='http://www.w3.org/1999/xhtml'><url><loc>"+storeDetails.base_url+"/</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
        // Store Properties
        storeProperties.create({ store_id: storeId, footer_config: defaultSetup.footer_config }, function(err, response) {
            if(!err && response) {
                // Product Features
                productFeatures.create({ store_id: storeId }, function(err, response) {
                    if(!err && response) {
                        // Store Features
                        storeFeatures.create({ store_id: storeId }, function(err, response) {
                            if(!err && response) {
                                // catalog list
                                defaultSetup.catalog.forEach((obj) => {
                                    obj.store_id = storeId.toString();
                                    siteMapData += "<url><loc>"+storeDetails.base_url+"/category/"+obj.seo_details.page_url+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                                });
                                section.insertMany(defaultSetup.catalog, function(err, response) {
                                    if(!err && response) {
                                        let catalogIds = {};
                                        response.forEach((cat, index) => {
                                            catalogIds['catalog'+(index+1)+'_id'] = cat._id.toString();
                                        })
                                        // layout
                                        defaultSetup.layout.forEach((obj) => {
                                            obj.store_id = storeId.toString();
                                            if(obj.type=='featured_product') {
                                                obj.featured_category_id = catalogIds[obj.featured_category_id];
                                            }
                                            else {
                                                obj.image_list.forEach((img) => {
                                                    if(img.link_status) { img.category_id = catalogIds[img.category_id]; }
                                                });
                                            }
                                        });
                                        let layoutRootPath = 'uploads/'+storeId.toString()+'/layouts';
                                        defaultSetup.layout[0].image_list[0].desktop_img = layoutRootPath+"/desktop_primary_slider.jpg";
                                        defaultSetup.layout[0].image_list[0].mobile_img = layoutRootPath+"/mobile_primary_slider.jpg";
                                        layout.insertMany(defaultSetup.layout, function(err, response) {
                                            if(!err && response) {
                                                let staticFileRoot = 'https://yourstore.io/api/uploads/yourstore/store-layouts/';
                                                imgUploadService.staticFileUpload(staticFileRoot+'desktop_slider1-a_s.jpg', layoutRootPath, 'desktop_primary_slider_s.jpg').then((resp) => {
                                                    imgUploadService.staticFileUpload(staticFileRoot+'desktop_slider1-a.jpg', layoutRootPath, 'desktop_primary_slider.jpg').then((resp) => {
                                                        imgUploadService.staticFileUpload(staticFileRoot+'mobile_slider1-a_s.jpg', layoutRootPath, 'mobile_primary_slider_s.jpg').then((resp) => {
                                                            imgUploadService.staticFileUpload(staticFileRoot+'mobile_slider1-a.jpg', layoutRootPath, 'mobile_primary_slider.jpg').then((resp) => {
                                                                // menu list
                                                                defaultSetup.menu.forEach((menu) => {
                                                                    menu.store_id = storeId.toString();
                                                                    if(menu.link_status) { menu.category_id = catalogIds[menu.category_id]; }
                                                                    else {
                                                                        menu.sections.forEach((sec) => {
                                                                            if(sec.link_status) { sec.category_id = catalogIds[sec.category_id]; }
                                                                            else {
                                                                                sec.categories.forEach((cat) => {
                                                                                    if(cat.link_status) { cat.category_id = catalogIds[cat.category_id]; }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                                menus.insertMany(defaultSetup.menu, function(err, response) {
                                                                    if(!err && response) {
                                                                        // product list
                                                                        defaultSetup.product.forEach((obj) => {
                                                                            obj.store_id = storeId;
                                                                            let proCatList = [];
                                                                            obj.category_id.forEach((cat) => { proCatList.push(catalogIds[cat]); });
                                                                            obj.category_id = proCatList;
                                                                            siteMapData += "<url><loc>"+storeDetails.base_url+"/category/"+obj.seo_details.page_url+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                                                                        });
                                                                        products.insertMany(defaultSetup.product, function(err, response) {
                                                                            if(!err && response) {
                                                                                // default sitemap
                                                                                siteMapData += "</urlset>";
                                                                                sitemap.create({ store_id: mongoose.Types.ObjectId(storeId), content: siteMapData }, function(err, response) {
                                                                                    if(!err) {
                                                                                        if(adminDetails.mail_config && adminDetails.mail_config.transporter) {
                                                                                            // send welcome mail to customer
                                                                                            mailTemp.store_signup(storeDetails).then((body) => {
                                                                                                let bodyContent = body;
                                                                                                let sendData = {
                                                                                                    config: adminDetails.mail_config,
                                                                                                    sendTo: storeDetails.email,
                                                                                                    subject: "Welcome to Yourstore!",
                                                                                                    body: bodyContent,
                                                                                                    cc_mail: adminDetails.mail_config.transporter.auth.user
                                                                                                };
                                                                                                mailService.sendMailFromAdmin(sendData, function(err, response) {
                                                                                                    resolve({ status: true });
                                                                                                });
                                                                                            });
                                                                                        }
                                                                                        else {
                                                                                            resolve({ status: true });
                                                                                        }
                                                                                    }
                                                                                    else { reject({ status: false, error: err, message: "Unable to add sitemap" }); }
                                                                                });
                                                                            }
                                                                            else { reject({ status: false, error: err, message: "Unable to add product" }); }
                                                                        });
                                                                    }
                                                                    else { reject({ status: false, error: err, message: "Unable to add menu" }); }
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            }
                                            else { reject({ status: false, error: err, message: "Unable to add layout" }); }
                                        });
                                    }
                                    else { reject({ status: false, error: err, message: "Unable to add catalog" }); }
                                });
                            }
                            else { reject({ status: false, error: err, message: "Unable to set store features" }); }
                        });
                    }
                    else { reject({ status: false, error: err, message: "Unable to set product features" }); }
                });
            }
            else { reject({ status: false, error: err, message: "Unable to set store properties" }); }
        });
    });
}

exports.create_store_v2 = function(storeDetails, adminDetails) {
    return new Promise((resolve, reject) => {
        let storeId = storeDetails._id.toString();
        // Store Properties
        let compDetails = storeDetails.company_details;
        defaultSetup.footer_config.contact_config.content = "<p>"+storeDetails.email+"</p>";
        defaultSetup.footer_config.address_config.content = "<p>"+compDetails.name+"</p><p>"+compDetails.address+"</p><p>"+compDetails.city+", "+compDetails.state+" "+compDetails.pincode+".</p>";
        storeProperties.create({ store_id: storeId, footer_config: defaultSetup.footer_config }, function(err, response) {
            if(!err && response) {
                // Product Features
                let taxRates = [];
                if(storeDetails.country=='India') {
                    taxRates.push({
                        "home_country" : "India", "home_state" : compDetails.state,
                        "name" : "No Tax", "primary" : true, "sgst" : 0, "cgst" : 0, "igst" : 0
                    });
                }
                productFeatures.create({ store_id: storeId, tax_rates: taxRates }, function(err, response) {
                    if(!err && response) {
                        let taxRateId = null;
                        if(response.tax_rates.length) {
                            taxRateId = response.tax_rates[0]._id.toString();
                        }
                        // Store Features
                        storeFeatures.create({ store_id: storeId }, function(err, response) {
                            if(!err && response) {
                                // deploy details
                                deployDetails.create({ store_id: mongoose.Types.ObjectId(storeId) }, function(err, response) {
                                    if(!err && response) {
                                        // menu list
                                        defaultSetup.menu.forEach((menu) => { menu.store_id = storeId; });
                                        menus.insertMany(defaultSetup.menu, function(err, response) {
                                            if(!err && response) {
                                                // product list
                                                defaultSetup.product.forEach((product) => {
                                                    product.store_id = storeId;
                                                    if(taxRateId) { product.taxrate_id = taxRateId; }
                                                });
                                                products.insertMany(defaultSetup.product, function(err, response) {
                                                    if(!err && response) {
                                                        if(adminDetails.mail_config && adminDetails.mail_config.transporter) {
                                                            // send welcome mail to customer
                                                            mailTemp.store_signup(storeDetails).then((body) => {
                                                                let bodyContent = body;
                                                                let sendData = {
                                                                    config: adminDetails.mail_config,
                                                                    sendTo: storeDetails.email,
                                                                    subject: "Welcome to Yourstore!",
                                                                    body: bodyContent,
                                                                    cc_mail: adminDetails.mail_config.transporter.auth.user
                                                                };
                                                                mailService.sendMailFromAdmin(sendData, function(err, response) {
                                                                    resolve({ status: true, _id: storeDetails._id, token: storeDetails.temp_token });
                                                                });
                                                            });
                                                        }
                                                        else {
                                                            resolve({ status: true, _id: storeDetails._id, token: storeDetails.temp_token });
                                                        }
                                                    }
                                                    else { reject({ status: false, error: err, message: "Unable to create product list" }); }
                                                });
                                            }
                                            else { reject({ status: false, error: err, message: "Unable to create menu list" }); }
                                        });
                                    }
                                    else { reject({ status: false, error: err, message: "Unable to create deploy details" }); }
                                });
                            }
                            else { reject({ status: false, error: err, message: "Unable to set store features" }); }
                        });
                    }
                    else { reject({ status: false, error: err, message: "Unable to set product features" }); }
                });
            }
            else { reject({ status: false, error: err, message: "Unable to set store properties" }); }
        });
    });
}

// update sitemap
exports.updateStoreSitemap = function(storeId) {
    return new Promise((resolve, reject) => {
        let prevDate = new Date().setDate(new Date().getDate() - 1);
        store.findOne({ _id: mongoose.Types.ObjectId(storeId), status: 'active', account_type: 'client', sitemap_updated_on: { $lte: new Date(prevDate) } }, function(err, response) {
            if(!err && response) {
                let storeDetails = response;
                let productList = []; let sectionList = []; let blogList = [];
                // products
                products.find({ store_id: mongoose.Types.ObjectId(storeDetails._id), archive_status: false, status: 'active', stock: { $gt: 0 } }, { store_id: 1, seo_status: 1, seo_details: 1 }, function(err, proResp) {
                    if(!err && proResp) { productList = proResp; }
                    // sections
                    section.find({ store_id: mongoose.Types.ObjectId(storeDetails._id), status: 'active' }, function(err, sectionResp) {
                        if(!err && sectionResp) { sectionList = sectionResp; }
                        // blogs
                        blogs.find({ store_id: mongoose.Types.ObjectId(storeDetails._id), status: "enabled" }, { store_id: 1, seo_status: 1, seo_details: 1 }, function(err, blogResp) {
                            if(!err && blogResp) { blogList = blogResp; }
                            // generate sitemap data
                            let mapData = "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9' xmlns:xhtml='http://www.w3.org/1999/xhtml'><url><loc>"+storeDetails.base_url+"/</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                            // common list
                            buildCommonSitemap(storeDetails.base_url, storeDetails.default_sitemap).then((respData) => {
                                mapData += respData;
                                // section list
                                buildSectionSitemap(storeDetails.base_url, sectionList).then((respData) => {
                                    mapData += respData;
                                    // product list
                                    buildSitemap(storeDetails.base_url, "product", productList).then((respData) => {
                                        mapData += respData;
                                        // blog list
                                        buildSitemap(storeDetails.base_url, "blogs", blogList).then((respData) => {
                                            mapData += respData+"</urlset>";
                                            sitemap.findOne({ store_id: mongoose.Types.ObjectId(storeDetails._id) }, function(err, response) {
                                                if(!err && response) {
                                                    sitemap.findByIdAndUpdate(response._id, { $set: { content: mapData, updated_on: new Date() } }, function(err, response) {
                                                        if(!err) {
                                                            store.findByIdAndUpdate(storeDetails._id, { $set: { sitemap_updated_on: new Date() } }, function(err, response) {
                                                                resolve(true);
                                                            });
                                                        }
                                                        else {
                                                            console.log("sitemap update err", err);
                                                            resolve(true);
                                                        }
                                                    });
                                                }
                                                else {
                                                    sitemap.create({ store_id: mongoose.Types.ObjectId(storeDetails._id), content: mapData }, function(err, response) {
                                                        if(!err) {
                                                            store.findByIdAndUpdate(storeDetails._id, { $set: { sitemap_updated_on: new Date() } }, function(err, response) {
                                                                resolve(true);
                                                            });
                                                        }
                                                        else {
                                                            console.log("sitemap update err", err);
                                                            resolve(true);
                                                        }
                                                    });
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            }
            else { resolve(true); }
        });
    });
}

function buildCommonSitemap(base_url, list) {
    return new Promise((resolve, reject) => {
        let mapUrl = "";
        for(let i=0; i<list.length; i++)
        {
            mapUrl += "<url><loc>"+base_url+"/"+list[i]+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
        }
        resolve(mapUrl);
    });
}

function buildSectionSitemap(base_url, sectionList) {
    return new Promise((resolve, reject) => {
        let mapUrl = "";
        for(let i=0; i<sectionList.length; i++)
        {
            let categoryList = sectionList[i].categories;
            if(categoryList.length)
            {
                for(let j=0; j<categoryList.length; j++)
                {
                    let subCategoryList = categoryList[j].sub_categories;
                    if(subCategoryList.length)
                    {
                        for(let k=0; k<subCategoryList.length; k++)
                        {
                            if(subCategoryList[k].seo_status) {
                                mapUrl += "<url><loc>"+base_url+"/category/"+subCategoryList[k].seo_details.page_url+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                            }
                            else {
                                mapUrl += "<url><loc>"+base_url+"/category/"+subCategoryList[k]._id+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                            }
                        }
                    }
                    else {
                        if(categoryList[j].seo_status) {
                            mapUrl += "<url><loc>"+base_url+"/category/"+categoryList[j].seo_details.page_url+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                        }
                        else {
                            mapUrl += "<url><loc>"+base_url+"/category/"+categoryList[j]._id+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                        }
                    }
                }
            }
            else {
                if(sectionList[i].seo_status) {
                    mapUrl += "<url><loc>"+base_url+"/category/"+sectionList[i].seo_details.page_url+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                }
                else {
                    mapUrl += "<url><loc>"+base_url+"/category/"+sectionList[i]._id+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
                }
            }
        }
        resolve(mapUrl);
    });
}

function buildSitemap(base_url, type, list) {
    return new Promise((resolve, reject) => {
        let mapUrl = "";
        for(let i=0; i<list.length; i++)
        {
            if(list[i].seo_status) {
                mapUrl += "<url><loc>"+base_url+"/"+type+"/"+list[i].seo_details.page_url+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
            }
            else {
                mapUrl += "<url><loc>"+base_url+"/"+type+"/"+list[i]._id+"</loc><lastmod>"+new Date().toISOString()+"</lastmod><priority>1.00</priority></url>";
            }
        }
        resolve(mapUrl);
    });
}