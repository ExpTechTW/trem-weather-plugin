// temperatureLowLayer: mirror temperature.js but use daily.low.temperature
window.temperatureLowLayer = {
    show: function() {
        if (map.getLayer('temperatureLow-circles')) {
            map.setLayoutProperty('temperatureLow-circles', 'visibility', 'visible');
        }
        if (map.getLayer('temperatureLow-labels')) {
            map.setLayoutProperty('temperatureLow-labels', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('temperatureLow-circles')) {
            map.setLayoutProperty('temperatureLow-circles', 'visibility', 'none');
        }
        if (map.getLayer('temperatureLow-labels')) {
            map.setLayoutProperty('temperatureLow-labels', 'visibility', 'none');
        }
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
