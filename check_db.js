const conectarDB = require('./config/database');
const { PlanillaDetalle } = require('./models/Planilla');
const IdNota = require('./models/IdNota');

(async () => {
    try {
        await conectarDB();
        console.log('Connected to DB!');
        
        // Check PlanillaDetalle sorting
        const maxDocAlph = await PlanillaDetalle.findOne().sort({ Id: -1 }).lean();
        console.log('Max Doc (Alphabetical):', maxDocAlph?.Id);

        const maxDocsNum = await PlanillaDetalle.aggregate([
            { $project: { numericId: { $toInt: "$Id" } } },
            { $sort: { numericId: -1 } },
            { $limit: 1 }
        ]);
        console.log('Max Doc (Numeric):', maxDocsNum.length > 0 ? maxDocsNum[0].numericId : 'None');

        // Check IdNota sorting
        const maxIdNotaAlph = await IdNota.findOne().sort({ Id: -1 }).lean();
        console.log('Max IdNota (Alphabetical):', maxIdNotaAlph?.Id);

        const maxIdNotaNum = await IdNota.aggregate([
            { $project: { numericId: { $toInt: "$Id" } } },
            { $sort: { numericId: -1 } },
            { $limit: 1 }
        ]);
        console.log('Max IdNota (Numeric):', maxIdNotaNum.length > 0 ? maxIdNotaNum[0].numericId : 'None');

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
