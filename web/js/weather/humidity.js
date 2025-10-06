// 創建濕度圖層控制器
window.humidityLayer = {
    show: function() {
        if (map.getLayer('humidity-circles')) {
            map.setLayoutProperty('humidity-circles', 'visibility', 'visible');
        }
        if (map.getLayer('humidity-labels')) {
            map.setLayoutProperty('humidity-labels', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('humidity-circles')) {
            map.setLayoutProperty('humidity-circles', 'visibility', 'none');
        }
        if (map.getLayer('humidity-labels')) {
            map.setLayoutProperty('humidity-labels', 'visibility', 'none');
        }
    },
    updateTime: async function(timeStr = undefined) {
        // 獲取時間列表
        const timeListResponse = await fetch('https://api.exptech.dev/api/v1/meteor/weather/list');
        const timeList = await timeListResponse.json();
        let targetTime = timeList[timeList.length - 1];

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

        // 更新時間選擇器（如有需要）
        // const timeSelector = document.getElementById('time-selector');
        // if (timeSelector) {
        //     ...如需同步選單可在此處理...
        // }

        const timeDisplay = document.getElementById('time-display');
        const date = new Date(parseInt(targetTime));
        timeDisplay.textContent = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');

        try {
            const response = await fetch(`https://api.exptech.dev/api/v1/meteor/weather/${targetTime}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const weatherData = await response.json();

            const humidityFeatures = weatherData
                .map(station => {
                    const humidity = station.data.air.relative_humidity;
                    if (humidity === -99) return null;

                    return {
                        type: 'Feature',
                        properties: {
                            id: station.id,
                            humidity: humidity,
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

            map.getSource('humidity-data').setData({
                type: 'FeatureCollection',
                features: humidityFeatures
            });
        } catch (error) {
            console.error('濕度資料載入失敗:', error);
        }
    }

};

map.on('load', async function() {
    const response = await fetch('https://api.exptech.dev/api/v1/meteor/weather/list');
    const timeList = await response.json();
    const latestTime = timeList[timeList.length - 1];

    const timeDisplay = document.getElementById('time-display');
    const date = new Date(parseInt(latestTime));
    timeDisplay.textContent = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');

    const weatherResponse = await fetch(`https://api.exptech.dev/api/v1/meteor/weather/${latestTime}`);
    const weatherData = await weatherResponse.json();

    const humidityFeatures = weatherData
        .map(station => {
            const humidity = station.data.air.relative_humidity;
            if (humidity === -99) return null;

            return {
                type: 'Feature',
                properties: {
                    id: station.id,
                    humidity: humidity,
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

    map.addSource('humidity-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: humidityFeatures
        }
    });

    // 添加濕度圓圈圖層
    map.addLayer({
        id: 'humidity-circles',
        type: 'circle',
        source: 'humidity-data',
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
                ['get', 'humidity'],
                0, '#ffb63d',
                50, '#ffffff',
                100, '#0000FF'
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 0.2,
            'circle-stroke-color': '#000000',
            'circle-stroke-opacity': 0.7
        }
    });

    // 添加濕度標籤圖層
    map.addLayer({
        id: 'humidity-labels',
        type: 'symbol',
        source: 'humidity-data',
        layout: {
            'visibility': 'none',
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['get', 'humidity'],
                ' (%)'
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
        minzoom: 8.5
    });

    map.on('click', 'humidity-circles', async (e) => {
        const stationId = e.features[0].properties.id;
        const stationName = e.features[0].properties.name;

        // Show popup and progress bar
        chartPopup.style.display = 'block';
        progressContainer.style.display = 'block';
        tempChartCanvas.style.display = 'none';
        windChartCanvas.style.display = 'none';
        rainChartCanvas.style.display = 'none';
        humidityChartCanvas.style.display = 'none';
        pressureChartCanvas.style.display = 'none';

        if (window.humidityChart) {
            window.humidityChart.destroy();
        }
        if (window.windChart) {
            window.windChart.destroy();
        }
        if (window.rainChart) {
            window.rainChart.destroy();
        }
        if (window.temperatureChart) {
            window.temperatureChart.destroy();
        }

        const listResponse = await fetch('https://api.exptech.dev/api/v1/meteor/weather/list');
        const timeList = await listResponse.json();

        const historyData = [];
        let loadedCount = 0;

        for (const time of timeList) {
            let weatherData;
            if (weatherCache.has(time)) {
                weatherData = weatherCache.get(time);
            } else {
                const weatherResponse = await fetch(`https://api.exptech.dev/api/v1/meteor/weather/${time}`);
                weatherData = await weatherResponse.json();
                weatherCache.set(time, weatherData);
            }

            const stationData = weatherData.find(s => s.id === stationId);
            if (stationData && stationData.data.air.relative_humidity !== -99) {
                historyData.push({
                    time: parseInt(time),
                    data: stationData.data
                });
            }

            loadedCount++;
            const progress = Math.round((loadedCount / timeList.length) * 100);
            progressBar.style.width = progress + '%';
            progressBar.textContent = progress + '%';
        }

        // Hide progress bar and show chart
        progressContainer.style.display = 'none';
        tempChartCanvas.style.display = 'none';
        windChartCanvas.style.display = 'none';
        rainChartCanvas.style.display = 'none';
        pressureChartCanvas.style.display = 'none';
        humidityChartCanvas.style.display = 'block';

        historyData.sort((a, b) => a.time - b.time);

        const labels = historyData.map(d => {
            const date = new Date(d.time);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });
        const humidityData = historyData.map(d => d.data.air.relative_humidity);

        const textColor = '#f1f1f1';
        const gridColor = 'rgba(255, 255, 255, 0.1)';

        window.humidityChart = new Chart(humidityChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '濕度',
                    data: humidityData,
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
                        text: `測站 ${stationName} 過去濕度變化`,
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
                            text: '濕度 (%)',
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

        closeButton.onclick = function() {
            chartPopup.style.display = 'none';
        }

        window.onclick = function(event) {
            if (event.target == chartPopup) {
                chartPopup.style.display = 'none';
            }
        }
    });
});