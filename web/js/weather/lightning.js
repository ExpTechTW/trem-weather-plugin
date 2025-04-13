// 創建閃電圖層控制器
window.lightningLayer = {
    show: function() {
        if (map.getLayer('lightning-markers')) {
            map.setLayoutProperty('lightning-markers', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('lightning-markers')) {
            map.setLayoutProperty('lightning-markers', 'visibility', 'none');
        }
    },
    updateTime: async function(time) {
        // 獲取時間列表
        const timeListResponse = await fetch('https://api-1.exptech.dev/api/v1/meteor/lightning/list');
        const timeList = await timeListResponse.json();
        
        // 如果沒有提供時間參數，使用最新的時間
        if (!time) {
            time = timeList[timeList.length - 1];
        }
        
        // 更新時間選擇器
        const timeSelector = document.getElementById('time-selector');
        if (timeSelector) {
            timeSelector.innerHTML = ''; // 清空現有選項
            timeList.forEach(t => {
                const option = document.createElement('option');
                option.value = t;
                const date = new Date(parseInt(t));
                option.textContent = date.getFullYear() + '-' + 
                    String(date.getMonth() + 1).padStart(2, '0') + '-' +
                    String(date.getDate()).padStart(2, '0') + ' ' +
                    String(date.getHours()).padStart(2, '0') + ':' +
                    String(date.getMinutes()).padStart(2, '0');
                if (t === time) {
                    option.selected = true;
                }
                timeSelector.appendChild(option);
            });
        }

        const timeDisplay = document.getElementById('time-display');
        const date = new Date(parseInt(time));
        timeDisplay.textContent = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');

        try {
            const lightningResponse = await fetch(`https://api-1.exptech.dev/api/v1/meteor/lightning/${time}`);
            if (!lightningResponse.ok) {
                throw new Error(`HTTP error! status: ${lightningResponse.status}`);
            }
            const lightningData = await lightningResponse.json();

            const lightningFeatures = lightningData
                .map(lightning => {
                    const type = lightning.type;
                    const lightningTime = parseInt(lightning.time);
                    const currentTime = parseInt(time);
                    const timeDiff = currentTime - lightningTime;
                    
                    let level;
                    if (timeDiff < 5 * 60 * 1000) {
                        level = 5;
                    } else if (timeDiff < 10 * 60 * 1000) {
                        level = 10;
                    } else if (timeDiff < 30 * 60 * 1000) {
                        level = 30;
                    } else {
                        level = 60;
                    }

                    const iconName = `lightning-${type}-${level}`;

                    return {
                        type: 'Feature',
                        properties: {
                            iconName: iconName
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [lightning.loc.lng, lightning.loc.lat]
                        }
                    };
                });

            map.getSource('lightning-data').setData({
                type: 'FeatureCollection',
                features: lightningFeatures
            });
        } catch (error) {
            console.error(`載入閃電資料時發生錯誤: ${error.message}`);
        }
    }
};

// 載入閃電圖示
map.on('load', async function() {
    const lightningIcons = [
        'lightning-0-5', 'lightning-0-10', 'lightning-0-30', 'lightning-0-60',
        'lightning-1-5', 'lightning-1-10', 'lightning-1-30', 'lightning-1-60'
    ];
    
    for (const iconName of lightningIcons) {
        const imageUrl = `js/weather/icons/${iconName}.png`;
        try {
            const response = await fetch(imageUrl);
            if (response.ok) {
                const blob = await response.blob();
                const image = await createImageBitmap(blob);
                if (!map.hasImage(iconName)) {
                    map.addImage(iconName, image);
                }
            } else {
                console.error(`無法載入圖示: ${imageUrl}`);
            }
        } catch (error) {
            console.error(`載入圖示時發生錯誤: ${imageUrl}`, error);
        }
    }

    // 獲取最新時間
    const response = await fetch('https://api-1.exptech.dev/api/v1/meteor/lightning/list');
    const timeList = await response.json();
    const latestTime = timeList[timeList.length - 1];

    // 獲取閃電資料
    const lightningResponse = await fetch(`https://api-1.exptech.dev/api/v1/meteor/lightning/${latestTime}`);
    const lightningData = await lightningResponse.json();

    const lightningFeatures = lightningData
        .map(lightning => {
            const type = lightning.type;
            const lightningTime = parseInt(lightning.time);
            const currentTime = parseInt(latestTime);
            const timeDiff = currentTime - lightningTime;
            
            let level;
            if (timeDiff < 5 * 60 * 1000) {
                level = 5;
            } else if (timeDiff < 10 * 60 * 1000) {
                level = 10;
            } else if (timeDiff < 30 * 60 * 1000) {
                level = 30;
            } else {
                level = 60;
            }

            const iconName = `lightning-${type}-${level}`;

            return {
                type: 'Feature',
                properties: {
                    iconName: iconName
                },
                geometry: {
                    type: 'Point',
                    coordinates: [lightning.loc.lng, lightning.loc.lat]
                }
            };
        });

    // 添加資料來源
    map.addSource('lightning-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: lightningFeatures
        }
    });

    // 添加閃電標記圖層
    map.addLayer({
        id: 'lightning-markers',
        type: 'symbol',
        source: 'lightning-data',
        layout: {
            'visibility': 'none',
            'icon-image': ['get', 'iconName'],
            'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 0.2,
                10, 0.7
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
        }
    });

    // 添加時間選擇器事件監聽器
    const timeSelector = document.getElementById('time-selector');
    if (timeSelector) {
        timeSelector.addEventListener('change', function() {
            lightningLayer.updateTime(this.value);
        });
    }

    const timeDisplay = document.getElementById('time-display');
    const date = new Date(parseInt(latestTime));
    timeDisplay.textContent = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');

    // 添加用戶位置標記
    const userLat = parseFloat(localStorage.getItem('user-lat') || '0');
    const userLon = parseFloat(localStorage.getItem('user-lon') || '0');
    
    if (userLat !== 0 && userLon !== 0) {
        map.addSource('user-location', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: [userLon, userLat]
                        }
                    }
                ]
            }
        });

        map.addLayer({
            id: 'user-location-marker',
            type: 'symbol',
            source: 'user-location',
            layout: {
                'icon-image': 'gps',
                'icon-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5, 0.5,
                    10, 1.5
                ],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        // 將地圖中心設置為用戶位置
        map.flyTo({
            center: [userLon, userLat],
            zoom: 8,
            duration: 1000
        });
    }

    // 添加圖例切換按鈕
    const legendToggle = document.getElementById('legend-toggle');
    const legend = document.getElementById('legend');
    
    if (legendToggle && legend) {
        legendToggle.addEventListener('click', function() {
            if (legend.style.display === 'none') {
                legend.style.display = 'block';
                legendToggle.textContent = '隱藏圖例';
            } else {
                legend.style.display = 'none';
                legendToggle.textContent = '顯示圖例';
            }
        });
    }
}); 