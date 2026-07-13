// 創建閃電圖層控制器
// 讓 setTimeList 和 updateTime 共享 timeList
let timeList;

// 設定 lightning 自己的最新時間列表（給 resetTime 用）
let setTimeList;

window.lightningLayer = {
    show: function() {
        if (map.getLayer('lightning-markers')) {
            map.setLayoutProperty('lightning-markers', 'visibility', 'visible');
        }
        const legend = document.getElementById('lightning-legend-container');
        if (legend) legend.style.display = 'block';
    },
    hide: function() {
        if (map.getLayer('lightning-markers')) {
            map.setLayoutProperty('lightning-markers', 'visibility', 'none');
        }
    },
    updateTime: async function(timeStr = undefined) {
        // 獲取時間列表
        const timeListResponse = await fetch('https://api-1.exptech.dev/api/v2/meteor/lightning/list');
        const fetchedList = await timeListResponse.json();

        let time;

        if (timeStr) {
            const target = timeStr.replace(/-/g, '/');
            const inputDate = new Date(target);
            let minDiff = Infinity;
            for (const t of fetchedList) {
                const d = new Date(Number(t));
                const diff = Math.abs(d.getTime() - inputDate.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    time = t;
                }
            }
        } else {
            // 沒有傳入 timeStr 時，優先用已存的 timeList（resetTime 用）
            timeList = fetchedList;
            // lightning/list 最後一個是最新
            time = timeList[timeList.length - 1];
        }

        const timeDisplay = document.getElementById('time-display');
        const date = new Date(Number(time));
        timeDisplay.textContent = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');

        try {
            const lightningResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/lightning/${time}`);
            if (!lightningResponse.ok) {
                throw new Error(`HTTP error! status: ${lightningResponse.status}`);
            }
            const lightningData = await lightningResponse.json();

            // 確保資料有效
            if (!lightningData || !Array.isArray(lightningData) || lightningData.length === 0) {
                console.warn('閃電資料為空');
                return;
            }

            const lightningFeatures = lightningData
                .filter(lightning => 
                    lightning && 
                    lightning.loc && 
                    lightning.time &&
                    (lightning.type === 0 || lightning.type === 1)
                )
                .map(lightning => {
                    const type = parseInt(lightning.type) || 0;
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
                        properties: { iconName: iconName },
                        geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(lightning.loc.lng), parseFloat(lightning.loc.lat)]
                        }
                    };
                });

            if (map.getSource('lightning-data')) {
                map.getSource('lightning-data').setData({
                    type: 'FeatureCollection',
                    features: lightningFeatures
                });
            }
        } catch (error) {
            console.error('閃電資料載入失敗:', error);
        }
    }

};

// 載入閃電圖示
map.on('load', async function() {
    // ── 建立閃電圖例容器 (預設隱藏，打開圖層時顯示) ──
    const legend = document.getElementById('lightning-legend-container');
    if (!legend) {
        const container = document.createElement('div');
        container.id = 'lightning-legend-container';
        container.style.cssText = 'background: #1e1e1e; color: #e0e0e0; border-radius: 8px; padding: 10px 12px; width: 280px; max-height: 400px; overflow-y: auto; position: fixed; bottom: 65px; left: 10px; z-index: 999; display: none;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 6px;';
        header.innerHTML = '<span style="font-weight: bold; font-size: 14px;">⚡ 閃電圖例</span><span id="lightning-legend-toggle" style="font-size: 12px;">▲</span>';
        header.onclick = function () {
            const content = document.getElementById('lightning-legend-content');
            const icon = document.getElementById('lightning-legend-toggle');
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
        content.id = 'lightning-legend-content';
        content.style.cssText = 'overflow: hidden; display: none;';
        container.appendChild(content);

        // 圖例說明文字
        const legendItems = [
            { type: '0', name: '雲間閃電', png: 'lightning-0-5' },
            { type: '1', name: '對地閃電', png: 'lightning-1-5' }
        ];

        for (const item of legendItems) {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px;';
            div.innerHTML = `
                <img src="js/weather/icons/${item.png}.png" style="width: 20px; height: 20px; margin-right: 8px;">
                <span style="font-size: 12px; color: #e0e0e0;">${item.name}</span>
            `;
            content.appendChild(div);
        }

        // 圖例文字說明
        const explanationDiv = document.createElement('div');
        explanationDiv.style.cssText = 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;';
        explanationDiv.innerHTML = `
            <div style="font-size: 11px; color: #aaa; line-height: 1.5;">
                <strong>圖例說明：</strong><br>
                • 0~5min 圖示：閃電發生時間越接近現在<br>
                • 30~60min 圖示：閃電發生時間越早
            </div>
        `;
        content.appendChild(explanationDiv);

        // 時間範圍漸層
        const gradBar = document.createElement('div');
        gradBar.style.cssText = 'background: linear-gradient(to right, #e74c3c 0%, #f1c40f 25%, #2ecc71 50%, #3498db 75%, #2980b9 100%); height: 12px; border-radius: 6px; margin: 8px 0;';
        container.appendChild(gradBar);

        const gradLabels = document.createElement('div');
        gradLabels.style.cssText = 'display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 6px;';
        gradLabels.innerHTML = '<span>0~5min</span><span>5~10min</span><span>10~30min</span><span>30~60min</span>';
        container.appendChild(gradLabels);

        document.body.appendChild(container);
    }

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
    const response = await fetch('https://api-1.exptech.dev/api/v2/meteor/lightning/list');
    const timeList = await response.json();
    const latestTime = timeList[timeList.length - 1];

    // 獲取閃電資料
    const lightningResponse = await fetch(`https://api-1.exptech.dev/api/v2/meteor/lightning/${latestTime}`);
    const lightningData = await lightningResponse.json();

    if (!lightningData || !Array.isArray(lightningData)) {
        console.warn('閃電資料為空，無法建立圖層');
        return;
    }

    // 設定 lightning 自己的 timeList（給 resetTime 和 updateTime 用）
    setTimeList = (list) => { timeList = list; };

            const lightningFeatures = lightningData
                .filter(lightning => 
                    lightning && 
                    lightning.loc && 
                    lightning.time &&
                    (lightning.type === 0 || lightning.type === 1)
                )
                .map(lightning => {
                    const type = parseInt(lightning.type) || 0;
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
                        properties: { iconName: iconName },
                        geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(lightning.loc.lng), parseFloat(lightning.loc.lat)]
                        }
                    };
                });

    // 添加資料來源前先確保所有可能的 icon 都已加載
    const allPossibleIcons = [
        'lightning-0-5', 'lightning-0-10', 'lightning-0-30', 'lightning-0-60',
        'lightning-1-5', 'lightning-1-10', 'lightning-1-30', 'lightning-1-60'
    ];
    for (const iconName of allPossibleIcons) {
        if (!map.hasImage(iconName)) {
            const imageUrl = `js/weather/icons/${iconName}.png`;
            try {
                const response = await fetch(imageUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const image = await createImageBitmap(blob);
                    map.addImage(iconName, image);
                }
            } catch (error) {
                console.error(`Failed to load icon: ${imageUrl}`, error);
            }
        }
    }

    // 添加資料來源
    map.addSource('lightning-data', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: lightningFeatures }
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


    const timeDisplay = document.getElementById('time-display');
    const date = new Date(Number(latestTime));
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

    // 數據加載完成后更新圖層狀態
    setTimeout(() => {
        if (window.layerMenu) {
            window.layerMenu.updateLayers();
        }
    }, 500);

    // 監聽 data-layer="lightning" 的 active 變化，控制圖例顯示/隱藏
    const lightningLegend = document.getElementById('lightning-legend-container');
    const lightningItem = document.querySelector('.layer-item[data-layer="lightning"]');
    if (lightningLegend && lightningItem) {
        const observer = new MutationObserver(() => {
            if (lightningItem.classList.contains('active')) {
                lightningLegend.style.display = 'block';
            } else {
                lightningLegend.style.display = 'none';
            }
        });
        observer.observe(lightningItem, { attributes: true, attributeFilter: ['class'] });
    }
});