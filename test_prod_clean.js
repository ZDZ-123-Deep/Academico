require('dotenv').config();
const mongoose = require('mongoose');
const Empresa = require('./models/Empresa');

mongoose.connect(process.env.MONGO_URI_ACADEMICO).then(async () => {
    try {
        await Empresa.findOneAndUpdate(
            {},
            { $unset: { logo: 1 } },
            { new: true, upsert: true, lean: true, strict: false }
        );
        console.log('Cleaned test logo');
    } catch(e) { console.error(e.message); }
    mongoose.disconnect();
});
