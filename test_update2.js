const mongoose = require('mongoose');
const Empresa = require('./models/Empresa');

mongoose.connect('mongodb://localhost:27017/ga2026').then(async () => {
    try {
        await Empresa.deleteMany({});
        await Empresa.create({ nombre: 'Initial' });
        
        const update = { logo: 'data:image/png;base64,TESTING_SAVE_WITHOUT_STRICT_FALSE' };
        
        const empresa = await Empresa.findOneAndUpdate(
            {},
            { $set: update },
            { new: true, upsert: true, lean: true }
        );
        
        console.log('Returned logo:', empresa.logo);
        
        const inDb = await Empresa.findOne().lean();
        console.log('In DB logo:', inDb.logo);
    } catch(e) { console.error(e.message); }
    mongoose.disconnect();
});
