// 創建溫度圖層控制器
window.temperatureLayer = {
    show: function() {
        if (map.getLayer('temperature-circles')) {
            map.setLayoutProperty('temperature-circles', 'visibility', 'visible');
        }
        if (map.getLayer('temperature-labels')) {
            map.setLayoutProperty('temperature-labels', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('temperature-circles')) {
            map.setLayoutProperty('temperature-circles', 'visibility', 'none');
        }
        if (map.getLayer('temperature-labels')) {
            map.setLayoutProperty('temperature-labels', 'visibility', 'none');
        }
    },
    updateTime: async function(timeStr = undefined) {
        const response = await fetch('https://api.exptech.dev/api/v2/meteor/weather/list');
        const timeList = await response.json();
        let targetTime = timeList[0];

        if (timeStr) {
            const target = timeStr.replace(/-/g, '/');
            const inputDate = new Date(target);
            let minDiff = Infinity;
            for (const t of timeList) {
                const d = new Date(parseInt(t));
                const diff = Math.abs(d.getTime() - inputDate.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    targetTime = t;
                }
            }
        }

        const timeDisplay = document.getElementById('time-display');
        const date = new Date(parseInt(targetTime));
        timeDisplay.textContent = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');

        const weatherResponse = await fetch(`https://api.exptech.dev/api/v2/meteor/weather/${targetTime}`);
        const weatherData = await weatherResponse.json();

        const temperatureData = weatherData
            .filter(station => station.data.air.temperature !== -99)
            .map(station => ({
                type: 'Feature',
                properties: {
                    id: station.id,
                    name: station.station.name,
                    temperature: station.data.air.temperature
                },
                geometry: {
                    type: 'Point',
                    coordinates: [station.station.lng, station.station.lat]
                }
            }));

        map.getSource('temperature-data').setData({
            type: 'FeatureCollection',
            features: temperatureData
        });
    }
};

resetButton.addEventListener('click', () => {
    map.jumpTo({
        center: [120.2, 23.6],
        zoom: 6.6
    });
});

const showTemperatureChart = async (e) => {
    const stationId = e.features[0].properties.id;
    const stationName = e.features[0].properties.name;

    window.initchartPopup();
    chartPopup.dataset.stationId = stationId;
    chartPopup.dataset.stationName = stationName;
    setChartTitle(stationName + ' - 氣溫');
    chartTypeSelect.value = 'temperature';

    closeButton.onclick = function() {
        if (isLoading) {
            shouldStopLoading = true;
        }
        chartPopup.style.display = 'none';
        if (window.temperatureChart) {
            window.temperatureChart.destroy();
        }
    }

    window.onclick = function(event) {
        if (event.target == chartPopup) {
            chartPopup.style.display = 'none';
        }
    }

    const listResponse = await fetch('https://api.exptech.dev/api/v2/meteor/weather/list');
    const timeList = await listResponse.json();
    const filteredTimeList = window.filterTimeListByDuration ? window.filterTimeListByDuration(timeList) : timeList;

    const historyData = [];
    let loadedCount = 0;

    for (const time of filteredTimeList) {
        let weatherData;
        if (weatherCache.has(time)) {
            weatherData = weatherCache.get(time);
        } else {
            const weatherResponse = await fetch(`https://api.exptech.dev/api/v2/meteor/weather/${time}`);
            weatherData = await weatherResponse.json();
            weatherCache.set(time, weatherData);
        }

        const stationData = weatherData.find(s => s.id === stationId);
        if (stationData && stationData.data.air.temperature !== -99) {
            historyData.push({
                time: parseInt(time),
                data: stationData.data
            });
        }

        loadedCount++;
        const progress = Math.round((loadedCount / filteredTimeList.length) * 100);
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
    windChartCanvas.style.display = 'none';
    rainChartCanvas.style.display = 'none';
    humidityChartCanvas.style.display = 'none';
    pressureChartCanvas.style.display = 'none';
    tempChartCanvas.style.display = 'block';
    allChartCanvas.style.display = 'none';

    historyData.sort((a, b) => a.time - b.time);

    const labels = historyData.map(d => {
        const date = new Date(d.time);
        // return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    const temperatures = historyData.map(d => d.data.air.temperature);

    const textColor = '#f1f1f1';
    const gridColor = 'rgba(255, 255, 255, 0.1)';

    window.temperatureChart = new Chart(tempChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '氣溫',
                data: temperatures,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `測站 ${stationName} 過去氣溫變化`,
                    color: textColor,
                    font: {
                        size: 18
                    }
                },
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '時間',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '氣溫 (°C)',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
};
window.showTemperatureChart = showTemperatureChart;

map.on('load', async function() {
    const response = await fetch('https://api.exptech.dev/api/v2/meteor/weather/list');
    const timeList = await response.json();
    const latestTime = timeList[0];

    const timeDisplay = document.getElementById('time-display');
    const date = new Date(parseInt(latestTime));
    timeDisplay.textContent = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');

    const weatherResponse = await fetch(`https://api.exptech.dev/api/v2/meteor/weather/${latestTime}`);
    const weatherData = await weatherResponse.json();
    weatherCache.set(latestTime, weatherData);

    const temperatureData = weatherData
        .filter(station => station.data.air.temperature !== -99)
        .map(station => ({
            type: 'Feature',
            properties: {
                id: station.id,
                name: station.station.name,
                temperature: station.data.air.temperature
            },
            geometry: {
                type: 'Point',
                coordinates: [station.station.lng, station.station.lat]
            }
        }));

    map.addSource('temperature-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: temperatureData
        }
    });

    map.addLayer({
        id: 'temperature-circles',
        type: 'circle',
        source: 'temperature-data',
        layout: {
            'visibility': 'none'  // 預設隱藏
        },
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 5,
                12, 15
            ],
            'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'temperature'],
                -20, '#4d4e51',
                -10, '#0000FF',
                0, '#6495ED',
                10, '#95d07e',
                20, '#f6e78b',
                30, '#FF4500',
                40, '#8B0000'
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 0.2,
            'circle-stroke-color': '#000000',
            'circle-stroke-opacity': 0.7
        }
    });

    map.addLayer({
        id: 'temperature-labels',
        type: 'symbol',
        source: 'temperature-data',
        minzoom: 8.5,
        layout: {
            'visibility': 'none',  // 預設隱藏
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['number-format', ['get', 'temperature'], {'max-fraction-digits': 1}],
                '°C'
            ],
            'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 10,
                12, 14
            ],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-anchor': 'top',
            'text-offset': [0, 1],
            'text-font': ['Noto Sans Regular']
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1.5,
            'text-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 0,
                8.5, 1
            ]
        }
    });

    map.on('click', 'temperature-circles', showTemperatureChart);
});