const showAllChart = async (e) => {
    const stationId = e.features[0].properties.id;
    const stationName = e.features[0].properties.name;

    if (!(e && e.all)) {
        window.initchartPopup();
    }
    chartPopup.dataset.stationId = stationId;
    chartPopup.dataset.stationName = stationName;
    setChartTitle(stationName + ' - 全部數據');
    chartTypeSelect.value = 'all';

    closeButton.onclick = function() {
        if (isLoading) {
            shouldStopLoading = true;
        }
        chartPopup.style.display = 'none';
        if (window.AllChart) {
            window.AllChart.destroy();
        }
    }

    window.onclick = function(event) {
        if (event.target == chartPopup) {
            chartPopup.style.display = 'none';
        }
    }

    const listResponse = await fetch('https://api.exptech.dev/api/v1/meteor/weather/list');
    const timeList = await listResponse.json();
    const filteredTimeList = window.filterTimeListByDuration ? window.filterTimeListByDuration(timeList) : timeList;

    const historyData = [];
    let loadedCount = 0;

    for (const time of filteredTimeList) {
        let weatherData;
        if (weatherCache.has(time)) {
            weatherData = weatherCache.get(time);
        } else {
            const weatherResponse = await fetch(`https://api.exptech.dev/api/v1/meteor/weather/${time}`);
            weatherData = await weatherResponse.json();
            weatherCache.set(time, weatherData);
        }

        // try to fetch rain data (rain API is separate)
        let rainData = null;
        try {
            if (typeof rainCache !== 'undefined') {
                if (rainCache.has(time)) {
                    rainData = rainCache.get(time);
                } else {
                    const rainResponse = await fetch(`https://api.exptech.dev/api/v1/meteor/rain/${time}`);
                    rainData = await rainResponse.json();
                    rainCache.set(time, rainData);
                }
            }
        } catch (err) {
            // ignore rain fetch errors and continue with weather data only
            console.warn('rain data not available for', time, err);
            rainData = null;
        }

        const stationData = weatherData ? weatherData.find(s => s.id === stationId) : null;
        const rainStation = rainData ? rainData.find(s => s.id === stationId) : null;

        const tempVal = stationData && stationData.data && stationData.data.air ? stationData.data.air.temperature : -99;
        const humidityVal = stationData && stationData.data && stationData.data.air ? stationData.data.air.relative_humidity : -99;
        const pressureVal = stationData && stationData.data && stationData.data.air ? stationData.data.air.pressure : -99;
        const windVal = stationData && stationData.data && stationData.data.wind ? stationData.data.wind.speed : -99;
        const rainVal = rainStation && rainStation.data ? (rainStation.data.now !== undefined ? rainStation.data.now : (rainStation.data.rainfall !== undefined ? rainStation.data.rainfall : -99)) : -99;

        // Only push a record if at least one metric is valid
        if ([tempVal, humidityVal, pressureVal, windVal, rainVal].some(v => v !== -99 && v !== null && v !== undefined)) {
            historyData.push({
                time: parseInt(time),
                data: {
                    temperature: tempVal !== -99 ? tempVal : null,
                    humidity: humidityVal !== -99 ? humidityVal : null,
                    pressure: pressureVal !== -99 ? pressureVal : null,
                    wind: windVal !== -99 ? windVal : null,
                    rain: rainVal !== -99 ? rainVal : null
                }
            });
        }

        loadedCount++;
        const progress = Math.round((loadedCount / timeList.length) * 100);
        progressBar.style.width = progress + '%';
        progressBar.textContent = progress + '%';

        if (shouldStopLoading) {
            isLoading = false;
            return;
        }
    }

    isLoading = false;

    if (shouldStopLoading) {
        return;
    }

    // Hide progress bar and show chart
    progressContainer.style.display = 'none';
    tempChartCanvas.style.display = 'none';
    rainChartCanvas.style.display = 'none';
    humidityChartCanvas.style.display = 'none';
    pressureChartCanvas.style.display = 'none';
    windChartCanvas.style.display = 'none';
    allChartCanvas.style.display = 'block';

    historyData.sort((a, b) => a.time - b.time);

    const labels = historyData.map(d => {
        const date = new Date(d.time);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });

    const temperatures = historyData.map(d => d.data.temperature);
    const rainfalls = historyData.map(d => d.data.rain);
    const humidities = historyData.map(d => d.data.humidity);
    const pressures = historyData.map(d => d.data.pressure);
    const windSpeeds = historyData.map(d => d.data.wind);

    const textColor = '#f1f1f1';
    const gridColor = 'rgba(255, 255, 255, 0.1)';

    // destroy old chart if exists
    if (window.AllChart) {
        try { window.AllChart.destroy(); } catch(e) {}
    }

    window.AllChart = new Chart(allChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '氣溫 (°C)',
                    data: temperatures,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    yAxisID: 'y'
                },
                {
                    label: '雨量 (mm)',
                    data: rainfalls,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false,
                    yAxisID: 'y1'
                },
                {
                    label: '濕度 (%)',
                    data: humidities,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    yAxisID: 'y2'
                },
                {
                    label: '氣壓 (hPa)',
                    data: pressures,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: false,
                    yAxisID: 'y3'
                },
                {
                    label: '風速 (m/s)',
                    data: windSpeeds,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    fill: false,
                    yAxisID: 'y4'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `測站 ${stationName} 全部數據過去變化`,
                    color: textColor,
                    font: { size: 18 }
                },
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: '時間', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '氣溫 (°C)', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '雨量 (mm)', color: textColor },
                    ticks: { color: textColor },
                    grid: { drawOnChartArea: false }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    title: { display: true, text: '濕度 (%)', color: textColor },
                    ticks: { color: textColor },
                    grid: { drawOnChartArea: false }
                },
                y3: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    title: { display: true, text: '氣壓 (hPa)', color: textColor },
                    ticks: { color: textColor },
                    grid: { drawOnChartArea: false }
                },
                y4: {
                    type: 'linear',
                    display: false,
                    position: 'left',
                    title: { display: true, text: '風速 (m/s)', color: textColor },
                    ticks: { color: textColor },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
};
window.showAllChart = showAllChart;