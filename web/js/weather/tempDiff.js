// temperatureDiffHighLayer: difference between daily high and low
function updateTempDiffLegend(features) {
    let container = document.getElementById('temp-diff-legend-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'temp-diff-legend-container';
        container.style.cssText = 'position: absolute; bottom: 60px; right: 30px; left: 30px; background: rgba(0, 0, 0, 0.8); color: white; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto; width: 220px; z-index: 1000; display: none; font-size: 12px; font-family: "Noto Sans Regular", sans-serif; box-shadow: 0 0 10px rgba(0,0,0,0.5);';

        // Add custom scrollbar styles
        const style = document.createElement('style');
        style.textContent = `
            #temp-diff-legend-container::-webkit-scrollbar {
                width: 6px;
            }
            #temp-diff-legend-container::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
            }
            #temp-diff-legend-container::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
            #temp-diff-legend-container::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        `;
        container.appendChild(style);

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; cursor: pointer; border-bottom: 1px solid #666; padding-bottom: 5px;';
        header.innerHTML = '<span style="font-weight: bold; font-size: 14px;">溫差統計 & 圖例</span><span id="temp-diff-toggle-icon" style="font-size: 12px;">▼</span>';
        header.onclick = function () {
            const content = document.getElementById('temp-diff-content');
            const icon = document.getElementById('temp-diff-toggle-icon');
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
        content.id = 'temp-diff-content';
        container.appendChild(content);

        document.body.appendChild(container);
    }

    const content = document.getElementById('temp-diff-content');

    // Legend
    let html = '<div style="margin-bottom: 15px; margin-top: 5px;">';
    html += '<div style="margin-bottom: 5px; font-weight: bold;">圖例 (°C)</div>';
    html += '<div style="background: linear-gradient(to right, #ffffff 0%, #f6e78b 33%, #FF4500 66%, #8B0000 100%); height: 12px; border-radius: 6px; border: 1px solid #555;"></div>';
    html += '<div style="display: flex; justify-content: space-between; margin-top: 4px; color: #ddd; font-size: 11px;">';
    html += '<span>0</span><span>5</span><span>10</span><span>15+</span>';
    html += '</div></div>';

    // Ranking
    const sorted = [...features]
        .sort((a, b) => b.properties.tempDiff - a.properties.tempDiff)
        .slice(0, 20);

    html += '<div style="margin-bottom: 5px; font-weight: bold;">最大溫差排行 (Top 20)</div>';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
    sorted.forEach((f, i) => {
        const p = f.properties;
        const coords = f.geometry.coordinates;
        const rankColor = i < 3 ? '#ffeb3b' : '#fff';
        const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
        html += `<tr style="background: ${rowBg}; cursor: pointer;" onclick="map.flyTo({center: [${coords[0]}, ${coords[1]}], zoom: 12});">
            <td style="padding: 3px 5px; color: ${rankColor}; width: 25px; text-align: center;">${i + 1}</td>
            <td style="padding: 3px 5px;">${p.name}</td>
            <td style="padding: 3px 5px; text-align: right; font-family: monospace;">${p.tempDiff.toFixed(1)}</td>
        </tr>`;
    });
    html += '</table>';

    content.innerHTML = html;
}

window.temperatureDiffHighLayer = {
    show: function () {
        if (map.getLayer('tempDiffHigh-circles')) {
            map.setLayoutProperty('tempDiffHigh-circles', 'visibility', 'visible');
        }
        if (map.getLayer('tempDiffHigh-labels')) {
            map.setLayoutProperty('tempDiffHigh-labels', 'visibility', 'visible');
        }
        const container = document.getElementById('temp-diff-legend-container');
        if (container) container.style.display = 'block';
    },
    hide: function () {
        if (map.getLayer('tempDiffHigh-circles')) {
            map.setLayoutProperty('tempDiffHigh-circles', 'visibility', 'none');
        }
        if (map.getLayer('tempDiffHigh-labels')) {
            map.setLayoutProperty('tempDiffHigh-labels', 'visibility', 'none');
        }
        const container = document.getElementById('temp-diff-legend-container');
        if (container) container.style.display = 'none';
    },
    updateTime: async function (timeStr = undefined) {
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

        const tempDiffData = weatherData
            .filter(station =>
                station.daily &&
                station.daily.high && station.daily.high.temperature !== -99 &&
                station.daily.low && station.daily.low.temperature !== -99
            )
            .map(station => {
                const diff = parseFloat((station.daily.high.temperature - station.daily.low.temperature).toFixed(1));
                return {
                    type: 'Feature',
                    properties: {
                        id: station.id,
                        name: station.station.name,
                        tempDiff: diff
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [station.station.lng, station.station.lat]
                    }
                };
            });

        if (map.getSource('tempDiffHigh-data')) {
            map.getSource('tempDiffHigh-data').setData({
                type: 'FeatureCollection',
                features: tempDiffData
            });
        }
        updateTempDiffLegend(tempDiffData);
    }
};

map.on('load', async function () {
    try {
        const listResponse = await fetch('https://api-1.exptech.dev/api/v2/meteor/weather/list');
        const timeList = await listResponse.json();
        const latestTime = timeList[timeList.length - 1];

        const weatherResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/weather/${latestTime}`);
        const weatherData = await weatherResponse.json();

        const tempDiffData = weatherData
            .filter(station =>
                station.daily &&
                station.daily.high && station.daily.high.temperature !== -99 &&
                station.daily.low && station.daily.low.temperature !== -99
            )
            .map(station => {
                const diff = parseFloat((station.daily.high.temperature - station.daily.low.temperature).toFixed(1));
                return {
                    type: 'Feature',
                    properties: {
                        id: station.id,
                        name: station.station.name,
                        tempDiff: diff
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [station.station.lng, station.station.lat]
                    }
                };
            });

        map.addSource('tempDiffHigh-data', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: tempDiffData
            }
        });

        updateTempDiffLegend(tempDiffData);

        map.addLayer({
            id: 'tempDiffHigh-circles',
            type: 'circle',
            source: 'tempDiffHigh-data',
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
                    ['get', 'tempDiff'],
                    0, '#ffffff',
                    5, '#f6e78b',
                    10, '#FF4500',
                    15, '#8B0000'
                ],
                'circle-opacity': 0.7,
                'circle-stroke-width': 0.2,
                'circle-stroke-color': '#000000',
                'circle-stroke-opacity': 0.7
            }
        });

        map.addLayer({
            id: 'tempDiffHigh-labels',
            type: 'symbol',
            source: 'tempDiffHigh-data',
            minzoom: 8.5,
            layout: {
                'visibility': 'none',
                'text-field': ['format',
                    ['get', 'name'],
                    '\n',
                    ['number-format', ['get', 'tempDiff'], { 'max-fraction-digits': 1 }],
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
    } catch (e) {
        console.warn('temperatureDiffHighLayer init failed', e);
    }
});