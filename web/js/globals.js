const weatherCache = new Map();
const rainCache = new Map();

const chartPopup = document.getElementById('chart-popup');
const tempChartCanvas = document.getElementById('temperature-chart');
const windChartCanvas = document.getElementById('wind-chart');
const rainChartCanvas = document.getElementById('rain-chart');
const humidityChartCanvas = document.getElementById('humidity-chart');
const pressureChartCanvas = document.getElementById('pressure-chart');
const allChartCanvas = document.getElementById('all-chart');
const closeButton = document.querySelector('.chart-close-button');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const chartTitle = document.getElementById('chart-title');

let isLoading = false;
let shouldStopLoading = false;

// chart duration state (in hours). null means all available
let chartDurationHours = 6;

function setChartTitle(text) {
	if (chartTitle) chartTitle.textContent = text;
}

function setChartDuration(hours) {
	chartDurationHours = hours === 'all' ? null : Number(hours);
}

function getChartDuration() {
	return chartDurationHours;
}

function filterTimeListByDuration(timeList) {
	if (!chartDurationHours) return timeList;
	// timeList are timestamps in string form; take last timestamp as latest
	const latest = Number(timeList[0]);
	const cutoff = latest - chartDurationHours * 3600 * 1000;
	return timeList.filter(t => Number(t) >= cutoff);
}

// expose helpers globally
window.setChartTitle = setChartTitle;
window.setChartDuration = setChartDuration;
window.getChartDuration = getChartDuration;
window.filterTimeListByDuration = filterTimeListByDuration;

// Wire up duration and type select if present
const durationSelect = document.getElementById('chart-duration-select');
const chartTypeSelect = document.getElementById('chart-type-select');
const rainIntervalSelect = document.getElementById('rain-interval-select');

let chartType = 'temperature';
function setChartType(type) {
	chartType = type;
}
function getChartType() {
	return chartType;
}
window.setChartType = setChartType;
window.getChartType = getChartType;

if (chartTypeSelect) {
	chartTypeSelect.addEventListener('change', () => {
		setChartType(chartTypeSelect.value);
		window.dispatchEvent(new CustomEvent('chartTypeChanged', { detail: { type: chartTypeSelect.value }, }));
        // show rain interval selector only when rain is selected
        if (rainIntervalSelect) {
            if (chartTypeSelect.value === 'rain' || chartTypeSelect.value === 'all') {
                rainIntervalSelect.style.display = 'block';
            } else {
                rainIntervalSelect.style.display = 'none';
            }
        }
	});
}
if (durationSelect) {
	durationSelect.addEventListener('change', () => {
		const val = durationSelect.value;
		setChartDuration(val);
		window.dispatchEvent(new CustomEvent('chartDurationChanged', { detail: { type: chartTypeSelect.value } }));
	});
}

// rain interval events
if (rainIntervalSelect) {
    // expose getter
    function getRainInterval() { return rainIntervalSelect.value; }
    window.getRainInterval = getRainInterval;

    rainIntervalSelect.addEventListener('change', () => {
        if (chartTypeSelect.value === 'rain') {
            window.dispatchEvent(new CustomEvent('chartTypeChanged', { detail: { type: 'rain' } }));
        } else if (chartTypeSelect.value === 'all') {
            window.dispatchEvent(new CustomEvent('chartTypeChanged', { detail: { type: 'all' } }));
        }
    });
}

function initchartPopup() {
    // Reset loading flags
    shouldStopLoading = false;
    isLoading = true;

    // Show popup and progress bar
    chartPopup.style.display = 'block';
    progressContainer.style.display = 'block';
    tempChartCanvas.style.display = 'none';
    windChartCanvas.style.display = 'none';
    rainChartCanvas.style.display = 'none';
    humidityChartCanvas.style.display = 'none';
    pressureChartCanvas.style.display = 'none';
    allChartCanvas.style.display = 'none';

    if (window.humidityChart) {
        window.humidityChart.destroy();
    }
    if (window.pressureChart) {
        window.pressureChart.destroy();
    }
    if (window.rainChart) {
        window.rainChart.destroy();
    }
    if (window.temperatureChart) {
        window.temperatureChart.destroy();
    }
    if (window.windChart) {
        window.windChart.destroy();
    }
    if (window.AllChart) {
        window.AllChart.destroy();
    }
}
window.initchartPopup = initchartPopup;

function showCharts(types, e) {
    const baseEvent = e && e.features ? e : {
        features: [{
            properties: {
                id: chartPopup.dataset.stationId,
                name: chartPopup.dataset.stationName
            }
        }]
    };

    if (types === 'temperature') window.showTemperatureChart(baseEvent);
    else if (types === 'wind') window.showWindChart(baseEvent);
    else if (types === 'rain') window.showRainChart(baseEvent);
    else if (types === 'humidity') window.showHumidityChart(baseEvent);
    else if (types === 'pressure') window.showPressureChart(baseEvent);
    else if (types === 'all') window.showAllChart(baseEvent);
}

// instant chart switch on type change
const typeSwitchHandler = (e) => {
    const type = e && e.detail && e.detail.type ? e.detail.type : getChartType();
    showCharts(type, e);
};

window.addEventListener('chartTypeChanged', typeSwitchHandler);
window.addEventListener('chartDurationChanged', typeSwitchHandler);