function parseYYYYMMDDHHMMSS(s) {
    if (!s || s.length < 12) return null;
    const year = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day = s.substring(6, 8);
    const hour = s.substring(8, 10);
    const minute = s.substring(10, 12);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
}
// 創建降雨雷達圖層控制器
window.radarRainLayer = {
    show: function() {
        this.showLayer(0);
    },
    hide: function() {
        for (let i = 0; i < 3; i++) {
            if (map.getLayer(`radarRainLayer${i}`)) {
                map.setLayoutProperty(`radarRainLayer${i}`, 'visibility', 'none');
            }
        }
    },
    showLayer: function(layerIndex) {
        for (let i = 0; i < 3; i++) {
            if (map.getLayer(`radarRainLayer${i}`)) {
                const visibility = i === layerIndex ? 'visible' : 'none';
                map.setLayoutProperty(`radarRainLayer${i}`, 'visibility', visibility);
            }
        }
    },
    showAll: function() {
        for (let i = 0; i < 3; i++) {
            if (map.getLayer(`radarRainLayer${i}`)) {
                map.setLayoutProperty(`radarRainLayer${i}`, 'visibility', 'visible');
            }
        }
    },
    updateTime: async function(timeStr = undefined) {
        // timeStr: yyyy-mm-dd hh:mm，若未傳則用最新
        const response = await fetch('https://api.exptech.dev/api/v1/tiles/rain/list');
        const timeList = await response.json();
        for (let i = 0; i < 3; i++) {
            let targetTime = timeList[i][0];

            if (timeStr) {
                // 轉成 timestamp 字串（毫秒）
                // timeList 內容為 timestamp 字串，需比對 yyyy-mm-dd hh:mm
                const target = timeStr.replace(/-/g, '/'); // Safari 相容
                const inputDate = new Date(target);
                // 找最接近的時間
                let minDiff = Infinity;
                for (const t of timeList) {
                    const d = parseYYYYMMDDHHMMSS(t);
                    if (!d) continue;
                    const diff = Math.abs(d.getTime() - inputDate.getTime());
                    if (diff < minDiff) {
                        minDiff = diff;
                        targetTime = t;
                    }
                }
            }

            const timeDisplay = document.getElementById('time-display');
            const date = parseYYYYMMDDHHMMSS(targetTime);
            if (date) {
                timeDisplay.textContent = date.getFullYear() + '-' +
                    String(date.getMonth() + 1).padStart(2, '0') + '-' +
                    String(date.getDate()).padStart(2, '0') + ' ' +
                    String(date.getHours()).padStart(2, '0') + ':' +
                    String(date.getMinutes()).padStart(2, '0');
            }

            const source = map.getSource(`radarRainTiles${i}`);
            if (source) {
                source.setTiles([
                    `https://api-1.exptech.dev/api/v1/tiles/rain/${i}/${targetTime}/{z}/{x}/{y}.png`
                ]);
            }
        }
    }
};

let radarRainOpacity = 1;
let radarRainIsOn = true;

// 播放功能
let radarRainPlayTimer = null;
let isRadarRainPlaying = false;

function createRadarRainPlayButton() {
    // 將控制元件掛到 #radar-play-controls
    const controls = document.getElementById('radar-play-controls');
    let btn = document.getElementById('radar-play-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'radar-play-btn';
        btn.style.background = '#232323';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '6px';
        btn.style.padding = '4px 16px';
        btn.style.fontSize = '1rem';
        btn.style.cursor = 'pointer';
        btn.style.height = '28px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.textContent = '▶';
        controls && controls.appendChild(btn);
    }
    btn.onclick = async function() {
        if (isRadarRainPlaying) {
            stopRadarRainPlay();
        } else {
            startRadarRainPlay();
        }
    };

    let speedSel = document.getElementById('radar-speed-sel');
    if (!speedSel) {
        speedSel = document.createElement('select');
        speedSel.id = 'radar-speed-sel';
        speedSel.style.background = '#232323';
        speedSel.style.color = '#fff';
        speedSel.style.border = '1px solid #444';
        speedSel.style.borderRadius = '6px';
        speedSel.style.fontSize = '1rem';
        speedSel.style.padding = '2px 8px';
        speedSel.style.height = '28px';
        [
            {v:600, t:'快'},
            {v:1000, t:'中'},
            {v:1800, t:'慢'}
        ].forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.v;
            o.textContent = opt.t;
            speedSel.appendChild(o);
        });
        controls && controls.appendChild(speedSel);
    }

    let rangeSel = document.getElementById('radar-range-sel');
    if (!rangeSel) {
        rangeSel = document.createElement('select');
        rangeSel.id = 'radar-range-sel';
        rangeSel.style.background = '#232323';
        rangeSel.style.color = '#fff';
        rangeSel.style.border = '1px solid #444';
        rangeSel.style.borderRadius = '6px';
        rangeSel.style.fontSize = '1rem';
        rangeSel.style.padding = '2px 8px';
        rangeSel.style.height = '28px';
        [
            {v:6, t:'1小時'},
            {v:12, t:'2小時'},
            {v:24, t:'4小時'},
            {v:36, t:'6小時'},
            {v:48, t:'8小時'},
            {v:72, t:'12小時'},
            {v:120, t:'20小時'},
            {v:9999, t:'全部'}
        ].forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.v;
            o.textContent = opt.t;
            rangeSel.appendChild(o);
        });
        controls && controls.appendChild(rangeSel);
    }
}

function createRadarRainButtons() {
    const container = document.createElement('div');
    container.id = 'radar-rain-controls';
    container.style.position = 'absolute';
    container.style.top = '120px';
    container.style.right = '10px';
    container.style.display = 'none';
    container.style.flexDirection = 'column';
    container.style.zIndex = '1';

    const buttonData = [
        { name: '樹林', layer: 0 },
        { name: '南屯', layer: 1 },
        { name: '林園', layer: 2 },
        { name: '全部', layer: 'all' }
    ];

    const buttons = [];

    buttonData.forEach(btnInfo => {
        const button = document.createElement('button');
        button.textContent = btnInfo.name;
        button.style.background = '#232323';
        button.style.color = '#fff';
        button.style.border = '1px solid #444';
        button.style.borderRadius = '6px';
        button.style.padding = '4px 16px';
        button.style.fontSize = '1rem';
        button.style.cursor = 'pointer';
        button.style.marginTop = '5px';

        if (btnInfo.layer === 0) {
            button.style.background = '#3a3b40';
        }

        button.onclick = () => {
            // Reset background for all buttons
            buttons.forEach(btn => btn.style.background = '#232323');
            button.style.background = '#3a3b40';

            if (btnInfo.layer === 'all') {
                window.radarRainLayer.showAll();
            } else {
                window.radarRainLayer.showLayer(btnInfo.layer);
            }
        };
        buttons.push(button);
        container.appendChild(button);
    });

    document.body.appendChild(container);
}

// 播放降雨雷達動畫，支援自訂速度與區間
async function startRadarRainPlay() {
    if (isRadarRainPlaying) return;
    isRadarRainPlaying = true;
    const btn = document.getElementById('radar-play-btn');
    btn.textContent = '⏸';
    btn.style.background = '#3a3b40';
    const response = await fetch('https://api.exptech.dev/api/v1/tiles/rain/list');
    const timeList = await response.json();
    // 取得區間
    const rangeSel = document.getElementById('radar-range-sel');
    let range = 24;
    if (rangeSel) range = parseInt(rangeSel.value, 10);
    let playList = timeList.slice(-range);
    if (range >= 9999) playList = timeList;
    let idx = 0;
    // 若目前 time-display 有值，從該時間開始，若是最新則從頭開始
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay && timeDisplay.textContent) {
        const match = timeDisplay.textContent.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
        if (match) {
            const val = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
            // 最新時間字串
            const latest = playList[playList.length - 1];
            const latestDate = parseYYYYMMDDHHMMSS(latest);
            if (latestDate) {
                const latestStr = `${latestDate.getFullYear()}-${String(latestDate.getMonth()+1).padStart(2,'0')}-${String(latestDate.getDate()).padStart(2,'0')} ${String(latestDate.getHours()).padStart(2,'0')}:${String(latestDate.getMinutes()).padStart(2,'0')}`;
                // 若 val 接近 latestStr 且區間小於 range，從倒數 range 開始（1小時內）
                if (val === latestStr || Math.abs(new Date(val).getTime() - latestDate.getTime()) < 3600000) {
                    if (playList.length > range) {
                        idx = (playList.length - 1) - range;
                    } else {
                        idx = 0;
                    }
                } else {
                    for (let i = 0; i < playList.length; i++) {
                        const d = parseYYYYMMDDHHMMSS(playList[i]);
                        if (!d) continue;
                        const tstr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                        if (tstr === val) {
                            idx = i;
                            break;
                        }
                    }
                }
            }
        }
    }
    // 取得速度
    const speedSel = document.getElementById('radar-speed-sel');
    let speed = 600;
    if (speedSel) speed = parseInt(speedSel.value, 10);
    radarRainPlayTimer = setInterval(() => {
        if (!isRadarRainPlaying) return;
        // 將 playList[idx] 轉為 yyyy-mm-dd hh:mm
        const t = playList[idx];
        const d = parseYYYYMMDDHHMMSS(t);
        if (d) {
            const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            window.radarRainLayer.updateTime && window.radarRainLayer.updateTime(timeStr);
        }
        idx = (idx + 1) % playList.length;
    }, speed);
}

function stopRadarRainPlay() {
    isRadarRainPlaying = false;
    const btn = document.getElementById('radar-play-btn');
    btn.textContent = '▶';
    btn.style.background = '#232323';
    if (radarRainPlayTimer) {
        clearInterval(radarRainPlayTimer);
        radarRainPlayTimer = null;
    }
}

// createRadarRainPlayButton();
createRadarRainButtons();

map.on('load', async function () {
    const response = await fetch('https://api.exptech.dev/api/v1/tiles/rain/list');
    const timeList = await response.json();
    for (let i = 0; i < 3; i++) {
        const latestTime = timeList[i][0];

        const timeDisplay = document.getElementById('time-display');
        const date = parseYYYYMMDDHHMMSS(latestTime);
        if (date) {
            timeDisplay.textContent = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0');
        }

        map.addSource(`radarRainTiles${i}`, {
            'type': 'raster',
            'tiles': [
                `https://api-1.exptech.dev/api/v1/tiles/rain/${i}/${latestTime}/{z}/{x}/{y}.png`
            ],
            'tileSize': 256
        }).on('error', function(e) {
            console.error(`降雨雷達${i}圖層載入錯誤:`, e.error);
        });

        map.addLayer({
            'id': `radarRainLayer${i}`,
            'type': 'raster',
            'source': `radarRainTiles${i}`,
            'layout': {
                'visibility': 'none'
            },
            'paint': {
                'raster-opacity': 1
            }
        }, 'county-outline');
    }

    setInterval(() => {
        if (radarRainIsOn) {
            for (let i = 0; i < 3; i++) {
                map.setPaintProperty(`radarRainLayer${i}`, 'raster-opacity', radarRainOpacity);
            }
            radarRainOpacity = 0;
            radarRainIsOn = false;
            setTimeout(() => {
                radarRainOpacity = 1;
                radarRainIsOn = true;
            }, 500);
        }
    }, 3500);
});