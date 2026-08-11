const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM('<button onclick="mostrarSeccion(\'cursos\',this)">Test</button>');
const btns = dom.window.document.querySelectorAll("button[onclick*=\"'cursos'\"]");
console.log('Found:', btns.length);
