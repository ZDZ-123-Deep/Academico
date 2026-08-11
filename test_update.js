const mongoose = require('mongoose');
const Empresa = require('./models/Empresa');

mongoose.connect('mongodb://localhost:27017/ga2026').then(async () => {
    try {
        await Empresa.deleteMany({});
        const update = { nombre: 'Test', logo: 'data:image/png;base64,123' };
        
        console.log("Update object:", update);
        
        const empresa = await Empresa.findOneAndUpdate(
            {},
            { $set: update },
            { new: true, upsert: true, lean: true, strict: false }
        );
        
        console.log('Returned from query:', Object.keys(empresa));
        console.log('Returned logo:', empresa.logo);
        
        const inDb = await Empresa.findOne().lean();
        console.log('In DB fields:', Object.keys(inDb));
        console.log('In DB logo:', inDb.logo);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        mongoose.disconnect();
    }
});
