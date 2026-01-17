// 創建雨量圖層控制器
window.rainLayer = {
    show: function() {
        if (map.getLayer('rain-circles')) {
            map.setLayoutProperty('rain-circles', 'visibility', 'visible');
        }
        if (map.getLayer('rain-labels')) {
            map.setLayoutProperty('rain-labels', 'visibility', 'visible');
        }
        if (map.getLayer('rain-0-circles')) {
            map.setLayoutProperty('rain-0-circles', 'visibility', 'visible');
        }
        if (map.getLayer('rain-0-labels')) {
            map.setLayoutProperty('rain-0-labels', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('rain-circles')) {
            map.setLayoutProperty('rain-circles', 'visibility', 'none');
        }
        if (map.getLayer('rain-labels')) {
            map.setLayoutProperty('rain-labels', 'visibility', 'none');
        }
        if (map.getLayer('rain-0-circles')) {
            map.setLayoutProperty('rain-0-circles', 'visibility', 'none');
        }
        if (map.getLayer('rain-0-labels')) {
            map.setLayoutProperty('rain-0-labels', 'visibility', 'none');
        }
    },
    updateTime: async function(interval = 'now', timeStr = undefined) {
        const response = await fetch('https://api.exptech.dev/api/v2/meteor/rain/list');
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

        const rainResponse = await fetch(`https://api.exptech.dev/api/v2/meteor/rain/${targetTime}`);
        const rainData = await rainResponse.json();

        const rainFeatures = rainData
            .map(station => {
                let rainfall;
                switch(interval) {
                    case 'now':
                        rainfall = station.data['now'];
                        break;
                    case '10m':
                        rainfall = station.data['10m'];
                        break;
                    case '1h':
                        rainfall = station.data['1h'];
                        break;
                    case '3h':
                        rainfall = station.data['3h'];
                        break;
                    case '6h':
                        rainfall = station.data['6h'];
                        break;
                    case '12h':
                        rainfall = station.data['12h'];
                        break;
                    case '24h':
                        rainfall = station.data['24h'];
                        break;
                    case '2d':
                        rainfall = station.data['2d'];
                        break;
                    case '3d':
                        rainfall = station.data['3d'];
                        break;
                    default:
                        rainfall = station.data['now'];
                }

                if (rainfall === -99) return null;

                return {
                    type: 'Feature',
                    properties: {
                        id: station.id,
                        rainfall: rainfall,
                        name: station.station.name,
                        county: station.station.county,
                        town: station.station.town
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [station.station.lng, station.station.lat]
                    }
                };
            })
            .filter(feature => feature !== null);

        map.getSource('rain-data').setData({
            type: 'FeatureCollection',
            features: rainFeatures
        });
    }
};

const showRainChart = async (e) => {
    const stationId = e.features[0].properties.id;
    const stationName = e.features[0].properties.name;

    window.initchartPopup();
    chartPopup.dataset.stationId = stationId;
    chartPopup.dataset.stationName = stationName;
    setChartTitle(stationName + ' - 雨量');
    chartTypeSelect.value = 'rain';

    closeButton.onclick = function() {
        if (isLoading) {
            shouldStopLoading = true;
        }
        chartPopup.style.display = 'none';
        if (window.rainChart) {
            window.rainChart.destroy();
        }
    }

    window.onclick = function(event) {
        if (event.target == chartPopup) {
            chartPopup.style.display = 'none';
        }
    }

    const listResponse = await fetch('https://api.exptech.dev/api/v2/meteor/rain/list');
    const timeList = await listResponse.json();
    const filteredTimeList = window.filterTimeListByDuration ? window.filterTimeListByDuration(timeList) : timeList;

    const historyData = [];
    let loadedCount = 0;

    // determine desired interval key (default to 'now')
    const selectedInterval = (window.getRainInterval && typeof window.getRainInterval === 'function') ? window.getRainInterval() : 'now';

    for (const time of filteredTimeList) {
        let weatherData;
        if (rainCache.has(time)) {
            weatherData = rainCache.get(time);
        } else {
            const weatherResponse = await fetch(`https://api.exptech.dev/api/v2/meteor/rain/${time}`);
            weatherData = await weatherResponse.json();
            rainCache.set(time, weatherData);
        }

        const stationData = weatherData.find(s => s.id === stationId);
        if (stationData) {
            const key = selectedInterval || 'now';
            const val = stationData.data[key];
            if (val !== -99) {
                historyData.push({
                    time: parseInt(time),
                    value: val
                });
            }
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
    tempChartCanvas.style.display = 'none';
    windChartCanvas.style.display = 'none';
    rainChartCanvas.style.display = 'none';
    humidityChartCanvas.style.display = 'none';
    pressureChartCanvas.style.display = 'none';
    rainChartCanvas.style.display = 'block';
    allChartCanvas.style.display = 'none';

    historyData.sort((a, b) => a.time - b.time);

    const labels = historyData.map(d => {
        const date = new Date(d.time);
        // return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    const rainfalls = historyData.map(d => d.value);

    const textColor = '#f1f1f1';
    const gridColor = 'rgba(255, 255, 255, 0.1)';

    window.rainChart = new Chart(rainChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '雨量',
                data: rainfalls,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `測站 ${stationName} 過去雨量變化`,
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
                        text: '雨量 (mm)',
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
window.showRainChart = showRainChart;

map.on('load', async function() {
    const response = await fetch('https://api.exptech.dev/api/v2/meteor/rain/list');
    const timeList = await response.json();
    const latestTime = timeList[0];

    const timeDisplay = document.getElementById('time-display');
    const date = new Date(parseInt(latestTime));
    timeDisplay.textContent = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');

    const rainResponse = await fetch(`https://api.exptech.dev/api/v2/meteor/rain/${latestTime}`);
    const rainData = await rainResponse.json();

    const rainFeatures = rainData
        .map(station => {
            const rainfall = station.data.now;
            if (rainfall === -99) return null;

            return {
                type: 'Feature',
                properties: {
                    id: station.id,
                    rainfall: rainfall,
                    name: station.station.name,
                    county: station.station.county,
                    town: station.station.town
                },
                geometry: {
                    type: 'Point',
                    coordinates: [station.station.lng, station.station.lat]
                }
            };
        })
        .filter(feature => feature !== null);

    map.addSource('rain-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: rainFeatures
        }
    });

    // 添加雨量為0的圓圈圖層
    map.addLayer({
        id: 'rain-0-circles',
        type: 'circle',
        source: 'rain-data',
        layout: {
            'visibility': 'none'
        },
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                9.5, 3,
                12, 6
            ],
            'circle-color': '#808080',
            'circle-stroke-width': 0.8,
            'circle-stroke-color': '#FFFFFF'
        },
        filter: ['==', ['get', 'rainfall'], 0],
        minzoom: 9.5
    });

    // 添加雨量為0的標籤圖層
    map.addLayer({
        id: 'rain-0-labels',
        type: 'symbol',
        source: 'rain-data',
        layout: {
            'visibility': 'none',
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['get', 'rainfall'],
                ' (mm)'
            ],
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 2]
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
        },
        filter: ['==', ['get', 'rainfall'], 0],
        minzoom: 9.5
    });

    // 添加雨量圓圈圖層
    map.addLayer({
        id: 'rain-circles',
        type: 'circle',
        source: 'rain-data',
        layout: {
            'visibility': 'none'
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
                ['get', 'rainfall'],
                0, '#c2c2c2',
                10, '#9cfcff',
                30, '#059bff',
                50, '#39ff03',
                100, '#fffb03',
                200, '#ff9500',
                300, '#ff0000',
                500, '#fb00ff',
                1000, '#960099',
                2000, '#000000'
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 0.2,
            'circle-stroke-color': '#000000',
            'circle-stroke-opacity': 0.7
        },
        filter: ['!=', ['get', 'rainfall'], 0]
    });

    // 添加雨量標籤圖層
    map.addLayer({
        id: 'rain-labels',
        type: 'symbol',
        source: 'rain-data',
        layout: {
            'visibility': 'none',
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['get', 'rainfall'],
                ' (mm)'
            ],
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 2]
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
        },
        filter: ['!=', ['get', 'rainfall'], 0],
        minzoom: 8.5
    });

    map.on('click', 'rain-circles', showRainChart);
    map.on('click', 'rain-0-circles', showRainChart);
    map.on('click', 'rain-labels', showRainChart);
});