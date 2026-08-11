require('dotenv').config();
const mongoose = require('mongoose');
const Empresa = require('./models/Empresa');

mongoose.connect(process.env.MONGO_URI_ACADEMICO).then(async () => {
    try {
        const empresa = await Empresa.findOneAndUpdate(
            {},
            { $set: { logo: 'data:image/png;base64,PRODUCTION_TEST' } },
            { new: true, upsert: true, lean: true, strict: false }
        );
        console.log('Saved keys:', Object.keys(empresa));
        console.log('Saved logo:', empresa.logo);
    } catch(e) { console.error(e.message); }
    mongoose.disconnect();
});
