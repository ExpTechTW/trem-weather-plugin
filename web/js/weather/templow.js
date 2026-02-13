// temperatureLowLayer: mirror temperature.js but use daily.low.temperature
function updateTempLowLegend(features) {
    let container = document.getElementById('temp-low-legend-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'temp-low-legend-container';
        container.className = 'legend-container';

        const header = document.createElement('div');
        header.className = 'legend-header';

        const title = document.createElement('span');
        title.className = 'legend-title';
        title.textContent = '最低溫統計 & 圖例';

        const icon = document.createElement('span');
        icon.id = 'temp-low-toggle-icon';
        icon.className = 'legend-toggle-icon';
        icon.textContent = '▼';

        header.appendChild(title);
        header.appendChild(icon);
        header.onclick = function () {
            const content = document.getElementById('temp-low-content');
            const icon = document.getElementById('temp-low-toggle-icon');
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
        content.id = 'temp-low-content';
        container.appendChild(content);

        document.body.appendChild(container);
    }

    const content = document.getElementById('temp-low-content');
    content.features = features;
    if (!content.sortOrder) content.sortOrder = 'asc';
    renderTempLowLegend();
}

function renderTempLowLegend() {
    const content = document.getElementById('temp-low-content');
    if (!content || !content.features) return;
    const features = content.features;
    const isAsc = content.sortOrder === 'asc';

    // Legend
    let html = '<div style="margin-bottom: 15px; margin-top: 5px;">';
    html += '<div style="margin-bottom: 5px; font-weight: bold;">圖例 (°C)</div>';
    html += '<div style="background: linear-gradient(to right, #4d4e51 0%, #0000FF 16%, #6495ED 33%, #95d07e 50%, #f6e78b 66%, #FF4500 83%, #8B0000 100%); height: 12px; border-radius: 6px; border: 1px solid #555;"></div>';
    html += '<div style="display: flex; justify-content: space-between; margin-top: 4px; color: #ddd; font-size: 11px;">';
    html += '<span>-20</span><span>0</span><span>20</span><span>40</span>';
    html += '</div></div>';

    // Ranking
    const sorted = [...features]
        .sort((a, b) => isAsc ? a.properties.temperatureLow - b.properties.temperatureLow : b.properties.temperatureLow - a.properties.temperatureLow)
        .slice(0, 20);

    const sortIcon = isAsc ? '▲' : '▼';
    html += `<div style="margin-bottom: 5px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span>最低溫排行 (Top 20)</span>
        <span style="cursor: pointer; padding: 0 5px;" onclick="toggleTempLowSort()">${sortIcon}</span>
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
            <td style="padding: 3px 5px; text-align: right; font-family: monospace;">${p.temperatureLow.toFixed(1)}</td>
        </tr>`;
    });
    html += '</table>';

    content.innerHTML = html;
}

window.toggleTempLowSort = function() {
    const content = document.getElementById('temp-low-content');
    if (content) {
        content.sortOrder = content.sortOrder === 'asc' ? 'desc' : 'asc';
        renderTempLowLegend();
    }
};

window.temperatureLowLayer = {
    show: function() {
        if (map.getLayer('temperatureLow-circles')) {
            map.setLayoutProperty('temperatureLow-circles', 'visibility', 'visible');
        }
        if (map.getLayer('temperatureLow-labels')) {
            map.setLayoutProperty('temperatureLow-labels', 'visibility', 'visible');
        }
        const container = document.getElementById('temp-low-legend-container');
        if (container) container.style.display = 'block';
    },
    hide: function() {
        if (map.getLayer('temperatureLow-circles')) {
            map.setLayoutProperty('temperatureLow-circles', 'visibility', 'none');
        }
        if (map.getLayer('temperatureLow-labels')) {
            map.setLayoutProperty('temperatureLow-labels', 'visibility', 'none');
        }
        const container = document.getElementById('temp-low-legend-container');
        if (container) container.style.display = 'none';
    },
    updateTime: async function(timeStr = undefined) {
        const response = await fetch('https://api-1.exptech.dev/api/v2/meteor/weather/list');
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
        if (timeDisplay) {
            const date = new Date(parseInt(targetTime));
            timeDisplay.textContent = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0');
        }

        const weatherResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/weather/${targetTime}`);
        const weatherData = await weatherResponse.json();

        const temperatureLowData = weatherData
            .filter(station => station.daily && station.daily.low && station.daily.low.temperature !== -99)
            .map(station => {
                const date = new Date(station.daily.low.time);
                const time = date.toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).replace(/\//g, '-').replace(',', '');

                return {
                    type: 'Feature',
                    properties: {
                        id: station.id,
                        name: station.station.name,
                        temperatureLow: station.daily.low.temperature,
                        time: time
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [station.station.lng, station.station.lat]
                    }
                };
            });

        if (map.getSource('temperatureLow-data')) {
            map.getSource('temperatureLow-data').setData({
                type: 'FeatureCollection',
                features: temperatureLowData
            });
        }
        updateTempLowLegend(temperatureLowData);
    }
};

map.on('load', async function() {
    try {
        const listResponse = await fetch('https://api-1.exptech.dev/api/v2/meteor/weather/list');
        const timeList = await listResponse.json();
        const latestTime = timeList[timeList.length - 1];

        const weatherResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/weather/${latestTime}`);
        const weatherData = await weatherResponse.json();

        const temperatureLowData = weatherData
            .filter(station => station.daily && station.daily.low && station.daily.low.temperature !== -99)
            .map(station => {
                const date = new Date(station.daily.low.time);
                const time = date.toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).replace(/\//g, '-').replace(',', '');

                return {
                    type: 'Feature',
                    properties: {
                        id: station.id,
                        name: station.station.name,
                        temperatureLow: station.daily.low.temperature,
                        time: time
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [station.station.lng, station.station.lat]
                    }
                };
            });

        map.addSource('temperatureLow-data', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: temperatureLowData
            }
        });

        updateTempLowLegend(temperatureLowData);

        map.addLayer({
            id: 'temperatureLow-circles',
            type: 'circle',
            source: 'temperatureLow-data',
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
                    ['get', 'temperatureLow'],
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
            id: 'temperatureLow-labels',
            type: 'symbol',
            source: 'temperatureLow-data',
            minzoom: 8.5,
            layout: {
                'visibility': 'none',
                'text-field': ['format',
                    ['get', 'name'],
                    '\n',
                    ['number-format', ['get', 'temperatureLow'], {'max-fraction-digits': 1}],
                    '°C',
                    '\n',
                    ['get', 'time'],
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
    } catch (e) {
        console.warn('temperatureLowLayer init failed', e);
    }
});
