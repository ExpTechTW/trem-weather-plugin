// updatePressureLegend: pressure statistics & legend
function updatePressureLegend(features) {
    let container = document.getElementById('pressure-legend-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pressure-legend-container';
        container.className = 'legend-container';

        const header = document.createElement('div');
        header.className = 'legend-header';

        const title = document.createElement('span');
        title.className = 'legend-title';
        title.textContent = '氣壓統計 & 圖例';

        const icon = document.createElement('span');
        icon.id = 'pressure-toggle-icon';
        icon.className = 'legend-toggle-icon';
        icon.textContent = '▼';

        header.appendChild(title);
        header.appendChild(icon);
        header.onclick = function () {
            const content = document.getElementById('pressure-content');
            const icon = document.getElementById('pressure-toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▲';
            }
        };
        container.appendChild(header);

        const content = document.createElement('div');
        content.id = 'pressure-content';
        container.appendChild(content);

        document.body.appendChild(container);
    }

    const content = document.getElementById('pressure-content');
    content.features = features;
    if (!content.sortOrder) content.sortOrder = 'desc';
    renderPressureLegend();
}

function renderPressureLegend() {
    const content = document.getElementById('pressure-content');
    if (!content || !content.features) return;
    const features = content.features;
    const isDesc = content.sortOrder === 'desc';

    // Legend
    let html = '<div style="margin-bottom: 15px; margin-top: 5px;">';
    html += '<div style="margin-bottom: 5px; font-weight: bold;">圖例 (hPa)</div>';
    html += '<div style="background: linear-gradient(to right, #77bfcc 0%, #82cb75 42%, #f7e78a 85%, #ffffff 100%); height: 12px; border-radius: 6px; border: 1px solid #555;"></div>';
    html += '<div style="display: flex; justify-content: space-between; margin-top: 4px; color: #ddd; font-size: 11px;">';
    html += '<span>725</span><span>850</span><span>975</span><span>1020+</span>';
    html += '</div></div>';

    // Ranking
    const sorted = [...features]
        .sort((a, b) => isDesc ? b.properties.pressure - a.properties.pressure : a.properties.pressure - b.properties.pressure)
        .slice(0, 20);

    const sortIcon = isDesc ? '▼' : '▲';
    html += `<div style="margin-bottom: 5px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span>氣壓排行 (Top 20)</span>
        <span style="cursor: pointer; padding: 0 5px;" onclick="togglePressureSort()">${sortIcon}</span>
    </div>`;
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
    sorted.forEach((f, i) => {
        const p = f.properties;
        const coords = f.geometry.coordinates;
        const rankColor = i < 3 ? '#ffeb3b' : '#fff';
        const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
        html += `<tr style="background: ${rowBg}; cursor: pointer;" onclick="map.flyTo({center: [${coords[0]}, ${coords[1]}], zoom: 12});">
            <td style="padding: 3px 5px; color: ${rankColor}; width: 25px; text-align: center;">${i + 1}</td>
            <td style="padding: 3px 5px;">${p.name}</td>
            <td style="padding: 3px 5px; text-align: right; font-family: monospace;">${p.pressure.toFixed(1)}</td>
        </tr>`;
    });
    html += '</table>';

    content.innerHTML = html;
}

window.togglePressureSort = function() {
    const content = document.getElementById('pressure-content');
    if (content) {
        content.sortOrder = content.sortOrder === 'desc' ? 'asc' : 'desc';
        renderPressureLegend();
    }
};

// 創建氣壓圖層控制器
window.pressureLayer = {
    show: function() {
        if (map.getLayer('pressure-circles')) {
            map.setLayoutProperty('pressure-circles', 'visibility', 'visible');
        }
        if (map.getLayer('pressure-labels')) {
            map.setLayoutProperty('pressure-labels', 'visibility', 'visible');
        }
        const container = document.getElementById('pressure-legend-container');
        if (container) container.style.display = 'block';
    },
    hide: function() {
        if (map.getLayer('pressure-circles')) {
            map.setLayoutProperty('pressure-circles', 'visibility', 'none');
        }
        if (map.getLayer('pressure-labels')) {
            map.setLayoutProperty('pressure-labels', 'visibility', 'none');
        }
        const container = document.getElementById('pressure-legend-container');
        if (container) container.style.display = 'none';
    },
    updateTime: async function(timeStr = undefined) {
        // 獲取時間列表
        const timeListResponse = await fetch('https://api-1.exptech.dev/api/v2/meteor/weather/list');
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
            const pressureResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/weather/${targetTime}`);
            if (!pressureResponse.ok) {
                throw new Error(`HTTP error! status: ${pressureResponse.status}`);
            }
            const pressureData = await pressureResponse.json();

            const pressureFeatures = pressureData
                .map(station => {
                    const pressure = station.data.air.pressure;
                    if (pressure === -99) return null;

                    return {
                        type: 'Feature',
                        properties: {
                            id: station.id,
                            pressure: pressure,
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

            map.getSource('pressure-data').setData({
                type: 'FeatureCollection',
                features: pressureFeatures
            });
            updatePressureLegend(pressureFeatures);
        } catch (error) {
            console.error('氣壓資料載入失敗:', error);
        }
    }

};

const showPressureChart = async (e) => {
    const stationId = e.features[0].properties.id;
    const stationName = e.features[0].properties.name;

    window.initchartPopup();
    chartPopup.dataset.stationId = stationId;
    chartPopup.dataset.stationName = stationName;
    setChartTitle(stationName + ' - 氣壓');
    chartTypeSelect.value = 'pressure';

    closeButton.onclick = function() {
        if (isLoading) {
            shouldStopLoading = true;
        }
        chartPopup.style.display = 'none';
        if (window.pressureChart) {
            window.pressureChart.destroy();
        }
    }

    window.onclick = function(event) {
        if (event.target == chartPopup) {
            chartPopup.style.display = 'none';
        }
    }

    const listResponse = await fetch('https://api-1.exptech.dev/api/v2/meteor/weather/list');
    const timeList = await listResponse.json();
    const filteredTimeList = window.filterTimeListByDuration ? window.filterTimeListByDuration(timeList) : timeList;

    const historyData = [];
    let loadedCount = 0;

    for (const time of filteredTimeList) {
        let weatherData;
        if (weatherCache.has(time)) {
            weatherData = weatherCache.get(time);
        } else {
            const weatherResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/weather/${time}`);
            weatherData = await weatherResponse.json();
            weatherCache.set(time, weatherData);
        }

        const stationData = weatherData.find(s => s.id === stationId);
        if (stationData && stationData.data.air.pressure !== -99) {
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

    // 隱藏進度並顯示壓力圖
    progressContainer.style.display = 'none';
    tempChartCanvas.style.display = 'none';
    windChartCanvas.style.display = 'none';
    rainChartCanvas.style.display = 'none';
    humidityChartCanvas.style.display = 'none';
    pressureChartCanvas.style.display = 'block';
    allChartCanvas.style.display = 'none';

    historyData.sort((a, b) => a.time - b.time);

    const labels = historyData.map(d => {
        const date = new Date(d.time);
        // return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    const pressures = historyData.map(d => d.data.air.pressure);

    const textColor = '#f1f1f1';
    const gridColor = 'rgba(255, 255, 255, 0.1)';

    window.pressureChart = new Chart(pressureChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '氣壓',
                data: pressures,
                borderColor: 'rgba(54,162,235,1)',
                backgroundColor: 'rgba(54,162,235,0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `測站 ${stationName} 過去氣壓變化`,
                    color: textColor,
                    font: { size: 18 }
                },
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: '時間', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    display: true,
                    title: { display: true, text: '氣壓 (hPa)', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
};
window.showPressureChart = showPressureChart;

map.on('load', async function() {
    const response = await fetch('https://api-1.exptech.dev/api/v2/meteor/weather/list');
    const timeList = await response.json();
    const latestTime = timeList[timeList.length - 1];

    const timeDisplay = document.getElementById('time-display');
    const date = new Date(parseInt(latestTime));
    timeDisplay.textContent = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');

    const pressureResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/weather/${latestTime}`);
    const pressureData = await pressureResponse.json();

    const pressureFeatures = pressureData
        .map(station => {
            const pressure = station.data.air.pressure;
            if (pressure === -99) return null;

            return {
                type: 'Feature',
                properties: {
                    id: station.id,
                    pressure: pressure,
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

    map.addSource('pressure-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: pressureFeatures
        }
    });

    updatePressureLegend(pressureFeatures);

    // 添加氣壓圓圈圖層
    map.addLayer({
        id: 'pressure-circles',
        type: 'circle',
        source: 'pressure-data',
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
                ['get', 'pressure'],
                725, '#77bfcc',
                850, '#82cb75',
                975, '#f7e78a',
                1020, '#ffffff'
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 0.2,
            'circle-stroke-color': '#000000',
            'circle-stroke-opacity': 0.7
        }
    });

    // 添加氣壓標籤圖層
    map.addLayer({
        id: 'pressure-labels',
        type: 'symbol',
        source: 'pressure-data',
        layout: {
            'visibility': 'none',
            'text-field': ['get', 'pressure'],
            'text-field': ['format',
                ['get', 'name'],
                '\n',
                ['get', 'pressure'],
                ' (hPa)'
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

    map.on('click', 'pressure-circles', showPressureChart);
});