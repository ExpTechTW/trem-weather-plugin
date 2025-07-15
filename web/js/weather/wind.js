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
                        direction: (direction + 180) % 360, // 調整方向以符合地圖顯示
                        speed: speed,
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

    const windFeatures = windData
        .map(station => {
            const direction = station.data.wind.direction;
            const speed = station.data.wind.speed;
            
            if (direction === -99 || speed === -99) return null;

            return {
                type: 'Feature',
                properties: {
                    id: station.id,
                    direction: (direction + 180) % 360, // 調整方向以符合地圖顯示
                    speed: speed,
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
            'text-field': ['get', 'speed'],
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
            'text-field': ['get', 'speed'],
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

    map.on('click', 'wind-arrows', (e) => {
        const stationId = e.features[0].properties.id;
        // 這裡可以添加點擊事件處理，例如顯示詳細信息
        console.log('Selected station:', stationId);
    });
}); 