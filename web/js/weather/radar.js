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
    updateTime: async function(timeStr = undefined) {
        // timeStr: yyyy-mm-dd hh:mm，若未傳則用最新
        const response = await fetch('https://api.exptech.dev/api/v1/tiles/radar/list');
        const timeList = await response.json();
        let targetTime = timeList[timeList.length - 1];

        if (timeStr) {
            // 轉成 timestamp 字串（毫秒）
            // timeList 內容為 timestamp 字串，需比對 yyyy-mm-dd hh:mm
            const target = timeStr.replace(/-/g, '/'); // Safari 相容
            const inputDate = new Date(target);
            // 找最接近的時間
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

        map.getSource('radarTiles').setTiles([
            `https://api-1.exptech.dev/api/v1/tiles/radar/${targetTime}/{z}/{x}/{y}.png`
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

// 播放功能
let radarPlayTimer = null;
let isRadarPlaying = false;

function createRadarPlayButton() {
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
        if (isRadarPlaying) {
            stopRadarPlay();
        } else {
            startRadarPlay();
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

// 播放雷達動畫，支援自訂速度與區間
async function startRadarPlay() {
    if (isRadarPlaying) return;
    isRadarPlaying = true;
    document.getElementById('radar-play-btn').textContent = '⏸';
    const response = await fetch('https://api.exptech.dev/api/v1/tiles/radar/list');
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
            const latestDate = new Date(parseInt(latest));
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
                    const d = new Date(parseInt(playList[i]));
                    const tstr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    if (tstr === val) {
                        idx = i;
                        break;
                    }
                }
            }
        }
    }
    // 取得速度
    const speedSel = document.getElementById('radar-speed-sel');
    let speed = 600;
    if (speedSel) speed = parseInt(speedSel.value, 10);
    radarPlayTimer = setInterval(() => {
        if (!isRadarPlaying) return;
        // 將 playList[idx] 轉為 yyyy-mm-dd hh:mm
        const t = playList[idx];
        const d = new Date(parseInt(t));
        const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        window.radarLayer.updateTime && window.radarLayer.updateTime(timeStr);
        idx = (idx + 1) % playList.length;
    }, speed);
}

function stopRadarPlay() {
    isRadarPlaying = false;
    document.getElementById('radar-play-btn').textContent = '▶';
    if (radarPlayTimer) {
        clearInterval(radarPlayTimer);
        radarPlayTimer = null;
    }
}

createRadarPlayButton();

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
            'visibility': 'visible'
        },
        'paint': {
            'raster-opacity': 1
        }
    }, 'county-outline');

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