const mapConfig = {
    container: 'map',
    dragRotate: false,
    style: {
        'version': 8,
        'name': 'ExpTech Studio',
        'center': [120.2, 23.6],
        'zoom': 7,
        'sources': {
            'map': {
                'type': 'vector',
                'url': 'https://lb.exptech.dev/api/v1/map/tiles/tiles.json',
            },
        },
        'sprite': '',
        'glyphs': 'https://orangemug.github.io/font-glyphs/glyphs/{fontstack}/{range}.pbf',
        'layers': [
            {
                id: 'background',
                type: 'background',
                paint: {
                    'background-color': '#1f2025',
                },
            },
            {
                'id': 'county',
                'type': 'fill',
                'source': 'map',
                'source-layer': 'city',
                'paint': {
                    'fill-color': '#3F4045',
                    'fill-opacity': 1,
                },
            },
            {
                'id': 'town',
                'type': 'fill',
                'source': 'map',
                'source-layer': 'town',
                'paint': {
                    'fill-color': '#3F4045',
                    'fill-opacity': 1,
                },
            },
            {
                'id': 'county-outline',
                'source': 'map',
                'source-layer': 'city',
                'type': 'line',
                'paint': {
                    'line-color': '#a9b4bc',
                },
            },
            {
                'id': 'global',
                'type': 'fill',
                'source': 'map',
                'source-layer': 'global',
                'paint': {
                    'fill-color': '#3F4045',
                    'fill-opacity': 1,
                },
            }
        ]
    },
    center: [120.2, 23.6],
    zoom: 6.6
};

const map = new maplibregl.Map(mapConfig);

// 切換圖層相關代碼
const toggleButton = document.getElementById('toggle-layer');
let layerVisible = false;

function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('mapConfig');
        return savedConfig ? JSON.parse(savedConfig) : { layers: { town_outline: { visible: false } } };
    } catch (error) {
        console.error('無法載入設定:', error);
        return { layers: { town_outline: { visible: false } } };
    }
}

function saveConfig(config) {
    try {
        localStorage.setItem('mapConfig', JSON.stringify(config));
        console.log(config);
    } catch (error) {
        console.error('無法儲存設定:', error);
    }
}

toggleButton.addEventListener('click', () => {
    layerVisible = !layerVisible;

    if (layerVisible) {
        if (!map.getLayer('town-outline')) {
            map.addLayer({
                'id': 'town-outline',
                'type': 'line',
                'source': 'map',
                'source-layer': 'town',
                'paint': {
                    'line-color': '#a9b4bc',
                },
            });
        }
        map.setLayoutProperty('town-outline', 'visibility', 'visible');
    } else {
        if (map.getLayer('town-outline')) {
            map.setLayoutProperty('town-outline', 'visibility', 'none');
        }
    }

    saveConfig({
        layers: {
            town_outline: {
                visible: layerVisible
            }
        }
    });

    toggleButton.innerHTML = layerVisible ? `
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
            <path d="m644-448-56-58 122-94-230-178-94 72-56-58 150-116 360 280-196 152Zm115 114-58-58 73-56 66 50-81 64Zm33 258L632-236 480-118 120-398l66-50 294 228 94-73-57-56-37 29-360-280 83-65L55-811l57-57 736 736-56 56ZM487-606Z"/>
        </svg>
    ` : `
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
            <path d="M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z"/>
        </svg>
    `;
});

map.on('load', function() {
    const config = loadConfig();
    layerVisible = config.layers.town_outline.visible;

    if (layerVisible) {
        map.addLayer({
            'id': 'town-outline',
            'type': 'line',
            'source': 'map',
            'source-layer': 'town',
            'paint': {
                'line-color': '#a9b4bc',
            },
        });
    } else {
        map.addLayer({
            'id': 'town-outline',
            'type': 'line',
            'source': 'map',
            'source-layer': 'town',
            'paint': {
                'line-color': '#a9b4bc',
            },
            'layout': {
                'visibility': 'none'
            }
        });
    }

    toggleButton.innerHTML = layerVisible ? `
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
            <path d="m644-448-56-58 122-94-230-178-94 72-56-58 150-116 360 280-196 152Zm115 114-58-58 73-56 66 50-81 64Zm33 258L632-236 480-118 120-398l66-50 294 228 94-73-57-56-37 29-360-280 83-65L55-811l57-57 736 736-56 56ZM487-606Z"/>
        </svg>
    ` : `
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
            <path d="M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z"/>
        </svg>
    `;
});
