const config = {
    // mail_base: 'https://yourstore.io/store-mail/',
    // api_base: 'https://yourstore.io/api/',
    // image_base: 'https://yourstore.io/api/uploads/',
    // image_api_base: 'http://151.106.7.18:4000',
    mail_base: 'https://yourstore.io/store-mail/',
    api_base: 'http://localhost:4100/',
    image_base: 'http://localhost:4100/uploads/',
    image_api_base: 'http://localhost:4100',
    mail_config: {
        transporter: {
            host: "lin.ezveb.com",
            port: 25,
            secureConnection: false,
            auth: {
                user: "prabha@sis.in",
                pass: "Prabha1990"
                // user: "orders@yourstore.io",
                // pass: "Yourstore@747"
            }
        }
    }
};

module.exports = config;