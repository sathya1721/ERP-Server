const webpush = require('web-push');

const vapidKeys = {
    publicKey: 'BK7P3Gui8d5itafHsJ0_amZrnaM8lADhEZcQCRrDZBoBEh_33HBiLHBjS0LUk5UP3Zr2xU2tlFS9Ypnv0xJQHNk',
    privateKey: 'Yp_XKJmhvq-rbZaZ_a0cmHVJxMIqo5IJduAbcnHTVkU'
};
webpush.setVapidDetails('mailto: rianozal@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);

exports.push = function(data) {

    let payloadData = data.payload;
    const notificationPayload = {
        notification: {
            title: payloadData.title,
            body: payloadData.body,
            "icon": "assets/icons/icon-144x144.png",
            "badge": "assets/icons/icon-144x144.png"
        }
    };
    Promise.all(data.subscribers.map(sub => {
        webpush.sendNotification(sub, JSON.stringify(notificationPayload));
    }))
    .then(data => { return true; })
    .catch(err => { return false; });

};