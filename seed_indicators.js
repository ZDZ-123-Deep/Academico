const conectarDB = require('./config/database');
const Indicador = require('./models/Indicador');

const indicators = [
  { Id: '1', tipo: 'Cumplimiento', descripcion: 'MOTIVACION DE PROCESOS ESCOLARES', estado: 'A' },
  { Id: '2', tipo: 'Cumplimiento', descripcion: 'COMPROMISOS PROCESOS ESCOLARES', estado: 'A' },
  { Id: '3', tipo: 'Cumplimiento', descripcion: 'PUNTUALIDAD EN LOS PROCESOS ESCOLARES', estado: 'A' },
  { Id: '4', tipo: 'Presentación Personal', descripcion: 'USO ADECUADO UNIFORMES', estado: 'A' },
  { Id: '5', tipo: 'Presentación Personal', descripcion: 'PULCRITUD EN PRESENTACION FISICA', estado: 'A' },
  { Id: '6', tipo: 'Cumplimiento Escolar', descripcion: 'ACTITUD DE CONVIVENCIA', estado: 'A' },
  { Id: '7', tipo: 'Cumplimiento Escolar', descripcion: 'VALORACION NORMATIVA', estado: 'A' },
  { Id: '8', tipo: 'Cumplimiento Escolar', descripcion: 'PARTICIPACION DE PROCESOS ESCOLARES', estado: 'A' }
];

(async () => {
    try {
        await conectarDB();
        console.log('Connected to DB for seeding indicators!');
        
        // Remove existing to avoid duplicates or messy state
        await Indicador.deleteMany({});
        console.log('Cleared existing indicators.');
        
        // Insert new ones
        const result = await Indicador.insertMany(indicators);
        console.log(`Successfully seeded ${result.length} indicators.`);
        
        process.exit(0);
    } catch (e) {
        console.error('Error seeding indicators:', e);
        process.exit(1);
    }
})();
