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
                            stationName: station.station.name,
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
                    stationName: station.station.name,
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
            'text-field': ['get', 'humidity'],
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

    map.on('click', 'humidity-circles', (e) => {
        const stationId = e.features[0].properties.id;
        // 這裡可以添加點擊事件處理，例如顯示詳細信息
        console.log('Selected station:', stationId);
    });
}); 