// mongodb://dineamik:Dineamik*747@151.106.7.18:27017,151.106.7.74:27017/dineamik_db?replicaSet=mongodineamik&readPreference=primaryPreferred
// mongodb://yourstore:Store*747@151.106.7.18:27017,151.106.7.74:27017/yourstore_db?replicaSet=mongodineamik&readPreference=primaryPreferred
// mongodb://yourstore:Store*747@151.106.7.18:27017/yourstore_db

// const config = {
//     development: {
//     	credentials: 'mongodb://yourstore:Store*747@151.106.7.18:27017,151.106.7.74:27017/yourstore_db?replicaSet=mongodineamik&readPreference=primaryPreferred'
//     },
//     production: {
//         credentials: 'mongodb://yourstore:Store*747@151.106.7.18:27017,151.106.7.74:27017/yourstore_db?replicaSet=mongodineamik&readPreference=primaryPreferred'
//     }
// };

const config = {
    development: {
    	credentials: 'mongodb://dinamic_erp_user:DineErp*005@151.106.7.18:27017,151.106.7.74:27017/dinamic_erp_db?replicaSet=mongodineamik&readPreference=primaryPreferred'
    },
    production: {
        credentials: 'mongodb://dinamic_erp_user:DineErp*005@151.106.7.18:27017,151.106.7.74:27017/dinamic_erp_db?replicaSet=mongodineamik&readPreference=primaryPreferred'
    }
};

module.exports = config;