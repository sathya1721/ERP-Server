'use strict';
const router = require('express').Router();
const storeController = require('../controllers/admin/store.controller');
const commonController = require('../controllers/admin/common.controller');
const shippingController = require('../controllers/admin/shipping.controller');
const packageController = require('../controllers/admin/package.controller');
const featuresController = require('../controllers/admin/features.controller');
const paymentController = require('../controllers/admin/payment.controller');

router
    .route('/store')
    .get(storeController.list)
    .post(storeController.add)
    .put(storeController.update)
    .patch(storeController.hard_remove)
router
    .route('/store/details')
    .post(storeController.details)
router
    .route('/store/generate_token')
    .post(storeController.generate_token)
router
    .route('/store/generate_token_v2')
    .post(storeController.generate_token_v2)
router
    .route('/store/change_pwd')
    .post(storeController.change_pwd)
router
    .route('/store/manual_deploy')
    .get(storeController.manual_deploy)
router
    .route('/store/check_build_status')
    .get(storeController.check_build_status)

router
    .route('/import_customers')
    .post(commonController.import_customers)
router
    .route('/subscribers')
    .get(commonController.subscribers)

router
    .route('/shipping')
    .get(shippingController.list)
    .post(shippingController.add)
    .put(shippingController.update)
    .patch(shippingController.soft_remove)

router
    .route('/packages')
    .get(packageController.list)
    .post(packageController.add)
    .put(packageController.update)
    .patch(packageController.soft_remove)

router
    .route('/features')
    .get(featuresController.list)
    .post(featuresController.add)
    .put(featuresController.update)
    .patch(featuresController.soft_remove)
router
    .route('/features/details')
    .post(featuresController.details)

router
    .route('/inactive_payments')
    .post(paymentController.inactive_payments)
router
    .route('/razorpay_payment_status')
    .post(paymentController.razorpay_payment_status)

module.exports = router;