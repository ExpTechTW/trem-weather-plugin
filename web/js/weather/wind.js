// 創建風速圖層控制器
window.windLayer = {
    show: function() {
        if (map.getLayer('wind-arrows')) {
            map.setLayoutProperty('wind-arrows', 'visibility', 'visible');
        }
        if (map.getLayer('wind-speed-labels')) {
            map.setLayoutProperty('wind-speed-labels', 'visibility', 'visible');
        }
        if (map.getLayer('wind-circles')) {
            map.setLayoutProperty('wind-circles', 'visibility', 'visible');
        }
        if (map.getLayer('wind-speed-0-labels')) {
            map.setLayoutProperty('wind-speed-0-labels', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('wind-arrows')) {
            map.setLayoutProperty('wind-arrows', 'visibility', 'none');
        }
        if (map.getLayer('wind-speed-labels')) {
            map.setLayoutProperty('wind-speed-labels', 'visibility', 'none');
        }
        if (map.getLayer('wind-circles')) {
            map.setLayoutProperty('wind-circles', 'visibility', 'none');
        }
        if (map.getLayer('wind-speed-0-labels')) {
            map.setLayoutProperty('wind-speed-0-labels', 'visibility', 'none');
        }
    },
    updateTime: async function(timeStr = undefined) {
        const response = await fetch('https://api.exptech.dev/api/v1/meteor/weather/list');
        const timeList = await response.json();
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

        const timeDisplay = document.getElementById('time-display');
        const date = new Date(parseInt(targetTime));
        timeDisplay.textContent = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');

        const windResponse = await fetch(`https://api.exptech.dev/api/v1/meteor/weather/${targetTime}`);
        const windData = await windResponse.json();

        const windFeatures = windData
            .map(station => {
                const direction = station.data.wind.direction;
                const speed = station.data.wind.speed;

                if (direction === -99 || speed === -99) return null;

                return {
                    type: 'Feature',
                    properties: {
                        id: station.id,
                        name: station.station.name,
                        direction: (direction + 180) % 360, // 調整方向以符合地圖顯示
                        speed: speed,
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

        map.getSource('wind-data').setData({
            type: 'FeatureCollection',
            features: windFeatures
        });
    }
};

// 載入風速圖示
map.on('load', async function() {
    const windIcons = ['wind-1', 'wind-2', 'wind-3', 'wind-4', 'wind-5'];

    for (let i = 1; i <= 5; i++) {
        const imageId = `wind-${i}`;
        const imageUrl = `js/weather/icons/wind-${i}.png`;

        try {
            const response = await fetch(imageUrl);
            if (response.ok) {
                const blob = await response.blob();
                const image = await createImageBitmap(blob);
                if (!map.hasImage(imageId)) {
                    map.addImage(imageId, image);
                }
            } else {
                console.error(`無法載入圖示: ${imageUrl}`);
            }
        } catch (error) {
            console.error(`載入圖示時發生錯誤: ${imageUrl}`, error);
        }
    }

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

    const windResponse = await fetch(`https://api.exptech.dev/api/v1/meteor/weather/${latestTime}`);
    const windData = await windResponse.json();
    weatherCache.set(latestTime, windData);

    const windFeatures = windData
        .map(station => {
            const direction = station.data.wind.direction;
            const speed = station.data.wind.speed;

            if (direction === -99 || speed === -99) return null;

            return {
                type: 'Feature',
                properties: {
                    id: station.id,
                    name: station.station.name,
                    direction: (direction + 180) % 360, // 調整方向以符合地圖顯示
                    speed: speed,
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

    map.addSource('wind-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: windFeatures
        }
    });

    // 添加風速為0的圓圈圖層
    map.addLayer({
        id: 'wind-circles',
        type: 'circle',
        source: 'wind-data',
        layout: {
            'visibility': 'none'
        },
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 3,
                10, 6
            ],
            'circle-color': '#808080',
            'circle-stroke-width': 0.8,
            'circle-stroke-color': '#FFFFFF'
        },
        filter: ['==', ['get', 'speed'], 0],
        minzoom: 10
    });

    // 添加風速為0的標籤圖層
    map.addLayer({
        id: 'wind-speed-0-labels',
        type: 'symbol',
        source: 'wind-data',
        layout: {
            'visibility': 'none',
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['get', 'speed'],
                ' (m/s)'
            ],
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 2]
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2
        },
        filter: ['==', ['get', 'speed'], 0],
        minzoom: 10
    });

    // 添加風速箭頭圖層
    map.addLayer({
        id: 'wind-arrows',
        type: 'symbol',
        source: 'wind-data',
        layout: {
            'visibility': 'none',
            'icon-image': [
                'step',
                ['get', 'speed'],
                'wind-1',
                3.4, 'wind-2',
                8, 'wind-3',
                13.9, 'wind-4',
                32.7, 'wind-5'
            ],
            'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 0.2,
                10, 0.6
            ],
            'icon-rotate': ['get', 'direction'],
            'icon-allow-overlap': true,
            'text-allow-overlap': true
        },
        filter: ['!=', ['get', 'speed'], 0]
    });

    // 添加風速標籤圖層
    map.addLayer({
        id: 'wind-speed-labels',
        type: 'symbol',
        source: 'wind-data',
        layout: {
            'visibility': 'none',
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['get', 'speed'],
                ' (m/s)'
            ],
            'text-size': 12,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 2]
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2
        },
        filter: ['!=', ['get', 'speed'], 0],
        minzoom: 8.5
    });

    const showWindChart = async (e) => {
        const stationId = e.features[0].properties.id;
        const stationName = e.features[0].properties.name;

        // Reset loading flags
        shouldStopLoading = false;
        isLoading = true;

        // Show popup and progress bar
    chartPopup.style.display = 'block';
    setChartTitle(stationName + ' - 風向/風速');
    progressContainer.style.display = 'block';
        tempChartCanvas.style.display = 'none';
        windChartCanvas.style.display = 'none';
        rainChartCanvas.style.display = 'none';
        humidityChartCanvas.style.display = 'none';
        pressureChartCanvas.style.display = 'none';

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

        closeButton.onclick = function() {
            if (isLoading) {
                shouldStopLoading = true;
            }
            chartPopup.style.display = 'none';
            if (window.windChart) {
                window.windChart.destroy();
            }
        }

        window.onclick = function(event) {
            if (event.target == chartPopup) {
                chartPopup.style.display = 'none';
            }
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
            if (stationData && stationData.data.wind.speed !== -99) {
                historyData.push({
                    time: parseInt(time),
                    data: stationData.data
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
        windChartCanvas.style.display = 'block';

        historyData.sort((a, b) => a.time - b.time);

        const labels = historyData.map(d => {
            const date = new Date(d.time);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });
        const windSpeeds = historyData.map(d => d.data.wind.speed);

        const textColor = '#f1f1f1';
        const gridColor = 'rgba(255, 255, 255, 0.1)';

        window.windChart = new Chart(windChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '風速',
                    data: windSpeeds,
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
                        text: `測站 ${stationName} 過去風速變化`,
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
                            text: '風速 (m/s)',
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

    map.on('click', 'wind-arrows', showWindChart);
    map.on('click', 'wind-circles', showWindChart);
});