/**
 * Rainfall Prediction Layer
 * Fetches prediction data from /api/v2/rainfall/regions
 * Displays circles on map with predicted rainfall amount and timeseries info.
 */

const RAINFALL_API = 'https://es-tnn1.yayacat.us.kg/api/v2/rainfall';
let _rainfallCitySelected = '';

// ── 雨量預測圖層控制器 ──
window.rainfallLayer = {
    show: function () {
        if (map.getLayer('rainfall-circles')) {
            map.setLayoutProperty('rainfall-circles', 'visibility', 'visible');
        }
        if (map.getLayer('rainfall-labels')) {
            map.setLayoutProperty('rainfall-labels', 'visibility', 'visible');
        }
        const legend = document.getElementById('rainfall-legend-container');
        if (legend) legend.style.display = 'block';
        const city = document.querySelector('.rainfall-city-container');
        if (city) city.style.display = 'block';
    },
    hide: function () {
        if (map.getLayer('rainfall-circles')) {
            map.setLayoutProperty('rainfall-circles', 'visibility', 'none');
        }
        if (map.getLayer('rainfall-labels')) {
            map.setLayoutProperty('rainfall-labels', 'visibility', 'none');
        }
        const legend = document.getElementById('rainfall-legend-container');
        if (legend) legend.style.display = 'none';
        const city = document.getElementById('rainfall-city-dropdown');
        if (city) city.style.display = 'none';
    },

    // 更新圖層資料
    updateTime: async function (city = '') {
        const isDistrict = city.indexOf('區') >= 0;
        const url = isDistrict
            ? `${RAINFALL_API}/district/${encodeURIComponent(city)}`
            : city
                ? `${RAINFALL_API}/city/${encodeURIComponent(city)}`
                : `${RAINFALL_API}/regions`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!data || !data.regions) return;

            const features = data.regions
                .filter(r => r.lat != null && r.lon != null && r.max_rain_mmh > 0)
                .map(r => ({
                    type: 'Feature',
                    properties: {
                        code: r.code,
                        area: r.area,
                        max_rain: r.max_rain_mmh,
                        avg_rain: r.avg_rain_mmh,
                        site: r.site,
                        lat: r.lat,
                        lon: r.lon,
                        rain_timeseries: r.rain_timeseries,
                        issue_time: data.issue_time_utc8 || "-:--",
                        max_lead_minute: data.max_lead_minute || 0
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [r.lon, r.lat]
                    }
                }));

            map.getSource('rainfall-data').setData({
                type: 'FeatureCollection',
                features: features
            });

            updateRainfallLegend(features);
            updateRainfallCityInfo(data);
        } catch (err) {
            console.error('[rainfall] updateTime 失敗:', err);
        }
    }
};

// ── 圖例更新 ──
function updateRainfallLegend(features) {
    const container = document.getElementById('rainfall-legend-container');
    if (!container) return;
    const content = document.getElementById('rainfall-legend-content');
    if (!content) return;

    const sorted = [...features].sort((a, b) => b.properties.max_rain - a.properties.max_rain).slice(0, 20);
    const maxLead = Math.max(...features.map(f => f.properties.max_lead_minute || 0));
    const issue = features.length > 0 ? features[0].properties.issue_time : '';

    let html = `<div style="margin-bottom: 10px;">
        <div style="margin-bottom: 5px; font-weight: bold;">圖例 (mm/h)</div>
        <div style="background: linear-gradient(to right, #e0f0ff 0%, #4fc3f7 10%, #29b6f6 20%, #4caf50 35%, #ffeb3b 50%, #ff9800 65%, #f44336 75%, #d32f2f 85%, #b71c1c 95%, #3e2723 100%);
                     height: 14px; border-radius: 7px; border: 1px solid #555;"></div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; color: #ddd; font-size: 11px;">
            <span>0</span><span>10</span><span>30</span><span>50</span><span>100</span><span>200</span><span>500</span>
        </div>
    </div>`;

    html += `<div style="margin-bottom: 8px; font-size: 12px; color: #ccc;">
        發布時間: <strong>${issue}</strong>
        &nbsp;|&nbsp; 最大預測: <strong>${maxLead}</strong> 分鐘
    </div>`;

    html += `<div style="margin-bottom: 5px; font-weight: bold; display: flex; justify-content: space-between;">
        <span>雨量預測 Top 20</span>
        <span style="cursor: pointer; font-size: 11px; color: #aaa;" onclick="window.rainfallToggleSort()">▼ 排序</span>
    </div>`;
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
    sorted.forEach((f, i) => {
        const p = f.properties;
        const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent';
        html += `<tr style="background: ${rowBg}; cursor: pointer;"
                     onclick="window.rainfallFlyTo(${p.lat}, ${p.lon})">
            <td style="padding: 3px 4px; width: 20px; text-align: center; color: ${i < 3 ? '#ffeb3b' : '#fff'};">${i + 1}</td>
            <td style="padding: 3px 4px;">${p.area}</td>
            <td style="padding: 3px 4px; text-align: right; font-family: monospace;">${p.max_rain.toFixed(1)}</td>
            <td style="padding: 3px 4px; text-align: right; font-family: monospace; color: #aaa;">${p.avg_rain.toFixed(1)}</td>
        </tr>`;
    });
    html += '</table>';

    content.innerHTML = html;
}

window.rainfallToggleSort = function () {
    const content = document.getElementById('rainfall-legend-content');
    if (content) {
        const asc = content.getAttribute('data-sort-asc') === 'true';
        content.setAttribute('data-sort-asc', String(!asc));
        updateRainfallLegend(window.rainfallFeatures || []);
    }
};

window.rainfallFlyTo = function (lat, lon) {
    map.flyTo({ center: [lon, lat], zoom: 12 });
};

function updateRainfallCityInfo(data) {
    const infoEl = document.getElementById('rainfall-city-info');
    if (infoEl) infoEl.textContent = `共 ${data.count} 個區域`;
}

// ── 建立圖例容器 ──
function createRainfallLegendContainer() {
    let container = document.getElementById('rainfall-legend-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'rainfall-legend-container';
        container.style.cssText = 'background: #1e1e1e; color: #e0e0e0; border-radius: 8px; padding: 10px 12px; width: 280px; max-height: 400px; overflow-y: auto; position: fixed; bottom: 10px; left: 10px; z-index: 999;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 6px;';
        header.innerHTML = '<span style="font-weight: bold; font-size: 14px;">🌧️ 雨量預測</span><span id="rainfall-legend-toggle" style="font-size: 12px;">▲</span>';
        header.onclick = function () {
            const content = document.getElementById('rainfall-legend-content');
            const icon = document.getElementById('rainfall-legend-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▲';
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
            }
        };
        container.appendChild(header);

        const content = document.createElement('div');
        content.id = 'rainfall-legend-content';
        content.style.cssText = 'overflow: hidden;';
        container.appendChild(content);

        // 雨量資訊元素
        const info = document.createElement('div');
        info.id = 'rainfall-city-info';
        info.style.cssText = 'padding: 6px 0; font-size: 12px; color: #ccc; border-top: 1px solid #333; margin-top: 6px;';
        info.textContent = '共 0 個區域';
        container.appendChild(info);

        document.body.appendChild(container);
    }
}

// ── map 載入時初始化 ──
map.on('load', async function () {
    createRainfallLegendContainer();

    // 初始載入所有區域
    let data;
    try {
        const res = await fetch(`${RAINFALL_API}/regions`);
        data = await res.json();
    } catch (e) {
        console.error('[rainfall] 初始載入失敗:', e);
        return;
    }

    if (!data || !data.regions) return;

    const features = data.regions
        .filter(r => r.lat != null && r.lon != null && r.max_rain_mmh > 0)
        .map(r => ({
            type: 'Feature',
            properties: {
                code: r.code,
                area: r.area,
                max_rain: r.max_rain_mmh,
                avg_rain: r.avg_rain_mmh,
                site: r.site,
                lat: r.lat,
                lon: r.lon,
                rain_timeseries: r.rain_timeseries,
                issue_time: data.issue_time_utc8 || "-:--",
                max_lead_minute: data.max_lead_minute || 0
            },
            geometry: {
                type: 'Point',
                coordinates: [r.lon, r.lat]
            }
        }));

    window.rainfallFeatures = features;

    map.addSource('rainfall-data', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: features
        }
    });

    // ── 雨量預測圓圈 ──
    map.addLayer({
        id: 'rainfall-circles',
        type: 'circle',
        source: 'rainfall-data',
        layout: {
            'visibility': 'none'
        },
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                5, 7,
                10, 14,
                16, 22
            ],
            'circle-color': [
                'interpolate', ['linear'], ['get', 'max_rain'],
                0,   '#4fc3f7',
                10,  '#29b6f6',
                30,  '#4caf50',
                60,  '#ffeb3b',
                120, '#f44336',
                350, '#3e2723'
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.9
        }
    });

    // ── 雨量預測標籤 ──
    map.addLayer({
        id: 'rainfall-labels',
        type: 'symbol',
        source: 'rainfall-data',
        layout: {
            'visibility': 'none',
            'text-field': ['format',
                ['get', 'area'],
                '\n',
                ['get', 'max_rain'],
                ' mm/h'
            ],
            'text-size': 11,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 2.2],
            'text-anchor': 'top'
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
            'text-halo-blur': 1
        },
        minzoom: 9
    });

    // ── 點擊事件 ──
    map.on('click', 'rainfall-circles', function (e) {
        const props = e.features[0].properties;
        const popup = new maplibregl.Popup({ className: 'rainfall-popup' })
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="padding: 8px 12px; background: #1e1e1e; color: #e0e0e0; border-radius: 6px; min-width: 160px; font-size: 13px;">
                    <div style="font-weight: bold; margin-bottom: 4px;">${props.area}</div>
                    <div>最大雨量: <strong>${props.max_rain.toFixed(1)} mm/h</strong></div>
                    <div>平均雨量: <strong>${props.avg_rain.toFixed(1)} mm/h</strong></div>
                    <div style="margin-top: 6px; font-size: 11px; color: #aaa;">
                        發布時間: ${props.issue_time}
                    </div>
                    <div style="font-size: 11px; color: #aaa;">
                        最大預測: ${props.max_lead_minute} 分鐘
                    </div>
                </div>
            `);
        popup.addTo(map);
    });

    map.on('mouseenter', 'rainfall-circles', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'rainfall-circles', function () {
        map.getCanvas().style.cursor = '';
    });

    // 預設顯示
    window.rainfallLayer.show();
    updateRainfallLegend(features);
    updateRainfallCityInfo(data);
});
