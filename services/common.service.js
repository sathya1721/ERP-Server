module.exports = {
    orderNumber() {
        let months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];;
        let date = new Date();
        return Math.floor(100000+Math.random()*999999)+"-"+months[date.getMonth()]+date.getFullYear().toString().substr(-2);
    },
    invoiceNumber(invoiceConfig) {
        let invoiceNum = "";
        let numConvert = String(invoiceConfig.next_invoice_no).padStart(invoiceConfig.min_digit, '0');
        invoiceNum = invoiceConfig.prefix+numConvert+invoiceConfig.suffix;
        return invoiceNum;
    },
    priceFormat(currency_details, price) {
        return currency_details.html_code+(price/currency_details.country_inr_value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    },
    priceConvert(currency_details, price) {
        return (price/currency_details.country_inr_value).toFixed(2);
    },
    giftCouponCode(length) {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    },
    randomString(length) {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    },
    urlFormat(string) {
        string = string.toLowerCase().replace(/[^a-zA-Z0-9- ]/g, "");
        string = string.replace(/ +(?= )/g, "");
        string = string.replace(/[^a-zA-Z0-9]/g, "-");
        string = string.replace("---", "-");
        return string;
    },
    CALC_AC(currencyDetails, price) {
        if(!price) { price = 0; }
        let additonalCost = 0;
        if(currencyDetails.additional_charges > 0) {
            let percentage = currencyDetails.additional_charges/100;
            additonalCost = price*percentage;
        }
        let totalPrice = parseFloat(price)+parseFloat(additonalCost);
        return parseFloat((totalPrice).toFixed(2));
    },
    stringCapitalize(string) {
        if(string) {
            let array = [];
            string.split(" ").map((obj) => {
                if(obj) { array.push(obj[0].toUpperCase() + obj.substring(1).toLowerCase()); }
            });
            return array.join(" ");
        }
        else { return ""; }
    },
    rgbToHex(colors) {
        let hexCode = "#";
        colors.map(x => {
            let hex = x.toString(16);
            if(hex.length === 1) { hexCode += '0'; }
            hexCode += hex;
        });
        return hexCode;
    }
};