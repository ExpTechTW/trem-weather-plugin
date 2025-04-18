const resetButton = document.getElementById('reset-position');

// 創建雷達圖層控制器
window.radarLayer = {
    show: function() {
        if (map.getLayer('radarLayer')) {
            map.setLayoutProperty('radarLayer', 'visibility', 'visible');
        }
    },
    hide: function() {
        if (map.getLayer('radarLayer')) {
            map.setLayoutProperty('radarLayer', 'visibility', 'none');
        }
    },
    updateTime: async function() {
        const response = await fetch('https://api.exptech.dev/api/v1/tiles/radar/list');
        const timeList = await response.json();
        const latestTime = timeList[timeList.length - 1];
    
        const timeDisplay = document.getElementById('time-display');
        const date = new Date(parseInt(latestTime));
        timeDisplay.textContent = date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');
        
        map.getSource('radarTiles').setTiles([
            `https://api-1.exptech.dev/api/v1/tiles/radar/${latestTime}/{z}/{x}/{y}.png`
        ]);
    }
};
  
resetButton.addEventListener('click', () => {
    map.jumpTo({
        center: [120.2, 23.6],
        zoom: 6.6
    });
});
  
let opacity = 1;
let isOn = true;
  
map.on('load', async function () {
    const response = await fetch('https://api.exptech.dev/api/v1/tiles/radar/list');
    const timeList = await response.json();
    const latestTime = timeList[timeList.length - 1];
  
    const timeDisplay = document.getElementById('time-display');
    const date = new Date(parseInt(latestTime));
    timeDisplay.textContent = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');
  
    map.addSource('radarTiles', {
        'type': 'raster',
        'tiles': [
            `https://api-1.exptech.dev/api/v1/tiles/radar/${latestTime}/{z}/{x}/{y}.png`
        ],
        'tileSize': 256
    }).on('error', function(e) {
        console.error('雷達圖層載入錯誤:', e.error);
    });
  
    map.addLayer({
        'id': 'radarLayer',
        'type': 'raster',
        'source': 'radarTiles',
        'layout': {
            'visibility': 'visible'  // 預設顯示
        },
        'paint': {
            'raster-opacity': 1
        }
    });
  
    setInterval(() => {
        if (isOn) {
            opacity = 0;
            isOn = false;
            setTimeout(() => {
                opacity = 1;
                isOn = true;
            }, 500);
        }
    }, 3500);
});