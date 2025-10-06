const weatherCache = new Map();
const rainCache = new Map();

const chartPopup = document.getElementById('chart-popup');
const tempChartCanvas = document.getElementById('temperature-chart');
const windChartCanvas = document.getElementById('wind-chart');
const rainChartCanvas = document.getElementById('rain-chart');
const humidityChartCanvas = document.getElementById('humidity-chart');
const pressureChartCanvas = document.getElementById('pressure-chart');
const closeButton = document.querySelector('.chart-close-button');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');