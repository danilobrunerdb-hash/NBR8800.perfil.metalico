const fs = require('fs');
const htmlFile = 'c:/Users/danil/OneDrive/Área de Trabalho/CÁLCULO PERFIL METÁLICO/nbr-calculo-perfil/index.html';
const cssFile = 'c:/Users/danil/OneDrive/Área de Trabalho/CÁLCULO PERFIL METÁLICO/nbr-calculo-perfil/src/index.css';

let html = fs.readFileSync(htmlFile, 'utf8');

const lightColors = {
  'on-surface': '#1a1c20', 'on-secondary-fixed': '#161c22', 'on-tertiary': '#ffffff', 'error-container': '#ffdad6', 'primary': '#003874', 'tertiary-fixed-dim': '#bac8dc', 'inverse-surface': '#2e3035', 'inverse-on-surface': '#f0f0f7', 'surface-container-high': '#e8e8ee', 'secondary-fixed': '#dde3eb', 'on-secondary': '#ffffff', 'primary-container': '#1a4f95', 'on-primary-fixed': '#001b3e', 'inverse-primary': '#aac7ff', 'on-tertiary-fixed-variant': '#3a4859', 'tertiary-container': '#445162', 'secondary-fixed-dim': '#c1c7cf', 'primary-fixed': '#d6e3ff', 'surface-variant': '#e2e2e8', 'on-primary-fixed-variant': '#08458b', 'primary-fixed-dim': '#aac7ff', 'secondary': '#595f66', 'on-surface-variant': '#424751', 'tertiary': '#2d3a4a', 'tertiary-fixed': '#d6e4f9', 'on-secondary-fixed-variant': '#41474e', 'on-error-container': '#93000a', 'on-secondary-container': '#5f656c', 'surface-bright': '#f9f9ff', 'background': '#f9f9ff', 'surface': '#f9f9ff', 'surface-container-lowest': '#ffffff', 'on-primary-container': '#a3c3ff', 'outline': '#737782', 'on-error': '#ffffff', 'on-tertiary-fixed': '#0f1c2c', 'secondary-container': '#dde3eb', 'surface-dim': '#d9d9e0', 'on-tertiary-container': '#b6c4d8', 'error': '#ba1a1a', 'on-primary': '#ffffff', 'surface-container-low': '#f3f3fa', 'outline-variant': '#c3c6d2', 'surface-tint': '#2e5ea5', 'surface-container': '#ededf4', 'on-background': '#1a1c20', 'surface-container-highest': '#e2e2e8'
};

const darkColors = {
  'on-surface': '#e2e2e9', 'on-secondary-fixed': '#c2c7cf', 'on-tertiary': '#bac8dc', 'error-container': '#93000a', 'primary': '#aac7ff', 'tertiary-fixed-dim': '#bac8dc', 'inverse-surface': '#e2e2e9', 'inverse-on-surface': '#111318', 'surface-container-high': '#282a2f', 'secondary-fixed': '#dde3eb', 'on-secondary': '#161c22', 'primary-container': '#00458f', 'on-primary-fixed': '#001b3e', 'inverse-primary': '#003874', 'on-tertiary-fixed-variant': '#bac8dc', 'tertiary-container': '#2d3a4a', 'secondary-fixed-dim': '#c1c7cf', 'primary-fixed': '#d6e3ff', 'surface-variant': '#44474e', 'on-primary-fixed-variant': '#d6e3ff', 'primary-fixed-dim': '#aac7ff', 'secondary': '#c2c7cf', 'on-surface-variant': '#c4c6d0', 'tertiary': '#bac8dc', 'tertiary-fixed': '#d6e4f9', 'on-secondary-fixed-variant': '#c2c7cf', 'on-error-container': '#ffdad6', 'on-secondary-container': '#dde3eb', 'surface-bright': '#37393e', 'background': '#111318', 'surface': '#111318', 'surface-container-lowest': '#0c0e13', 'on-primary-container': '#d6e3ff', 'outline': '#8e9099', 'on-error': '#690005', 'on-tertiary-fixed': '#bac8dc', 'secondary-container': '#41474e', 'surface-dim': '#111318', 'on-tertiary-container': '#d6e4f9', 'error': '#ffb4ab', 'on-primary': '#002f65', 'surface-container-low': '#191c20', 'outline-variant': '#44474e', 'surface-tint': '#aac7ff', 'surface-container': '#1d2024', 'on-background': '#e2e2e9', 'surface-container-highest': '#33353a'
};

const startIndex = html.indexOf('"colors": {');
const endIndex = html.indexOf('},', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  let newColors = '"colors": {\n';
  newColors += Object.keys(lightColors).map(k => `              "${k}": "var(--${k})"`).join(',\n');
  newColors += '\n            }';
  
  const newHtml = html.substring(0, startIndex) + newColors + html.substring(endIndex + 1);
  fs.writeFileSync(htmlFile, newHtml, 'utf8');
}

let css = fs.readFileSync(cssFile, 'utf8');
let cssVars = '\n:root {\n';
for (let k in lightColors) {
  cssVars += `  --${k}: ${lightColors[k]};\n`;
}
cssVars += '}\n\n.dark {\n';
for (let k in darkColors) {
  cssVars += `  --${k}: ${darkColors[k]};\n`;
}
cssVars += '}\n';

fs.writeFileSync(cssFile, css + cssVars, 'utf8');
console.log("Success");
