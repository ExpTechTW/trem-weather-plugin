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
    updateTime: async function() {
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

        const temperatureData = weatherData
            .filter(station => station.data.air.temperature !== -99)
            .map(station => ({
                type: 'Feature',
                properties: {
                    id: station.id,
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

updateButton.addEventListener('click', async () => {
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

    const temperatureData = weatherData
        .filter(station => station.data.air.temperature !== -99)
        .map(station => ({
            type: 'Feature',
            properties: {
                id: station.id,
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
});

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

    const temperatureData = weatherData
        .filter(station => station.data.air.temperature !== -99)
        .map(station => ({
            type: 'Feature',
            properties: {
                id: station.id,
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
            'text-field': ['number-format', ['get', 'temperature'], {
                'locale': 'zh-TW',
                'max-fraction-digits': 1
            }],
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

    map.on('click', 'temperature-circles', (e) => {
        const stationId = e.features[0].properties.id;
        // 這裡可以添加點擊事件處理，例如顯示詳細信息
        console.log('Selected station:', stationId);
    });
}); 