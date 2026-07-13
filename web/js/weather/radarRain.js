function parseYYYYMMDDHHMMSS(s) {
    if (!s || s.length < 12) return null;
    const year = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day = s.substring(6, 8);
    const hour = s.substring(8, 10);
    const minute = s.substring(10, 12);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
}

// 安全的 fetch JSON，處理 404 / HTML 回應
async function fetchRainListJson() {
    try {
        const response = await fetch('https://api-1.exptech.dev/api/v1/tiles/rain/list');
        if (!response.ok) {
            console.warn('降雨雷達圖元清單 404 (API 可能尚未部署)');
            return [[], [], []];
        }
        const text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.warn('降雨雷達圖元清單讀取失敗:', e);
        return [[], [], []];
    }
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
        let timeList = [[], [], []];
        try {
            const response = await fetch('https://api-1.exptech.dev/api/v1/tiles/rain/list');
            if (response.ok) {
                timeList = await response.json();
            }
        } catch (e) {
            console.warn('updateTime 讀取失敗:', e);
        }

        for (let i = 0; i < 3; i++) {
            let targetTime = timeList[i][0] || '';

            if (timeStr) {
                const target = timeStr.replace(/-/g, '/');
                const inputDate = new Date(target);
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

    let timeList = [[], [], []];
    try {
        const response = await fetch('https://api-1.exptech.dev/api/v1/tiles/rain/list');
        if (response.ok) {
            timeList = await response.json();
        }
    } catch (e) {
        console.warn('降雨雷達播放讀取失敗:', e);
    }

    const rangeSel = document.getElementById('radar-range-sel');
    let range = 24;
    if (rangeSel) range = parseInt(rangeSel.value, 10);
    let playList = timeList.slice(-range);
    if (range >= 9999) playList = timeList;
    if (playList.length === 0) {
        console.warn('降雨雷達播放：時間列表為空');
        stopRadarRainPlay();
        return;
    }

    let idx = 0;
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay && timeDisplay.textContent) {
        const match = timeDisplay.textContent.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
        if (match) {
            const val = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
            const latest = playList[playList.length - 1];
            const latestDate = parseYYYYMMDDHHMMSS(latest);
            if (latestDate) {
                const latestStr = `${latestDate.getFullYear()}-${String(latestDate.getMonth()+1).padStart(2,'0')}-${String(latestDate.getDate()).padStart(2,'0')} ${String(latestDate.getHours()).padStart(2,'0')}:${String(latestDate.getMinutes()).padStart(2,'0')}`;
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

    const speedSel = document.getElementById('radar-speed-sel');
    let speed = 600;
    if (speedSel) speed = parseInt(speedSel.value, 10);
    radarRainPlayTimer = setInterval(() => {
        if (!isRadarRainPlaying) return;
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
    let timeList = [[], [], []];
    try {
        const response = await fetch('https://api-1.exptech.dev/api/v1/tiles/rain/list');
        if (response.ok) {
            timeList = await response.json();
        }
    } catch (e) {
        console.warn('降雨雷達圖元清單讀取失敗:', e);
    }

    for (let i = 0; i < 3; i++) {
        const latestTime = timeList[i][0] || '';

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
            const errMsg = e.error ? (typeof e.error === 'object' ? e.error.message : e.error) : String(e);
            if (errMsg.includes('InvalidState') || errMsg.includes('decode')) {
                console.warn(`降雨雷達${i}圖元解碼錯誤 (可安全忽略):`, errMsg);
            } else {
                console.error(`降雨雷達${i}圖層載入錯誤:`, errMsg);
            }
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
